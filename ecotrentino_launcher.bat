@echo off
setlocal EnableDelayedExpansion

set "CRM_DIR=C:\Users\Alessio Osele\ecotrentino-crm"
set "CRM_URL=http://localhost:8000"

cd /d "%CRM_DIR%"

:: ── Se il server è già in ascolto, apri solo il browser ──────────────────────
netstat -an 2>nul | findstr /L ":8000 " | findstr "LISTENING" >nul 2>&1
if not errorlevel 1 (
    start "" "%CRM_URL%"
    exit /b 0
)

:: ── Setup venv al primo avvio ─────────────────────────────────────────────────
if not exist "venv\Scripts\python.exe" (
    echo Primo avvio: creazione ambiente virtuale...
    python -m venv venv
    call venv\Scripts\activate.bat
    pip install -q -r requirements.txt
)

:: ── Avvia il server in una finestra minimizzata ───────────────────────────────
start "Ecotrentino CRM" /min cmd /c "cd /d "%CRM_DIR%" && call venv\Scripts\activate.bat && python main.py"

:: ── Aspetta che la porta 8000 sia in ascolto (max 30 s) ──────────────────────
set /a tries=0
:wait_loop
    set /a tries+=1
    if !tries! gtr 30 goto timeout
    ping -n 2 127.0.0.1 >nul 2>&1
    netstat -an 2>nul | findstr /L ":8000 " | findstr "LISTENING" >nul 2>&1
    if errorlevel 1 goto wait_loop

:: ── Apri il browser ───────────────────────────────────────────────────────────
start "" "%CRM_URL%"
exit /b 0

:timeout
    :: Server lento — prova comunque
    start "" "%CRM_URL%"
    exit /b 1
