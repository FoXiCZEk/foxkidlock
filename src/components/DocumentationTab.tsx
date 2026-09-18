import React, { useState } from 'react';
import {
  BookOpen,
  HelpCircle,
  Terminal,
  ShieldCheck,
  Gamepad2,
  Globe,
  Monitor,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Download,
  Server,
  KeyRound,
  ExternalLink,
  Laptop
} from 'lucide-react';

interface DocumentationTabProps {
  onOpenScriptModal?: () => void;
  onNavigateToTab?: (tab: 'remote' | 'agent' | 'webfilter' | 'modules' | 'docker' | 'security') => void;
}

export const DocumentationTab: React.FC<DocumentationTabProps> = ({
  onOpenScriptModal,
  onNavigateToTab,
}) => {
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const handleCopyCmd = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  const toggleFaq = (idx: number) => {
    setExpandedFaq(expandedFaq === idx ? null : idx);
  };

  const faqItems = [
    {
      q: 'Jak systém funguje po zapnutí počítače?',
      a: 'Při každém přihlášení dítěte do Windows se na pozadí tiše spustí agent. Spojí se se serverem, a pokud ještě nebyly splněny denní výukové úkoly, okamžitě spustí celoobrazovkový Kiosk s otázkami a zablokuje herní procesy. Jakmile dítě splní požadovaný počet otázek, okno se automaticky zavře a plocha je uvolněna pro hraní.'
    },
    {
      q: 'Co když dítě zkusí ukončit Kiosk okno nebo vypnout agenta?',
      a: 'Kiosk běží v režimu, který překrývá hlavní panel, tlačítka minimalizace i nabídku Start. Pokud by se dítěti podařilo okno shodit, agent na pozadí do 3 sekund situaci detekuje a Kiosk znovu obnoví na popředí. Pro maximální bezpečnost doporučujeme, aby dítě nemělo ve Windows účet s právy správce (administrátora).'
    },
    {
      q: 'Mohu počítač odemknout na dálku ze svého mobilu?',
      a: 'Ano, v záložce "Vzdálené ovládání" stačí kliknout na tlačítko "Odemknout PC (Přeskočit úkoly)". Server okamžitě předá agentovi na PC povel, Kiosk okno se na dětském monitoru samo zavře a hry budou povoleny.'
    },
    {
      q: 'Jak funguje blokování webů (YouTube, TikTok apod.)?',
      a: 'V záložce "Webový filtr" můžete zapnout blokování vybraných domén. Agent během doby zamykání přesměruje tyto adresy v systémovém souboru hosts na 127.0.0.1 a zároveň monitoruje panely prohlížečů. Po splnění úkolů se přístup k webům automaticky obnoví.'
    },
    {
      q: 'Jak změnit rodičovský PIN kód?',
      a: 'V záložce "Zabezpečení & PIN" zadejte stávající PIN (z výroby nastaveno: 1234) a poté zadejte a potvrďte svůj nový 4místný číselný kód.'
    },
    {
      q: 'Lze systém provozovat na vlastním domácím NASu nebo serveru?',
      a: 'Ano! Projekt je připraven pro Docker. V záložce "Nasazení Docker" naleznete kompletní konfiguraci pro Docker Compose. Data se ukládají do lokální složky ./data, takže o žádné statistiky nepřijdete ani po restartu kontejneru.'
    }
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-900/60 via-slate-900/80 to-slate-950/90 border border-indigo-500/30 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0 shadow-inner">
              <BookOpen className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
                  Uživatelská příručka & Dokumentace
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  v2.4.0
                </span>
              </div>
              <p className="text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Kompletní průvodce nastavením, instalací systémového agenta pro Windows, správou výukových modulů a řešením běžných situací.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {onOpenScriptModal && (
              <button
                id="btn-doc-download-agent"
                onClick={onOpenScriptModal}
                className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg shadow-indigo-600/30 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Instalační balíček agenta</span>
              </button>
            )}
            <a
              href="/api/agent/download/all"
              download="RodicovskyZamek-WindowsAgent-latest.zip"
              className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Stáhnout ZIP</span>
            </a>
          </div>
        </div>
      </div>

      {/* 3 Step Quick Start Guide */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl">
        <h3 className="text-lg font-bold text-white flex items-center gap-2.5 mb-6">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span>Rychlý start v 3 jednoduchých krocích</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Step 1 */}
          <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex flex-col justify-between">
            <div>
              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 font-black text-sm flex items-center justify-center mb-4">
                1
              </div>
              <h4 className="font-bold text-white text-base mb-2">Nastavte pravidla</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                V záložkách nahoře zvolte, kolik otázek musí dítě denně splnit (např. 5 otázek) a jaký má denní limit na hraní her.
              </p>
            </div>
            {onNavigateToTab && (
              <button
                onClick={() => onNavigateToTab('modules')}
                className="mt-4 text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
              >
                <span>Upravit výukové moduly</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Step 2 */}
          <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex flex-col justify-between">
            <div>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 font-black text-sm flex items-center justify-center mb-4">
                2
              </div>
              <h4 className="font-bold text-white text-base mb-2">Nainstalujte agenta na PC</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Na dětském počítači stáhněte balíček a spusťte soubor <b>Instalovat-Agenta-Windows.bat</b>. Agent poběží tiše na pozadí bez oken.
              </p>
            </div>
            {onNavigateToTab && (
              <button
                onClick={() => onNavigateToTab('agent')}
                className="mt-4 text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
              >
                <span>Zkontrolovat stav agenta</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Step 3 */}
          <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex flex-col justify-between">
            <div>
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 font-black text-sm flex items-center justify-center mb-4">
                3
              </div>
              <h4 className="font-bold text-white text-base mb-2">Mějte dohled z mobilu</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Tento web si uložte na plochu mobilního telefonu. Kdykoliv uvidíte, zda dítě studuje nebo hraje, a můžete PC dálkově odemknout.
              </p>
            </div>
            {onNavigateToTab && (
              <button
                onClick={() => onNavigateToTab('remote')}
                className="mt-4 text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
              >
                <span>Přejít na vzdálené ovládání</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Feature Deep Dive Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Module 1: Windows Agent */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-white text-base">Jak funguje Windows Agent</h4>
              <span className="text-xs text-slate-400">Plná kontrola a ochrana stanice</span>
            </div>
          </div>
          <ul className="space-y-2.5 text-xs text-slate-300 leading-relaxed">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
              <span><b>Tichý běh:</b> Využívá Windows Script Host (wscript.exe), takže při startu nebliká černé okno.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
              <span><b>Autostart:</b> Zaregistrován v Plánovači úloh Windows s nejvyššími právy při každém přihlášení.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
              <span><b>Watchdog Kiosku:</b> Pokud dítě okno zavře, agent ho do 3 sekund znovu zobrazí.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
              <span><b>Čisté ukončení:</b> Jakmile jsou úkoly splněny, agent Kiosk okamžitě ukončí a uvolní celou plochu.</span>
            </li>
          </ul>
        </div>

        {/* Module 2: Game Watchdog */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-white text-base">Hlídání a ukončování her</h4>
              <span className="text-xs text-slate-400">Automatické ukončení při zamknutí</span>
            </div>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed mb-3">
            Pokud je počítač zamčený úkoly nebo vypršel denní časový limit, agent okamžitě zastavuje tyto procesy:
          </p>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {['Minecraft', 'Roblox', 'Steam', 'Epic Games', 'Fortnite', 'Battle.net', 'Riot Games', 'Discord', 'CS2'].map(game => (
              <span key={game} className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-medium text-slate-300">
                {game}
              </span>
            ))}
          </div>
          <p className="text-[11px] text-slate-400">
            V záložce <b>Počítačový agent</b> můžete přidat jakýkoliv další název spustitelného souboru (.exe).
          </p>
        </div>

        {/* Module 3: Web Filter */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-white text-base">Dvouúrovňový webový filtr</h4>
              <span className="text-xs text-slate-400">Blokace YouTube, sociálních sítí a videí</span>
            </div>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed mb-2">
            Během plnění úkolů lze zabránit přepínání na videa:
          </p>
          <ul className="space-y-1.5 text-xs text-slate-400">
            <li>• <b>DNS blokace:</b> Zápis do systémového souboru hosts (přesměrování na 127.0.0.1).</li>
            <li>• <b>Automatické obnovení:</b> Po splnění úkolů se přístup k webům okamžitě vrátí.</li>
            <li>• <b>Volitelný seznam:</b> YouTube, Netflix, TikTok, Twitch, Instagram a další.</li>
          </ul>
        </div>

        {/* Module 4: Deployment & Local Server */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-white text-base">Možnosti nasazení</h4>
              <span className="text-xs text-slate-400">Cloud, NAS i lokální počítač</span>
            </div>
          </div>
          <ul className="space-y-2 text-xs text-slate-300">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
              <span><b>Cloud (Google Cloud Run):</b> Běží 24/7 s přístupem odkudkoliv z internetu přes zabezpečené HTTPS.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
              <span><b>Domácí NAS / Docker:</b> Jednoduchý příkaz <code>docker compose up -d</code> spustí server u vás doma.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
              <span><b>Lokální Windows:</b> Poklepáním na <code>Spustit-Komplet-Lokalne.bat</code> bez nutnosti instalace serverů.</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Interactive FAQ Accordion */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl">
        <h3 className="text-lg font-bold text-white flex items-center gap-2.5 mb-6">
          <HelpCircle className="w-5 h-5 text-indigo-400" />
          <span>Často kladené otázky (FAQ) a řešení situací</span>
        </h3>

        <div className="space-y-3">
          {faqItems.map((item, idx) => {
            const isExpanded = expandedFaq === idx;
            return (
              <div
                key={idx}
                className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/40 transition-colors"
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-4 text-left flex items-center justify-between gap-4 hover:bg-slate-800/40 transition-colors cursor-pointer"
                >
                  <span className="text-sm font-semibold text-white">
                    {item.q}
                  </span>
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-indigo-400 shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                  )}
                </button>
                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 text-xs text-slate-300 leading-relaxed border-t border-slate-800/60 bg-slate-900/40">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
