@echo off
setlocal EnableDelayedExpansion
title Instalace Windows Agenta - Rodicovsky Zamek PC
color 0a

echo ==============================================================================
echo       INSTALACE: WINDOWS SYSTEMOVY AGENT (ZAMYKANI, HRY A WEBY)
echo ==============================================================================
echo  Tento instalacni pruvodce nastavi systemoveho agenta na tomto pocitaci:
echo.
echo   [+] 1. Automaticke spousteni ihned po prihlaseni (Windows Startup)
echo   [+] 2. Nepretrzity tichy beh na pozadi bez blikani oken konzole
echo   [+] 3. Okamzite ukonceni her (Minecraft, Roblox, Steam...) pri zamknuti
echo   [+] 4. Blokovani rozptylujicich webu (YouTube, Netflix, TikTok, Twitch...)
echo   [+] 5. Vzdalena sprava z mobilu/tabletu - okamzite odemceni i zamceni
echo   [+] 6. Watchdog: Udrzeni celoobrazovkoveho Kiosku s ukoly
echo ==============================================================================
echo.

set "INSTALL_DIR=%LOCALAPPDATA%\RodicovskyZamekPC\agent"
set "SOURCE_DIR=%~dp0"

echo [1/4] Vytvarim bezpecnou cilovou slozku: "%INSTALL_DIR%"...
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"

echo [2/4] Kopiruji soubory agenta...
copy /Y "%SOURCE_DIR%Agent-Zamek-PC.ps1" "%INSTALL_DIR%\Agent-Zamek-PC.ps1" >nul
copy /Y "%SOURCE_DIR%Spustit-Agenta-Skryte.vbs" "%INSTALL_DIR%\Spustit-Agenta-Skryte.vbs" >nul
if exist "%SOURCE_DIR%Odinstalovat-Agenta-Windows.bat" (
    copy /Y "%SOURCE_DIR%Odinstalovat-Agenta-Windows.bat" "%INSTALL_DIR%\Odinstalovat-Agenta-Windows.bat" >nul
)
if exist "%SOURCE_DIR%README-AGENT.txt" (
    copy /Y "%SOURCE_DIR%README-AGENT.txt" "%INSTALL_DIR%\README-AGENT.txt" >nul
)
if exist "%SOURCE_DIR%NAVOD-K-POUZITI.txt" (
    copy /Y "%SOURCE_DIR%NAVOD-K-POUZITI.txt" "%INSTALL_DIR%\NAVOD-K-POUZITI.txt" >nul
)
if exist "%SOURCE_DIR%server_url.txt" (
    copy /Y "%SOURCE_DIR%server_url.txt" "%INSTALL_DIR%\server_url.txt" >nul
)

echo [3/4] Registruji automaticke spousteni po prihlaseni uzivatele...

REM Pokus o registraci naplanovane ulohy s nejvyssimi pravy (pro hosts soubor)
schtasks /create /tn "RodicovskyZamekAgent" /tr "wscript.exe \"%INSTALL_DIR%\Spustit-Agenta-Skryte.vbs\"" /sc onlogon /rl highest /f >nul 2>&1

REM Registr Run pro aktualniho uzivatele (funguje vzdy bez administratorskych prav)
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "RodicovskyZamekAgent" /t REG_SZ /d "wscript.exe \"%INSTALL_DIR%\Spustit-Agenta-Skryte.vbs\"" /f >nul 2>&1

REM Zkopirovani spoustece do slozky Po spusteni (Startup)
set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
if exist "%STARTUP_DIR%" (
    copy /Y "%INSTALL_DIR%\Spustit-Agenta-Skryte.vbs" "%STARTUP_DIR%\RodicovskyZamekAgent.vbs" >nul 2>&1
)

echo [4/4] Spoustim agenta na pozadi...
start "" wscript.exe "%INSTALL_DIR%\Spustit-Agenta-Skryte.vbs"

echo.
echo ==============================================================================
echo  [USPECH] Agent byl uspesne nainstalovan a nyni bezi nepretrzite na pozadi!
echo ==============================================================================
echo  - Pri kazdem zapnuti nebo prihlaseni do Windows se agent spusti sam.
echo  - Blokuje nepovolene hry i webove portaly (YouTube, Netflix atd.).
echo  - Na dalku z rodicovskeho panelu muzete kdykoli odemknout nebo zamknout.
echo.
echo  Stav pripojeni agenta uvidite za malou chvili v rodicovskem panelu.
echo ==============================================================================
echo.
echo Stisknete libovolnou klavesu pro dokonceni...
pause >nul
