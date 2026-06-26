# --- Stage 1: Build ---
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json* ./
COPY packages/shared/package.json packages/shared/package.json
COPY packages/backend/package.json packages/backend/package.json
COPY packages/frontend/package.json packages/frontend/package.json

RUN npm install

COPY packages packages
RUN npm run build --workspace=shared --if-present
RUN npm run build --workspace=frontend
RUN npm run build --workspace=backend

# --- Stage 2: Runtime ---
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json* ./
COPY packages/shared/package.json packages/shared/package.json
COPY packages/backend/package.json packages/backend/package.json
RUN npm install --omit=dev --workspace=backend --workspace=shared

COPY --from=build /app/packages/backend/dist packages/backend/dist
COPY --from=build /app/packages/frontend/dist packages/frontend/dist
COPY --from=build /app/packages/shared packages/shared

# Datenverzeichnis für SQLite + Bild-Uploads
RUN mkdir -p /app/packages/backend/data
VOLUME ["/app/packages/backend/data"]

EXPOSE 3001
CMD ["node", "packages/backend/dist/index.js"]
