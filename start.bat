@echo off
REM MediaFlow — Windows development startup script
REM Activates the venv, frees port 8000, starts Daphne via manage.py runserver

cd /d "%~dp0"

if not exist "venv\Scripts\activate.bat" (
    echo [ERROR] Virtual environment not found. Run setup.bat first.
    exit /b 1
)

REM Kill anything on port 8000 — uses Get-NetTCPConnection which catches IPv6 sockets
REM (netstat -ano misses IPv6 listeners, causing false "port free" reports)
echo [MediaFlow] Checking port 8000...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Write-Host \"[MediaFlow] Killing PID $_ on port 8000...\"; Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }; Start-Sleep -Milliseconds 600"

call venv\Scripts\activate.bat

echo [MediaFlow] Python: && python --version
echo [MediaFlow] Django:  && python -c "import django; print(django.__version__)"
echo [MediaFlow] Starting ASGI server on http://127.0.0.1:8000 ...
echo.

python manage.py runserver
