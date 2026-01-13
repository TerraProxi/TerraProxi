# 

## Comment tout s’emboîte (le “lien entre tout”)

Le chemin réel quand un user sur téléphone crée un compte

1. Téléphone → https://api.tondomaine
 (TLS Let’s Encrypt)

2. Reverse proxy reçoit → redirige vers backend (container)

3. Backend vérifie / crée l’utilisateur → écrit en DB via réseau interne

4. DB répond → backend répond au téléphone

Le téléphone ne parle **jamais** à PostgreSQL.

## Plan d’actions (étapes & tâches) — version “base” sans fioritures

### Étape 1 — Préparer le serveur (on-prem de préférence)

- Installer Linux + Docker + Docker Compose
- SSH par clés
- Firewall : ouvrir 443, (80 optionnel), SSH limité IP, tout le reste fermé

#### 1.1 Installer Docker + Compose

Sur Ubuntu/Debian (exemple) :

- Mettre le système à jour
- Installer Docker Engine + plugin compose (ou docker-compose)

Objectif : docker version et docker compose version doivent répondre.

#### 1.2 Sécuriser l’accès SSH

- Créer un utilisateur non-root (ex: deploy)
- Activer l’auth par clé SSH (pas mot de passe)
- (Option conseillé) Désactiver login root par SSH

Objectif : tu te connectes en ssh deploy@IP avec ta clé.

#### 1.3 Firewall minimal

Tu veux :

- ouvrir 443/tcp (HTTPS)
- ouvrir 80/tcp (utile pour Let’s Encrypt HTTP challenge + redirection)
- ouvrir 22/tcp (SSH) mais restreint à vos IP si possible
- tout le reste fermé

Avec UFW (simple) :

- ufw allow 80/tcp
- ufw allow 443/tcp
- ufw allow from <ton_IP_publique> to any port 22 proto tcp (et idem pour les IP des membres)
- ufw enable

Vérif :

- depuis ton PC : ssh OK

- depuis Internet : seul 80/443 répondent

### Étape 2 — DNS OVH

Domaine → A record vers l’IP publique du serveur

Objectif : ton domaine pointe vers l’IP publique du serveur.

#### 2.1 Créer les enregistrements DNS

Chez OVH :

- Record A : api → IPV4_DU_SERVEUR (ex: api.tondomaine.fr)
- (Option) Record A : @ → IPV4_DU_SERVEUR si tu veux aussi tondomaine.fr
- Attendre propagation (quelques minutes à quelques heures).

Vérif : ping api.tondomaine.fr (ou nslookup) renvoie l’IP.

### Étape 3 — HTTPS (obligatoire)

- Déployer Caddy (le plus simple) ou Nginx+certbot
- Obtenir cert Let’s Encrypt automatiquement
- Forcer HTTPS

Étape 3 — HTTPS avec Nginx + Let’s Encrypt (le plus pertinent pour toi)

Tu connais Nginx : très bien.
Caddy est plus simple car TLS auto, mais Nginx est parfait et très standard.

3.1 Installer Nginx

Installer Nginx via apt

Démarrer le service

Vérif :

ouvrir http://api.tondomaine.fr → page Nginx par défaut (ou au moins réponse HTTP)

3.2 Installer Certbot (Let’s Encrypt)

Installer certbot + plugin nginx

Lancer la commande certbot pour ton domaine (ex: api.tondomaine.fr)

Ça va :

obtenir le certificat

configurer Nginx

activer la redirection HTTP→HTTPS si tu le demandes

Vérif :

https://api.tondomaine.fr fonctionne

test rapide : SSL Labs (plus tard) ou juste navigateur sans alerte

3.3 Mettre un reverse proxy vers ton backend Docker

Tu vas créer un vhost Nginx pour :

écouter en 443 (cert Let’s Encrypt)

proxy vers http://127.0.0.1:PORT_BACKEND (ex: 3000)

Concept :

Nginx est “porte d’entrée”

le backend écoute en local (ou sur une interface interne) et n’est pas exposé au public

À configurer dans Nginx :

proxy_pass http://127.0.0.1:3000;

ajouter les headers classiques (X-Forwarded-For, X-Forwarded-Proto, etc.)

client_max_body_size si besoin

timeouts basiques (optionnel)

3.4 Renouvellement auto des certificats

Certbot installe généralement un timer systemd automatique.
Vérif :

systemctl list-timers | grep certbot

test : certbot renew --dry-run

Conclusion : pour toi, Nginx + Certbot est le plus pertinent car tu maîtrises déjà, et c’est la stack “classique”.

### Étape 4 — Déployer l’app (backend) + DB

docker-compose.yml :

backend

postgres + volume

réseau interne

Vérifier que DB n’est pas exposée (pas de port public)

Mettre les variables d’environnement (DB URL, JWT secret)

### Étape 5 — Accès admin DB

Méthode “docker exec” ou tunnel SSH

Documenter la procédure

### Étape 6 — Redondance “socle”

Stockage redondant (RAID1/NAS/snapshots) pour le volume DB

Vérifier qu’une mise à jour des containers ne détruit pas les données





Étape 4 — Déployer backend + PostgreSQL avec Docker Compose

Tu vas créer un dossier projet (sur le serveur) :

/opt/terraproxi/ (par exemple)

4.1 Structure minimale

docker-compose.yml

.env (secrets)

éventuellement un compose.prod.yml plus tard

4.2 Docker Compose : principes à respecter

DB avec volume (pour ne pas perdre les données au redémarrage)

DB sans ports publics (pas de 5432:5432)

Backend et DB sur un réseau interne docker

Backend exposé uniquement en local (127.0.0.1) si possible

Exemple de règles (sans te coller du code ici si tu préfères) :

Backend : ports: "127.0.0.1:3000:3000"

Postgres : pas de ports

Réseau : internal: true (bonne pratique)

Volume : pgdata:/var/lib/postgresql/data

4.3 Variables d’environnement (sécurité)

Dans .env :

POSTGRES_DB=...

POSTGRES_USER=app_user

POSTGRES_PASSWORD=...fort...

JWT_SECRET=...fort...

DATABASE_URL=postgres://app_user:...@postgres:5432/....

⚠️ Ne jamais committer .env dans Git.

4.4 Lancer et vérifier

docker compose up -d

Vérifier :

docker ps → backend et postgres “Up”

docker logs backend → pas d’erreur DB

curl http://127.0.0.1:3000/health (si route health)

curl https://api.tondomaine.fr/health via Nginx

Étape 5 — Accès admin DB (sans exposer la base aux utilisateurs)

Tu as dit : DB accessible uniquement à :

l’application

les admins

Sans backup/RAID, on reste simple.

Option A (la plus simple) : admin via docker exec

Tâches :

Identifier le conteneur postgres

Lancer psql dedans :

docker exec -it <container> psql -U app_user -d <db>

Faire tes commandes SQL

✅ Avantage : aucun port DB ouvert, pas de tunnel.

Option B : tunnel SSH (quand tu veux un client DB local)

Tâches :

S’assurer que postgres n’écoute pas publiquement (pas de port publié)

Faire un tunnel :

ssh -L 5432:localhost:5432 deploy@api.tondomaine.fr

Sur ton PC : PgAdmin/DBeaver → localhost:5432

✅ Avantage : tu utilises une UI, toujours sans exposer la DB.

Étape 6 — “Pas de redondance/backup pour l’instant” : ce que tu fais quand même

Même si tu repousses backups/redondance, fais ces 2 mini-actions (ça ne te coûte rien) :

Assurer la persistance DB

volume docker obligatoire (sinon tu perds tout à chaque recréation)

Valider que “mise à jour app” ne casse pas la DB

simuler une update backend :

docker compose pull (ou rebuild)

docker compose up -d

vérifier que les données sont encore là

Résumé “checklist” (ultra simple)

Serveur : Docker + SSH clé + firewall (80/443 + SSH restreint)

DNS OVH : api.domaine → IP serveur

Nginx : reverse proxy + certbot Let’s Encrypt + redirect HTTPS

Compose : backend (local port) + postgres (volume, pas exposé) + réseau interne

Admin DB : docker exec (ou tunnel SSH)

Vérif : mobile → https://api.domaine → backend → postgres