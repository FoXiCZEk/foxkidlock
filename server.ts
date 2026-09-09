import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import {
  ParentSettings,
  ChildLiveState,
  OverallStats,
  RemoteCommand,
  AttemptLog,
  SubjectId
} from './src/types.ts';
import {
  DEFAULT_PARENT_SETTINGS,
  DEFAULT_QUESTIONS
} from './src/data/defaultQuestions.ts';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const DATA_FILE = process.env.DATA_FILE || path.join(process.cwd(), 'parental_lock_data.json');

// In-memory application store
let parentSettings: ParentSettings = { ...DEFAULT_PARENT_SETTINGS };
let childState: ChildLiveState = {
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
};

let stats: OverallStats = {
  totalAnswered: 12,
  totalCorrect: 10,
  accuracyPercent: 83,
  subjectBreakdown: {
    math: { answered: 5, correct: 4, accuracy: 80 },
    czech: { answered: 4, correct: 3, accuracy: 75 },
    geography: { answered: 3, correct: 3, accuracy: 100 },
    science: { answered: 0, correct: 0, accuracy: 0 },
    english: { answered: 0, correct: 0, accuracy: 0 },
  },
  recentAttempts: [
    {
      id: 'demo-1',
      timestamp: Date.now() - 3600000 * 2,
      subjectId: 'math',
      questionText: 'Kolik je 7 × 8?',
      userAnswer: '56',
      correctAnswer: '56',
      isCorrect: true,
      timeSpentSeconds: 14,
    },
    {
      id: 'demo-2',
      timestamp: Date.now() - 3600000,
      subjectId: 'czech',
      questionText: 'Které slovo je vyjmenované po P?',
      userAnswer: 'pýcha',
      correctAnswer: 'pýcha',
      isCorrect: true,
      timeSpentSeconds: 9,
    },
    {
      id: 'demo-3',
      timestamp: Date.now() - 1800000,
      subjectId: 'czech',
      questionText: 'Urči slovní druh slova "RYCHLE":',
      userAnswer: 'Přídavné jméno',
      correctAnswer: 'Příslovce',
      isCorrect: false,
      timeSpentSeconds: 18,
    },
  ],
};

let pendingCommands: RemoteCommand[] = [];

// Load state from file if exists
try {
  if (fs.existsSync(DATA_FILE)) {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed.parentSettings) parentSettings = parsed.parentSettings;
    if (parsed.stats) stats = parsed.stats;
    if (parsed.childState) {
      childState = {
        ...childState,
        ...parsed.childState,
        lastHeartbeat: Date.now(),
      };
    }
  }
} catch (e) {
  console.warn('Failed to load persisted lock data, using default state:', e);
}

function persistData() {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify({ parentSettings, stats, childState }, null, 2),
      'utf-8'
    );
  } catch (err) {
    console.error('Error saving data to disk:', err);
  }
}

// Recalculate requirements based on active settings
function syncModuleRequirements() {
  Object.keys(parentSettings.modules).forEach((subKey) => {
    const sId = subKey as SubjectId;
    const modConfig = parentSettings.modules[sId];
    if (modConfig) {
      if (!childState.moduleProgress[sId]) {
        childState.moduleProgress[sId] = { completed: 0, required: modConfig.requiredQuestionsCount, correctInSession: 0 };
      } else {
        childState.moduleProgress[sId].required = modConfig.requiredQuestionsCount;
      }
    }
  });
}
syncModuleRequirements();

async function startServer() {
  const app = express();
  app.use(express.json());

  // API endpoints
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });

  // Get current state (used by both child PC and remote parent web view)
  app.get('/api/state', (req, res) => {
    // Pop commands if child PC is asking
    const isChild = req.query.role === 'child';
    let commandsToSend: RemoteCommand[] = [];

    if (isChild && pendingCommands.length > 0) {
      commandsToSend = [...pendingCommands];
      pendingCommands = [];
    }

    res.json({
      settings: parentSettings,
      childState,
      stats,
      pendingCommands: commandsToSend,
      serverTime: Date.now(),
    });
  });

  // Heartbeat from child PC
  app.post('/api/heartbeat', (req, res) => {
    const { isKioskActive, playtimeRemainingSeconds, currentSubjectId } = req.body;
    childState.lastHeartbeat = Date.now();
    if (typeof isKioskActive === 'boolean') childState.isKioskActive = isKioskActive;
    if (typeof playtimeRemainingSeconds === 'number') {
      childState.playtimeRemainingSeconds = playtimeRemainingSeconds;
      if (childState.status === 'unlocked_playing' && playtimeRemainingSeconds <= 0) {
        childState.status = 'time_expired';
      }
    }
    if (currentSubjectId) childState.currentSubjectId = currentSubjectId;

    res.json({ success: true, commands: pendingCommands });
  });

  // Child submits an answer
  app.post('/api/answer', (req, res) => {
    const {
      subjectId,
      questionText,
      userAnswer,
      correctAnswer,
      isCorrect,
      timeSpentSeconds,
    } = req.body;

    // Log attempt
    const attempt: AttemptLog = {
      id: 'att-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      timestamp: Date.now(),
      subjectId,
      questionText,
      userAnswer: String(userAnswer),
      correctAnswer: String(correctAnswer),
      isCorrect: Boolean(isCorrect),
      timeSpentSeconds: Number(timeSpentSeconds) || 5,
    };

    stats.recentAttempts.unshift(attempt);
    if (stats.recentAttempts.length > 100) stats.recentAttempts.pop();

    stats.totalAnswered += 1;
    if (isCorrect) stats.totalCorrect += 1;
    stats.accuracyPercent = Math.round((stats.totalCorrect / stats.totalAnswered) * 100);

    const sub = stats.subjectBreakdown[subjectId as SubjectId];
    if (sub) {
      sub.answered += 1;
      if (isCorrect) sub.correct += 1;
      sub.accuracy = Math.round((sub.correct / sub.answered) * 100);
    }

    // Update child session progress
    if (!childState.moduleProgress[subjectId as SubjectId]) {
      childState.moduleProgress[subjectId as SubjectId] = {
        completed: 0,
        required: parentSettings.modules[subjectId as SubjectId]?.requiredQuestionsCount || 3,
        correctInSession: 0,
      };
    }

    const modProgress = childState.moduleProgress[subjectId as SubjectId];
    modProgress.completed += 1;
    if (isCorrect) modProgress.correctInSession += 1;

    // Check if ALL active enabled modules have reached their required question count
    let allFinished = true;
    for (const [sKey, config] of Object.entries(parentSettings.modules)) {
      if (config.enabled) {
        const p = childState.moduleProgress[sKey as SubjectId];
        if (!p || p.completed < config.requiredQuestionsCount) {
          allFinished = false;
          break;
        }
      }
    }

    if (allFinished) {
      childState.status = 'unlocked_playing';
      childState.playtimeRemainingSeconds = parentSettings.dailyPlaytimeMinutes * 60;
    }

    persistData();

    res.json({
      success: true,
      allFinished,
      childState,
      stats,
    });
  });

  // Parent remote commands (Skip tasks, add time, force lock, send message)
  app.post('/api/parent/command', (req, res) => {
    const { command, payload, pin } = req.body;

    // Optional PIN verification if sent
    if (pin && pin !== parentSettings.parentPin) {
      return res.status(401).json({ error: 'Neplatný rodičovský PIN' });
    }

    if (command === 'skip_tasks') {
      // Direct remote unlock
      childState.status = 'unlocked_playing';
      childState.playtimeRemainingSeconds = parentSettings.dailyPlaytimeMinutes * 60;
      pendingCommands.push({ type: 'skip_tasks', timestamp: Date.now() });
    } else if (command === 'force_lock') {
      childState.status = 'locked_studying';
      pendingCommands.push({ type: 'force_lock', timestamp: Date.now() });
    } else if (command === 'add_playtime') {
      const minutes = payload?.minutes || 15;
      childState.playtimeRemainingSeconds += minutes * 60;
      pendingCommands.push({ type: 'add_playtime', payload: { minutes }, timestamp: Date.now() });
    } else if (command === 'send_message') {
      const msg = payload?.message || '';
      childState.activeMessageFromParent = msg;
      pendingCommands.push({ type: 'send_message', payload: { message: msg }, timestamp: Date.now() });
    } else if (command === 'reset_session') {
      childState.status = 'locked_studying';
      Object.keys(childState.moduleProgress).forEach((k) => {
        childState.moduleProgress[k as SubjectId].completed = 0;
        childState.moduleProgress[k as SubjectId].correctInSession = 0;
      });
      pendingCommands.push({ type: 'reset_session', timestamp: Date.now() });
    }

    persistData();
    res.json({ success: true, childState });
  });

  // Parent settings update (requires PIN)
  app.post('/api/parent/settings', (req, res) => {
    const { settings, pin } = req.body;
    if (pin !== parentSettings.parentPin) {
      return res.status(401).json({ error: 'Nesprávný rodičovský PIN kód' });
    }

    if (settings) {
      parentSettings = {
        ...parentSettings,
        ...settings,
      };
      syncModuleRequirements();
      persistData();
    }

    res.json({ success: true, settings: parentSettings });
  });

  // Reset stats
  app.post('/api/stats/reset', (req, res) => {
    const { pin } = req.body;
    if (pin !== parentSettings.parentPin) {
      return res.status(401).json({ error: 'Nesprávný rodičovský PIN kód' });
    }

    stats = {
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
    };
    persistData();
    res.json({ success: true, stats });
  });

  // Dynamic batch script download with accurate current server host or custom user Docker host
  app.get('/api/download-bat', (req, res) => {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.get('host') || 'localhost:3000';
    let targetUrl = `${protocol}://${host}/?mode=child`;

    // Allow user to supply their custom Docker host or local IP
    if (typeof req.query.targetUrl === 'string' && req.query.targetUrl.trim().length > 0) {
      targetUrl = req.query.targetUrl.trim();
    }

    const bat = `@echo off
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

set "TARGET_URL=${targetUrl}"

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

REM 2. Zkusit Microsoft Edge (predinstalovany ve vsech Windows 10 a 11)
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
exit
`;

    res.setHeader('Content-Type', 'application/x-bat; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="Spustit-Kiosk-Zamek.bat"');
    res.send(bat);
  });

  // Docker deployment file download & view endpoints
  app.get(['/Dockerfile', '/Dockerfile.txt', '/api/docker/dockerfile'], (req, res) => {
    const dockerfilePath = path.join(process.cwd(), 'Dockerfile');
    if (fs.existsSync(dockerfilePath)) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      if (req.path === '/api/docker/dockerfile') {
        res.setHeader('Content-Disposition', 'attachment; filename="Dockerfile"');
      }
      return res.sendFile(dockerfilePath);
    }
    res.status(404).send('Dockerfile not found');
  });

  app.get(['/docker-compose.yml', '/api/docker/compose'], (req, res) => {
    const composePath = path.join(process.cwd(), 'docker-compose.yml');
    if (fs.existsSync(composePath)) {
      res.setHeader('Content-Type', 'text/yaml; charset=utf-8');
      if (req.path === '/api/docker/compose') {
        res.setHeader('Content-Disposition', 'attachment; filename="docker-compose.yml"');
      }
      return res.sendFile(composePath);
    }
    res.status(404).send('docker-compose.yml not found');
  });

  // Vite integration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    const publicPath = path.join(process.cwd(), 'public');
    if (fs.existsSync(publicPath)) {
      app.use('/public', express.static(publicPath));
    }
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Rodičovský zámek PC běží na http://0.0.0.0:${PORT}`);
  });
}

startServer();
