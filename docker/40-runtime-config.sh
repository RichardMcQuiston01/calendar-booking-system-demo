#!/bin/sh
# Runs from nginx's /docker-entrypoint.d at container start. Turns environment
# variables into /config.js, which the app reads as window.__DEMO_CONFIG__.
set -eu

CONFIG_FILE=/usr/share/nginx/html/config.js

# Escape backslashes and double quotes so the value is a safe JS string literal.
escape_js() {
  printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g'
}

webhook_url="$(escape_js "${ERROR_LOG_WEBHOOK_URL:-}")"

printf 'window.__DEMO_CONFIG__ = { errorLogWebhookUrl: "%s" };\n' "$webhook_url" > "$CONFIG_FILE"
if [ -n "${ERROR_LOG_WEBHOOK_URL:-}" ]; then webhook_state=enabled; else webhook_state=disabled; fi
echo "40-runtime-config.sh: wrote $CONFIG_FILE (error log webhook: $webhook_state)"
