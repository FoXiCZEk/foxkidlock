@echo off
chcp 65001 >nul
title Hlidac her - Rodicovsky zamek PC
color 0c

echo ===================================================================
echo             HLÍDAČ HER A APLIKACÍ (MINECRAFT, ROBLOX...)
echo ===================================================================
echo  Tento skript běží na pozadí a hlídá, zda má dítě odemčený herní čas.
echo  Pokud rodič přes GUI klikne na "Okamžitě zamknout PC", tento skript:
echo   1. Během 1-2 sekund ihned ukončí hry (Minecraft, Roblox, Steam...)
echo   2. Vrátí celoobrazovkový Kiosk s úkoly do popředí obrazovky.
echo ===================================================================
echo.

REM 1. Detekce serveru (lokalni nebo cloudovy)
set "CLOUD_URL=https://ais-pre-q3orgyhhxwbamgxmw2ejcq-853779803326.europe-west2.run.app"
set "LOCAL_URL=http://localhost:3000"
set "SERVER_URL=%CLOUD_URL%"

curl -s -m 1 http://localhost:3000/api/health >nul 2>&1
if %errorlevel% equ 0 (
    echo [INFO] Pripojeno k lokalnimu serveru: %LOCAL_URL%
    set "SERVER_URL=%LOCAL_URL%"
) else (
    echo [INFO] Lokalni server nebezi, pouzivam cloud: %CLOUD_URL%
)
echo [INFO] Hlidac je aktivni a monitoruje stav zamku kazde 2 sekundy...
echo.

:loop
REM Dotaz na aktualni stav z serveru
curl -s -m 2 "%SERVER_URL%/api/child-state" > "%temp%\child_status.json" 2>nul

REM Kontrola, zda je zamek aktivni (locked_studying nebo time_expired)
findstr /C:"\"status\":\"locked_studying\"" "%temp%\child_status.json" >nul 2>&1
set "IS_LOCKED=%errorlevel%"

findstr /C:"\"status\":\"time_expired\"" "%temp%\child_status.json" >nul 2>&1
set "IS_EXPIRED=%errorlevel%"

if %IS_LOCKED% equ 0 goto :kill_games
if %IS_EXPIRED% equ 0 goto :kill_games

REM Pokud je stav "unlocked_playing", hry jsou povoleny
goto :wait_next

:kill_games
REM 1. Ukonceni nepovolenych hernich procesu
taskkill /f /im Minecraft.exe >nul 2>&1
taskkill /f /im MinecraftLauncher.exe >nul 2>&1
taskkill /f /im javaw.exe >nul 2>&1
taskkill /f /im java.exe >nul 2>&1
taskkill /f /im RobloxPlayerBeta.exe >nul 2>&1
taskkill /f /im RobloxPlayerLauncher.exe >nul 2>&1
taskkill /f /im Steam.exe >nul 2>&1
taskkill /f /im EpicGamesLauncher.exe >nul 2>&1

REM 2. Aktivace a vytazeni Kiosku prohlizece do popredi
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $p = Get-Process -Name chrome, msedge -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1; if ($p) { $ws.AppActivate($p.Id) }" >nul 2>&1

:wait_next
REM Interval kontroly 2 sekundy
timeout /t 2 /nobreak >nul
goto :loop
