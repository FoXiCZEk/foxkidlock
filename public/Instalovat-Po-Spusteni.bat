@echo off
chcp 65001 >nul
title Instalace Rodicovskeho Zamku do Po Spusteni (Windows Autostart)
color 0a

echo ===================================================================
echo     INSTALACE: AUTOMATICKE SPUSTENI RODICOVSKEHO ZAMKU PO STARTU
echo ===================================================================
echo.
echo Tento skript umisti spousteci soubor do slozky "Po spusteni" (Startup)
echo ve Windows, aby se Rodicovsky zamek vzdy automaticky aktivoval
echo po prihlaseni ditete do pocitace.
echo.

set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "SOURCE_BAT=%~dp0Spustit-Kiosk-Zamek.bat"

if not exist "%SOURCE_BAT%" (
    echo [CHYBA] Soubor Spustit-Kiosk-Zamek.bat nebyl nalezen ve stejne slozce!
    echo Ujistete se, ze jsou oba soubory rozbaleny ve stejne slozce.
    echo.
    pause
    exit /b 1
)

echo Kopiruji do: "%STARTUP_FOLDER%\Spustit-Kiosk-Zamek.bat"
copy /Y "%SOURCE_BAT%" "%STARTUP_FOLDER%\Spustit-Kiosk-Zamek.bat" >nul

if %ERRORLEVEL% equ 0 (
    echo.
    echo [USPECH!] Rodicovsky zamek byl uspesne nainstalovan do slozky Po Spusteni.
    echo Pri kazdem zapnuti pocitace se nyni aplikace spusti na cele obrazovce.
    echo.
    echo (Tip: Pro odinstalaci staci smazat Spustit-Kiosk-Zamek.bat ze slozky Po spusteni)
) else (
    echo.
    echo [CHYBA] Nepodarilo se zkopirovat soubor. Zkontrolujte prava nebo spustte jako spravce.
)

echo.
echo Stisknete libovolnou klavesu pro ukonceni...
pause >nul
