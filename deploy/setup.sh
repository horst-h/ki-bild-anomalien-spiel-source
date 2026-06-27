#!/usr/bin/env bash
# deploy/setup.sh
# Ersteinrichtung eines Ubuntu 22.04/24.04 VPS für das KI-Bild-Anomalien-Spiel.
# Als root oder sudo-Benutzer ausführen.
set -euo pipefail

REPO_URL="https://github.com/horst-h/ki-bild-anomalien-spiel-source.git"
APP_DIR="/opt/ki-bild-anomalien-spiel"
DEPLOY_USER="ki-deploy"
DOMAIN="${DOMAIN:-}"   # Optionale Überschreibung via Umgebungsvariable

echo "=== 1. System-Update ==="
apt-get update -qq && apt-get upgrade -y -qq

echo "=== 2. Docker installieren ==="
if ! command -v docker &>/dev/null; then
  apt-get install -y -qq ca-certificates curl gnupg
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
    | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
    https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin
  systemctl enable --now docker
  echo "Docker installiert: $(docker --version)"
else
  echo "Docker bereits vorhanden: $(docker --version)"
fi

echo "=== 3. Deploy-User anlegen ==="
if ! id "$DEPLOY_USER" &>/dev/null; then
  useradd -m -s /bin/bash "$DEPLOY_USER"
  usermod -aG docker "$DEPLOY_USER"
  mkdir -p "/home/$DEPLOY_USER/.ssh"
  chmod 700 "/home/$DEPLOY_USER/.ssh"
  touch "/home/$DEPLOY_USER/.ssh/authorized_keys"
  chmod 600 "/home/$DEPLOY_USER/.ssh/authorized_keys"
  chown -R "$DEPLOY_USER:$DEPLOY_USER" "/home/$DEPLOY_USER/.ssh"
  echo "Benutzer '$DEPLOY_USER' angelegt. SSH-Public-Key in"
  echo "  /home/$DEPLOY_USER/.ssh/authorized_keys eintragen!"
else
  echo "Benutzer '$DEPLOY_USER' bereits vorhanden."
fi

echo "=== 4. Repository klonen ==="
if [ ! -d "$APP_DIR/.git" ]; then
  git clone "$REPO_URL" "$APP_DIR"
  chown -R "$DEPLOY_USER:$DEPLOY_USER" "$APP_DIR"
else
  echo "Repository bereits vorhanden unter $APP_DIR."
fi

echo "=== 5. .env anlegen (falls nicht vorhanden) ==="
if [ ! -f "$APP_DIR/.env" ]; then
  cp "$APP_DIR/.env.example" "$APP_DIR/.env"
  # Zufällige Secrets generieren
  sed -i "s/ADMIN_PASSWORD=changeme/ADMIN_PASSWORD=$(openssl rand -base64 16)/" "$APP_DIR/.env"
  sed -i "s/SESSION_SECRET=dev-secret-change-me/SESSION_SECRET=$(openssl rand -base64 32)/" "$APP_DIR/.env"
  chown "$DEPLOY_USER:$DEPLOY_USER" "$APP_DIR/.env"
  chmod 640 "$APP_DIR/.env"
  echo "WICHTIG: $APP_DIR/.env anlegen und ADMIN_PASSWORD + SESSION_SECRET setzen!"
fi

echo "=== 6. Caddy installieren ==="
if ! command -v caddy &>/dev/null; then
  apt-get install -y -qq debian-keyring debian-archive-keyring apt-transport-https
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
    | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
    > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -qq
  apt-get install -y -qq caddy
  echo "Caddy installiert: $(caddy version)"
else
  echo "Caddy bereits vorhanden: $(caddy version)"
fi

echo "=== 7. Caddy konfigurieren ==="
if [ -n "$DOMAIN" ]; then
  cat > /etc/caddy/Caddyfile <<EOF
${DOMAIN} {
    reverse_proxy localhost:3001
}
EOF
else
  cp "$APP_DIR/Caddyfile" /etc/caddy/Caddyfile
fi
systemctl reload caddy || systemctl restart caddy

echo "=== 8. Backup-Cronjob einrichten ==="
CRON_LINE="0 3 * * * $DEPLOY_USER $APP_DIR/deploy/backup.sh >> /var/log/ki-backup.log 2>&1"
if ! grep -qF "backup.sh" /etc/cron.d/ki-backup 2>/dev/null; then
  echo "$CRON_LINE" > /etc/cron.d/ki-backup
  chmod 644 /etc/cron.d/ki-backup
  echo "Backup-Cronjob eingerichtet (täglich 03:00 Uhr)."
fi
chmod +x "$APP_DIR/deploy/backup.sh"

echo ""
echo "=== Setup abgeschlossen ==="
echo "Nächste Schritte:"
echo "  1. SSH-Public-Key für '$DEPLOY_USER' in /home/$DEPLOY_USER/.ssh/authorized_keys eintragen"
echo "  2. .env unter $APP_DIR/.env prüfen und ADMIN_PASSWORD / SESSION_SECRET setzen"
if [ -z "$DOMAIN" ]; then
  echo "  3. Domain in /etc/caddy/Caddyfile setzen und 'systemctl reload caddy' ausführen"
fi
echo "  4. Erstmalig deployen: cd $APP_DIR && docker compose up --build -d"
