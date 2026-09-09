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

REM 1. Urceni cilove adresy URL
set "CLOUD_URL=https://ais-pre-q3orgyhhxwbamgxmw2ejcq-853779803326.europe-west2.run.app/?mode=child"
set "LOCAL_URL=http://localhost:3000/?mode=child"
set "TARGET_URL=%CLOUD_URL%"

echo [1/3] Kontroluji dostupnost serveru...
curl -s -m 1 http://localhost:3000/api/health >nul 2>&1
if %errorlevel% equ 0 (
    echo       -> Nalezen bezici lokalni server na http://localhost:3000
    set "TARGET_URL=%LOCAL_URL%"
) else (
    echo       -> Lokalni server na portu 3000 nebezi.
    echo       -> Pouzivam verejny cloudovy server:
    echo          %CLOUD_URL%
)
echo.

REM 2. Hledani prohlizece Google Chrome nebo Microsoft Edge
echo [2/3] Hledam webovy prohlizec (Google Chrome nebo Microsoft Edge)...
set "BROWSER_EXE="
set "BROWSER_NAME="
set "BROWSER_TYPE="

REM A. Google Chrome (64-bit, 32-bit nebo uzivatelsky profil)
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    set "BROWSER_EXE=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
    set "BROWSER_NAME=Google Chrome (64-bit)"
    set "BROWSER_TYPE=chrome"
    goto :browser_found
)
if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
    set "BROWSER_EXE=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
    set "BROWSER_NAME=Google Chrome (32-bit)"
    set "BROWSER_TYPE=chrome"
    goto :browser_found
)
if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" (
    set "BROWSER_EXE=%LocalAppData%\Google\Chrome\Application\chrome.exe"
    set "BROWSER_NAME=Google Chrome (Uzivatelsky profil AppData)"
    set "BROWSER_TYPE=chrome"
    goto :browser_found
)

REM B. Microsoft Edge (nativni soucast kazdych Windows 10 a 11)
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    set "BROWSER_EXE=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
    set "BROWSER_NAME=Microsoft Edge"
    set "BROWSER_TYPE=edge"
    goto :browser_found
)
if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
    set "BROWSER_EXE=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
    set "BROWSER_NAME=Microsoft Edge (64-bit)"
    set "BROWSER_TYPE=edge"
    goto :browser_found
)
if exist "%LocalAppData%\Microsoft\Edge\Application\msedge.exe" (
    set "BROWSER_EXE=%LocalAppData%\Microsoft\Edge\Application\msedge.exe"
    set "BROWSER_NAME=Microsoft Edge (Uzivatelsky)"
    set "BROWSER_TYPE=edge"
    goto :browser_found
)

:browser_found
if "%BROWSER_EXE%"=="" (
    echo [VAROVANI] Nebyl nalezen Chrome ani Edge ve standardnich cestach.
    echo Oteviram ve vychozim systemovem prohlizeci...
    start "" "%TARGET_URL%"
    goto :finished
)

echo       -> Nalezen: %BROWSER_NAME%
echo       -> Cesta: "%BROWSER_EXE%"
echo.

REM 3. Spusteni prohlizece v Kiosk rezimu
echo [3/3] Spoustim Kiosk rezim na popredi...
set "KIOSK_PROFILE=%TEMP%\kiosk_browser_profile"

if "%BROWSER_TYPE%"=="chrome" (
    start "" "%BROWSER_EXE%" --kiosk "%TARGET_URL%" --user-data-dir="%KIOSK_PROFILE%" --no-first-run --no-default-browser-check --disable-translate --disable-features=Translate --disable-pinch --overscroll-history-navigation=0 --disable-background-mode --disable-component-update --disable-sync
) else (
    start "" "%BROWSER_EXE%" --kiosk "%TARGET_URL%" --edge-kiosk-type=fullscreen --user-data-dir="%KIOSK_PROFILE%" --no-first-run --no-default-browser-check
)

:finished
echo.
echo ===================================================================
echo [HOTOVO] Rodicovsky zamek byl uspesne spusten.
echo.
echo Cilova adresa: %TARGET_URL%
echo.
echo Pokud se okno prohlizece otevrelo, muzete toto okno zavrit.
echo Stisknete libovolnou klavesu pro ukonceni...
echo ===================================================================
pause >nul
exit /b 0
