@echo off
chcp 65001 >nul
title Rodicovsky zamek PC - Kiosk rezim na popredi
color 0b

echo ===================================================================
echo             RODICOVSKY ZAMEK PC - KIOSK REZIM
echo ===================================================================
echo   Spoustim aplikaci v celoobrazovkovem Kiosk rezimu na popredi.
echo   Ukoly v zamku musi byt splneny pro odemknuti her a aplikaci.
echo ===================================================================
echo.

REM Nastaveni cilove adresy (v pripade potreby zmente na svoji URL)
set "TARGET_URL=https://ais-dev-q3orgyhhxwbamgxmw2ejcq-853779803326.europe-west2.run.app/?mode=child"

REM 1. Zkusit Google Chrome
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    echo [INFO] Nalezen Google Chrome (64-bit). Spoustim v Kiosk rezimu...
    start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" --kiosk "%TARGET_URL%" --disable-pinch --overscroll-history-navigation=0 --no-first-run --disable-features=Translate
    goto :success
)

if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
    echo [INFO] Nalezen Google Chrome (32-bit). Spoustim v Kiosk rezimu...
    start "" "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" --kiosk "%TARGET_URL%" --disable-pinch --overscroll-history-navigation=0 --no-first-run --disable-features=Translate
    goto :success
)

if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" (
    echo [INFO] Nalezen uzivatelsky Google Chrome. Spoustim v Kiosk rezimu...
    start "" "%LocalAppData%\Google\Chrome\Application\chrome.exe" --kiosk "%TARGET_URL%" --disable-pinch --overscroll-history-navigation=0 --no-first-run
    goto :success
)

REM 2. Zkusit Microsoft Edge (predinstalovany ve vsech Windows 10 a Windows 11)
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    echo [INFO] Nalezen Microsoft Edge. Spoustim v Kiosk rezimu...
    start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --kiosk "%TARGET_URL%" --edge-kiosk-type=fullscreen --no-first-run
    goto :success
)

if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
    echo [INFO] Nalezen Microsoft Edge (64-bit). Spoustim v Kiosk rezimu...
    start "" "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" --kiosk "%TARGET_URL%" --edge-kiosk-type=fullscreen --no-first-run
    goto :success
)

REM 3. Fallback na vychozi systemovy prohlizec
echo [VAROVANI] Chrome ani Edge nebyly nalezeny v obvyklych cestach.
echo Oteviram ve vychozim prohlizeci...
start "" "%TARGET_URL%"

:success
echo.
echo [HOTOVO] Rodicovsky zamek byl uspesne spusten.
timeout /t 3 >nul
exit
