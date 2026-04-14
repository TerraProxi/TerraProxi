FROM node:20-alpine AS base
WORKDIR /app

# Dépendances
FROM base AS deps
COPY package.json ./
RUN npm install

# Build Vite
FROM deps AS build
COPY . .
RUN npm run build

# Serveur de production minimal avec nginx
FROM nginx:alpine AS runner
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
