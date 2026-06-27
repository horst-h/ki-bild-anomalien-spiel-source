# KI-Bild-Anomalien-Spiel

Webanwendung für ein KI-Awareness-Spiel zur Erkennung von Fake-Bildern (Festival 2026).
Vollständige Anforderungen und Architektur: siehe Anforderungsdokument im Obsidian-Vault /
Projektdokumentation.

## Struktur

Monorepo mit npm Workspaces:

- `packages/frontend` – React + TypeScript + Vite, react-konva für die Bildinteraktion, XState
  für State-Management, als PWA lauffähig
- `packages/backend` – Node + Express + SQLite (better-sqlite3), Bildverarbeitung mit `sharp`
- `packages/shared` – gemeinsam genutzte Zod-Schemas (Frontend + Backend)

## Setup

```bash
npm install
cp .env.example .env   # ggf. ADMIN_PASSWORD anpassen
npm run dev
```

Startet Backend (Port 3001) und Frontend (Vite Dev-Server, Port 5173) parallel. Der Vite-Dev-
Server proxyt `/api` und `/images` an das Backend.

Frontend allein im Browser öffnen: http://localhost:5173

## Build & Produktion

```bash
npm run build
```

baut alle Workspaces. Für den produktiven Betrieb wird stattdessen das Docker-Image verwendet:

```bash
docker compose up --build
```

Die Anwendung läuft danach auf Port 80, SQLite-Datei und Bild-Uploads liegen persistent im
gemounteten `./data`-Verzeichnis.

## Tests / Lint

```bash
npm run lint
npm test
```

./scripts/e2e.sh
Playwright-Argumente werden durchgereicht, z. B.:

## Scripts für Testaufrufe

```bash
./scripts/e2e.sh --headed          # Browser sichtbar
./scripts/e2e.sh --grep "Ray-Casting"  # einzelnen Test laufen lassen
./scripts/e2e.sh --debug           # mit Playwright Inspector
```

(Noch ohne konkrete Konfiguration – Platzhalter-Skripte in den jeweiligen `package.json`-Dateien
ergänzen, sobald Tooling feststeht.)

## Admin-Zugang

Login über ein geteiltes Passwort (`ADMIN_PASSWORD` in `.env` bzw. Docker-Compose-Environment).
Admin-Oberfläche erreichbar unter `/admin`.

## Weiterführende Dokumentation

Anforderungen, Architektur, API-Endpunkte, Datenbankschema und Sequenzdiagramme siehe
`Anforderungen-KI-Bild-Anomalien-Spiel.md` im Dokumentations-Vault.
