@echo off
title Ecotrentino CRM
cd /d "%~dp0"
echo.
echo  ╔══════════════════════════════════╗
echo  ║    ECOTRENTINO CRM - Avvio       ║
echo  ╚══════════════════════════════════╝
echo.

where python >nul 2>&1
if errorlevel 1 (
    echo [ERRORE] Python non trovato. Installalo da https://www.python.org/
    pause
    exit /b 1
)

if not exist "venv\Scripts\activate.bat" (
    echo [1/2] Creazione ambiente virtuale...
    python -m venv venv
    echo [2/2] Installazione dipendenze...
    call venv\Scripts\activate.bat
    pip install -q -r requirements.txt
) else (
    call venv\Scripts\activate.bat
)

echo.
echo  Server avviato su: http://localhost:8000
echo  API docs:          http://localhost:8000/api/docs
echo  Premi Ctrl+C per fermare.
echo.
python main.py
pause
