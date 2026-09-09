import React, { useState } from 'react';
import {
  Server,
  Download,
  Copy,
  Check,
  X,
  FileCode,
  Terminal,
  ExternalLink,
  HardDrive,
  Cpu,
  Layers,
  Sparkles
} from 'lucide-react';

interface DockerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DockerModal: React.FC<DockerModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'dockerfile' | 'compose' | 'instructions'>('dockerfile');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const dockerfileContent = `# Multi-stage build for optimal image size and security
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package descriptors
COPY package*.json ./

# Install all dependencies (including devDependencies needed for build)
RUN npm install

# Copy application sources
COPY . .

# Build Vite frontend and bundled server.cjs via esbuild
RUN npm run build

# -------------------------------------------------------------
# Production runner image
# -------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_FILE=/app/data/parental_lock_data.json

# Install curl for container health check
RUN apk add --no-cache curl

# Copy package descriptors
COPY package*.json ./

# Install only production dependencies
RUN npm install --omit=dev && npm cache clean --force

# Copy built production assets from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

# Create directory for persistent state volume and grant permissions
RUN mkdir -p /app/data && chown -R node:node /app

# Run under non-root node user for container security
USER node

# Persistent volume for settings, quiz results and lock state
VOLUME ["/app/data"]

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \\
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["node", "dist/server.cjs"]`;

  const dockerComposeContent = `version: '3.8'

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
      # Volitelně: GEMINI_API_KEY pro generování dalších výukových úloh pomocí AI
      # - GEMINI_API_KEY=vase_api_klic
    volumes:
      # Trvalé ukládání konfigurace, výsledků a statistik v lokální složce ./data
      - ./data:/app/data
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 5s`;

  const currentContent = activeTab === 'dockerfile' ? dockerfileContent : dockerComposeContent;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const filename = activeTab === 'dockerfile' ? 'Dockerfile' : 'docker-compose.yml';
    const blob = new Blob([currentContent], { type: 'text/plain;charset=utf-8' });
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Docker konfigurace serveru</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  V kořeni projektu: /Dockerfile
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Soubory pro spuštění serveru v kontejneru (lokální NAS, PC, Raspberry Pi nebo VPS)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="px-6 py-2 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('dockerfile')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
                activeTab === 'dockerfile'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Dockerfile</span>
            </button>

            <button
              onClick={() => setActiveTab('compose')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
                activeTab === 'compose'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>docker-compose.yml</span>
            </button>

            <button
              onClick={() => setActiveTab('instructions')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
                activeTab === 'instructions'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Příkazy ke spuštění</span>
            </button>
          </div>

          {activeTab !== 'instructions' && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Zkopírováno' : 'Kopírovat'}</span>
              </button>

              <button
                onClick={handleDownload}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Stáhnout</span>
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === 'instructions' ? (
            <div className="space-y-4 text-xs text-slate-300">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="font-bold text-white text-sm block">1. Rychlé spuštění pomocí Docker Compose</span>
                <p className="text-slate-400">
                  Ujistěte se, že máte v kořenové složce soubory <code>Dockerfile</code> a <code>docker-compose.yml</code>. Poté spusťte:
                </p>
                <code className="block bg-slate-900 p-3 rounded-xl border border-slate-800 text-amber-300 font-mono text-xs select-all">
                  docker compose up -d --build
                </code>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="font-bold text-white text-sm block">2. Spuštění přes samostatný Docker CLI</span>
                <code className="block bg-slate-900 p-3 rounded-xl border border-slate-800 text-slate-300 font-mono text-xs select-all whitespace-pre">
{`docker build -t parental-lock:latest .
docker run -d --name parental-lock -p 3000:3000 -v "$(pwd)/data:/app/data" --restart unless-stopped parental-lock:latest`}
                </code>
              </div>

              <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 text-indigo-300">
                <div className="font-bold text-white mb-1">💡 Kde soubory najdete přímo v projektu:</div>
                <ul className="list-disc list-inside space-y-1 text-slate-400">
                  <li>Kořenový adresář: <code className="text-amber-300">/Dockerfile</code></li>
                  <li>Kořenový adresář: <code className="text-amber-300">/docker-compose.yml</code></li>
                  <li>Veřejný statický odkaz: <a href="/Dockerfile" target="_blank" rel="noreferrer" className="text-amber-400 underline">Zobrazit /Dockerfile v prohlížeči</a></li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="relative">
              <pre className="p-4 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto select-all leading-relaxed max-h-[50vh]">
                {currentContent}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span>Přímý odkaz:</span>
            <a
              href="/Dockerfile"
              target="_blank"
              rel="noreferrer"
              className="text-amber-400 hover:underline flex items-center gap-1 font-mono"
            >
              <span>/Dockerfile</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold"
          >
            Zavřít
          </button>
        </div>
      </div>
    </div>
  );
};
