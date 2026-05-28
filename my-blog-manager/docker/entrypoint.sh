#!/bin/sh
set -e
mkdir -p /app/public
PORT="${CMS_API_PORT:-8000}"
printf '{"api_port": %s}\n' "$PORT" > /app/public/backend_config.json
exec node server.js
