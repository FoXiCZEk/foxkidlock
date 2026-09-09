@echo off
chcp 65001 >nul
title Hlidac her - Rodicovsky zamek PC
color 0c

echo ===================================================================
echo             HLÍDAČ HER A APLIKACÍ (MINECRAFT, ROBLOX...)
echo ===================================================================
echo  Tento skript běží na pozadí a hlídá, zda má dítě odemčený herní čas.
echo  Pokud je stav ZAMČENO, skript automaticky uzavře Minecraft a hry.
echo  Jakmile dítě splní úkoly, hry se automaticky povolí.
echo ===================================================================
echo.

set "SERVER_URL=http://localhost:3000"

:loop
REM Dotaz na aktuální stav dětského PC na serveru
curl -s "%SERVER_URL%/api/child-state" > "%temp%\child_status.json" 2>nul

REM Kontrola, zda je zámek aktivní (locked_studying nebo time_expired)
findstr /C:"\"status\":\"locked_studying\"" "%temp%\child_status.json" >nul
set "IS_LOCKED=%errorlevel%"

findstr /C:"\"status\":\"time_expired\"" "%temp%\child_status.json" >nul
set "IS_EXPIRED=%errorlevel%"

if %IS_LOCKED% equ 0 (
    goto :kill_games
)
if %IS_EXPIRED% equ 0 (
    goto :kill_games
)

REM Pokud je stav "unlocked_playing", nic neukončujeme, hry jsou povoleny
goto :wait_next

:kill_games
REM Ukončení herních procesů, pokud je zámek aktivní
taskkill /f /im Minecraft.exe >nul 2>&1
taskkill /f /im MinecraftLauncher.exe >nul 2>&1
taskkill /f /im javaw.exe >nul 2>&1
taskkill /f /im RobloxPlayerBeta.exe >nul 2>&1
taskkill /f /im Steam.exe >nul 2>&1

:wait_next
REM Kontrola každé 3 sekundy
timeout /t 3 /nobreak >nul
goto :loop
