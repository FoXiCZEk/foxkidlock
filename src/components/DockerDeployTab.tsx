import React, { useState } from 'react';
import {
  Server,
  Download,
  Copy,
  Check,
  Terminal,
  ExternalLink,
  ShieldCheck,
  Laptop,
  HardDrive,
  FolderArchive,
  RefreshCw,
  Info,
  Layers,
  Cpu
} from 'lucide-react';

interface DockerDeployTabProps {
  currentOrigin?: string;
}

export const DockerDeployTab: React.FC<DockerDeployTabProps> = ({ currentOrigin = '' }) => {
  const defaultHost = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const [customServerUrl, setCustomServerUrl] = useState(defaultHost);
  const [copiedCompose, setCopiedCompose] = useState(false);
  const [copiedDockerfile, setCopiedDockerfile] = useState(false);
  const [copiedRunCommand, setCopiedRunCommand] = useState(false);
  const [copiedCustomBat, setCopiedCustomBat] = useState(false);
  const [activeCodeTab, setActiveCodeTab] = useState<'compose' | 'dockerfile' | 'cli'>('compose');

  const dockerComposeCode = `version: '3.8'

services:
  parental-lock:
    build:
      context: .
      dockerfile: Dockerfile
    image: parental-lock:latest
    container_name: parental-lock-server
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DATA_FILE=/app/data/parental_lock_data.json
      # Volitelně: zadejte Gemini API klíč pro tvorbu nových úloh
      # - GEMINI_API_KEY=vase_tajne_gemini_api_klic
    volumes:
      # Trvalé ukládání konfigurace, výsledků a statistik v lokální složce ./data
      - ./data:/app/data
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 5s`;

  const dockerfileCode = `# Multi-stage build pro minimalni velikost a vysoke zabezpeceni
FROM node:20-alpine AS builder

WORKDIR /app

# Kopirovani popisu balicku
COPY package*.json ./

# Instalace vsech zavislosti vcetne vyvojovych pro sestaveni
RUN npm install

# Kopirovani zdrojovych kodu
COPY . .

# Sestaveni produkcniho balicku (Vite + esbuild CJS server)
RUN npm run build

# -------------------------------------------------------------
# Produkcni image pro beh serveru
# -------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_FILE=/app/data/parental_lock_data.json

# Instalace curl pro healthcheck
RUN apk add --no-cache curl

COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

# Zkopirovani hotoveho buildu
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

# Vytvoreni slozky pro trvala data
RUN mkdir -p /app/data && chown -R node:node /app

USER node

VOLUME ["/app/data"]

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \\
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["node", "dist/server.cjs"]`;

  const dockerRunCode = `# 1. Sestavit Docker image
docker build -t parental-lock:latest .

# 2. Vytvořit lokální složku pro perzistentní data
mkdir -p ./data

# 3. Spustit kontejner na pozadí na portu 3000
docker run -d \\
  --name parental-lock-server \\
  --restart unless-stopped \\
  -p 3000:3000 \\
  -v "$(pwd)/data:/app/data" \\
  parental-lock:latest`;

  // Generated custom BAT content based on custom URL
  const targetChildUrl = `${customServerUrl.replace(/\/+$/, '')}/?mode=child`;
  const customBatContent = `@echo off
chcp 65001 >nul
title Rodicovsky zamek PC - Kiosk rezim na popredi (Docker)
color 0b

echo ===================================================================
echo             RODICOVSKY ZAMEK PC - KIOSK REZIM
echo ===================================================================
echo   Pripojuji se k serveru: ${targetChildUrl}
echo ===================================================================
echo.

set "TARGET_URL=${targetChildUrl}"

REM 1. Zkusit Google Chrome
if exist "%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe" (
    echo [INFO] Nalezen Google Chrome. Spoustim v Kiosk rezimu...
    start "" "%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe" --kiosk "%TARGET_URL%" --disable-pinch --overscroll-history-navigation=0 --no-first-run
    goto :success
)

if exist "%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe" (
    echo [INFO] Nalezen Google Chrome. Spoustim v Kiosk rezimu...
    start "" "%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe" --kiosk "%TARGET_URL%" --disable-pinch --overscroll-history-navigation=0 --no-first-run
    goto :success
)

REM 2. Zkusit Microsoft Edge
if exist "%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe" (
    echo [INFO] Nalezen Microsoft Edge. Spoustim v Kiosk rezimu...
    start "" "%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe" --kiosk "%TARGET_URL%" --edge-kiosk-type=fullscreen --no-first-run
    goto :success
)

if exist "%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe" (
    echo [INFO] Nalezen Microsoft Edge. Spoustim v Kiosk rezimu...
    start "" "%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe" --kiosk "%TARGET_URL%" --edge-kiosk-type=fullscreen --no-first-run
    goto :success
)

REM 3. Ostatni prohlizece
start "" "%TARGET_URL%"

:success
echo.
echo [HOTOVO] Rodicovsky zamek spusten.
timeout /t 3 >nul
exit`;

  const copyToClipboard = (text: string, setter: (val: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  const downloadBlob = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Overview */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
            <Server className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-white tracking-tight">Nasazení vlastního serveru přes Docker</h3>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Docker & Compose ready
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Spusťte backend Rodičovského zámku na vlastním domácím serveru, NASu (Synology, QNAP, TrueNAS),
              Raspberry Pi nebo VPS. Všechna data se trvale ukládají do lokálního svazku a jsou chráněna před výpadkem.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <a
            id="btn-download-compose-file"
            href="/api/docker/compose"
            download="docker-compose.yml"
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-950/30 transition-all active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>Stáhnout docker-compose.yml</span>
          </a>

          <a
            id="btn-download-dockerfile"
            href="/api/docker/dockerfile"
            download="Dockerfile"
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 flex items-center gap-2 transition-all active:scale-95"
          >
            <Download className="w-4 h-4 text-slate-400" />
            <span>Stáhnout Dockerfile</span>
          </a>
        </div>
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-indigo-400 shrink-0">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">Multi-stage Alpine Build</h4>
            <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
              Optimalizovaný Node.js 20 Alpine kontejner o minimální velikosti s rychlým startem.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-emerald-400 shrink-0">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">Perzistentní svazek (Volume)</h4>
            <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
              Složka <code className="text-amber-300">./data</code> uchovává PIN, statistiky i otázky při restartech.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-amber-400 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">Non-root zabezpečení</h4>
            <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
              Proces v kontejneru běží pod neprivilegovaným uživatelem <code>node</code> s vestavěným healthcheckem.
            </p>
          </div>
        </div>
      </div>

      {/* Quick Start Guide: 2 Simple Steps */}
      <div className="bg-slate-950/70 p-6 rounded-3xl border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Terminal className="w-4 h-4 text-amber-400" />
          Jak spustit server v Dockeru (2 jednoduché příkazy)
        </h3>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <span className="text-xs font-semibold text-slate-400">1. Spuštění kontejneru pomocí Docker Compose:</span>
          <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-xs text-amber-300 overflow-x-auto">
            <code>docker compose up -d --build</code>
            <button
              onClick={() => copyToClipboard('docker compose up -d --build', setCopiedRunCommand)}
              className="ml-3 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors shrink-0"
              title="Kopírovat příkaz"
            >
              {copiedRunCommand ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[11px] text-slate-500">
            Server se automaticky zkompiluje, spustí na portu <strong>3000</strong> a vytvoří složku <code>./data</code> pro trvalé ukládání.
          </p>
        </div>
      </div>

      {/* Interactive BAT generator configured for user's Docker server */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Laptop className="w-4 h-4 text-amber-400" />
              Propojení s dětským PC – Generátor spouštěcího .BAT skriptu
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Zadejte lokální IP adresu vašeho Docker serveru (např. <code>http://192.168.1.50:3000</code>).
              Vygenerujeme pro vás upravený skript pro dětské PC, který se okamžitě připojí k vašemu Dockeru.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center pt-2">
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Adresa vašeho Docker serveru:
            </label>
            <input
              id="input-docker-server-url"
              type="text"
              value={customServerUrl}
              onChange={(e) => setCustomServerUrl(e.target.value)}
              placeholder="http://192.168.1.100:3000"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="flex gap-2 pt-5 sm:pt-6">
            <button
              id="btn-download-custom-docker-bat"
              onClick={() => downloadBlob(customBatContent, 'Spustit-Kiosk-Zamek.bat', 'application/x-bat;charset=utf-8')}
              className="flex-1 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Stáhnout .BAT</span>
            </button>

            <button
              id="btn-copy-custom-docker-bat"
              onClick={() => copyToClipboard(customBatContent, setCopiedCustomBat)}
              className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 flex items-center justify-center transition-colors"
              title="Kopírovat kód skriptu"
            >
              {copiedCustomBat ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-[11px] text-slate-400">
          Cílová URL pro dětské PC:{' '}
          <strong className="text-amber-300 font-mono">{targetChildUrl}</strong>
        </div>
      </div>

      {/* Code Viewer Tabs (Compose, Dockerfile, CLI) */}
      <div className="bg-slate-950/80 rounded-3xl border border-slate-800 overflow-hidden">
        <div className="px-6 py-3 border-b border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveCodeTab('compose')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                activeCodeTab === 'compose'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              docker-compose.yml
            </button>
            <button
              onClick={() => setActiveCodeTab('dockerfile')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                activeCodeTab === 'dockerfile'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              Dockerfile
            </button>
            <button
              onClick={() => setActiveCodeTab('cli')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                activeCodeTab === 'cli'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              Docker CLI příkazy
            </button>
          </div>

          <div className="flex items-center gap-2">
            {activeCodeTab === 'compose' && (
              <button
                onClick={() => copyToClipboard(dockerComposeCode, setCopiedCompose)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-medium transition-colors"
              >
                {copiedCompose ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Zkopírováno</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Kopírovat</span>
                  </>
                )}
              </button>
            )}

            {activeCodeTab === 'dockerfile' && (
              <button
                onClick={() => copyToClipboard(dockerfileCode, setCopiedDockerfile)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-medium transition-colors"
              >
                {copiedDockerfile ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Zkopírováno</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Kopírovat</span>
                  </>
                )}
              </button>
            )}

            {activeCodeTab === 'cli' && (
              <button
                onClick={() => copyToClipboard(dockerRunCode, setCopiedRunCommand)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-medium transition-colors"
              >
                {copiedRunCommand ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Zkopírováno</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Kopírovat</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        <div className="p-4 bg-slate-950">
          <pre className="text-xs font-mono text-slate-300 overflow-x-auto max-h-72 select-all leading-relaxed p-2">
            {activeCodeTab === 'compose' && dockerComposeCode}
            {activeCodeTab === 'dockerfile' && dockerfileCode}
            {activeCodeTab === 'cli' && dockerRunCode}
          </pre>
        </div>
      </div>
    </div>
  );
};
