@echo off
chcp 65001 >nul
title Instalace Windows Agenta - Rodicovsky Zamek PC
color 0a

echo ==============================================================================
echo       INSTALACE: WINDOWS SYSTÉMOVÝ AGENT (ZAMYKÁNÍ, HRY & WEBY)
echo ==============================================================================
echo  Tento instalační průvodce nastaví systémového agenta na tomto počítači:
echo.
echo   [+] 1. Automatické spouštění ihned po přihlášení (Windows Startup)
echo   [+] 2. Nepřetržitý tichý běh na pozadí bez blikání oken konzole
echo   [+] 3. Okamžité ukončení her (Minecraft, Roblox, Steam...) při zamknutí
echo   [+] 4. Blokování rozptylujících webů (YouTube, Netflix, TikTok, Twitch...)
echo   [+] 5. Vzdálená správa z mobilu/tabletu - okamžité odemčení i zamčení
echo   [+] 6. Watchdog: Udržení celoobrazovkového Kiosku s úkoly
echo ==============================================================================
echo.

set "INSTALL_DIR=%LOCALAPPDATA%\RodicovskyZamekPC\agent"
set "SOURCE_DIR=%~dp0"

echo [1/4] Vytvářím bezpečnou cílovou složku: "%INSTALL_DIR%"...
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"

echo [2/4] Kopíruji soubory agenta...
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

echo [3/4] Registruji automatické spuštění po přihlášení uživatele...

REM Pokus o registraci naplánované úlohy s nejvyššími právy (pro přístup k hosts souboru)
schtasks /create /tn "RodicovskyZamekAgent" /tr "wscript.exe \"%INSTALL_DIR%\Spustit-Agenta-Skryte.vbs\"" /sc onlogon /rl highest /f >nul 2>&1

REM Registr Run pro aktuálního uživatele (funguje vždy bez administrátorských práv)
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "RodicovskyZamekAgent" /t REG_SZ /d "wscript.exe \"%INSTALL_DIR%\Spustit-Agenta-Skryte.vbs\"" /f >nul 2>&1

REM Zkopírování spouštěče do složky Po spuštění (Startup)
set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
if exist "%STARTUP_DIR%" (
    copy /Y "%INSTALL_DIR%\Spustit-Agenta-Skryte.vbs" "%STARTUP_DIR%\RodicovskyZamekAgent.vbs" >nul 2>&1
)

echo [4/4] Spouštím agenta na pozadí právě teď...
wscript.exe "%INSTALL_DIR%\Spustit-Agenta-Skryte.vbs"

echo.
echo ==============================================================================
echo  [ÚSPĚCH] Agent byl úspěšně nainstalován a nyní běží nepřetržitě na pozadí!
echo ==============================================================================
echo  - Při každém zapnutí nebo přihlášení do Windows se agent spustí sám.
echo  - Blokuje nepovolené hry i webové portály (YouTube, Netflix atd.).
echo  - Na dálku z rodičovského panelu můžete kdykoli odemknout nebo zamknout.
echo.
echo  Stav připojení agenta můžete ihned vidět v rodičovském panelu.
echo ==============================================================================
echo.
echo Stiskněte libovolnou klávesu pro dokončení...
pause >nul
