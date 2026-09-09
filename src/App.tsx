import React, { useState, useEffect, useCallback } from 'react';
import {
  ParentSettings,
  ChildLiveState,
  OverallStats,
  SubjectId
} from './types';
import { DEFAULT_PARENT_SETTINGS } from './data/defaultQuestions';
import { ChildKioskView } from './components/ChildKioskView';
import { ParentDashboard } from './components/ParentDashboard';
import { PinAuthModal } from './components/PinAuthModal';
import { KioskScriptModal } from './components/KioskScriptModal';
import { DockerModal } from './components/DockerModal';
import { ShieldCheck, Smartphone, Laptop, FileCode2, Server } from 'lucide-react';

export default function App() {
  const [settings, setSettings] = useState<ParentSettings>(DEFAULT_PARENT_SETTINGS);
  const [childState, setChildState] = useState<ChildLiveState>({
    pcId: 'Detske-PC-1',
    status: 'locked_studying',
    currentSubjectId: 'math',
    moduleProgress: {
      math: { completed: 0, required: 4, correctInSession: 0 },
      czech: { completed: 0, required: 4, correctInSession: 0 },
      geography: { completed: 0, required: 3, correctInSession: 0 },
      science: { completed: 0, required: 3, correctInSession: 0 },
      english: { completed: 0, required: 3, correctInSession: 0 },
    },
    playtimeRemainingSeconds: 45 * 60,
    lastHeartbeat: Date.now(),
    activeMessageFromParent: null,
    isKioskActive: true,
  });

  const [stats, setStats] = useState<OverallStats>({
    totalAnswered: 0,
    totalCorrect: 0,
    accuracyPercent: 100,
    subjectBreakdown: {
      math: { answered: 0, correct: 0, accuracy: 0 },
      czech: { answered: 0, correct: 0, accuracy: 0 },
      geography: { answered: 0, correct: 0, accuracy: 0 },
      science: { answered: 0, correct: 0, accuracy: 0 },
      english: { answered: 0, correct: 0, accuracy: 0 },
    },
    recentAttempts: [],
  });

  // UI state
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isParentPanelOpen, setIsParentPanelOpen] = useState(false);
  const [isParentAuthenticated, setIsParentAuthenticated] = useState(false);
  const [isScriptModalOpen, setIsScriptModalOpen] = useState(false);
  const [isDockerModalOpen, setIsDockerModalOpen] = useState(false);
  const [activeRoleView, setActiveRoleView] = useState<'child' | 'remote_parent'>('child');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Check URL query parameters on load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    if (mode === 'parent' || mode === 'remote') {
      setActiveRoleView('remote_parent');
      setIsPinModalOpen(true);
    }
  }, []);

  // Poll state from server every 2.5 seconds
  const fetchState = useCallback(async () => {
    try {
      const res = await fetch(`/api/state?role=${activeRoleView === 'child' ? 'child' : 'parent'}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.settings) setSettings(data.settings);
      if (data.childState) setChildState(data.childState);
      if (data.stats) setStats(data.stats);

      // Handle any commands sent to child PC
      if (activeRoleView === 'child' && Array.isArray(data.pendingCommands)) {
        data.pendingCommands.forEach((cmd: any) => {
          if (cmd.type === 'skip_tasks') {
            showToast('Rodiče vzdáleně odemkli počítač!');
          } else if (cmd.type === 'force_lock') {
            showToast('Rodiče uzamkli počítač.');
          } else if (cmd.type === 'add_playtime') {
            showToast(`Rodiče vám přidali +${cmd.payload?.minutes || 15} minut času!`);
          } else if (cmd.type === 'send_message') {
            showToast(`Zpráva od rodičů: ${cmd.payload?.message}`);
          }
        });
      }
    } catch {
      // Offline fallback
    }
  }, [activeRoleView]);

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 2500);
    return () => clearInterval(interval);
  }, [fetchState]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Submit answer
  const handleAnswerSubmit = async (answerData: {
    subjectId: SubjectId;
    questionText: string;
    userAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
    timeSpentSeconds: number;
  }) => {
    try {
      const res = await fetch('/api/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(answerData),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.childState) setChildState(data.childState);
        if (data.stats) setStats(data.stats);
      }
    } catch (e) {
      console.error('Error submitting answer:', e);
    }
  };

  // Heartbeat
  const handleHeartbeat = async (kioskActive: boolean, remainingSec: number, activeSubject: SubjectId) => {
    try {
      await fetch('/api/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isKioskActive: kioskActive,
          playtimeRemainingSeconds: remainingSec,
          currentSubjectId: activeSubject,
        }),
      });
    } catch {
      // Ignore
    }
  };

  // Remote parent command
  const handleSendRemoteCommand = async (command: string, payload?: Record<string, unknown>) => {
    try {
      const res = await fetch('/api/parent/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command, payload, pin: settings.parentPin }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.childState) setChildState(data.childState);
        fetchState();
      }
    } catch (e) {
      console.error('Error sending remote command:', e);
    }
  };

  // Update settings
  const handleUpdateSettings = async (newSettings: ParentSettings): Promise<boolean> => {
    try {
      const res = await fetch('/api/parent/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: newSettings, pin: settings.parentPin }),
      });
      if (res.ok) {
        setSettings(newSettings);
        fetchState();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // Reset stats
  const handleResetStats = async () => {
    try {
      const res = await fetch('/api/stats/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: settings.parentPin }),
      });
      if (res.ok) {
        fetchState();
      }
    } catch {
      // Ignore
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col relative font-sans">
      {/* Role Switcher Floating Pill & Quick Script Access */}
      <aside aria-label="Přepínač režimu" className="fixed bottom-4 right-4 z-40 bg-slate-900/90 border border-slate-700/80 rounded-full px-3 py-1.5 shadow-2xl backdrop-blur-md flex items-center gap-2">
        <button
          id="btn-quick-bat-script"
          onClick={() => setIsScriptModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-amber-300 hover:text-amber-200 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 transition-colors shadow-sm"
          title="Zobrazit a stáhnout spouštěcí .BAT skript pro dětské PC"
        >
          <FileCode2 className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          <span>Skript .BAT na PC</span>
        </button>

        <button
          id="btn-quick-docker-modal"
          onClick={() => setIsDockerModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-indigo-300 hover:text-indigo-200 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/40 transition-colors shadow-sm"
          title="Zobrazit a stáhnout Dockerfile a konfiguraci pro server"
        >
          <Server className="w-3.5 h-3.5 text-indigo-400" />
          <span>Dockerfile / Docker</span>
        </button>

        <div className="w-px h-4 bg-slate-700 mx-0.5" />

        <button
          id="btn-switch-child-view"
          onClick={() => {
            setActiveRoleView('child');
            setIsParentPanelOpen(false);
          }}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-colors ${
            activeRoleView === 'child'
              ? 'bg-amber-500 text-slate-950'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Laptop className="w-3.5 h-3.5" />
          <span>Dětské PC (Kiosk)</span>
        </button>

        <button
          id="btn-switch-parent-view"
          onClick={() => {
            if (!isParentAuthenticated) {
              setIsPinModalOpen(true);
            } else {
              setActiveRoleView('remote_parent');
            }
          }}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-colors ${
            activeRoleView === 'remote_parent'
              ? 'bg-amber-500 text-slate-950'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Rodičovský web</span>
        </button>
      </aside>

      {/* Global Toast Banner */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl bg-amber-500 text-slate-950 font-bold text-sm shadow-2xl flex items-center gap-2 animate-fade-in">
          <ShieldCheck className="w-5 h-5" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main View Router */}
      {activeRoleView === 'remote_parent' ? (
        <div className="min-h-screen p-4 md:p-8 flex items-center justify-center">
          <ParentDashboard
            settings={settings}
            childState={childState}
            stats={stats}
            onUpdateSettings={handleUpdateSettings}
            onSendRemoteCommand={handleSendRemoteCommand}
            onResetStats={handleResetStats}
            onClose={() => setActiveRoleView('child')}
            isRemoteWebMode={true}
            onOpenScriptModal={() => setIsScriptModalOpen(true)}
          />
        </div>
      ) : (
        <ChildKioskView
          settings={settings}
          childState={childState}
          onAnswerSubmit={handleAnswerSubmit}
          onOpenParentPanel={() => setIsPinModalOpen(true)}
          onHeartbeat={handleHeartbeat}
          onOpenScriptModal={() => setIsScriptModalOpen(true)}
        />
      )}

      {/* Local Parent Dashboard Modal over Child PC */}
      {isParentPanelOpen && activeRoleView === 'child' && (
        <ParentDashboard
          settings={settings}
          childState={childState}
          stats={stats}
          onUpdateSettings={handleUpdateSettings}
          onSendRemoteCommand={handleSendRemoteCommand}
          onResetStats={handleResetStats}
          onClose={() => setIsParentPanelOpen(false)}
          isRemoteWebMode={false}
          onOpenScriptModal={() => setIsScriptModalOpen(true)}
        />
      )}

      {/* Interactive Kiosk BAT Script Dialog */}
      <KioskScriptModal
        isOpen={isScriptModalOpen}
        onClose={() => setIsScriptModalOpen(false)}
      />

      {/* Docker Server & Dockerfile Modal */}
      <DockerModal
        isOpen={isDockerModalOpen}
        onClose={() => setIsDockerModalOpen(false)}
      />

      {/* PIN Authentication Modal */}
      {isPinModalOpen && (
        <PinAuthModal
          correctPin={settings.parentPin}
          onSuccess={() => {
            setIsPinModalOpen(false);
            setIsParentAuthenticated(true);
            if (activeRoleView === 'remote_parent') {
              // Stay in remote parent view
            } else {
              setIsParentPanelOpen(true);
            }
          }}
          onCancel={() => {
            setIsPinModalOpen(false);
            if (activeRoleView === 'remote_parent') {
              setActiveRoleView('child');
            }
          }}
        />
      )}
    </div>
  );
}
