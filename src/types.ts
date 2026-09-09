export type SubjectId = 'math' | 'czech' | 'geography' | 'english' | 'science';

export type GradeLevel = 1 | 2 | 3 | 4 | 5;

export interface Question {
  id: string;
  subjectId: SubjectId;
  grade: GradeLevel;
  question: string;
  subtext?: string;
  options?: string[]; // for multiple choice
  correctAnswer: string; // trimmed lowercase comparison or exact option
  hint?: string;
  explanation?: string;
  type: 'multiple_choice' | 'text' | 'number';
}

export interface SubjectModuleConfig {
  id: SubjectId;
  name: string;
  description: string;
  icon: string;
  color: string;
  enabled: boolean;
  requiredQuestionsCount: number; // e.g., 5
  grade: GradeLevel;
}

export interface AllowedApp {
  id: string;
  name: string;
  icon: string;
  category: 'game' | 'creative' | 'learning' | 'video';
  url?: string; // Web link or executable protocol
  command?: string; // Desktop command hint e.g., 'minecraft.exe'
  description: string;
  enabled: boolean;
}

export interface ParentSettings {
  parentPin: string; // e.g. "1234"
  childName: string; // e.g. "Matyáš"
  modules: Record<SubjectId, SubjectModuleConfig>;
  dailyPlaytimeMinutes: number; // e.g. 45
  requireAccuracyPercent: number; // e.g. 70
  strictKioskMode: boolean; // if true, full-screen lock & sound on blur
  allowedApps: AllowedApp[];
  customQuestions: Question[];
}

export interface AttemptLog {
  id: string;
  timestamp: number;
  subjectId: SubjectId;
  questionText: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  timeSpentSeconds: number;
}

export interface OverallStats {
  totalAnswered: number;
  totalCorrect: number;
  accuracyPercent: number;
  subjectBreakdown: Record<SubjectId, {
    answered: number;
    correct: number;
    accuracy: number;
  }>;
  recentAttempts: AttemptLog[];
}

export interface ChildLiveState {
  pcId: string;
  status: 'locked_studying' | 'unlocked_playing' | 'parent_bypass' | 'time_expired';
  currentSubjectId: SubjectId | null;
  moduleProgress: Record<SubjectId, {
    completed: number;
    required: number;
    correctInSession: number;
  }>;
  playtimeRemainingSeconds: number;
  lastHeartbeat: number;
  activeMessageFromParent: string | null;
  isKioskActive: boolean;
}

export interface RemoteCommand {
  type: 'skip_tasks' | 'force_lock' | 'add_playtime' | 'send_message' | 'reset_session';
  payload?: {
    minutes?: number;
    message?: string;
  };
  timestamp: number;
}
