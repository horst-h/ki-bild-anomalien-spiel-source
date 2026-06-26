# API-Referenz – KI-Bild-Anomalien-Spiel

**Base-URL (Dev):** `http://localhost:3001`  
**Base-URL (Produktion):** gleicher Origin wie das Frontend (`/api/…`)

Alle Endpunkte sprechen JSON (`Content-Type: application/json`), außer dem
Bild-Upload (`multipart/form-data`) und dem Bild-Download.

---

## Koordinatensystem

Alle Klick-Koordinaten und Polygon-Punkte sind **normalisiert (0.0 … 1.0)**,
relativ zur Bildgröße. `{ x: 0, y: 0 }` ist oben-links, `{ x: 1, y: 1 }`
ist unten-rechts. Das erlaubt bildgrößenunabhängige Prüfung auf dem Server.

---

## Anti-Cheat-Hinweis

Anomalie-Polygone und Erklärungen werden **niemals vor Rundenende** an den
Client gesendet. `GET /api/games/:id/tasks/:i` enthält nur Bild-URL,
Zeitlimit und Anzahl der Bereiche – keine Koordinaten. Erst `POST …/finish`
liefert die vollständige Auflösung.

---

## 1 · Öffentliche Spieler-API

### `GET /api/health`

Liveness-Check.

```
HTTP 200
{ "status": "ok" }
```

---

### `POST /api/validate-name`

Prüft einen Spielernamen auf unzulässige Begriffe **vor** dem Spielstart,
damit Fehler direkt im Formular angezeigt werden können.

**Request**
```json
{ "name": "4dm1n" }
```

**Response `200`**
```json
{ "verdict": "allowed" }
```
```json
{ "verdict": "blocked", "stage": "impersonation" }
```
```json
{ "verdict": "review", "reason": "no_api_key" }
```

| `verdict`   | Bedeutung |
|-------------|-----------|
| `allowed`   | Name ist in Ordnung |
| `blocked`   | Name nicht erlaubt; `stage`: `blocklist` / `impersonation` / `perspective` |
| `review`    | Perspective-API nicht erreichbar; Client soll trotzdem starten (fail-open) |

**Fehler**
```
HTTP 400  { "error": "Name fehlt" }
```

```bash
curl -X POST http://localhost:3001/api/validate-name \
  -H "Content-Type: application/json" \
  -d '{"name":"TestSpieler"}'
```

---

### `POST /api/games`

Neues Spiel starten. Wählt serverseitig 3 Aufgaben passend zum Avatar-Level
aus, legt das Spiel in der Datenbank an.

**Request**
```json
{
  "playerName": "MaxMuster",
  "avatarLevel": "waldfuchs"
}
```

| Feld          | Typ    | Constraints |
|---------------|--------|-------------|
| `playerName`  | string | 2–30 Zeichen |
| `avatarLevel` | string | `jungfuchs` / `waldfuchs` / `erzfuchs` |

**Response `201`**
```json
{
  "gameId": "550e8400-e29b-41d4-a716-446655440000",
  "taskCount": 3
}
```

**Fehler**
```
HTTP 400  { "error": "Name nicht erlaubt" }
HTTP 400  { "error": { "fieldErrors": { "playerName": ["..."] } } }   ← Zod-Validierungsfehler
HTTP 503  { "error": "Nicht genügend veröffentlichte Bilder für dieses Level" }
```

```bash
curl -X POST http://localhost:3001/api/games \
  -H "Content-Type: application/json" \
  -d '{"playerName":"MaxMuster","avatarLevel":"waldfuchs"}'
```

---

### `GET /api/games/:gameId/tasks/:taskIndex`

Aufgaben-Details für eine Runde. **Keine Polygon-Koordinaten oder Erklärungen**
(Anti-Cheat).

**Response `200`**
```json
{
  "taskIndex": 0,
  "category": "mittel",
  "imageUrl": "/images/550e8400-e29b-41d4-a716-446655440001",
  "timeLimitSeconds": 90,
  "maxWrongAttempts": 6,
  "totalAreas": 3,
  "hitsSoFar": 0,
  "wrongAttemptsSoFar": 0
}
```

**Fehler**
```
HTTP 404  { "error": "Aufgabe nicht gefunden" }
```

```bash
curl http://localhost:3001/api/games/GAME_ID/tasks/0
```

---

### `POST /api/games/:gameId/tasks/:taskIndex/attempt`

Einen Klick serverseitig prüfen. Das Backend vergleicht den Punkt per
Ray-Casting gegen alle Anomalie-Polygone.

**Request**
```json
{ "x": 0.42, "y": 0.17 }
```

**Response `200` – Treffer**
```json
{
  "result": "hit",
  "areaId": "area-uuid",
  "explanation": "Das Gebäude hat keine Fenster.",
  "polygon": [
    { "x": 0.30, "y": 0.10 },
    { "x": 0.55, "y": 0.10 },
    { "x": 0.55, "y": 0.40 },
    { "x": 0.30, "y": 0.40 }
  ],
  "hitsSoFar": 1,
  "wrongAttemptsSoFar": 0,
  "totalAreas": 3,
  "taskComplete": false
}
```

**Response `200` – Fehlversuch**
```json
{
  "result": "miss",
  "hitsSoFar": 1,
  "wrongAttemptsSoFar": 1,
  "totalAreas": 3,
  "taskComplete": false
}
```

**Response `200` – Bereits gefunden (Duplikat)**
```json
{
  "result": "duplicate",
  "hitsSoFar": 1,
  "wrongAttemptsSoFar": 0,
  "totalAreas": 3
}
```

> `taskComplete: true` signalisiert, dass alle Bereiche gefunden wurden
> oder die maximalen Fehlversuche erreicht sind – der Client soll dann
> `POST …/finish` aufrufen.

**Fehler**
```
HTTP 400  { "error": { ... } }   ← x/y außerhalb 0..1
HTTP 404  { "error": "Aufgabe nicht gefunden" }
HTTP 409  { "error": "Aufgabe ist bereits beendet" }
```

```bash
curl -X POST http://localhost:3001/api/games/GAME_ID/tasks/0/attempt \
  -H "Content-Type: application/json" \
  -d '{"x":0.42,"y":0.17}'
```

---

### `POST /api/games/:gameId/tasks/:taskIndex/finish`

Runde beenden. Berechnet den Score serverseitig aus den gespeicherten
Treffern/Fehlversuchen (nie aus Client-Angaben). Gibt die vollständige
Auflösung zurück.

**Request**
```json
{
  "remainingTimeSeconds": 45,
  "skipped": false
}
```

**Response `200`**
```json
{
  "score": 672,
  "resolution": {
    "areas": [
      {
        "id": "area-uuid-1",
        "polygon": [{ "x": 0.30, "y": 0.10 }, { "x": 0.55, "y": 0.10 }, { "x": 0.55, "y": 0.40 }, { "x": 0.30, "y": 0.40 }],
        "explanation": "Das Gebäude hat keine Fenster.",
        "found": true
      },
      {
        "id": "area-uuid-2",
        "polygon": [{ "x": 0.70, "y": 0.60 }, { "x": 0.90, "y": 0.60 }, { "x": 0.90, "y": 0.80 }, { "x": 0.70, "y": 0.80 }],
        "explanation": "Die Straßenlaterne schwebt in der Luft.",
        "found": false
      }
    ]
  }
}
```

**Fehler**
```
HTTP 400  { "error": { ... } }
HTTP 404  { "error": "Aufgabe nicht gefunden" }
HTTP 409  { "error": "Aufgabe ist bereits beendet" }
```

```bash
curl -X POST http://localhost:3001/api/games/GAME_ID/tasks/0/finish \
  -H "Content-Type: application/json" \
  -d '{"remainingTimeSeconds":45,"skipped":false}'
```

---

### `GET /api/games/:gameId/summary`

Gesamtauswertung nach allen 3 Aufgaben. Schreibt beim **ersten Aufruf** den
Eintrag ins Leaderboard. Weitere Aufrufe (z. B. Seiten-Reload) geben
dieselben Werte zurück, ohne erneut einzutragen (idempotent).

**Response `200`**
```json
{
  "playerName": "MaxMuster",
  "avatarLevel": "waldfuchs",
  "scorePerTask": [
    { "taskIndex": 0, "score": 672 },
    { "taskIndex": 1, "score": 580 },
    { "taskIndex": 2, "score": 413 }
  ],
  "totalScore": 1665,
  "totalHits": 7,
  "totalWrongAttempts": 4,
  "rank": 3
}
```

**Fehler**
```
HTTP 400  { "error": "Noch nicht alle Aufgaben abgeschlossen" }
HTTP 404  { "error": "Spiel nicht gefunden" }
```

```bash
curl http://localhost:3001/api/games/GAME_ID/summary
```

---

### `GET /api/leaderboard`

Top-100 Einträge, sortiert nach Score absteigend (bei Gleichstand: früherer
Zeitpunkt zuerst).

**Response `200`**
```json
[
  {
    "rank": 1,
    "playerName": "MaxMuster",
    "avatarLevel": "erzfuchs",
    "totalScore": 2410,
    "createdAt": "2026-06-26 14:32:11"
  }
]
```

```bash
curl http://localhost:3001/api/leaderboard
```

---

### `GET /images/:id`

Liefert das Bild als statische Datei (JPEG/WebP, durch `sharp` beim Upload
auf max. 1280 px Breite skaliert).

```bash
curl http://localhost:3001/images/IMAGE_UUID --output bild.jpg
```

---

## 2 · Admin-API

Alle Admin-Endpunkte erfordern eine aktive Admin-Session (Session-Cookie,
gesetzt durch `POST /api/admin/login`). Ohne Session: `HTTP 401`.

### `POST /api/admin/login`

**Request**
```json
{ "password": "changeme" }
```

**Response `200`**
```json
{ "status": "ok" }
```

**Fehler**
```
HTTP 400  { "error": "Passwort fehlt" }
HTTP 401  { "error": "Falsches Passwort" }
```

```bash
curl -c cookies.txt -X POST http://localhost:3001/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"password":"changeme"}'
```

---

### `POST /api/admin/logout`

Beendet die Admin-Session.

**Response `200`**
```json
{ "status": "ok" }
```

```bash
curl -b cookies.txt -X POST http://localhost:3001/api/admin/logout
```

---

### `GET /api/admin/images`

Alle Bilder (Status `draft`, `published`, `archived`) mit ihren
Anomalie-Bereichen.

**Response `200`**
```json
[
  {
    "id": "uuid",
    "title": "Stadtbild mit Fehlern",
    "image_path": "uuid.webp",
    "category": "mittel",
    "suitability": "allgemein",
    "time_limit_seconds": 90,
    "max_wrong_attempts": 6,
    "status": "published",
    "created_at": "2026-06-26 10:00:00",
    "updated_at": "2026-06-26 11:00:00",
    "anomalyAreas": [
      {
        "id": "area-uuid",
        "polygon": [{ "x": 0.30, "y": 0.10 }, { "x": 0.55, "y": 0.10 }, { "x": 0.55, "y": 0.40 }, { "x": 0.30, "y": 0.40 }],
        "explanation": "Das Gebäude hat keine Fenster."
      }
    ]
  }
]
```

```bash
curl -b cookies.txt http://localhost:3001/api/admin/images
```

---

### `GET /api/admin/images/:id`

Einzelbild mit Anomalie-Bereichen (gleiche Struktur wie oben, einzelnes Objekt).

```bash
curl -b cookies.txt http://localhost:3001/api/admin/images/IMAGE_UUID
```

**Fehler**
```
HTTP 404  { "error": "Bild nicht gefunden" }
```

---

### `POST /api/admin/images`

Neues Bild hochladen. Das Backend skaliert es mit `sharp` auf max. 1280 px
Breite und speichert es als WebP. Legt den Datensatz im Status `draft` an
(Standard-Kategorie `leicht`, Zeitlimit 60 s, 6 Fehlversuche).

**Request** – `multipart/form-data`

| Feld    | Typ  | Pflicht | Beschreibung |
|---------|------|---------|--------------|
| `image` | File | ja      | JPEG / PNG / WebP, max. 8 MB |
| `title` | Text | nein    | Fällt auf Dateiname zurück |

**Response `201`**
```json
{
  "id": "uuid",
  "title": "Stadtbild mit Fehlern",
  "imagePath": "uuid.webp",
  "status": "draft"
}
```

**Fehler**
```
HTTP 400  { "error": "Kein Bild hochgeladen oder Format nicht erlaubt" }
```

```bash
curl -b cookies.txt -X POST http://localhost:3001/api/admin/images \
  -F "image=@/pfad/zum/bild.jpg" \
  -F "title=Stadtbild mit Fehlern"
```

---

### `PUT /api/admin/images/:id`

Metadaten und/oder Anomalie-Bereiche aktualisieren. Alle Felder optional;
nur übergebene Felder werden geändert. Bei `anomalyAreas`: **vollständiger
Ersatz** der bisherigen Bereiche (kein Merge).

**Request** (alle Felder optional)
```json
{
  "title": "Überarbeiteter Titel",
  "category": "schwer",
  "suitability": "allgemein",
  "timeLimitSeconds": 120,
  "maxWrongAttempts": 5,
  "anomalyAreas": [
    {
      "id": "vorhandene-uuid-oder-weglassen",
      "polygon": [
        { "x": 0.10, "y": 0.10 },
        { "x": 0.30, "y": 0.10 },
        { "x": 0.30, "y": 0.30 },
        { "x": 0.10, "y": 0.30 }
      ],
      "explanation": "Der Schatten fällt in die falsche Richtung."
    }
  ]
}
```

| Feld               | Typ      | Constraints |
|--------------------|----------|-------------|
| `category`         | string   | `leicht` / `mittel` / `schwer` |
| `suitability`      | string   | `kinderfreundlich` / `allgemein` |
| `timeLimitSeconds` | integer  | > 0 |
| `maxWrongAttempts` | integer  | > 0 |
| `anomalyAreas[].polygon` | array | mind. 3 Punkte, x/y je 0..1 |
| `anomalyAreas[].explanation` | string | nicht leer |

**Response `200`**
```json
{ "status": "ok" }
```

**Fehler**
```
HTTP 400  { "error": "Fehlerbereiche dürfen sich nicht überlappen" }
HTTP 400  { "error": { ... } }   ← Zod-Validierungsfehler
HTTP 404  { "error": "Bild nicht gefunden" }
```

```bash
curl -b cookies.txt -X PUT http://localhost:3001/api/admin/images/IMAGE_UUID \
  -H "Content-Type: application/json" \
  -d '{"category":"schwer","timeLimitSeconds":120}'
```

---

### `POST /api/admin/images/:id/publish`

Bild veröffentlichen. Vorher werden folgende Bedingungen geprüft:

- Bild-Datei vorhanden
- Kategorie gesetzt
- Mindestens 1 Anomalie-Bereich mit Erklärung
- Maximale Fehlversuche und Zeitlimit gesetzt
- Keine überlappenden Bereiche (Bounding-Box-Prüfung)

**Response `200`**
```json
{ "status": "published" }
```

**Fehler**
```
HTTP 400  {
  "error": "Bild ist nicht vollständig",
  "missing": ["Mindestens ein Fehlerbereich erforderlich", "Zeitlimit fehlt"]
}
HTTP 404  { "error": "Bild nicht gefunden" }
```

```bash
curl -b cookies.txt -X POST http://localhost:3001/api/admin/images/IMAGE_UUID/publish
```

---

### `DELETE /api/admin/images/:id`

Archiviert das Bild (setzt Status auf `archived`, löscht nicht physisch).
Archivierte Bilder werden bei der Spielauswahl ignoriert.

**Response `200`**
```json
{ "status": "archived" }
```

```bash
curl -b cookies.txt -X DELETE http://localhost:3001/api/admin/images/IMAGE_UUID
```

---

## 3 · Fehler-Codes Übersicht

| HTTP | Bedeutung |
|------|-----------|
| 400  | Ungültige Eingabe (Validierungsfehler, unvollständige Daten) |
| 401  | Nicht eingeloggt (Admin-Bereich) oder falsches Passwort |
| 404  | Ressource nicht gefunden |
| 409  | Konflikt (z. B. Aufgabe bereits beendet) |
| 503  | Nicht genügend veröffentlichte Bilder für Spielstart |

Alle Fehlertexte im Format:
```json
{ "error": "Lesbare Beschreibung" }
```
oder bei Zod-Validierungsfehlern:
```json
{ "error": { "fieldErrors": { "feldname": ["Fehlermeldung"] }, "formErrors": [] } }
```

---

## 4 · Typischer Spielablauf (Sequenz)

```
POST /api/validate-name          → { verdict: "allowed" }
POST /api/games                  → { gameId, taskCount: 3 }

  für taskIndex = 0, 1, 2:
  GET  /api/games/:id/tasks/:i   → Bild-URL, Zeitlimit, Anzahl Bereiche
    POST …/attempt (x, y)        → hit / miss / duplicate  (wiederholt)
  POST …/finish                  → score, vollständige Auflösung

GET  /api/games/:id/summary      → Gesamtscore, Rang, Leaderboard-Eintrag
GET  /api/leaderboard            → Top 100
```
