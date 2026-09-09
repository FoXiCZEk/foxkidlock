import React, { useState } from 'react';
import {
  FileCode2,
  Download,
  Copy,
  Check,
  X,
  Laptop,
  Terminal,
  ExternalLink,
  ShieldAlert,
  Sparkles,
  HelpCircle
} from 'lucide-react';

interface KioskScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KioskScriptModal: React.FC<KioskScriptModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [copiedShortcut, setCopiedShortcut] = useState(false);

  if (!isOpen) return null;

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const childUrl = `${currentOrigin}/?mode=child`;

  const scriptCode = `@echo off
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

set "TARGET_URL=${childUrl}"

REM 1. Zkusit Google Chrome
if exist "%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe" (
    echo [INFO] Nalezen Google Chrome (64-bit). Spoustim v Kiosk rezimu...
    start "" "%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe" --kiosk "%TARGET_URL%" --disable-pinch --overscroll-history-navigation=0 --no-first-run --disable-features=Translate
    goto :success
)

if exist "%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe" (
    echo [INFO] Nalezen Google Chrome (32-bit). Spoustim v Kiosk rezimu...
    start "" "%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe" --kiosk "%TARGET_URL%" --disable-pinch --overscroll-history-navigation=0 --no-first-run --disable-features=Translate
    goto :success
)

if exist "%LocalAppData%\\Google\\Chrome\\Application\\chrome.exe" (
    echo [INFO] Nalezen uzivatelsky Google Chrome. Spoustim v Kiosk rezimu...
    start "" "%LocalAppData%\\Google\\Chrome\\Application\\chrome.exe" --kiosk "%TARGET_URL%" --disable-pinch --overscroll-history-navigation=0 --no-first-run
    goto :success
)

REM 2. Zkusit Microsoft Edge (predinstalovany ve vsech Windows 10 i 11)
if exist "%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe" (
    echo [INFO] Nalezen Microsoft Edge. Spoustim v Kiosk rezimu...
    start "" "%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe" --kiosk "%TARGET_URL%" --edge-kiosk-type=fullscreen --no-first-run
    goto :success
)

if exist "%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe" (
    echo [INFO] Nalezen Microsoft Edge (64-bit). Spoustim v Kiosk rezimu...
    start "" "%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe" --kiosk "%TARGET_URL%" --edge-kiosk-type=fullscreen --no-first-run
    goto :success
)

REM 3. Fallback na vychozi prohlizec
echo [VAROVANI] Chrome ani Edge nebyly nalezeny v obvyklych cestach.
echo Oteviram ve vychozim prohlizeci...
start "" "%TARGET_URL%"

:success
echo.
echo [HOTOVO] Rodicovsky zamek byl uspesne spusten.
timeout /t 3 >nul
exit`;

  const handleCopy = () => {
    navigator.clipboard.writeText(scriptCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadBat = () => {
    // We can directly trigger download from API endpoint or blob
    const blob = new Blob([scriptCode], { type: 'application/x-bat;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Spustit-Kiosk-Zamek.bat';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleDownloadAutostart = () => {
    const autostartCode = `@echo off
chcp 65001 >nul
title Instalace Rodicovskeho Zamku do Po Spusteni
color 0a

echo ===================================================================
echo     INSTALACE: AUTOMATICKE SPUSTENI RODICOVSKEHO ZAMKU PO STARTU
echo ===================================================================
echo.
set "STARTUP_FOLDER=%APPDATA%\\Microsoft\\Windows\\Start Menu\\Programs\\Startup"
set "SOURCE_BAT=%~dp0Spustit-Kiosk-Zamek.bat"

if not exist "%SOURCE_BAT%" (
    echo [CHYBA] Soubor Spustit-Kiosk-Zamek.bat nebyl nalezen ve stejne slozce!
    echo Prosim stahnete oba soubory do stejne slozky (napr. Stazene soubory).
    echo.
    pause
    exit /b 1
)

copy /Y "%SOURCE_BAT%" "%STARTUP_FOLDER%\\Spustit-Kiosk-Zamek.bat" >nul

if %ERRORLEVEL% equ 0 (
    echo [USPECH!] Rodicovsky zamek byl pridan do automatickeho spusteni.
    echo Pri kazdem zapnuti pocitace se aplikace spusti v rezimu Kiosk.
) else (
    echo [CHYBA] Nepodarilo se zkopirovat soubor.
)

echo.
pause`;

    const blob = new Blob([autostartCode], { type: 'application/x-bat;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Instalovat-Po-Spusteni.bat';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-3xl w-full shadow-2xl overflow-hidden flex flex-col my-auto max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Terminal className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Spouštěcí Windows .BAT skript
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold">
                  Připraveno ke stažení
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Tento soubor spustí dětské PC v režimu celé obrazovky (Kiosk) bez adresního řádku a možností zavření.
              </p>
            </div>
          </div>
          <button
            id="btn-close-script-modal"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm">
          {/* Main Action Buttons: Direct Downloads */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              id="btn-modal-download-bat"
              onClick={handleDownloadBat}
              className="p-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold flex items-center justify-between shadow-lg shadow-amber-950/40 transition-transform active:scale-[0.98] group"
            >
              <div className="flex items-center gap-3 text-left">
                <div className="w-10 h-10 rounded-xl bg-slate-950/20 flex items-center justify-center">
                  <Download className="w-5 h-5 text-slate-950 group-hover:translate-y-0.5 transition-transform" />
                </div>
                <div>
                  <div className="text-sm font-extrabold text-slate-950">1. Stáhnout Spustit-Kiosk-Zamek.bat</div>
                  <div className="text-[11px] text-slate-800 font-medium">Hlavní spouštěč (Chrome & Edge)</div>
                </div>
              </div>
            </button>

            <button
              id="btn-modal-download-autostart"
              onClick={handleDownloadAutostart}
              className="p-4 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-white font-bold flex items-center justify-between shadow-lg transition-transform active:scale-[0.98] group"
            >
              <div className="flex items-center gap-3 text-left">
                <div className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center text-emerald-400">
                  <Laptop className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-extrabold text-white">2. Stáhnout Instalovat-Po-Spusteni.bat</div>
                  <div className="text-[11px] text-slate-400 font-medium">Automatický start po zapnutí Windows</div>
                </div>
              </div>
              <Download className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
            </button>
          </div>

          {/* Quick Direct Link info */}
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-300">
              Přímý webový odkaz na soubor: <code className="text-amber-300 font-mono">/public/Spustit-Kiosk-Zamek.bat</code>
            </span>
            <a
              href="/public/Spustit-Kiosk-Zamek.bat"
              download="Spustit-Kiosk-Zamek.bat"
              className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Přímý odkaz</span>
            </a>
          </div>

          {/* Step-by-step instructions */}
          <div className="bg-slate-950/50 rounded-2xl border border-slate-800 p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <HelpCircle className="w-4 h-4" />
              Postup zprovoznění na dětském počítači (3 jednoduché kroky):
            </h3>

            <ol className="space-y-3 text-xs text-slate-300 list-decimal list-inside leading-relaxed">
              <li className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <strong className="text-white">Uložení na dětské PC:</strong> Klikněte na žluté tlačítko výše a stáhněte soubor <code className="text-amber-300">Spustit-Kiosk-Zamek.bat</code> na plochu nebo do složky v dětském počítači.
              </li>
              <li className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <strong className="text-white">Vyzkoušení spuštění:</strong> Dvojklikem spusťte stažený <code className="text-amber-300">.bat</code> soubor. Automaticky najde Google Chrome nebo Microsoft Edge a otevře dětskou uzamčenou obrazovku na celou plochu.
              </li>
              <li className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <strong className="text-white">Automatický start po zapnutí PC:</strong> Stáhněte a spusťte <code className="text-emerald-300">Instalovat-Po-Spusteni.bat</code> (nebo stiskněte <kbd className="bg-slate-800 px-1 py-0.5 rounded text-amber-300">Win + R</kbd>, zadejte <code className="text-amber-300">shell:startup</code> a přetáhněte tam soubor <code className="text-amber-300">Spustit-Kiosk-Zamek.bat</code>).
              </li>
            </ol>
          </div>

          {/* Code Viewer with Copy Button */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-400 flex items-center gap-2">
                <FileCode2 className="w-4 h-4 text-slate-400" />
                Zdrojový kód dávkového skriptu (.bat):
              </span>
              <button
                id="btn-copy-bat-code"
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Zkopírováno</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Kopírovat kód</span>
                  </>
                )}
              </button>
            </div>

            <div className="relative">
              <pre className="bg-slate-950 border border-slate-800 p-4 rounded-2xl text-xs font-mono text-slate-300 overflow-x-auto max-h-52 select-all leading-relaxed">
                {scriptCode}
              </pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Podporuje Windows 10 a Windows 11 (Google Chrome i Microsoft Edge).
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors"
          >
            Zavřít
          </button>
        </div>
      </div>
    </div>
  );
};
