#!/usr/bin/env bash
# Start MapboxFlight.
#   ./start.sh          – dev server (Vite, http://localhost:47613)
#   ./start.sh --prod   – production build + preview server
#   PORT=xxxx ./start.sh – use another port
set -euo pipefail

cd "$(dirname "$0")"

# 1. Node.js
if ! command -v node >/dev/null 2>&1; then
  echo "Error: Node.js is not installed. Install it from https://nodejs.org/" >&2
  exit 1
fi

# 2. .env
if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Created .env from .env.example."
  echo "Fill in VITE_MAPBOX_TOKEN in .env (https://account.mapbox.com/access-tokens/) and run again." >&2
  exit 1
fi

mapbox_token=$(grep -E '^VITE_MAPBOX_TOKEN=' .env | cut -d= -f2- || true)
if [[ -z "$mapbox_token" || "$mapbox_token" == "YOUR_MAPBOX_TOKEN_HERE" ]]; then
  echo "Error: VITE_MAPBOX_TOKEN is not set in .env." >&2
  exit 1
fi

for key in VITE_OPENROUTER_KEY VITE_ELEVENLABS_KEY; do
  value=$(grep -E "^${key}=" .env | cut -d= -f2- || true)
  if [[ -z "$value" || "$value" == YOUR_* ]]; then
    echo "Warning: $key is not set – related features (narration/TTS) will be unavailable."
  fi
done

# 3. Dependencies (install if missing or package-lock.json changed since last install)
if [[ ! -d node_modules || package-lock.json -nt node_modules/.package-lock.json ]]; then
  echo "Installing dependencies..."
  npm install
fi

# 4. Port check
port="${PORT:-47613}"
if lsof -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Error: port $port is already in use. Pick another with PORT=xxxx ./start.sh" >&2
  exit 1
fi
export PORT="$port"
echo "Starting on http://localhost:$port"

# 5. Run
if [[ "${1:-}" == "--prod" ]]; then
  npm run build
  npm run preview
else
  npm run dev
fi
