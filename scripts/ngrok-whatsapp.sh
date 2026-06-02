#!/usr/bin/env bash
# Expone la API local (puerto 3000) para el webhook de Twilio WhatsApp.
# Uso: ./scripts/ngrok-whatsapp.sh
# Luego copiá la URL https en Twilio Sandbox → "When a message comes in":
#   https://XXXX.ngrok-free.app/api/whatsapp/webhook

set -e
PORT="${PORT:-3000}"

if ! command -v ngrok >/dev/null 2>&1; then
  echo "ngrok no está instalado."
  echo "  brew install ngrok/ngrok/ngrok"
  echo "  o descargá desde https://ngrok.com/download"
  exit 1
fi

echo "→ Túnel hacia http://localhost:${PORT}"
echo "→ En Twilio pegá: https://TU-URL.ngrok-free.app/api/whatsapp/webhook"
echo ""
exec ngrok http "$PORT"
