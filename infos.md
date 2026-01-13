# Infos pratiques

- Serveur Ubuntu chez OVH
- Enregistrement DNS sur Cloudflare => [terraproxy.fr](<https://dash.cloudflare.com/27bbad26272f997b6ca73887f244d633/terraproxi.fr>)
- Caddy pour le htpps et routage (pas Nginx)
- 3 conteneurs via docker-compose: app front, app back (auth, api, gateway), db
  - back écoute en 3002
  - front écoute en 80
- DB PostgreSQL jamais exposée
