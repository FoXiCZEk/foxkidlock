import React, { useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Download,
  Terminal,
  Check,
  Copy,
  Plus,
  Trash2,
  Gamepad2,
  RefreshCw,
  Cpu,
  Monitor,
  Zap,
  Info
} from 'lucide-react';
import { DesktopAgentInfo, ChildLiveState } from '../types';
import { WebFilterControl } from './WebFilterControl';

interface DesktopAgentControlProps {
  agent?: DesktopAgentInfo;
  childStatus: ChildLiveState['status'];
  parentPin: string;
  onRefresh?: () => void;
}

export const DesktopAgentControl: React.FC<DesktopAgentControlProps> = ({
  agent,
  childStatus,
  parentPin,
  onRefresh,
}) => {
  const [newProcessName, setNewProcessName] = useState('');
  const [isUpdatingProcesses, setIsUpdatingProcesses] = useState(false);
  const [copiedScriptCommand, setCopiedScriptCommand] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const isOnline = Boolean(agent?.isOnline);
  const serverUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

  const oneLinerCommand = `powershell -ExecutionPolicy Bypass -Command "irm '${serverUrl}/api/agent/download/script' -OutFile '$env:TEMP\\Agent-Zamek-PC.ps1'; & '$env:TEMP\\Agent-Zamek-PC.ps1'"`;

  const handleCopyCommand = () => {
    navigator.clipboard.writeText(oneLinerCommand);
    setCopiedScriptCommand(true);
    setTimeout(() => setCopiedScriptCommand(false), 2500);
  };

  const handleAddProcess = async () => {
    const clean = newProcessName.trim().replace(/\.exe$/i, '');
    if (!clean) return;

    setIsUpdatingProcesses(true);
    try {
      const res = await fetch('/api/agent/blocked-processes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pin: parentPin,
          action: 'add',
          processName: clean,
        }),
      });
      if (res.ok) {
        setNewProcessName('');
        setStatusMessage(`Proces "${clean}" byl přidán do seznamu blokovaných her.`);
        setTimeout(() => setStatusMessage(null), 3000);
      }
    } catch {
      setStatusMessage('Nepodařilo se přidat proces.');
    } finally {
      setIsUpdatingProcesses(false);
    }
  };

  const handleRemoveProcess = async (proc: string) => {
    setIsUpdatingProcesses(true);
    try {
      const res = await fetch('/api/agent/blocked-processes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pin: parentPin,
          action: 'remove',
          processName: proc,
        }),
      });
      if (res.ok) {
        setStatusMessage(`Proces "${proc}" byl odebrán.`);
        setTimeout(() => setStatusMessage(null), 3000);
      }
    } catch {
      setStatusMessage('Nepodařilo se odebrat proces.');
    } finally {
      setIsUpdatingProcesses(false);
    }
  };

  const defaultBlockedProcesses = agent?.blockedProcessNames || [
    'Minecraft',
    'MinecraftLauncher',
    'javaw',
    'java',
    'RobloxPlayerBeta',
    'RobloxPlayerLauncher',
    'Steam',
    'steamwebhelper',
    'EpicGamesLauncher',
    'FortniteClient-Win64-Shipping',
    'VALORANT-Win64-Shipping',
    'LeagueClient',
    'GenshinImpact',
    'Brawlhalla',
    'Discord',
  ];

  return (
    <div className="space-y-6">
      {/* Status banner */}
      <div
        className={`p-5 rounded-2xl border transition-all ${
          isOnline
            ? 'bg-emerald-950/40 border-emerald-500/40'
            : 'bg-slate-900 border-slate-800'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center border ${
                isOnline
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              {isOnline ? (
                <ShieldCheck className="w-6 h-6 animate-pulse" />
              ) : (
                <ShieldAlert className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-base">
                  Systémový Windows Agent (Hlídač her a zamykání)
                </h3>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                    isOnline
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isOnline ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'
                    }`}
                  />
                  {isOnline ? 'ONLINE & AKTIVNÍ' : 'ODPOJEN / NENAINSTALOVÁN'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                {isOnline
                  ? `Agent na počítači "${agent?.hostname || 'Dětské PC'}" aktivně hlídá spouštění her a drží Kiosk zámek na popředí.`
                  : 'Nainstalujte agenta na dětské PC, aby systém ihned po přihlášení do Windows ukončoval hry a vynucoval zobrazení úkolů.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/api/agent/download/installer"
              download="Instalovat-Agenta-Windows.bat"
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 transition-all shadow-md active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Stáhnout instalátor (.BAT)</span>
            </a>
          </div>
        </div>

        {/* Diagnostic counters if online */}
        {isOnline && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-800/80">
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] text-slate-400 block font-medium flex items-center gap-1">
                <Monitor className="w-3 h-3 text-sky-400" /> Počítač
              </span>
              <span className="text-sm font-bold text-white mt-0.5 block truncate">
                {agent?.hostname || 'PC Dítěte'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] text-slate-400 block font-medium flex items-center gap-1">
                <Zap className="w-3 h-3 text-emerald-400" /> Stav ochrany
              </span>
              <span className="text-sm font-bold text-emerald-400 mt-0.5 block truncate">
                {childStatus === 'unlocked_playing' ? 'Hry povoleny' : 'Hry zablokovány'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] text-slate-400 block font-medium flex items-center gap-1">
                <Gamepad2 className="w-3 h-3 text-rose-400" /> Ukončené hry
              </span>
              <span className="text-sm font-bold text-rose-400 mt-0.5 block">
                {agent?.killedProcessesCount || 0} zásahů
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] text-slate-400 block font-medium flex items-center gap-1">
                <Cpu className="w-3 h-3 text-amber-400" /> Verze agenta
              </span>
              <span className="text-sm font-bold text-amber-300 mt-0.5 block">
                v{agent?.version || '2.2'}
              </span>
            </div>
          </div>
        )}
      </div>

      {statusMessage && (
        <div className="p-3 rounded-xl bg-indigo-950/60 border border-indigo-500/40 text-indigo-200 text-xs flex items-center gap-2">
          <Info className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* HOW IT WORKS ON WINDOWS LOGIN */}
      <div className="bg-slate-950/60 p-6 rounded-2xl border border-slate-800">
        <h4 className="font-bold text-white text-sm mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          Jak agent zajišťuje zamykání a hlídání her na Windows:
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
            <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-xs">
              1
            </span>
            <div className="font-bold text-white">Start při přihlášení (Login)</div>
            <p className="text-slate-400 leading-relaxed">
              Agent se automaticky spustí v tichém režimu na pozadí hned, jak se dítě přihlásí do Windows. Žádné černé okno ani lišta.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
            <span className="w-6 h-6 rounded-full bg-rose-500/20 text-rose-400 font-bold flex items-center justify-center text-xs">
              2
            </span>
            <div className="font-bold text-white">Ukončení her & Kiosk</div>
            <p className="text-slate-400 leading-relaxed">
              Pokud dítě ještě nesplnilo otázky nebo vypršel čas, agent do 1 sekundy nemilosrdně ukončí procesy her a vytáhne Kiosk s otázkami do popředí.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
            <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs">
              3
            </span>
            <div className="font-bold text-white">Automatické povolení</div>
            <p className="text-slate-400 leading-relaxed">
              Jakmile dítě vyřeší zadaný počet úkolů (nebo rodič vzdáleně klikne na „Odemknout hry“), agent přestane hry blokovat a dítě může hrát.
            </p>
          </div>
        </div>
      </div>

      {/* BLOCKED PROCESSES MANAGEMENT */}
      <div className="bg-slate-950/60 p-6 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="font-bold text-white text-sm flex items-center gap-2">
              <Gamepad2 className="w-4 h-4 text-rose-400" />
              Seznam her a procesů, které agent ukončuje
            </h4>
            <p className="text-xs text-slate-400">
              Při uzamčení stanice agent tyto spustitelné soubory okamžitě vypíná a nepovolí jejich spuštění.
            </p>
          </div>
        </div>

        {/* Process tags */}
        <div className="flex flex-wrap gap-2 pt-1">
          {defaultBlockedProcesses.map((proc) => (
            <span
              key={proc}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-200 flex items-center gap-2 hover:border-slate-700 transition-colors"
            >
              <span className="text-rose-400">⚡</span>
              <span>{proc}.exe</span>
              <button
                type="button"
                onClick={() => handleRemoveProcess(proc)}
                disabled={isUpdatingProcesses}
                className="text-slate-500 hover:text-rose-400 transition-colors ml-1"
                title="Odebrat z blokování"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>

        {/* Add custom process form */}
        <div className="flex items-center gap-2 pt-2">
          <input
            type="text"
            value={newProcessName}
            onChange={(e) => setNewProcessName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddProcess();
            }}
            placeholder="Přidat další hru (např. AmongUs, Apex, Spotify, Discord)..."
            className="flex-1 px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-amber-400"
          />
          <button
            type="button"
            onClick={handleAddProcess}
            disabled={isUpdatingProcesses || !newProcessName.trim()}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Přidat proces</span>
          </button>
        </div>
      </div>

      {/* WEB FILTERING (YOUTUBE, NETFLIX, ETC.) */}
      <WebFilterControl
        blockedWebsites={agent?.blockedWebsites}
        webFilterEnabled={agent?.webFilterEnabled}
        webFilterMode={agent?.webFilterMode}
        parentPin={parentPin}
        agent={agent}
        onRefresh={onRefresh}
      />

      {/* DOWNLOAD PACKAGES & POWERShell ONE-LINER */}
      <div className="bg-slate-950/60 p-6 rounded-2xl border border-slate-800 space-y-4">
        <h4 className="font-bold text-white text-sm flex items-center gap-2">
          <Download className="w-4 h-4 text-amber-400" />
          Stažení a instalace souborů agenta na dětské PC
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <a
            href="/api/agent/download/installer"
            download="Instalovat-Agenta-Windows.bat"
            className="p-4 rounded-xl bg-gradient-to-br from-amber-500/20 to-slate-900 border border-amber-500/40 hover:border-amber-400 text-white flex flex-col justify-between gap-3 transition-all group"
          >
            <div>
              <span className="text-xs font-bold text-amber-300 block flex items-center gap-1.5">
                <Download className="w-4 h-4" /> 1. Instalovat-Agenta.bat
              </span>
              <p className="text-[11px] text-slate-400 mt-1">
                Kompletní 1-klik instalační průvodce. Zaregistruje agenta do Windows Startup a ihned spustí.
              </p>
            </div>
            <span className="text-[10px] font-bold text-amber-400 group-hover:underline">
              Stáhnout instalátor →
            </span>
          </a>

          <a
            href="/api/agent/download/script"
            download="Agent-Zamek-PC.ps1"
            className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-white flex flex-col justify-between gap-3 transition-all group"
          >
            <div>
              <span className="text-xs font-bold text-slate-200 block flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-sky-400" /> 2. Agent-Zamek-PC.ps1
              </span>
              <p className="text-[11px] text-slate-400 mt-1">
                Samotný PowerShell skript obsahující logiku ukončování her a Kiosk watchdog.
              </p>
            </div>
            <span className="text-[10px] font-bold text-sky-400 group-hover:underline">
              Stáhnout skript →
            </span>
          </a>

          <a
            href="/api/agent/download/vbs"
            download="Spustit-Agenta-Skryte.vbs"
            className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-white flex flex-col justify-between gap-3 transition-all group"
          >
            <div>
              <span className="text-xs font-bold text-slate-200 block flex items-center gap-1.5">
                <RefreshCw className="w-4 h-4 text-indigo-400" /> 3. Tichý spouštěč .VBS
              </span>
              <p className="text-[11px] text-slate-400 mt-1">
                Zajišťuje spuštění PowerShellu bez jakéhokoliv probliknutí černého okna konzole.
              </p>
            </div>
            <span className="text-[10px] font-bold text-indigo-400 group-hover:underline">
              Stáhnout .VBS →
            </span>
          </a>

          <a
            href="/api/agent/download/uninstaller"
            download="Odinstalovat-Agenta-Windows.bat"
            className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-rose-900/40 text-white flex flex-col justify-between gap-3 transition-all group"
          >
            <div>
              <span className="text-xs font-bold text-rose-300 block flex items-center gap-1.5">
                <Trash2 className="w-4 h-4" /> 4. Odinstalovat.bat
              </span>
              <p className="text-[11px] text-slate-400 mt-1">
                Čistá odinstalace agenta: vypne proces a odstraní z registru Po spuštění.
              </p>
            </div>
            <span className="text-[10px] font-bold text-rose-400 group-hover:underline">
              Stáhnout odinstalátor →
            </span>
          </a>
        </div>

        {/* Quick 1-line PowerShell Install command */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-amber-400" />
              Bleskové spuštění přes Windows PowerShell (1 řádek):
            </span>
            <button
              type="button"
              onClick={handleCopyCommand}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 flex items-center gap-1 transition-colors border border-slate-700"
            >
              {copiedScriptCommand ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">Zkopírováno</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Kopírovat příkaz</span>
                </>
              )}
            </button>
          </div>
          <p className="text-[11px] text-slate-400">
            Na počítači dítěte stiskněte <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-300">Win + R</kbd>, napište <code>powershell</code> a vložte:
          </p>
          <div className="p-2.5 rounded-lg bg-slate-950 font-mono text-[11px] text-emerald-400 break-all border border-slate-800 select-all">
            {oneLinerCommand}
          </div>
        </div>
      </div>
    </div>
  );
};
