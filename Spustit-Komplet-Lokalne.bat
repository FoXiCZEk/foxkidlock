@echo off
chcp 65001 >nul
title Rodicovsky Zamek PC - Spusteni cele aplikace lokalne
color 0e

echo ===================================================================
echo          RODICOVSKY ZAMEK PC - KOMPLETNI LOKALNI SPUSTENI
echo ===================================================================
echo   Tento skript spusti lokalni server i celoobrazovkovy Kiosk.
echo ===================================================================
echo.

cd /d "%~dp0"

REM 1. Kontrola Node.js
echo [1/3] Kontroluji Node.js na tomto pocitaci...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [UPOZORNENI] Node.js nebyl v systemu nalezen.
    echo.
    echo Pro beh lokalniho serveru primo na PC je potreba mit nainstalovany Node.js
    echo (ke stazeni zdarma na https://nodejs.org/ - verze LTS) nebo Docker.
    echo.
    echo Prejete si misto toho otevrit Kiosk s pripojenim na cloudovy server?
    echo.
    echo Stisknete [K] pro Cloudovy Kiosk, nebo libovolnou jinou klavesu pro konec...
    choice /c KC /n /m "Vase volba: "
    if errorlevel 2 goto :end
    if errorlevel 1 goto :start_kiosk_cloud
)

echo       -> Node.js je pripraven.
echo.

REM 2. Kontrola sestaveni produkcniho serveru
echo [2/3] Overuji pripravenost serveru...
if not exist "dist\server.cjs" (
    echo       -> Provadim prvotni instalaci a sestaveni (chvilku strpeni)...
    call npm install
    call npm run build
)

echo       -> Spoustim server na portu 3000...
start "Rodicovsky Zamek - Server" /min node dist\server.cjs
echo       -> Server bezi na pozadi.
timeout /t 2 >nul
echo.

REM 3. Spusteni Kiosku
:start_kiosk_cloud
echo [3/3] Spoustim Kiosk rezim...
call "%~dp0public\Spustit-Kiosk-Zamek.bat"

:end
