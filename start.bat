@echo off
setlocal enabledelayedexpansion
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

rem === BACKUP AUTOMATICO ===
if exist crm.db (
    if not exist backups mkdir backups
    for /f %%I in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd"') do set BACKUP_DATE=%%I
    copy /y crm.db "backups\crm_backup_!BACKUP_DATE!.db" >nul
    echo  [Backup] Creato: crm_backup_!BACKUP_DATE!.db
    set _CNT=0
    for /f "delims=" %%F in ('dir /b /o-d "backups\crm_backup_*.db" 2^>nul') do (
        set /a _CNT+=1
        if !_CNT! gtr 7 del "backups\%%F" >nul 2>&1
    )
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
