#!/bin/bash
# Azure App Service startup script for MediaFlow
#
# This project uses Django Channels (WebSockets). Daphne is the correct ASGI
# server — it handles both HTTP and WS on the same port. Gunicorn WSGI would
# silently drop all WebSocket connections.
#
# Azure sets PORT via the WEBSITES_PORT env variable (default 8000).

PORT=${PORT:-8000}

echo "[MediaFlow] Running collectstatic..."
python manage.py collectstatic --noinput

echo "[MediaFlow] Running migrations..."
python manage.py migrate --noinput

echo "[MediaFlow] Starting Daphne on 0.0.0.0:$PORT"
exec daphne -b 0.0.0.0 -p $PORT mediaflow.asgi:application

# --- WSGI-only alternative (NO WebSocket support) ---
# Use this only if WebSockets are disabled and you need gunicorn WSGI workers:
# exec gunicorn mediaflow.wsgi:application --bind 0.0.0.0:$PORT --timeout 600 --workers 2
