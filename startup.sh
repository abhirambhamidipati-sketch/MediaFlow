#!/bin/bash

PORT=${PORT:-8000}

echo "[MediaFlow FIX] Installing dependencies..."

python -m pip install --upgrade pip
pip install -r requirements.txt

echo "[MediaFlow FIX] Running collectstatic..."
python manage.py collectstatic --noinput

echo "[MediaFlow FIX] Running migrations..."
python manage.py migrate --noinput

echo "[MediaFlow FIX] Starting Daphne..."
exec python -m daphne -b 0.0.0.0 -p $PORT mediaflow.asgi:application