@echo off
chcp 65001 >nul
title Odinstalace Windows Agenta - Rodicovsky Zamek PC
color 0c

echo ==============================================================================
echo       ODINSTALACE: WINDOWS SYSTÉMOVÝ AGENT (RODIČOVSKÝ ZÁMEK)
echo ==============================================================================
echo.

set "INSTALL_DIR=%LOCALAPPDATA%\RodicovskyZamekPC\agent"
set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"

echo [1/3] Ukončuji běžící instance agenta...
taskkill /f /im powershell.exe /fi "WINDOWTITLE eq RodicovskyZamekAgent*" >nul 2>&1
REM Ukončení běžícího PowerShell skriptu podle cesty
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*Agent-Zamek-PC.ps1*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }" >nul 2>&1

echo [2/3] Odebírám automatické spouštění z Windows...
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "RodicovskyZamekAgent" /f >nul 2>&1
if exist "%STARTUP_DIR%\RodicovskyZamekAgent.vbs" (
    del /f /q "%STARTUP_DIR%\RodicovskyZamekAgent.vbs" >nul 2>&1
)

echo [3/3] Mažu soubory agenta...
if exist "%INSTALL_DIR%" (
    rmdir /s /q "%INSTALL_DIR%" >nul 2>&1
)

echo.
echo ==============================================================================
echo  [HOTOVO] Windows Agent byl z tohoto počítače kompletně odstraněn.
echo ==============================================================================
echo.
echo Stiskněte libovolnou klávesu pro dokončení...
pause >nul
