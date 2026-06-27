# Deployment-Dokumentation

## Voraussetzungen

- Ubuntu 22.04 oder 24.04 VPS (z. B. DigitalOcean Droplet, 1 vCPU / 1 GB RAM reicht)
- Root-Zugang für die Ersteinrichtung
- Domain mit A-Record auf die VPS-IP
- GitHub-Repository mit den unter „GitHub Secrets einrichten" beschriebenen Secrets

---

## Ersteinrichtung des VPS

```bash
# Als root auf dem VPS:
curl -o setup.sh https://raw.githubusercontent.com/DEINE-ORG/ki-bild-anomalien-spiel/main/deploy/setup.sh
chmod +x setup.sh
DOMAIN=deine-domain.de bash setup.sh
```

Das Skript:
1. Installiert Docker CE und Docker Compose Plugin
2. Legt den Deployment-Benutzer `ki-deploy` an (Docker-Gruppe)
3. Klont das Repository nach `/opt/ki-bild-anomalien-spiel`
4. Erzeugt eine `.env` mit zufällig generierten Secrets
5. Installiert und konfiguriert Caddy (HTTPS via Let's Encrypt, automatisch)
6. Richtet einen täglichen Backup-Cronjob ein (03:00 Uhr)

Nach dem Setup:
- `.env` unter `/opt/ki-bild-anomalien-spiel/.env` prüfen und ggf. `ADMIN_PASSWORD` anpassen
- SSH-Key für `ki-deploy` eintragen (siehe nächster Abschnitt)
- Erstmalig deployen: `cd /opt/ki-bild-anomalien-spiel && docker compose up --build -d`

---

## GitHub Secrets einrichten

Das CI/CD-Workflow (`deploy`-Job) benötigt drei Secrets im GitHub-Repository.

### Benötigte Secrets

| Secret | Beschreibung |
|--------|-------------|
| `VPS_HOST` | IP-Adresse oder Hostname des VPS |
| `VPS_USER` | Deploy-Benutzer auf dem VPS (Standard: `ki-deploy`) |
| `VPS_SSH_KEY` | Privater SSH-Key des Deploy-Benutzers (PEM-Format, ohne Passphrase) |

### SSH-Key für den Deploy-User anlegen

```bash
# Lokal ein dediziertes Key-Paar generieren (ohne Passphrase für den CI-Einsatz)
ssh-keygen -t ed25519 -C "ki-deploy@github-actions" -f ~/.ssh/ki_deploy_ed25519 -N ""

# Public Key auf dem VPS eintragen (als root oder per sudo):
cat ~/.ssh/ki_deploy_ed25519.pub >> /home/ki-deploy/.ssh/authorized_keys

# Verbindung testen:
ssh -i ~/.ssh/ki_deploy_ed25519 ki-deploy@<VPS_HOST> "echo 'SSH OK'"
```

### Secrets in GitHub hinterlegen

1. GitHub-Repository öffnen → **Settings** → **Secrets and variables** → **Actions**
2. Für jedes Secret: **New repository secret** klicken, Namen eingeben, Wert einfügen

```
VPS_HOST    →  z. B. 123.456.789.0 oder deine-domain.de
VPS_USER    →  ki-deploy
VPS_SSH_KEY →  Inhalt von ~/.ssh/ki_deploy_ed25519 (der PRIVATE Key, beginnt mit -----BEGIN...)
```

> **Sicherheitshinweis:** Den privaten Key niemals committen oder in Logs ausgeben. Er hat
> ausschließlich Zugriff auf den `ki-deploy`-Benutzer, der kein `sudo` hat.

---

## Automatisches Deployment

Nach dem Setup startet der CI-Workflow bei jedem Push auf `main`:

1. **Job `ci`**: lint → build (alle Workspaces) → Unit-Tests → E2E-Tests
2. **Job `deploy`** (nur bei Push auf `main`, nach erfolgreichem `ci`):
   - SSH-Verbindung zum VPS
   - `git pull origin main`
   - `docker compose up --build -d`
   - Health-Check: `curl -f http://localhost:3001/api/health`

---

## Manuelles Deployment

```bash
ssh ki-deploy@<VPS_HOST>
cd /opt/ki-bild-anomalien-spiel
git pull origin main
docker compose up --build -d
```

---

## Backups

Das Skript `deploy/backup.sh` sichert täglich um 03:00 Uhr:
- `data/app.db` (SQLite-Datenbank)
- `data/images/` (hochgeladene Bilder)

Backups liegen unter `/var/backups/ki-bild-anomalien-spiel/` als `.tar.gz` und werden
nach 14 Tagen automatisch gelöscht.

Manuelles Backup:
```bash
sudo -u ki-deploy /opt/ki-bild-anomalien-spiel/deploy/backup.sh
```

---

## Rollback

```bash
ssh ki-deploy@<VPS_HOST>
cd /opt/ki-bild-anomalien-spiel
git log --oneline -10          # Commit-SHA ermitteln
git checkout <SHA>
docker compose up --build -d
```

---

## Umgebungsvariablen (`.env`)

| Variable | Beschreibung | Pflicht |
|----------|-------------|---------|
| `PORT` | Backend-Port (Standard: 3001) | Nein |
| `ADMIN_PASSWORD` | Passwort für die Admin-Oberfläche | **Ja** |
| `SESSION_SECRET` | Zufälliges Secret für Cookie-Sessions | **Ja** |
| `PERSPECTIVE_API_KEY` | Google Perspective API Key (Namens-Prüfung, optional) | Nein |
| `PERSPECTIVE_THRESHOLD` | Schwellenwert 0–1 für Perspective (Standard: 0.7) | Nein |
| `PERSPECTIVE_LANGUAGES` | Sprachen für Perspective (Standard: `de,en`) | Nein |

---

## Caddy (HTTPS)

Caddy übernimmt automatisch die TLS-Zertifikat-Ausstellung via Let's Encrypt.
Konfiguration: `/etc/caddy/Caddyfile`

```
deine-domain.de {
    reverse_proxy localhost:3001
}
```

Nach Änderungen: `systemctl reload caddy`
