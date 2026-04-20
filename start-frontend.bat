@echo off
REM MediaFlow — frontend dev server startup
REM Clears port 5174 (IPv4 + IPv6), then starts Vite

cd /d "%~dp0\frontend"

if not exist "node_modules" (
    echo [ERROR] node_modules not found. Run: cd frontend ^&^& npm install
    exit /b 1
)

REM Kill anything holding port 5174 — uses Get-NetTCPConnection which catches IPv6 sockets
REM (netstat -ano misses IPv6 listeners, causing false "port free" reports)
echo [MediaFlow] Checking port 5174...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 5174 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Write-Host \"[MediaFlow] Killing PID $_ on port 5174...\"; Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }; Start-Sleep -Milliseconds 600"

echo [MediaFlow] Starting Vite on http://localhost:5174 ...
echo.

npm run dev
