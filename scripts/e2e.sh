#!/usr/bin/env bash
# E2E-Tests ausführen.
# Das E2E-Backend läuft auf Port 3099, das E2E-Frontend auf Port 5174,
# sodass ein laufender Dev-Server (3001/5173) nicht stört.
set -euo pipefail

# Projektverzeichnis
cd "$(dirname "$0")/.."

# Falls nvm verfügbar: aktive Version übernehmen (oder .nvmrc wenn vorhanden)
if [ -s "$HOME/.nvm/nvm.sh" ]; then
  # shellcheck source=/dev/null
  source "$HOME/.nvm/nvm.sh"
  if [ -f ".nvmrc" ]; then
    nvm use --silent
  fi
fi

echo "Node: $(node --version)  npm: $(npm --version)"
echo ""

npm run test:e2e "$@"
