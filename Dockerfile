# --- Stage 1: Build ---
FROM node:20-alpine AS build
WORKDIR /app

# Build-Tools für native Module (better-sqlite3, sharp)
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json* ./
COPY packages/shared/package.json packages/shared/package.json
COPY packages/backend/package.json packages/backend/package.json
COPY packages/frontend/package.json packages/frontend/package.json

RUN npm ci

COPY packages packages

RUN npm run build --workspace=shared && \
    npm run build --workspace=frontend && \
    npm run build --workspace=backend

# Dev-Abhängigkeiten entfernen; native .node-Dateien bleiben erhalten
RUN npm prune --omit=dev

# --- Stage 2: Runtime ---
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Kompiliertes node_modules aus dem Build-Stage übernehmen (inkl. nativer Module)
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules node_modules

COPY --from=build /app/packages/shared/package.json packages/shared/package.json
COPY --from=build /app/packages/shared/dist packages/shared/dist

COPY --from=build /app/packages/backend/package.json packages/backend/package.json
COPY --from=build /app/packages/backend/dist packages/backend/dist
# Per-Package node_modules für Pakete die npm nicht in root hoisten konnte
COPY --from=build /app/packages/backend/node_modules packages/backend/node_modules

COPY --from=build /app/packages/frontend/dist packages/frontend/dist

# Datenverzeichnis für SQLite + Bild-Uploads
RUN mkdir -p /app/packages/backend/data
VOLUME ["/app/packages/backend/data"]

EXPOSE 3001
CMD ["node", "packages/backend/dist/index.js"]
