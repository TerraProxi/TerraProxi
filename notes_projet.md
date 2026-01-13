# Projet OpenInnov - TerraProxi

- Serveur Ubuntu chez OVH
- Enregistrement DNS sur Cloudflare => [terraproxy.fr](<https://dash.cloudflare.com/27bbad26272f997b6ca73887f244d633/terraproxi.fr>)
- Caddy pour le htpps et routage (pas Nginx)
- 3 conteneurs via docker-compose: app front, app back (auth, api, gateway), db
  - back écoute en 3002
  - front écoute en 80
- DB PostgreSQL jamais exposée

---

# 🌐 Comment tout s’emboîte (le lien réel entre les briques)

Quand un utilisateur crée un compte depuis son téléphone :

```
Téléphone
   |
HTTPS (TLS)
   |
gateway.terraproxi.fr   ← Caddy (reverse proxy + TLS)
   |
   | (réseau Docker interne)
   v
Back (API / Auth / Gateway – port 3002)
   |
   | (réseau Docker interne)
   v
PostgreSQL (db)
```

1. Le téléphone appelle `https://gateway.terraproxi.fr`
2. Caddy reçoit la requête HTTPS
3. Caddy la transmet au conteneur `back` (port 3002)
4. Le backend vérifie/crée l’utilisateur
5. Le backend parle à PostgreSQL via le réseau interne Docker
6. PostgreSQL répond au backend
7. Le backend répond au téléphone

👉 **Le téléphone ne parle jamais à PostgreSQL. Il n’y a aucune communication externe avec la base :**

- PostgreSQL ne voit jamais Internet
- Il ne voit que le backend
- Le backend ne voit que Caddy
- Caddy ne voit que le monde extérieur

C’est une architecture en *couches*.

Le serveur OVH a **trois** rôles :

| Rôle                    | Où                          |
| ----------------------- | --------------------------- |
| Point d’entrée Internet | Caddy (443 et 80)           |
| Logique applicative     | Conteneur `back`            |
| Données                 | Conteneur `db` (PostgreSQL) |


---

# 🧱 Architecture réelle

| Élément           | Rôle                                                     |
| ----------------- | -------------------------------------------------------- |
| Cloudflare DNS    | Fait pointer `gateway.terraproxi.fr` vers le serveur OVH |
| Caddy             | HTTPS + reverse proxy                                    |
| back (container)  | API + Auth + logique métier                              |
| front (container) | Site web                                                 |
| db (container)    | PostgreSQL                                               |
| Docker network    | Relie back ↔ db de façon privée                          |

---

# 🚀 Plan d’actions – version **réelle** et **à jour**

## Étape 1 — Préparer le serveur OVH

### 1.1 Mettre à jour

Partir connecté au serveur en root : `ssh IpAddress:PortNUmber`

```bash
sudo apt update && sudo apt -y upgrade
```

Pourquoi : SSH, sudo, ufw, etc. doivent être à jour avant de verrouiller l’accès.

### 1.2 Créer les utilisateurs

a) Création des admins :

```bash
adduser gaetan
adduser duna
usermod -aG sudo gaetan
usermod -aG sudo duna
```

b) Création des membres (sans sudo) :

```bash
adduser theo
adduser mylow
```

c) Installation des clés SSH pour les admins

Sur chaque PC admin :

```bash
ssh-keygen
ssh-copy-id gaetan@IP_DU_SERVEUR
ssh-copy-id duna@IP_DU_SERVEUR
```

Tester :

```bash
ssh gaetan@IP_DU_SERVEUR
sudo whoami
```

Doit afficher `root`.

d) Vérification qu’au moins un admin peut entrer

Ne pas continuer pas tant que ça ne marche pas.

Ouvrir un nouveau terminal :

```bash
ssh gaetan@IP_DU_SERVEUR
sudo whoami
```

Si possible de se connecter → OK.

e) Désactivation de root et des mots de passe

```bash
sudo nano /etc/ssh/sshd_config
```

Modifier le fichier de configuration avec :

```bash
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
```

Puis :

```bash
sudo systemctl restart ssh
```

Tester :

```bash
ssh gaetan@IP_DU_SERVEUR
```

Si possible de se connecter → OK.

### 1.2 Pare-feu minimal

On n’ouvre que ce qui est nécessaire :

```bash
sudo apt -y install ufw
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp
sudo ufw enable
sudo ufw status
```

6️⃣ Installer et configurer le pare-feu

Maintenant que SSH est sûr :

sudo apt -y install ufw
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow OpenSSH
sudo ufw enable
sudo ufw status


Test avant de fermer ta session :

ssh gaetan@IP_DU_SERVEUR

7️⃣ (Optionnel mais recommandé) Restreindre SSH aux IP des admins

Quand tu es sûr que tout marche :

sudo ufw delete allow OpenSSH
sudo ufw allow from IP_GAETAN to any port 22 proto tcp
sudo ufw allow from IP_DUNA to any port 22 proto tcp

8️⃣ Droits des membres

Par défaut :

theo et mylow :

peuvent se connecter en SSH

ne peuvent pas utiliser sudo

ne peuvent pas installer de logiciels

ne peuvent pas toucher au firewall

Tu peux vérifier :

sudo -l -U theo


Doit dire qu’il n’a pas de privilèges.
### 1.3 Création d'utilisateurs

| Utilisateur | SSH | sudo | Serveur |
| ----------- | --- | ---- | ------- |
| root        | ❌   | ❌    | bloqué  |
| gaetan      | ✔   | ✔    | admin   |
| duna        | ✔   | ✔    | admin   |
| theo        | ✔   | ❌    | membre  |
| mylow       | ✔   | ❌    | membre  |


---

## Étape 2 — DNS Cloudflare

Dans Cloudflare → DNS :

| Type | Nom     | IP                |
| ---- | ------- | ----------------- |
| A    | gateway | IP du serveur OVH |
| A    | app     | IP du serveur OVH |

Au début à mettre en **DNS only (gris)**.

Vérifier :

```bash
dig +short gateway.terraproxi.fr
dig +short app.terraproxi.fr
```

---

## Étape 3 — Installer Docker + Compose

```bash
sudo apt -y install ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
"deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
| sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt -y install docker-ce docker-ce-cli containerd.io docker-compose-plugin
```

---

## Étape 4 — Déployer la stack (Caddy + front + back + db)

Créer le dossier :

```bash
sudo mkdir -p /opt/terraproxi
sudo chown -R $USER:$USER /opt/terraproxi
cd /opt/terraproxi
```

Créer `.env` :

```env
POSTGRES_DB=terraproxi
POSTGRES_USER=app_user
POSTGRES_PASSWORD=CHANGE_ME_STRONG

JWT_SECRET=CHANGE_ME_LONG_RANDOM
DATABASE_URL=postgres://app_user:CHANGE_ME_STRONG@db:5432/terraproxi
```

---

### `docker-compose.yml`

```yaml
services:
  caddy:
    image: caddy:2
    ports: ["80:80", "443:443"]
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    depends_on: [back, front]
    networks: [public, internal]

  front:
    image: IMAGE_FRONT:latest
    expose: ["80"]
    networks: [internal]

  back:
    image: IMAGE_BACK:latest
    expose: ["3002"]
    environment:
      DATABASE_URL: ${DATABASE_URL}
      JWT_SECRET: ${JWT_SECRET}
    depends_on: [db]
    networks: [internal]

  db:
    image: postgres:16
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    networks: [internal]

networks:
  public: {}
  internal:
    internal: true

volumes:
  pgdata:
  caddy_data:
  caddy_config:
```

---

### `Caddyfile`

```caddy
gateway.terraproxi.fr {
  reverse_proxy back:3002
}

app.terraproxi.fr {
  reverse_proxy front:80
}
```

---

## Étape 5 — Lancer

```bash
docker compose up -d
docker compose ps
docker logs -n 50 caddy
```

Tester :

```bash
curl -I https://gateway.terraproxi.fr/health
```

---

## Étape 6 — Sécurité DB

Vérifie qu’elle n’est pas exposée :

```bash
sudo ss -lntp | grep 5432
```

→ rien ne doit apparaître côté 0.0.0.0

Admin DB :

```bash
docker exec -it $(docker ps -qf "name=db") psql -U app_user -d terraproxi
```

---

# ✅ Checklist finale

* [ ] Cloudflare pointe vers l’IP OVH
* [ ] HTTPS OK sur gateway.terraproxi.fr
* [ ] Docker tourne
* [ ] Caddy sert le TLS
* [ ] PostgreSQL n’a aucun port public
* [ ] L’API répond via Caddy
* [ ] Les données persistent après `docker compose up -d`
