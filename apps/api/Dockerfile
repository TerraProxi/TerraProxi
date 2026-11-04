# Image de l'API TerraProxi — contexte de build : racine du dépôt
#   docker build -f apps/api/Dockerfile -t terraproxi-back .

# 1. Dépendances (pnpm, lockfile figé)
FROM node:20-alpine AS deps
WORKDIR /repo
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/mobile/package.json apps/mobile/
COPY packages/shared-types/package.json packages/shared-types/
RUN pnpm install --frozen-lockfile --filter @terraproxi/api...

# 2. Bundle Bun : un fichier par point d'entrée, dépendances incluses
FROM oven/bun:1.3.5-alpine AS build
WORKDIR /repo
COPY --from=deps /repo ./
COPY apps/api apps/api
WORKDIR /repo/apps/api
RUN bun build src/index.ts src/db/migrate.ts src/db/seed.ts \
      --outdir dist --target bun --minify --external pg-native

# 3. Image finale : uniquement le bundle et les migrations, utilisateur non root
FROM oven/bun:1.3.5-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    API_PORT=3002 \
    MIGRATIONS_DIR=/app/migrations
COPY --from=build --chown=bun:bun /repo/apps/api/dist ./dist
COPY --chown=bun:bun infrastructure/database/migrations ./migrations
USER bun

EXPOSE 3002
HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3002/health || exit 1

# Applique les migrations en attente puis démarre l'API
CMD ["sh", "-c", "bun dist/db/migrate.js && exec bun dist/index.js"]
