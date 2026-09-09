import React, { useState, useEffect, useRef } from 'react';
import {
  Lock,
  Unlock,
  Sparkles,
  Award,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  HelpCircle,
  Lightbulb,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Play,
  RotateCcw,
  PenTool,
  Gamepad2,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  ChevronRight,
  BookOpen,
  Calculator,
  Compass,
  Leaf,
  Languages,
  FileCode2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  SubjectId,
  Question,
  ParentSettings,
  ChildLiveState,
  AllowedApp
} from '../types';
import { DEFAULT_QUESTIONS } from '../data/defaultQuestions';
import { soundFx } from '../utils/audio';

interface ChildKioskViewProps {
  settings: ParentSettings;
  childState: ChildLiveState;
  onAnswerSubmit: (data: {
    subjectId: SubjectId;
    questionText: string;
    userAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
    timeSpentSeconds: number;
  }) => void;
  onOpenParentPanel: () => void;
  onHeartbeat: (kioskActive: boolean, remainingSec: number, activeSubject: SubjectId) => void;
  onOpenScriptModal?: () => void;
}

export const ChildKioskView: React.FC<ChildKioskViewProps> = ({
  settings,
  childState,
  onAnswerSubmit,
  onOpenParentPanel,
  onHeartbeat,
  onOpenScriptModal,
}) => {
  // Enabled subjects
  const enabledSubjects = (Object.keys(settings.modules) as SubjectId[]).filter(
    (sId) => settings.modules[sId]?.enabled
  );

  const [activeSubject, setActiveSubject] = useState<SubjectId>(
    enabledSubjects[0] || 'math'
  );

  // Available questions for current subject & grade
  const subjectConfig = settings.modules[activeSubject];
  const allQuestions = [
    ...DEFAULT_QUESTIONS,
    ...(settings.customQuestions || []),
  ].filter(
    (q) =>
      q.subjectId === activeSubject &&
      (subjectConfig ? q.grade <= subjectConfig.grade : true)
  );

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const activeQuestion: Question | undefined =
    allQuestions[currentQuestionIndex % (allQuestions.length || 1)] || allQuestions[0];

  // User input state
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [textInput, setTextInput] = useState<string>('');
  const [feedback, setFeedback] = useState<{
    status: 'idle' | 'correct' | 'wrong';
    message: string;
  }>({ status: 'idle', message: '' });
  const [showHint, setShowHint] = useState(false);
  const [showScratchpad, setShowScratchpad] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());

  // Kiosk & Anti-cheat states
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCheatWarningOpen, setIsCheatWarningOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Canvas scratchpad ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Playtime countdown
  const [playtimeSeconds, setPlaytimeSeconds] = useState(
    childState.playtimeRemainingSeconds || settings.dailyPlaytimeMinutes * 60
  );

  // Sync playtime from childState when updated from server/remote
  useEffect(() => {
    if (childState.playtimeRemainingSeconds !== undefined) {
      setPlaytimeSeconds(childState.playtimeRemainingSeconds);
    }
  }, [childState.playtimeRemainingSeconds]);

  // Countdown timer when unlocked
  useEffect(() => {
    if (childState.status === 'unlocked_playing') {
      const interval = setInterval(() => {
        setPlaytimeSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [childState.status]);

  // Trigger celebration confetti when transitioning to unlocked
  useEffect(() => {
    if (childState.status === 'unlocked_playing') {
      soundFx.playCelebration();
      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
        });
      } catch {
        // Ignore
      }
    }
  }, [childState.status]);

  // Heartbeat & focus watcher for kiosk mode
  useEffect(() => {
    const handleBlur = () => {
      if (settings.strictKioskMode && childState.status === 'locked_studying') {
        setIsCheatWarningOpen(true);
        if (soundEnabled) soundFx.playWarning();
      }
    };

    const handleFocus = () => {
      // Returned to window
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent escape or common shortcuts from accidentally quitting kiosk
      if (e.key === 'F11') {
        e.preventDefault();
        toggleFullscreen();
      }
    };

    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('keydown', handleKeyDown);

    const hbInterval = setInterval(() => {
      onHeartbeat(isFullscreen, playtimeSeconds, activeSubject);
    }, 4000);

    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('keydown', handleKeyDown);
      clearInterval(hbInterval);
    };
  }, [settings.strictKioskMode, childState.status, isFullscreen, playtimeSeconds, activeSubject, soundEnabled]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const handleCheckAnswer = () => {
    if (!activeQuestion) return;

    const answer =
      activeQuestion.type === 'multiple_choice'
        ? selectedOption
        : textInput.trim();

    if (!answer) return;

    const cleanUser = answer.toLowerCase().trim();
    const cleanCorrect = activeQuestion.correctAnswer.toLowerCase().trim();
    const isCorrect = cleanUser === cleanCorrect;

    const timeSpent = Math.max(1, Math.round((Date.now() - questionStartTime) / 1000));

    if (isCorrect) {
      if (soundEnabled) soundFx.playCorrect();
      setFeedback({
        status: 'correct',
        message: 'Výborně! Správná odpověď.',
      });
    } else {
      if (soundEnabled) soundFx.playWrong();
      setFeedback({
        status: 'wrong',
        message: activeQuestion.explanation || `Není to úplně správně. Správná odpověď byla: ${activeQuestion.correctAnswer}`,
      });
    }

    onAnswerSubmit({
      subjectId: activeSubject,
      questionText: activeQuestion.question,
      userAnswer: answer,
      correctAnswer: activeQuestion.correctAnswer,
      isCorrect,
    timeSpentSeconds: timeSpent,
    });
  };

  const handleNextQuestion = () => {
    setSelectedOption('');
    setTextInput('');
    setFeedback({ status: 'idle', message: '' });
    setShowHint(false);
    setQuestionStartTime(Date.now());
    clearScratchpad();
    setCurrentQuestionIndex((prev) => prev + 1);
  };

  // Scratchpad drawing handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearScratchpad = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  // Icon helper
  const renderSubjectIcon = (id: SubjectId) => {
    switch (id) {
      case 'math':
        return <Calculator className="w-5 h-5" />;
      case 'czech':
        return <BookOpen className="w-5 h-5" />;
      case 'geography':
        return <Compass className="w-5 h-5" />;
      case 'science':
        return <Leaf className="w-5 h-5" />;
      case 'english':
        return <Languages className="w-5 h-5" />;
      default:
        return <BookOpen className="w-5 h-5" />;
    }
  };

  // Format seconds to mm:ss
  const formatTime = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Check overall module completion
  const currentProgress = childState.moduleProgress[activeSubject] || {
    completed: 0,
    required: subjectConfig?.requiredQuestionsCount || 3,
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100 select-none">
      {/* Kiosk Mode Top Navigation Bar */}
      <header className="px-6 py-4 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold">
            {childState.status === 'unlocked_playing' ? (
              <Unlock className="w-5 h-5 text-emerald-400 animate-pulse" />
            ) : (
              <Lock className="w-5 h-5 text-amber-400" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-tight text-lg text-white">
                Rodičovský zámek
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium">
                Profil: {settings.childName}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {childState.status === 'unlocked_playing'
                ? 'Počítač je odemčen! Užij si volný čas.'
                : 'Vyřeš zadané úkoly pro odemknutí her a aplikací.'}
            </p>
          </div>
        </div>

        {/* Live remote message toast if parent sent one */}
        {childState.activeMessageFromParent && (
          <div className="hidden md:flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-200 text-sm animate-bounce">
            <Send className="w-3.5 h-3.5 text-indigo-400" />
            <span>Zpráva od rodičů: <strong>{childState.activeMessageFromParent}</strong></span>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            id="btn-sound-toggle"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
            title={soundEnabled ? 'Ztlumit zvuk' : 'Zapnout zvuk'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-rose-400" />}
          </button>

          <button
            id="btn-fullscreen-toggle"
            onClick={toggleFullscreen}
            className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
            title="Přepnout celou obrazovku (Kiosk)"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {onOpenScriptModal && (
            <button
              id="btn-header-bat-script"
              onClick={onOpenScriptModal}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 transition-colors"
              title="Stáhnout a zobrazit .BAT spouštěcí skript pro dětské PC"
            >
              <FileCode2 className="w-3.5 h-3.5 text-amber-400" />
              <span>.BAT skript na PC</span>
            </button>
          )}

          {/* Discreet Parental unlock / settings button */}
          <button
            id="btn-parent-unlock"
            onClick={onOpenParentPanel}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>Rodičovský panel (PIN)</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-8 flex flex-col justify-center">
        {/* CASE A: UNLOCKED - PLAY TIME & APPS LAUNCHER */}
        {childState.status === 'unlocked_playing' ? (
          <div className="bg-slate-900/90 border border-emerald-500/30 rounded-3xl p-6 md:p-10 shadow-2xl backdrop-blur-xl animate-fade-in">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-b border-slate-800 pb-8 mb-8">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <Award className="w-8 h-8" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold mb-2">
                    <Sparkles className="w-3.5 h-3.5" />
                    Všechny úkoly splněny!
                  </div>
                  <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                    Počítač je odemčen, {settings.childName}!
                  </h1>
                  <p className="text-slate-400 text-sm mt-1">
                    Skvělá práce při řešení úkolů. Nyní máš přístup k povoleným hrám a zábavě.
                  </p>
                </div>
              </div>

              {/* Playtime Clock */}
              <div className="bg-slate-950/80 border border-emerald-500/30 rounded-2xl px-6 py-4 flex items-center gap-4 text-right">
                <Clock className="w-8 h-8 text-emerald-400 animate-spin-slow" />
                <div>
                  <div className="text-xs text-slate-400 font-medium">Zbývající herní čas</div>
                  <div className="text-3xl font-mono font-black text-emerald-300">
                    {formatTime(playtimeSeconds)}
                  </div>
                </div>
              </div>
            </div>

            {/* Allowed Apps Grid */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Gamepad2 className="w-5 h-5 text-amber-400" />
                  Povolené hry a aplikace
                </h2>
                <span className="text-xs text-slate-400">
                  Kliknutím otevřeš vybranou aplikaci
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {settings.allowedApps
                  .filter((app) => app.enabled)
                  .map((app: AllowedApp) => (
                    <div
                      key={app.id}
                      className="group relative bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-5 transition-all duration-200 flex flex-col justify-between hover:shadow-lg"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
                          <Gamepad2 className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="font-bold text-white group-hover:text-emerald-300 transition-colors">
                            {app.name}
                          </h3>
                          <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                            {app.description}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 pt-3 border-t border-slate-800/60 flex items-center justify-between">
                        <span className="text-xs px-2.5 py-0.5 rounded-md bg-slate-800 text-slate-300 font-medium capitalize">
                          {app.category}
                        </span>
                        {app.url ? (
                          <a
                            href={app.url}
                            target={app.url.startsWith('http') ? '_blank' : '_self'}
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors"
                          >
                            <span>Spustit</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        ) : (
                          <span className="text-xs text-slate-400 italic">
                            Spusťte na ploše
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        ) : childState.status === 'time_expired' ? (
          /* CASE B: TIME EXPIRED */
          <div className="bg-slate-900/90 border border-rose-500/40 rounded-3xl p-8 md:p-12 text-center max-w-xl mx-auto backdrop-blur-xl shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto mb-5">
              <Clock className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Herní čas pro dnešek vypršel</h2>
            <p className="text-slate-400 text-sm mb-6">
              Vymezený čas na hraní na počítači skončil. Můžeš požádat rodiče o prodloužení přes rodičovský panel, nebo jít na chvíli ven.
            </p>
            <button
              id="btn-expired-parent-unlock"
              onClick={onOpenParentPanel}
              className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm transition-colors border border-slate-700 inline-flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>Otevřít rodičovskou správu</span>
            </button>
          </div>
        ) : (
          /* CASE C: LOCKED - SOLVING STUDY TASKS */
          <div className="flex flex-col gap-6">
            {/* Subject Selector Tabs */}
            <div className="flex flex-wrap items-center gap-2 bg-slate-950/60 p-2 rounded-2xl border border-slate-800">
              {enabledSubjects.map((sId) => {
                const config = settings.modules[sId];
                const progress = childState.moduleProgress[sId] || { completed: 0, required: config.requiredQuestionsCount };
                const isCompleted = progress.completed >= config.requiredQuestionsCount;
                const isCurrent = activeSubject === sId;

                return (
                  <button
                    key={sId}
                    id={`tab-subject-${sId}`}
                    onClick={() => {
                      setActiveSubject(sId);
                      setSelectedOption('');
                      setTextInput('');
                      setFeedback({ status: 'idle', message: '' });
                      setShowHint(false);
                      setCurrentQuestionIndex(0);
                    }}
                    className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      isCurrent
                        ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                        : isCompleted
                        ? 'bg-emerald-950/50 text-emerald-300 border border-emerald-800/60'
                        : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {renderSubjectIcon(sId)}
                    <span>{config.name}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        isCurrent
                          ? 'bg-slate-950/30 text-slate-950'
                          : isCompleted
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {progress.completed}/{config.requiredQuestionsCount}
                    </span>
                    {isCompleted && <CheckCircle2 className="w-4 h-4 text-emerald-400 ml-0.5" />}
                  </button>
                );
              })}
            </div>

            {/* Active Task Solving Card */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
              {/* Top Subject Banner */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                    {renderSubjectIcon(activeSubject)}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      {subjectConfig?.name || 'Úkol'} - {subjectConfig?.grade}. třída
                    </h2>
                    <p className="text-xs text-slate-400">
                      Splněno: {currentProgress.completed} z {currentProgress.required} úloh
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-36 md:w-48">
                  <div className="flex justify-between text-xs text-slate-400 mb-1 font-medium">
                    <span>Postup</span>
                    <span>
                      {Math.min(100, Math.round((currentProgress.completed / currentProgress.required) * 100))}%
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, (currentProgress.completed / currentProgress.required) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Question Content */}
              {activeQuestion ? (
                <div className="space-y-6">
                  <div className="bg-slate-950/70 p-6 rounded-2xl border border-slate-800">
                    <span className="text-xs font-semibold uppercase tracking-wider text-amber-400/90 mb-1 block">
                      Otázka č. {currentProgress.completed + 1}
                    </span>
                    <h3 className="text-xl md:text-2xl font-bold text-white leading-snug">
                      {activeQuestion.question}
                    </h3>
                    {activeQuestion.subtext && (
                      <p className="text-slate-400 text-sm mt-2">{activeQuestion.subtext}</p>
                    )}
                  </div>

                  {/* Input Types */}
                  {activeQuestion.type === 'multiple_choice' && activeQuestion.options ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {activeQuestion.options.map((opt, i) => {
                        const isSelected = selectedOption === opt;
                        return (
                          <button
                            key={i}
                            id={`btn-option-${i}`}
                            disabled={feedback.status !== 'idle'}
                            onClick={() => setSelectedOption(opt)}
                            className={`p-4 rounded-xl text-left font-semibold text-base transition-all border ${
                              isSelected
                                ? 'bg-amber-500/20 border-amber-400 text-white ring-2 ring-amber-400/40'
                                : 'bg-slate-950/50 hover:bg-slate-800/80 border-slate-800 text-slate-200'
                            } disabled:opacity-80`}
                          >
                            <span className="inline-block w-6 h-6 rounded-md bg-slate-800 text-slate-300 text-center text-xs leading-6 mr-3 font-mono">
                              {String.fromCharCode(65 + i)}
                            </span>
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="text-xs text-slate-400 font-medium">Napiš svou odpověď:</label>
                      <div className="flex gap-3">
                        <input
                          id="input-text-answer"
                          type={activeQuestion.type === 'number' ? 'number' : 'text'}
                          value={textInput}
                          disabled={feedback.status !== 'idle'}
                          onChange={(e) => setTextInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && feedback.status === 'idle') {
                              handleCheckAnswer();
                            }
                          }}
                          placeholder={activeQuestion.type === 'number' ? 'Zadej číslo...' : 'Zadej odpověď...'}
                          className="flex-1 px-4 py-3.5 rounded-xl bg-slate-950/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 font-medium"
                        />
                      </div>
                    </div>
                  )}

                  {/* Feedback Box */}
                  {feedback.status !== 'idle' && (
                    <div
                      className={`p-4 rounded-xl border flex items-start gap-3 animate-fade-in ${
                        feedback.status === 'correct'
                          ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200'
                          : 'bg-rose-950/60 border-rose-500/50 text-rose-200'
                      }`}
                    >
                      {feedback.status === 'correct' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 text-sm font-medium">
                        {feedback.message}
                      </div>
                    </div>
                  )}

                  {/* Hint Drawer */}
                  {showHint && activeQuestion.hint && (
                    <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-200 text-sm flex items-start gap-3">
                      <Lightbulb className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="block text-xs uppercase tracking-wider text-amber-400 mb-1">
                          Nápověda pro řešení
                        </strong>
                        {activeQuestion.hint}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <div className="flex items-center gap-2">
                      {activeQuestion.hint && (
                        <button
                          id="btn-hint"
                          onClick={() => setShowHint(!showHint)}
                          className="px-3 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
                        >
                          <HelpCircle className="w-4 h-4 text-amber-400" />
                          <span>{showHint ? 'Skrýt nápovědu' : 'Zobrazit nápovědu'}</span>
                        </button>
                      )}

                      {/* Math scratchpad toggle */}
                      {activeSubject === 'math' && (
                        <button
                          id="btn-scratchpad-toggle"
                          onClick={() => setShowScratchpad(!showScratchpad)}
                          className="px-3 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
                        >
                          <PenTool className="w-4 h-4 text-sky-400" />
                          <span>{showScratchpad ? 'Zavřít poznámkový blok' : 'Počítací blok'}</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      {feedback.status === 'idle' ? (
                        <button
                          id="btn-check-answer"
                          onClick={handleCheckAnswer}
                          disabled={
                            activeQuestion.type === 'multiple_choice'
                              ? !selectedOption
                              : !textInput.trim()
                          }
                          className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold text-sm transition-all flex items-center gap-2 shadow-lg shadow-amber-500/20"
                        >
                          <span>Zkontrolovat odpověď</span>
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          id="btn-next-question"
                          onClick={handleNextQuestion}
                          className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                        >
                          <span>Další příklad</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Math Scratchpad Canvas */}
                  {showScratchpad && activeSubject === 'math' && (
                    <div className="mt-4 p-4 rounded-2xl bg-slate-950 border border-sky-500/30">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-sky-400 font-semibold flex items-center gap-1.5">
                          <PenTool className="w-3.5 h-3.5" />
                          Kreslicí a výpočetní plátno (pomocné výpočty)
                        </span>
                        <button
                          id="btn-clear-scratchpad"
                          onClick={clearScratchpad}
                          className="text-xs px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Smazat
                        </button>
                      </div>
                      <canvas
                        ref={canvasRef}
                        width={600}
                        height={180}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        className="w-full h-44 bg-slate-900 rounded-xl cursor-crosshair border border-slate-800"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400">
                  <BookOpen className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                  <p>V tomto modulu nejsou žádné další úlohy.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Kiosk Anti-cheat overlay alert if child tries to minimize or blur */}
      {isCheatWarningOpen && childState.status === 'locked_studying' && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-rose-950/80 border-2 border-rose-500/80 rounded-3xl p-8 max-w-lg w-full text-center shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-4 animate-pulse">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-white mb-2">
              Obrazovka je uzamčena!
            </h2>
            <p className="text-rose-200 text-sm mb-6 leading-relaxed">
              Tento počítač je chráněn rodičovským zámkem. Přístup k ploše, hrám a ostatním aplikacím je zablokován, dokud nedokončíš zadané výukové moduly.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                id="btn-return-to-learning"
                onClick={() => {
                  setIsCheatWarningOpen(false);
                  toggleFullscreen();
                }}
                className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-all"
              >
                Vrátit se k učení
              </button>
              <button
                id="btn-kiosk-parent-bypass"
                onClick={() => {
                  setIsCheatWarningOpen(false);
                  onOpenParentPanel();
                }}
                className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-colors"
              >
                Jsem rodič (Zadat PIN)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
