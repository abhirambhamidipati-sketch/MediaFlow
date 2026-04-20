@echo off
REM MediaFlow — first-time environment setup (Windows)
REM Creates venv with Python 3.14, installs all dependencies, runs check.

cd /d "%~dp0"

echo [1/4] Creating virtual environment with Python 3.14...
C:\Python314\python.exe -m venv venv
if errorlevel 1 ( echo [ERROR] venv creation failed. && exit /b 1 )

echo [2/4] Activating venv...
call venv\Scripts\activate.bat

echo [3/4] Installing dependencies...
python -m pip install --upgrade pip --quiet
pip install -r requirements.txt --quiet
if errorlevel 1 ( echo [ERROR] pip install failed. && exit /b 1 )

echo [4/4] Verifying Django...
python manage.py check
if errorlevel 1 ( echo [ERROR] Django check failed. && exit /b 1 )

echo.
echo [OK] Setup complete. Run start.bat to launch the server.
