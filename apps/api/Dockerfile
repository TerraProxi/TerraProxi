FROM oven/bun:1-alpine AS base
WORKDIR /app

# Dépendances
FROM base AS deps
COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile

# Build
FROM deps AS build
COPY src ./src
COPY tsconfig.json ./
RUN bun build src/index.ts --outdir dist --target bun --minify

# Image finale — minimale
FROM oven/bun:1-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/dist ./dist
COPY --from=deps  /app/node_modules ./node_modules

EXPOSE 3002
HEALTHCHECK --interval=10s --timeout=3s --retries=3 \
  CMD wget -qO- http://localhost:3002/health || exit 1

CMD ["bun", "dist/index.js"]
