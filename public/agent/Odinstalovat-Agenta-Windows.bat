@echo off
setlocal EnableDelayedExpansion
title Odinstalace Windows Agenta - Rodicovsky Zamek PC
color 0c

echo ==============================================================================
echo       ODINSTALACE: WINDOWS SYSTEMOVY AGENT (RODICOVSKY ZAMEK)
echo ==============================================================================
echo.

set "INSTALL_DIR=%LOCALAPPDATA%\RodicovskyZamekPC\agent"
set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"

echo [1/4] Ukoncuji bezici instance agenta...
taskkill /f /im powershell.exe /fi "WINDOWTITLE eq RodicovskyZamekAgent*" >nul 2>&1
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*Agent-Zamek-PC.ps1*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }" >nul 2>&1

echo [2/4] Rusim naplanovanou ulohu...
schtasks /delete /tn "RodicovskyZamekAgent" /f >nul 2>&1

echo [3/4] Odebiram automaticke spousteni z Windows...
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "RodicovskyZamekAgent" /f >nul 2>&1
if exist "%STARTUP_DIR%\RodicovskyZamekAgent.vbs" (
    del /f /q "%STARTUP_DIR%\RodicovskyZamekAgent.vbs" >nul 2>&1
)

echo [4/4] Mazu soubory agenta...
if exist "%INSTALL_DIR%" (
    rmdir /s /q "%INSTALL_DIR%" >nul 2>&1
)

echo.
echo ==============================================================================
echo  [HOTOVO] Windows Agent byl z tohoto pocitace kompletne odstranen.
echo ==============================================================================
echo.
echo Stisknete libovolnou klavesu pro dokonceni...
pause >nul
