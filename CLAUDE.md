# Projektkontext: KI-Bild-Anomalien-Spiel

Webanwendung für ein KI-Awareness-Spiel zur Erkennung von Fake-Bildern (Festival 2026).

**Vollständige Anforderungen, Architektur, Datenmodell, API-Endpunkte und
Sequenzdiagramme stehen in `docs/Anforderungen-KI-Bild-Anomalien-Spiel.md`.
Bitte vor größeren Änderungen oder neuen Features dort nachschlagen.**

## Struktur

npm-Workspaces-Monorepo:

- `packages/frontend` – React + TypeScript + Vite, react-konva (Bildinteraktion),
  XState (State-Management), als PWA lauffähig
- `packages/backend` – Node + Express + SQLite (better-sqlite3), Bildverarbeitung
  mit `sharp`
- `packages/shared` – gemeinsam genutzte Zod-Schemas (Frontend + Backend)

## Kritisches Architekturprinzip – unbedingt beachten

**Anomalie-Polygone und Erklärungen eines Bildes dürfen niemals vor
Rundenende an den Client gesendet werden** (Anti-Cheat, sonst über
DevTools auslesbar). Daher:

- `GET /api/games/:gameId/tasks/:taskIndex` liefert nur Bild-URL, Zeitlimit,
  max. Fehlversuche, Gesamtzahl Bereiche – **keine** Koordinaten/Erklärungen.
- Jeder Klick wird einzeln per `POST /api/games/:gameId/tasks/:taskIndex/attempt`
  serverseitig per Ray-Casting gegen die Polygone geprüft
  (`packages/backend/src/services/geometry.ts`). Der Client erfährt bei
  Treffer nur den getroffenen Bereich, sonst nichts.
- Erst `POST .../finish` (Rundenende) liefert die vollständige Auflösung.
- Score wird ausschließlich aus serverseitig erfassten Werten berechnet
  (`services/scoring.ts`), nie aus Client-Angaben.

Bitte dieses Prinzip bei jeder Erweiterung beibehalten – auch bei der
Admin-Oberfläche (Erklärungen/Polygone sind dort durch Admin-Auth geschützt,
nicht öffentlich).

## Aktueller Stand

**Backend:** Game-Routen (start/task/attempt/finish/summary), Leaderboard,
Admin-Routen (Login, Bildkatalog CRUD, Upload mit sharp-Resize,
Publish-Validierung) sind als erster Wurf vorhanden, noch ungetestet.

**Frontend:** `gameMachine.ts` (XState) und GameScreen-Komponenten (TopBar,
GameCanvas mit react-konva, FeedbackPopup) sind als Skizze vorhanden.

**Noch offen:**
- Übergeordnete App-/Routing-Machine für Start-/Namens-/Avatar-/Leaderboard-Screens
- Admin-Oberfläche im UI (Bild-Upload + Polygon-Editor) – bisher nur Backend-Routen
- Tests für `scoring.ts` und `gameSelection.ts`
- Echte Polygon-Überlappungsprüfung im Admin-Bereich (aktuell nur vereinfachte
  Bounding-Box-Prüfung, siehe Kommentar in `routes/admin/catalog.ts`)
- Namens-Blockliste in `routes/game.ts` ist nur ein Platzhalter

## Setup

```bash
npm install
cp .env.example .env
npm run dev   # Backend Port 3001, Frontend Port 5173 (Vite proxyt /api + /images)
```

Produktion: `docker compose up --build` (siehe `Dockerfile` / `docker-compose.yml`).
