import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Unlock,
  Play,
  RotateCcw,
  Send,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  XCircle,
  Clock,
  Laptop,
  Smartphone,
  Copy,
  Check,
  Sliders,
  BookOpen,
  Gamepad2,
  BarChart3,
  KeyRound,
  Download,
  UploadCloud,
  AlertCircle,
  FileText,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  Calculator,
  Compass,
  Leaf,
  Languages,
  FileCode2,
  Terminal,
  Server
} from 'lucide-react';
import { DockerDeployTab } from './DockerDeployTab';
import {
  ParentSettings,
  ChildLiveState,
  OverallStats,
  SubjectId,
  GradeLevel,
  Question,
  AllowedApp
} from '../types';
import { uploadJsonToGoogleDrive, requestGoogleDriveToken } from '../utils/googleDrive';

interface ParentDashboardProps {
  settings: ParentSettings;
  childState: ChildLiveState;
  stats: OverallStats;
  onUpdateSettings: (newSettings: ParentSettings) => Promise<boolean>;
  onSendRemoteCommand: (command: string, payload?: Record<string, unknown>) => Promise<void>;
  onResetStats: () => Promise<void>;
  onClose: () => void;
  isRemoteWebMode?: boolean;
  onOpenScriptModal?: () => void;
}

export const ParentDashboard: React.FC<ParentDashboardProps> = ({
  settings,
  childState,
  stats,
  onUpdateSettings,
  onSendRemoteCommand,
  onResetStats,
  onClose,
  isRemoteWebMode = false,
  onOpenScriptModal,
}) => {
  // Tabs: 'remote' | 'modules' | 'apps' | 'stats' | 'security' | 'drive' | 'docker'
  const [activeTab, setActiveTab] = useState<'remote' | 'modules' | 'apps' | 'stats' | 'security' | 'drive' | 'docker'>('remote');

  // Form states for settings
  const [formData, setFormData] = useState<ParentSettings>({ ...settings });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Remote message input
  const [remoteMessage, setRemoteMessage] = useState('');
  const [isSendingMsg, setIsSendingMsg] = useState(false);

  // Link copy state
  const [copiedLink, setCopiedLink] = useState(false);

  // Google Drive state
  const [driveStatus, setDriveStatus] = useState<{
    loading: boolean;
    success?: boolean;
    fileLink?: string;
    error?: string;
  }>({ loading: false });

  // Custom question modal / fields
  const [newQuestionSubject, setNewQuestionSubject] = useState<SubjectId>('math');
  const [newQuestionGrade, setNewQuestionGrade] = useState<GradeLevel>(3);
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newQuestionAnswer, setNewQuestionAnswer] = useState('');
  const [newQuestionHint, setNewQuestionHint] = useState('');
  const [newQuestionType, setNewQuestionType] = useState<'multiple_choice' | 'text' | 'number'>('number');
  const [newQuestionOptions, setNewQuestionOptions] = useState<string>('10, 20, 30, 40');

  // PIN change state
  const [newPin, setNewPin] = useState(settings.parentPin);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    setSaveSuccessMessage(null);
    const ok = await onUpdateSettings(formData);
    setIsSaving(false);
    if (ok) {
      setSaveSuccessMessage('Nastavení bylo úspěšně uloženo a aplikováno!');
      setTimeout(() => setSaveSuccessMessage(null), 3000);
    }
  };

  const handleSendRemoteMessage = async () => {
    if (!remoteMessage.trim()) return;
    setIsSendingMsg(true);
    await onSendRemoteCommand('send_message', { message: remoteMessage.trim() });
    setIsSendingMsg(false);
    setRemoteMessage('');
  };

  const handleAddCustomQuestion = () => {
    if (!newQuestionText.trim() || !newQuestionAnswer.trim()) return;

    const newQ: Question = {
      id: 'custom-' + Date.now(),
      subjectId: newQuestionSubject,
      grade: newQuestionGrade,
      question: newQuestionText.trim(),
      correctAnswer: newQuestionAnswer.trim(),
      hint: newQuestionHint.trim() || undefined,
      type: newQuestionType,
      options:
        newQuestionType === 'multiple_choice'
          ? newQuestionOptions.split(',').map((s) => s.trim()).filter(Boolean)
          : undefined,
    };

    setFormData((prev) => ({
      ...prev,
      customQuestions: [...(prev.customQuestions || []), newQ],
    }));

    setNewQuestionText('');
    setNewQuestionAnswer('');
    setNewQuestionHint('');
  };

  const handleDeleteCustomQuestion = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      customQuestions: (prev.customQuestions || []).filter((q) => q.id !== id),
    }));
  };

  const handleCopyRemoteLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?mode=parent`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleDriveBackup = async () => {
    setDriveStatus({ loading: true });
    try {
      const token = await requestGoogleDriveToken();
      const backupData = {
        exportedAt: new Date().toISOString(),
        childName: settings.childName,
        childLiveStatus: childState.status,
        overallStats: stats,
        settings: formData,
      };
      const fileName = `Rodicovsky-Zamek-${settings.childName}-${new Date().toISOString().split('T')[0]}.json`;
      const res = await uploadJsonToGoogleDrive(token, fileName, backupData);

      if (res.success) {
        setDriveStatus({
          loading: false,
          success: true,
          fileLink: res.webViewLink,
        });
      } else {
        setDriveStatus({
          loading: false,
          error: res.error || 'Neznámá chyba při nahrávání na Google Disk',
        });
      }
    } catch (err) {
      setDriveStatus({
        loading: false,
        error: err instanceof Error ? err.message : 'Nepodařilo se připojit ke Google účtu',
      });
    }
  };

  // Render subject icon
  const getSubjectIcon = (id: SubjectId) => {
    switch (id) {
      case 'math':
        return <Calculator className="w-4 h-4 text-emerald-400" />;
      case 'czech':
        return <BookOpen className="w-4 h-4 text-sky-400" />;
      case 'geography':
        return <Compass className="w-4 h-4 text-amber-400" />;
      case 'science':
        return <Leaf className="w-4 h-4 text-teal-400" />;
      case 'english':
        return <Languages className="w-4 h-4 text-indigo-400" />;
    }
  };

  const isChildOnline = Date.now() - childState.lastHeartbeat < 15000;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-white text-lg">
                  Rodičovský panel & Vzdálená správa
                </h1>
                {isRemoteWebMode && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30">
                    Vzdálené webové rozhraní
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Správa výukových modulů, statistik a vzdálené odemykání pro: {settings.childName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!isRemoteWebMode && (
              <button
                id="btn-close-parent-panel"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors border border-slate-700"
              >
                Návrat na dětskou obrazovku
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 border-b border-slate-800 bg-slate-950/40 flex overflow-x-auto gap-1 py-2">
          <button
            id="tab-parent-remote"
            onClick={() => setActiveTab('remote')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
              activeTab === 'remote'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Vzdálený dohled a příkazy</span>
            {isChildOnline && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping ml-1" />
            )}
          </button>

          <button
            id="tab-parent-modules"
            onClick={() => setActiveTab('modules')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
              activeTab === 'modules'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Výukové moduly & Úkoly</span>
          </button>

          <button
            id="tab-parent-apps"
            onClick={() => setActiveTab('apps')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
              activeTab === 'apps'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Gamepad2 className="w-4 h-4" />
            <span>Povolené hry & Čas</span>
          </button>

          <button
            id="tab-parent-stats"
            onClick={() => setActiveTab('stats')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
              activeTab === 'stats'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Statistiky & Úspěšnost</span>
          </button>

          <button
            id="tab-parent-drive"
            onClick={() => setActiveTab('drive')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
              activeTab === 'drive'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            <span>Google Drive Záloha</span>
          </button>

          <button
            id="tab-parent-security"
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
              activeTab === 'security'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>PIN a Kiosk návod</span>
          </button>

          <button
            id="tab-parent-docker"
            onClick={() => setActiveTab('docker')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
              activeTab === 'docker'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Server className="w-4 h-4" />
            <span>Docker & Server</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {saveSuccessMessage && (
            <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-sm flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>{saveSuccessMessage}</span>
            </div>
          )}

          {/* TAB 1: REMOTE MONITORING & ACTIONS */}
          {activeTab === 'remote' && (
            <div className="space-y-6">
              {/* Live Status Card */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400 block font-medium">Stav Dětského PC</span>
                    <span className="text-lg font-bold text-white flex items-center gap-2 mt-1">
                      <span
                        className={`w-3 h-3 rounded-full ${
                          isChildOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                        }`}
                      />
                      {isChildOnline ? 'Online na síti' : 'Offline / Čeká se'}
                    </span>
                  </div>
                  <Laptop className="w-8 h-8 text-slate-600" />
                </div>

                <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400 block font-medium">Aktuální režim</span>
                    <span className="text-lg font-bold text-white mt-1 block">
                      {childState.status === 'unlocked_playing' ? (
                        <span className="text-emerald-400 flex items-center gap-1.5">
                          <Unlock className="w-4 h-4" /> Odemčeno (Hraní)
                        </span>
                      ) : childState.status === 'time_expired' ? (
                        <span className="text-rose-400 flex items-center gap-1.5">
                          <Clock className="w-4 h-4" /> Čas vypršel
                        </span>
                      ) : (
                        <span className="text-amber-400 flex items-center gap-1.5">
                          <Lock className="w-4 h-4" /> Uzamčeno (Učení)
                        </span>
                      )}
                    </span>
                  </div>
                  <ShieldCheck className="w-8 h-8 text-slate-600" />
                </div>

                <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400 block font-medium">Zbývající čas hraní</span>
                    <span className="text-2xl font-mono font-bold text-white mt-1 block">
                      {Math.floor(childState.playtimeRemainingSeconds / 60)} min
                    </span>
                  </div>
                  <Clock className="w-8 h-8 text-slate-600" />
                </div>
              </div>

              {/* PRIMARY REMOTE ACTIONS */}
              <div className="bg-gradient-to-br from-amber-500/10 via-slate-900 to-indigo-950/40 p-6 rounded-2xl border border-amber-500/30">
                <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                  <Unlock className="w-5 h-5 text-amber-400" />
                  Rychlé dálkové akce pro rodiče
                </h3>
                <p className="text-xs text-slate-300 mb-6">
                  Zde můžete jedním kliknutím přeskočit úkoly, okamžitě odemknout počítač pro dítě, nebo naopak zablokovat obrazovku.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* ONE-CLICK REMOTE BYPASS (Requirement: moznost pro rodice preskocit ukoly) */}
                  <button
                    id="btn-remote-skip-tasks"
                    onClick={() => onSendRemoteCommand('skip_tasks')}
                    className="p-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-900/30 flex flex-col items-center justify-center gap-2 transition-all group"
                  >
                    <Unlock className="w-6 h-6 group-hover:scale-110 transition-transform" />
                    <span>Přeskočit úkoly & Odemknout</span>
                    <span className="text-[10px] font-normal text-emerald-200">
                      Okamžité dálkové odemknutí
                    </span>
                  </button>

                  <button
                    id="btn-remote-force-lock"
                    onClick={() => onSendRemoteCommand('force_lock')}
                    className="p-4 rounded-xl bg-rose-700 hover:bg-rose-600 text-white font-bold text-sm shadow-lg shadow-rose-900/30 flex flex-col items-center justify-center gap-2 transition-all group"
                  >
                    <Lock className="w-6 h-6 group-hover:scale-110 transition-transform" />
                    <span>Okamžitě zamknout PC</span>
                    <span className="text-[10px] font-normal text-rose-200">
                      Vrátit zámek na obrazovku
                    </span>
                  </button>

                  <button
                    id="btn-remote-add-15m"
                    onClick={() => onSendRemoteCommand('add_playtime', { minutes: 15 })}
                    className="p-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm border border-slate-700 flex flex-col items-center justify-center gap-2 transition-all group"
                  >
                    <Clock className="w-6 h-6 text-amber-400 group-hover:scale-110 transition-transform" />
                    <span>Přidat +15 minut</span>
                    <span className="text-[10px] font-normal text-slate-400">
                      Bonusový čas na hry
                    </span>
                  </button>

                  <button
                    id="btn-remote-reset-tasks"
                    onClick={() => onSendRemoteCommand('reset_session')}
                    className="p-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm border border-slate-700 flex flex-col items-center justify-center gap-2 transition-all group"
                  >
                    <RotateCcw className="w-6 h-6 text-sky-400 group-hover:scale-110 transition-transform" />
                    <span>Znovu vyžadovat úkoly</span>
                    <span className="text-[10px] font-normal text-slate-400">
                      Vynulovat postup v sezení
                    </span>
                  </button>
                </div>
              </div>

              {/* Real-time child module progress monitor */}
              <div className="bg-slate-950/60 p-6 rounded-2xl border border-slate-800">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-sky-400" />
                  Průběžný stav řešení jednotlivých předmětů
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(Object.keys(formData.modules) as SubjectId[]).map((sId) => {
                    const conf = formData.modules[sId];
                    if (!conf.enabled) return null;
                    const p = childState.moduleProgress[sId] || { completed: 0, required: conf.requiredQuestionsCount };
                    const isDone = p.completed >= conf.requiredQuestionsCount;

                    return (
                      <div
                        key={sId}
                        className={`p-4 rounded-xl border ${
                          isDone
                            ? 'bg-emerald-950/30 border-emerald-500/40'
                            : 'bg-slate-900 border-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-sm text-white flex items-center gap-2">
                            {getSubjectIcon(sId)}
                            {conf.name}
                          </span>
                          {isDone ? (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Splněno
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">
                              {p.completed} / {conf.requiredQuestionsCount} úloh
                            </span>
                          )}
                        </div>
                        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-500 rounded-full transition-all"
                            style={{
                              width: `${Math.min(100, (p.completed / conf.requiredQuestionsCount) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Send live message to child screen */}
              <div className="bg-slate-950/60 p-6 rounded-2xl border border-slate-800">
                <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                  <Send className="w-4 h-4 text-indigo-400" />
                  Odeslat živou zprávu na dětskou obrazovku
                </h3>
                <p className="text-xs text-slate-400 mb-4">
                  Zpráva se okamžitě zobrazí na horní liště dětského monitoru.
                </p>
                <div className="flex gap-3">
                  <input
                    id="input-parent-message"
                    type="text"
                    value={remoteMessage}
                    onChange={(e) => setRemoteMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSendRemoteMessage();
                    }}
                    placeholder="Např: Za chvíli je večeře! Ještě 2 příklady a máš volno..."
                    className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 text-sm"
                  />
                  <button
                    id="btn-send-parent-message"
                    onClick={handleSendRemoteMessage}
                    disabled={isSendingMsg || !remoteMessage.trim()}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-2 transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Odeslat</span>
                  </button>
                </div>
              </div>

              {/* Shareable Remote Web Link (Requirement: vzdálené sledování pokroku dítěte prostřednictvím webového rozhraní) */}
              <div className="bg-slate-950/60 p-6 rounded-2xl border border-slate-800">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
                      <Smartphone className="w-4 h-4 text-emerald-400" />
                      Vzdálený přístup pro rodiče (z mobilu nebo tabletu)
                    </h3>
                    <p className="text-xs text-slate-400">
                      Otevřete tento odkaz na svém telefonu pro sledování a odemykání odkudkoliv v domácnosti:
                    </p>
                  </div>
                  <button
                    id="btn-copy-remote-link"
                    onClick={handleCopyRemoteLink}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 transition-colors border border-slate-700 shrink-0"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'Zkopírováno!' : 'Kopírovat webový odkaz'}</span>
                  </button>
                </div>
                <div className="mt-3 p-3 rounded-xl bg-slate-900 font-mono text-xs text-amber-300 break-all border border-slate-800">
                  {typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}?mode=parent` : ''}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MODULES & TASK CONFIG */}
          {activeTab === 'modules' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">Konfigurace výukových předmětů</h3>
                  <p className="text-xs text-slate-400">
                    Aktivujte předměty, které musí dítě před hraním splnit, a nastavte obtížnost podle třídy.
                  </p>
                </div>
                <button
                  id="btn-save-modules"
                  onClick={handleSaveSettings}
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 transition-all shadow-md"
                >
                  <Save className="w-4 h-4" />
                  <span>Uložit změny</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(Object.keys(formData.modules) as SubjectId[]).map((sId) => {
                  const conf = formData.modules[sId];
                  return (
                    <div
                      key={sId}
                      className={`p-5 rounded-2xl border transition-all ${
                        conf.enabled
                          ? 'bg-slate-950/70 border-slate-700'
                          : 'bg-slate-950/30 border-slate-800 opacity-60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-xl bg-slate-800">
                            {getSubjectIcon(sId)}
                          </div>
                          <div>
                            <h4 className="font-bold text-white text-sm">{conf.name}</h4>
                            <p className="text-xs text-slate-400">{conf.description}</p>
                          </div>
                        </div>

                        {/* Toggle switch */}
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={conf.enabled}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setFormData((prev) => ({
                                ...prev,
                                modules: {
                                  ...prev.modules,
                                  [sId]: { ...conf, enabled: checked },
                                },
                              }));
                            }}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                        </label>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800/80 text-xs">
                        <div>
                          <label className="block text-slate-400 mb-1 font-medium">Ročník / Třída:</label>
                          <select
                            value={conf.grade}
                            onChange={(e) => {
                              const grade = Number(e.target.value) as GradeLevel;
                              setFormData((prev) => ({
                                ...prev,
                                modules: {
                                  ...prev.modules,
                                  [sId]: { ...conf, grade },
                                },
                              }));
                            }}
                            className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-medium"
                          >
                            <option value={1}>1. třída ZŠ</option>
                            <option value={2}>2. třída ZŠ</option>
                            <option value={3}>3. třída ZŠ</option>
                            <option value={4}>4. třída ZŠ</option>
                            <option value={5}>5. třída ZŠ</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-slate-400 mb-1 font-medium">Počet nutných úloh:</label>
                          <input
                            type="number"
                            min={1}
                            max={20}
                            value={conf.requiredQuestionsCount}
                            onChange={(e) => {
                              const val = Math.max(1, Number(e.target.value));
                              setFormData((prev) => ({
                                ...prev,
                                modules: {
                                  ...prev.modules,
                                  [sId]: { ...conf, requiredQuestionsCount: val },
                                },
                              }));
                            }}
                            className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-medium"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* CUSTOM QUESTIONS CREATOR */}
              <div className="bg-slate-950/70 p-6 rounded-2xl border border-slate-800">
                <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-amber-400" />
                  Přidat vlastní otázku do výuky
                </h3>
                <p className="text-xs text-slate-400 mb-4">
                  Můžete přidat specifické otázky nebo příklady z učebnice, které dítě právě probírá ve škole.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Předmět:</label>
                    <select
                      value={newQuestionSubject}
                      onChange={(e) => setNewQuestionSubject(e.target.value as SubjectId)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                    >
                      <option value="math">Matematika</option>
                      <option value="czech">Český jazyk</option>
                      <option value="geography">Vlastivěda</option>
                      <option value="science">Přírodověda</option>
                      <option value="english">Anglický jazyk</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Třída:</label>
                    <select
                      value={newQuestionGrade}
                      onChange={(e) => setNewQuestionGrade(Number(e.target.value) as GradeLevel)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                    >
                      <option value={1}>1. třída</option>
                      <option value={2}>2. třída</option>
                      <option value={3}>3. třída</option>
                      <option value={4}>4. třída</option>
                      <option value={5}>5. třída</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Typ odpovědi:</label>
                    <select
                      value={newQuestionType}
                      onChange={(e) => setNewQuestionType(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                    >
                      <option value="number">Číslo</option>
                      <option value="text">Text (jednoslovný)</option>
                      <option value="multiple_choice">Výběr z možností</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Text otázky / zadání:</label>
                    <input
                      type="text"
                      value={newQuestionText}
                      onChange={(e) => setNewQuestionText(e.target.value)}
                      placeholder="Např: Kolik je 12 × 5? nebo Jaké je hlavní město Francie?"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                    />
                  </div>

                  {newQuestionType === 'multiple_choice' && (
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Možnosti (oddělené čárkou):</label>
                      <input
                        type="text"
                        value={newQuestionOptions}
                        onChange={(e) => setNewQuestionOptions(e.target.value)}
                        placeholder="Paříž, Berlín, Londýn, Řím"
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Správná odpověď:</label>
                      <input
                        type="text"
                        value={newQuestionAnswer}
                        onChange={(e) => setNewQuestionAnswer(e.target.value)}
                        placeholder="Přesná odpověď (např. 60 nebo Paříž)"
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Nápověda pro dítě (volitelná):</label>
                      <input
                        type="text"
                        value={newQuestionHint}
                        onChange={(e) => setNewQuestionHint(e.target.value)}
                        placeholder="Např. Leží na řece Seině"
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                      />
                    </div>
                  </div>

                  <button
                    id="btn-add-custom-question"
                    onClick={handleAddCustomQuestion}
                    disabled={!newQuestionText.trim() || !newQuestionAnswer.trim()}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Vložit otázku do výuky</span>
                  </button>
                </div>

                {/* List of custom questions */}
                {formData.customQuestions && formData.customQuestions.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-slate-800">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                      Vaše přidané otázky ({formData.customQuestions.length})
                    </h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {formData.customQuestions.map((q) => (
                        <div
                          key={q.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            {getSubjectIcon(q.subjectId)}
                            <div>
                              <span className="font-semibold text-white block">{q.question}</span>
                              <span className="text-slate-400 text-[11px]">
                                Odpověď: <strong className="text-emerald-300">{q.correctAnswer}</strong> ({q.grade}. třída)
                              </span>
                            </div>
                          </div>
                          <button
                            id={`btn-delete-q-${q.id}`}
                            onClick={() => handleDeleteCustomQuestion(q.id)}
                            className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/20 transition-colors"
                            title="Smazat otázku"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: ALLOWED APPS & PLAYTIME */}
          {activeTab === 'apps' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">Správa her a denního limitu</h3>
                  <p className="text-xs text-slate-400">
                    Nastavte povolené hry a délku povoleného hraní po splnění úkolů.
                  </p>
                </div>
                <button
                  id="btn-save-apps"
                  onClick={handleSaveSettings}
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 transition-all shadow-md"
                >
                  <Save className="w-4 h-4" />
                  <span>Uložit změny</span>
                </button>
              </div>

              {/* Playtime Slider */}
              <div className="bg-slate-950/70 p-6 rounded-2xl border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-400" />
                    Denní limit na hraní po splnění úkolů:
                  </span>
                  <span className="text-xl font-bold font-mono text-amber-400">
                    {formData.dailyPlaytimeMinutes} minut
                  </span>
                </div>
                <input
                  type="range"
                  min={15}
                  max={180}
                  step={15}
                  value={formData.dailyPlaytimeMinutes}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      dailyPlaytimeMinutes: Number(e.target.value),
                    }))
                  }
                  className="w-full accent-amber-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-slate-500 mt-2 font-mono">
                  <span>15 min</span>
                  <span>45 min</span>
                  <span>90 min</span>
                  <span>120 min</span>
                  <span>180 min (3 hod)</span>
                </div>
              </div>

              {/* Apps List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {formData.allowedApps.map((app: AllowedApp) => (
                  <div
                    key={app.id}
                    className={`p-4 rounded-2xl border flex items-start justify-between gap-4 transition-all ${
                      app.enabled
                        ? 'bg-slate-950/70 border-slate-700'
                        : 'bg-slate-950/30 border-slate-800 opacity-60'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-amber-400 shrink-0">
                        <Gamepad2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-sm">{app.name}</h4>
                        <p className="text-xs text-slate-400 mt-0.5">{app.description}</p>
                        <span className="inline-block mt-2 text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold uppercase">
                          {app.category}
                        </span>
                      </div>
                    </div>

                    {/* Toggle */}
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={app.enabled}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setFormData((prev) => ({
                            ...prev,
                            allowedApps: prev.allowedApps.map((a) =>
                              a.id === app.id ? { ...a, enabled: checked } : a
                            ),
                          }));
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: STATISTICS (Requirement: zaznamenavat statistiky uspesnosti plneni ukolu) */}
          {activeTab === 'stats' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">Statistiky a úspěšnost učení</h3>
                  <p className="text-xs text-slate-400">
                    Sledování výsledků, chyb a historie všech odpovědí dítěte.
                  </p>
                </div>
                <button
                  id="btn-reset-stats"
                  onClick={onResetStats}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-rose-950 hover:text-rose-300 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Vynulovat statistiky</span>
                </button>
              </div>

              {/* KPI metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-950/70 p-5 rounded-2xl border border-slate-800">
                  <span className="text-xs text-slate-400 block font-medium">Celková úspěšnost</span>
                  <div className="text-3xl font-extrabold text-white mt-1 flex items-baseline gap-2">
                    <span className={stats.accuracyPercent >= 75 ? 'text-emerald-400' : 'text-amber-400'}>
                      {stats.accuracyPercent}%
                    </span>
                    <span className="text-xs text-slate-400 font-normal">
                      ({stats.totalCorrect} z {stats.totalAnswered} správně)
                    </span>
                  </div>
                </div>

                <div className="bg-slate-950/70 p-5 rounded-2xl border border-slate-800">
                  <span className="text-xs text-slate-400 block font-medium">Vyřešených úloh celkem</span>
                  <div className="text-3xl font-extrabold text-white mt-1">
                    {stats.totalAnswered}
                  </div>
                </div>

                <div className="bg-slate-950/70 p-5 rounded-2xl border border-slate-800">
                  <span className="text-xs text-slate-400 block font-medium">Průměrný čas na otázku</span>
                  <div className="text-3xl font-extrabold text-sky-400 mt-1">
                    {stats.recentAttempts.length > 0
                      ? Math.round(
                          stats.recentAttempts.reduce((acc, c) => acc + c.timeSpentSeconds, 0) /
                            stats.recentAttempts.length
                        )
                      : 0}{' '}
                    sekund
                  </div>
                </div>
              </div>

              {/* Breakdown by subject */}
              <div className="bg-slate-950/70 p-6 rounded-2xl border border-slate-800">
                <h4 className="text-sm font-bold text-white mb-4">Úspěšnost podle předmětů</h4>
                <div className="space-y-4">
                  {(Object.keys(formData.modules) as SubjectId[]).map((sId) => {
                    const conf = formData.modules[sId];
                    const subStat = stats.subjectBreakdown[sId] || { answered: 0, correct: 0, accuracy: 0 };

                    return (
                      <div key={sId}>
                        <div className="flex justify-between text-xs font-semibold mb-1">
                          <span className="flex items-center gap-2 text-white">
                            {getSubjectIcon(sId)}
                            {conf.name}
                          </span>
                          <span className="text-slate-300">
                            {subStat.accuracy}% ({subStat.correct}/{subStat.answered})
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              subStat.accuracy >= 80
                                ? 'bg-emerald-400'
                                : subStat.accuracy >= 60
                                ? 'bg-amber-400'
                                : 'bg-rose-400'
                            }`}
                            style={{ width: `${subStat.accuracy}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Detailed log of attempts */}
              <div className="bg-slate-950/70 p-6 rounded-2xl border border-slate-800">
                <h4 className="text-sm font-bold text-white mb-3">Protokol posledních pokusů</h4>
                {stats.recentAttempts.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4 text-center">Zatím nebyly zaznamenány žádné odpovědi.</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {stats.recentAttempts.map((att) => (
                      <div
                        key={att.id}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                          att.isCorrect
                            ? 'bg-emerald-950/20 border-emerald-500/20'
                            : 'bg-rose-950/20 border-rose-500/20'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          {att.isCorrect ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : (
                            <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                          )}
                          <div>
                            <div className="font-semibold text-white">{att.questionText}</div>
                            <div className="text-[11px] text-slate-400">
                              Odpověď dítěte: <strong className="text-slate-200">{att.userAnswer}</strong>
                              {!att.isCorrect && (
                                <span className="text-emerald-300 ml-2">
                                  (Správně: {att.correctAnswer})
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[10px] text-slate-500 font-mono block">
                            {new Date(att.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {att.timeSpentSeconds}s
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: GOOGLE DRIVE BACKUP (Google Workspace Drive Integration) */}
          {activeTab === 'drive' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <UploadCloud className="w-5 h-5 text-sky-400" />
                  Google Drive Záloha & Export výukových reportů
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Uložte si statistiky úspěšnosti a kompletní konfiguraci rodičovského zámku na svůj Google Disk pro dlouhodobý přehled.
                </p>
              </div>

              <div className="bg-slate-950/70 p-6 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">Záložní report: FoXKidLock-Report</h4>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Zahrnuje celkovou úspěšnost, počet zvládnutých úloh, detailní rozbor chyb podle předmětů a konfiguraci aktivních modulů pro dítě: <strong>{settings.childName}</strong>.
                    </p>
                  </div>
                </div>

                {driveStatus.success && driveStatus.fileLink && (
                  <div className="p-4 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-between">
                    <span className="flex items-center gap-2 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      Report byl úspěšně nahrán na váš Google Disk!
                    </span>
                    <a
                      href={driveStatus.fileLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1 transition-colors"
                    >
                      <span>Otevřít na Disku</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}

                {driveStatus.error && (
                  <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{driveStatus.error}</span>
                  </div>
                )}

                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    id="btn-upload-google-drive"
                    onClick={handleDriveBackup}
                    disabled={driveStatus.loading}
                    className="px-6 py-3 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-lg shadow-sky-900/30"
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>{driveStatus.loading ? 'Nahrávám na Google Disk...' : 'Zálohovat na Google Disk'}</span>
                  </button>

                  {/* Direct JSON download option */}
                  <button
                    id="btn-download-json-backup"
                    onClick={() => {
                      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(
                        JSON.stringify({ settings: formData, stats, childState }, null, 2)
                      );
                      const downloadAnchor = document.createElement('a');
                      downloadAnchor.setAttribute('href', dataStr);
                      downloadAnchor.setAttribute('download', `rodicovsky-zamek-${settings.childName}.json`);
                      document.body.appendChild(downloadAnchor);
                      downloadAnchor.click();
                      downloadAnchor.remove();
                    }}
                    className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 flex items-center gap-2 transition-colors"
                  >
                    <Download className="w-4 h-4 text-amber-400" />
                    <span>Stáhnout zálohu jako JSON soubor</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: SECURITY & KIOSK SCRIPT SETUP */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-amber-400" />
                  Bezpečnostní PIN a návod na Kiosk režim
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Změna přístupového hesla a konfigurace spuštění v celoobrazovkovém režimu na popředí.
                </p>
              </div>

              {/* Master PIN Settings */}
              <div className="bg-slate-950/70 p-6 rounded-2xl border border-slate-800 space-y-4">
                <h4 className="font-bold text-white text-sm">Hlavní rodičovský PIN</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Nový 4-místný PIN:</label>
                    <input
                      id="input-parent-new-pin"
                      type="password"
                      maxLength={8}
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value)}
                      className="w-full px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-center tracking-widest text-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Jméno dítěte:</label>
                    <input
                      id="input-child-name"
                      type="text"
                      value={formData.childName}
                      onChange={(e) => setFormData((prev) => ({ ...prev, childName: e.target.value }))}
                      className="w-full px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    id="btn-save-pin"
                    onClick={() => {
                      setFormData((prev) => ({ ...prev, parentPin: newPin }));
                      onUpdateSettings({ ...formData, parentPin: newPin });
                    }}
                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    <span>Uložit nový PIN</span>
                  </button>
                </div>
              </div>

              {/* Kiosk Mode Enforcer & Windows/Linux Autostart Scripts (Requirement: aplikace bude vzdy na popredi) */}
              <div className="bg-slate-950/70 p-6 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="font-bold text-white text-sm flex items-center gap-2">
                      <Laptop className="w-4 h-4 text-emerald-400" />
                      Dávkové soubory (.BAT) pro spuštění na dětském PC
                    </h4>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      Aby dítě nemohlo aplikaci vypnout, minimalizovat ani používat jiné programy bez splnění úkolů, spusťte na dětském PC skript <strong>Spustit-Kiosk-Zamek.bat</strong>. Prohlížeč (Chrome nebo Edge) poběží bez horní lišty a adresního řádku v režimu Kiosk.
                    </p>
                  </div>
                  {onOpenScriptModal && (
                    <button
                      type="button"
                      onClick={onOpenScriptModal}
                      className="shrink-0 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <Terminal className="w-3.5 h-3.5 text-amber-400" />
                      <span>Otevřít průvodce .BAT</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between gap-3">
                    <div>
                      <span className="text-xs font-bold text-white block">1. Spustit-Kiosk-Zamek.bat</span>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Spustí aplikaci ve fullscreen Kiosk módu (automaticky detekuje Chrome i Edge).
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <a
                        href="/api/download-bat"
                        download="Spustit-Kiosk-Zamek.bat"
                        className="px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Stáhnout .BAT</span>
                      </a>
                      <a
                        href="/public/Spustit-Kiosk-Zamek.bat"
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 transition-colors"
                      >
                        <FileCode2 className="w-3.5 h-3.5" />
                        <span>Zobrazit soubor</span>
                      </a>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between gap-3">
                    <div>
                      <span className="text-xs font-bold text-white block">2. Instalovat-Po-Spusteni.bat</span>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Automaticky nakopíruje zámek do složky "Po spuštění" (Autostart) ve Windows.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <a
                        href="/public/Instalovat-Po-Spusteni.bat"
                        download="Instalovat-Po-Spusteni.bat"
                        className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Stáhnout Autostart .BAT</span>
                      </a>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>
                    Fyzické umístění souborů v projektu: <code className="text-amber-300 font-mono">/public/Spustit-Kiosk-Zamek.bat</code>
                  </span>
                  <a
                    href="/public/NAVOD-KIOSK-WINDOWS.txt"
                    target="_blank"
                    rel="noreferrer"
                    className="text-amber-400 hover:underline flex items-center gap-1"
                  >
                    <span>Podrobný textový návod (.txt)</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: DOCKER & SERVER DEPLOYMENT */}
          {activeTab === 'docker' && (
            <DockerDeployTab />
          )}
        </div>
      </div>
    </div>
  );
};
