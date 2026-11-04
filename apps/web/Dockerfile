# Image du front web TerraProxi — contexte de build : racine du dépôt
#   docker build -f apps/web/Dockerfile --build-arg VITE_API_URL=https://gateway.terraproxi.fr/api .

FROM node:20-alpine AS build
WORKDIR /repo
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/mobile/package.json apps/mobile/
COPY packages/shared-types/package.json packages/shared-types/
RUN pnpm install --frozen-lockfile --filter @terraproxi/web...

COPY apps/web apps/web
# Variables publiques figées dans le bundle au build
ARG VITE_API_URL=https://gateway.terraproxi.fr/api
ARG VITE_STRIPE_PUBLISHABLE_KEY=
ENV VITE_API_URL=$VITE_API_URL \
    VITE_STRIPE_PUBLISHABLE_KEY=$VITE_STRIPE_PUBLISHABLE_KEY
RUN pnpm --filter @terraproxi/web build

# nginx sans privilèges root (écoute sur 8080)
FROM nginxinc/nginx-unprivileged:1.27-alpine AS runner
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/ >/dev/null || exit 1
