import React, { useState } from 'react';
import {
  Globe,
  ShieldCheck,
  ShieldAlert,
  Plus,
  Trash2,
  Check,
  AlertCircle,
  Tv,
  Film,
  MessageCircle,
  Gamepad2,
  Clock,
  Sparkles,
  ExternalLink,
  Power,
  RotateCw,
  Eye,
  EyeOff,
  Zap,
} from 'lucide-react';
import { BlockedWebSite, DesktopAgentInfo } from '../types';
import { DEFAULT_BLOCKED_WEBSITES } from '../data/defaultQuestions';

interface WebFilterControlProps {
  blockedWebsites?: BlockedWebSite[];
  webFilterEnabled?: boolean;
  webFilterMode?: 'always' | 'only_locked';
  parentPin: string;
  agent?: DesktopAgentInfo;
  onRefresh?: () => void;
}

export const WebFilterControl: React.FC<WebFilterControlProps> = ({
  blockedWebsites = DEFAULT_BLOCKED_WEBSITES,
  webFilterEnabled = true,
  webFilterMode = 'always',
  parentPin,
  agent,
  onRefresh,
}) => {
  const [sites, setSites] = useState<BlockedWebSite[]>(blockedWebsites);
  const [filterEnabled, setFilterEnabled] = useState<boolean>(webFilterEnabled);
  const [filterMode, setFilterMode] = useState<'always' | 'only_locked'>(webFilterMode);

  const [newSiteName, setNewSiteName] = useState('');
  const [newSiteDomain, setNewSiteDomain] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Sync state when props change
  React.useEffect(() => {
    if (blockedWebsites && blockedWebsites.length > 0) {
      setSites(blockedWebsites);
    }
  }, [blockedWebsites]);

  React.useEffect(() => {
    if (webFilterEnabled !== undefined) {
      setFilterEnabled(webFilterEnabled);
    }
  }, [webFilterEnabled]);

  React.useEffect(() => {
    if (webFilterMode) {
      setFilterMode(webFilterMode);
    }
  }, [webFilterMode]);

  const showFeedback = (msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(null), 3500);
  };

  // Remote API call
  const callFilterApi = async (body: Record<string, unknown>) => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/agent/web-filter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pin: parentPin,
          ...body,
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.blockedWebsites) setSites(data.blockedWebsites);
        if (data.webFilterEnabled !== undefined) setFilterEnabled(data.webFilterEnabled);
        if (data.webFilterMode) setFilterMode(data.webFilterMode);
        if (onRefresh) onRefresh();
      }
      return data;
    } catch (err) {
      console.error('Chyba při aktualizaci webového filtru:', err);
      showFeedback('Nepodařilo se odeslat požadavek na server.');
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleMaster = async (enabled: boolean) => {
    setFilterEnabled(enabled);
    const data = await callFilterApi({
      action: 'toggle-master',
      enabled,
    });
    if (data?.success) {
      showFeedback(
        enabled
          ? 'Filtrování webů bylo vzdáleně ZAPNUTO.'
          : 'Filtrování webů bylo dočasně VYPNUTO (weby povoleny).'
      );
    }
  };

  const handleSetMode = async (mode: 'always' | 'only_locked') => {
    setFilterMode(mode);
    const data = await callFilterApi({
      action: 'set-mode',
      mode,
    });
    if (data?.success) {
      showFeedback(
        mode === 'always'
          ? 'Režim nastaven: Blokovat vybrané weby nepřetržitě (24/7).'
          : 'Režim nastaven: Blokovat pouze při uzamčení PC (během učení).'
      );
    }
  };

  const handleToggleSite = async (siteId: string, currentEnabled: boolean) => {
    const nextVal = !currentEnabled;
    setSites((prev) =>
      prev.map((s) => (s.id === siteId ? { ...s, enabled: nextVal } : s))
    );

    const data = await callFilterApi({
      action: 'toggle-site',
      siteId,
      enabled: nextVal,
    });
    if (data?.success) {
      const site = sites.find((s) => s.id === siteId);
      showFeedback(
        `${site?.name || 'Web'} byl ${nextVal ? 'zablokován' : 'povolen'}.`
      );
    }
  };

  const handleAddCustomSite = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanDomain = newSiteDomain
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//i, '')
      .replace(/\/.*$/, '');
    const cleanName = newSiteName.trim() || cleanDomain;

    if (!cleanDomain) {
      showFeedback('Zadejte platnou doménu nebo webovou adresu (např. discord.com).');
      return;
    }

    const data = await callFilterApi({
      action: 'add-custom-site',
      name: cleanName,
      domain: cleanDomain,
    });

    if (data?.success) {
      setNewSiteName('');
      setNewSiteDomain('');
      showFeedback(`Vlastní web "${cleanName}" (${cleanDomain}) byl úspěšně přidán do blokování!`);
    }
  };

  const handleRemoveCustomSite = async (siteId: string, siteName: string) => {
    setSites((prev) => prev.filter((s) => s.id !== siteId));
    const data = await callFilterApi({
      action: 'remove-custom-site',
      siteId,
    });
    if (data?.success) {
      showFeedback(`Web "${siteName}" byl odebrán z blokování.`);
    }
  };

  const handleQuickBlockAll = async () => {
    await callFilterApi({ action: 'block-now' });
    setFilterEnabled(true);
    setFilterMode('always');
    showFeedback('Okamžitý povel: Weby byly ihned zablokovány na dálku!');
  };

  const handleQuickUnblockAll = async () => {
    await callFilterApi({ action: 'unblock-now' });
    setFilterEnabled(false);
    showFeedback('Okamžitý povel: Weby byly na dálku odblokovány.');
  };

  // Categorize sites
  const presetSites = sites.filter((s) => s.isPreset !== false);
  const customSites = sites.filter((s) => s.isPreset === false);

  const activeBlockedCount = filterEnabled
    ? sites.filter((s) => s.enabled).length
    : 0;

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'video':
        return <Film className="w-3.5 h-3.5 text-rose-400" />;
      case 'social':
        return <MessageCircle className="w-3.5 h-3.5 text-sky-400" />;
      case 'games':
        return <Gamepad2 className="w-3.5 h-3.5 text-amber-400" />;
      default:
        return <Globe className="w-3.5 h-3.5 text-indigo-400" />;
    }
  };

  return (
    <div className="space-y-6" id="web-filter-control-root">
      {/* Header & Master Remote Control */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-slate-800 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-all ${
                filterEnabled
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/30 shadow-lg shadow-rose-500/10'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-base">
                  Vzdálené blokování webů (YouTube, Netflix a další)
                </h3>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1.5 ${
                    filterEnabled
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      filterEnabled ? 'bg-rose-400 animate-pulse' : 'bg-slate-500'
                    }`}
                  />
                  {filterEnabled ? 'FILTR ZAPNUT' : 'FILTR VYPNUT'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Zakažte rozptylující weby (YouTube, Netflix, TikTok) na dálku. Windows Agent okamžitě
                přesměruje DNS a zavře nechtěné záložky v prohlížeči.
              </p>
            </div>
          </div>

          {/* Quick toggle button */}
          <div className="flex items-center gap-2">
            {filterEnabled ? (
              <button
                id="btn-quick-unblock-web"
                type="button"
                onClick={handleQuickUnblockAll}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs flex items-center gap-2 transition-all border border-slate-700 active:scale-95 cursor-pointer"
                title="Povolit weby (vypnout blokaci)"
              >
                <Eye className="w-4 h-4 text-emerald-400" />
                <span>Povolit weby</span>
              </button>
            ) : (
              <button
                id="btn-quick-block-web"
                type="button"
                onClick={handleQuickBlockAll}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-md shadow-rose-900/40 active:scale-95 cursor-pointer"
                title="Okamžitě zablokovat weby na dálku"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Zablokovat weby IHNED</span>
              </button>
            )}
          </div>
        </div>

        {/* Action feedback toast */}
        {actionFeedback && (
          <div className="p-3 rounded-xl bg-indigo-950/70 border border-indigo-500/40 text-indigo-200 text-xs flex items-center gap-2 animate-fadeIn">
            <Zap className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{actionFeedback}</span>
          </div>
        )}

        {/* Live Diagnostics row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-800/80">
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] text-slate-400 block font-medium flex items-center gap-1">
              <Power className="w-3 h-3 text-amber-400" /> Hlavní vypínač
            </span>
            <div className="flex items-center gap-2 mt-1">
              <button
                id="btn-toggle-filter-enabled"
                type="button"
                onClick={() => handleToggleMaster(!filterEnabled)}
                disabled={isSubmitting}
                className={`text-xs font-bold px-2 py-0.5 rounded cursor-pointer transition-colors ${
                  filterEnabled
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {filterEnabled ? 'Aktivní' : 'Vypnuto'}
              </button>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] text-slate-400 block font-medium flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" /> Blokovaných portálů
            </span>
            <span className="text-sm font-bold text-white mt-1 block">
              {activeBlockedCount} z {sites.length} služeb
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] text-slate-400 block font-medium flex items-center gap-1">
              <Globe className="w-3 h-3 text-sky-400" /> Zásahů agenta
            </span>
            <span className="text-sm font-bold text-rose-400 mt-1 block">
              {agent?.webBlockCount || 0} zablokováno
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] text-slate-400 block font-medium flex items-center gap-1">
              <Clock className="w-3 h-3 text-purple-400" /> Poslední událost
            </span>
            <span className="text-xs font-bold text-purple-300 mt-1 block truncate" title={agent?.lastWebBlockEvent || 'Žádná'}>
              {agent?.lastWebBlockEvent || 'Klidový stav'}
            </span>
          </div>
        </div>

        {/* Mode Selector: Always vs Only Locked */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
          <span className="text-xs font-bold text-white block">
            Kdy má být blokování webů vynucováno?
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              id="btn-mode-always"
              type="button"
              onClick={() => handleSetMode('always')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                filterMode === 'always'
                  ? 'bg-rose-950/30 border-rose-500/50 text-white shadow-sm'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    filterMode === 'always'
                      ? 'border-rose-400 bg-rose-500 text-white'
                      : 'border-slate-600'
                  }`}
                >
                  {filterMode === 'always' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                </span>
                <span className="text-xs font-bold text-white">Vždy blokovat (24/7 nepřetržitě)</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5 ml-6">
                Vybrané weby (např. YouTube, Netflix) budou na počítači zakázané trvale, i když má dítě volný herní čas.
              </p>
            </button>

            <button
              id="btn-mode-only-locked"
              type="button"
              onClick={() => handleSetMode('only_locked')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                filterMode === 'only_locked'
                  ? 'bg-amber-950/30 border-amber-500/50 text-white shadow-sm'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    filterMode === 'only_locked'
                      ? 'border-amber-400 bg-amber-500 text-white'
                      : 'border-slate-600'
                  }`}
                >
                  {filterMode === 'only_locked' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                </span>
                <span className="text-xs font-bold text-white">Blokovat pouze při zamknutém PC</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5 ml-6">
                Weby se zablokují pouze během výuky/vypršení limitu. Po splnění otázek se weby automaticky povolí.
              </p>
            </button>
          </div>
        </div>
      </div>

      {/* Preset Websites List (YouTube, Netflix, etc.) */}
      <div className="bg-slate-950/60 p-6 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-bold text-white text-sm flex items-center gap-2">
              <Tv className="w-4 h-4 text-amber-400" />
              Přednastavené služby k blokování (YouTube, Netflix, streamy...)
            </h4>
            <p className="text-xs text-slate-400">
              Přepnutím přepínače okamžitě zakážete nebo povolíte přístup k dané platformě.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {presetSites.map((site) => (
            <div
              key={site.id}
              id={`preset-site-${site.id}`}
              className={`p-4 rounded-xl border transition-all flex items-center justify-between ${
                site.enabled
                  ? 'bg-slate-900/90 border-rose-500/40 shadow-sm shadow-rose-950/30'
                  : 'bg-slate-900/40 border-slate-800 opacity-70 hover:opacity-100'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {getCategoryIcon(site.category)}
                  <span className="text-xs font-bold text-white">{site.name}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {site.domains.slice(0, 2).map((d) => (
                    <span
                      key={d}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-slate-950 font-mono text-slate-400 border border-slate-800"
                    >
                      {d}
                    </span>
                  ))}
                  {site.domains.length > 2 && (
                    <span className="text-[10px] text-slate-500">
                      +{site.domains.length - 2}
                    </span>
                  )}
                </div>
              </div>

              {/* Toggle switch */}
              <label className="relative inline-flex items-center cursor-pointer ml-3 shrink-0">
                <input
                  type="checkbox"
                  checked={site.enabled}
                  onChange={() => handleToggleSite(site.id, site.enabled)}
                  disabled={isSubmitting}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-500"></div>
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Custom Websites Form & List */}
      <div className="bg-slate-950/60 p-6 rounded-2xl border border-slate-800 space-y-4">
        <div>
          <h4 className="font-bold text-white text-sm flex items-center gap-2">
            <Plus className="w-4 h-4 text-emerald-400" />
            Přidat vlastní web nebo doménu k blokování
          </h4>
          <p className="text-xs text-slate-400">
            Zadejte libovolný web, který chcete na dětském počítači zakázat (např. filmy.cz, discord.com, steamcommunity.com).
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleAddCustomSite} className="flex flex-col sm:flex-row items-center gap-3">
          <input
            id="input-custom-web-name"
            type="text"
            value={newSiteName}
            onChange={(e) => setNewSiteName(e.target.value)}
            placeholder="Název (např. Vlastní filmový web)..."
            className="w-full sm:w-1/3 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-amber-400"
          />
          <input
            id="input-custom-web-domain"
            type="text"
            value={newSiteDomain}
            onChange={(e) => setNewSiteDomain(e.target.value)}
            placeholder="Doména / adresa (např. priklad.cz nebo stream.cz)..."
            required
            className="w-full sm:w-1/2 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-amber-400 font-mono"
          />
          <button
            id="btn-add-custom-web"
            type="submit"
            disabled={isSubmitting || !newSiteDomain.trim()}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shrink-0 cursor-pointer shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Zablokovat web</span>
          </button>
        </form>

        {/* Custom sites list */}
        {customSites.length > 0 ? (
          <div className="pt-2 space-y-2">
            <span className="text-xs font-bold text-slate-300 block">
              Vaše vlastní blokované weby ({customSites.length}):
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {customSites.map((site) => (
                <div
                  key={site.id}
                  id={`custom-site-${site.id}`}
                  className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                    site.enabled
                      ? 'bg-slate-900 border-rose-500/40 text-white'
                      : 'bg-slate-900/40 border-slate-800 text-slate-400 opacity-60'
                  }`}
                >
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold block">{site.name}</span>
                    <span className="text-[10px] font-mono text-slate-400 block">
                      {site.domains.join(', ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={site.enabled}
                        onChange={() => handleToggleSite(site.id, site.enabled)}
                        disabled={isSubmitting}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-500"></div>
                    </label>

                    <button
                      id={`btn-delete-site-${site.id}`}
                      type="button"
                      onClick={() => handleRemoveCustomSite(site.id, site.name)}
                      disabled={isSubmitting}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Smazat tento web"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 text-center text-xs text-slate-400">
            Zatím jste nepřidali žádný vlastní web. Můžete zadat libovolnou adresu výše.
          </div>
        )}
      </div>

      {/* Technical Explanation: 2-Layer Protection */}
      <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800 space-y-3">
        <h4 className="font-bold text-white text-xs flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          Dvouvrstvá ochrana agenta před obcházením:
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
            <span className="font-bold text-emerald-400 flex items-center gap-1.5">
              <span>1. DNS / Hosts blokace (Systémová úroveň)</span>
            </span>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Agent automaticky zapisuje blokované domény do systémového souboru <code>hosts</code> s přesměrováním na <code>127.0.0.1</code>.
              Stránka se v žádném prohlížeči ani aplikaci vůbec nenačte.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
            <span className="font-bold text-rose-400 flex items-center gap-1.5">
              <span>2. Aktivní hlídač panelů prohlížeče (Okamžitý zásah)</span>
            </span>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Pokud dítě již mělo YouTube nebo Netflix otevřený v záložce (nebo používá DoH/VPN), agent panel s videem okamžitě detekuje a zavře.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
