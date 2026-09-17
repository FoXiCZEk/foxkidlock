import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import {
  ParentSettings,
  ChildLiveState,
  OverallStats,
  RemoteCommand,
  AttemptLog,
  SubjectId,
  Question,
  GradeLevel,
  DesktopAgentInfo,
  BlockedWebSite,
} from './src/types.ts';
import {
  DEFAULT_PARENT_SETTINGS,
  DEFAULT_QUESTIONS,
  DEFAULT_BLOCKED_WEBSITES,
} from './src/data/defaultQuestions.ts';

// Lazy initialized Gemini client
let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key.trim() === '' || key === 'MY_GEMINI_API_KEY') return null;
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

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

let desktopAgentState: {
  isOnline: boolean;
  lastHeartbeat: number;
  hostname: string;
  os: string;
  version: string;
  killedProcessesCount: number;
  lastKilledProcess: string;
  lastKilledTime: number;
  blockedProcesses: string[];
  webBlockCount: number;
  lastWebBlockEvent: string;
} = {
  isOnline: false,
  lastHeartbeat: 0,
  hostname: '',
  os: '',
  version: '2.3.0',
  killedProcessesCount: 0,
  lastKilledProcess: '',
  lastKilledTime: 0,
  blockedProcesses: [
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
  ],
  webBlockCount: 0,
  lastWebBlockEvent: '',
};

// Ensure default web filter settings
if (!parentSettings.blockedWebsites) {
  parentSettings.blockedWebsites = JSON.parse(JSON.stringify(DEFAULT_BLOCKED_WEBSITES));
}
if (parentSettings.webFilterEnabled === undefined) {
  parentSettings.webFilterEnabled = true;
}
if (!parentSettings.webFilterMode) {
  parentSettings.webFilterMode = 'always';
}

// Load state from file if exists
try {
  if (fs.existsSync(DATA_FILE)) {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed.parentSettings) {
      parentSettings = {
        ...parentSettings,
        ...parsed.parentSettings,
        blockedWebsites: parsed.parentSettings.blockedWebsites || JSON.parse(JSON.stringify(DEFAULT_BLOCKED_WEBSITES)),
        webFilterEnabled: parsed.parentSettings.webFilterEnabled ?? true,
        webFilterMode: parsed.parentSettings.webFilterMode || 'always',
      };
    }
    if (parsed.stats) stats = parsed.stats;
    if (parsed.blockedProcesses && Array.isArray(parsed.blockedProcesses)) {
      desktopAgentState.blockedProcesses = parsed.blockedProcesses;
    }
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

function getActiveBlockedDomains(): string[] {
  const isFilterActive =
    Boolean(parentSettings.webFilterEnabled) &&
    (parentSettings.webFilterMode === 'always' || childState.status !== 'unlocked_playing');

  if (!isFilterActive) return [];

  const sites = parentSettings.blockedWebsites || DEFAULT_BLOCKED_WEBSITES;
  const domains = new Set<string>();
  for (const site of sites) {
    if (site.enabled) {
      site.domains.forEach((d) => {
        const clean = d.toLowerCase().trim();
        if (clean) domains.add(clean);
      });
    }
  }
  return Array.from(domains);
}

function persistData() {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify(
        {
          parentSettings,
          stats,
          childState,
          blockedProcesses: desktopAgentState.blockedProcesses,
        },
        null,
        2
      ),
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
  app.use('/public', express.static(path.join(process.cwd(), 'public')));

  // SSE client connections for instantaneous push synchronization
  const sseClients = new Set<express.Response>();

  function broadcastState() {
    const isAgentOnline = Date.now() - desktopAgentState.lastHeartbeat < 15000;
    childState.agent = {
      isOnline: isAgentOnline,
      lastHeartbeat: desktopAgentState.lastHeartbeat,
      hostname: desktopAgentState.hostname,
      os: desktopAgentState.os,
      version: desktopAgentState.version,
      killedProcessesCount: desktopAgentState.killedProcessesCount,
      lastKilledProcess: desktopAgentState.lastKilledProcess,
      lastKilledTimestamp: desktopAgentState.lastKilledTime,
      blockedProcessNames: desktopAgentState.blockedProcesses,
    };

    const payload = `data: ${JSON.stringify({
      settings: parentSettings,
      childState,
      stats,
      serverTime: Date.now(),
    })}\n\n`;

    for (const client of sseClients) {
      try {
        client.write(payload);
      } catch {
        sseClients.delete(client);
      }
    }
  }

  // SSE stream for instantaneous remote locking and unlocking
  app.get('/api/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    res.write(`data: ${JSON.stringify({
      settings: parentSettings,
      childState,
      stats,
      serverTime: Date.now(),
    })}\n\n`);

    sseClients.add(res);

    req.on('close', () => {
      sseClients.delete(res);
    });
  });

  // API endpoints
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });

  // AI Service status
  app.get('/api/ai/status', (req, res) => {
    const ai = getAI();
    res.json({
      available: Boolean(ai),
      model: 'gemini-3.8-flash',
      hasApiKey: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '' && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'),
    });
  });

  // AI Question Generator using Gemini API
  app.post('/api/ai/generate-questions', async (req, res) => {
    const {
      subjectId = 'math',
      grade = 3,
      count = 3,
      topic = '',
      pin,
      newCategory,
    } = req.body;

    if (pin && pin !== parentSettings.parentPin) {
      return res.status(401).json({ error: 'Nesprávný rodičovský PIN kód' });
    }

    const ai = getAI();
    if (!ai) {
      return res.status(400).json({
        error: 'Klíč GEMINI_API_KEY není na serveru nastaven nebo je prázdný. Nastavte jej v souboru .env nebo v prostředí Dockeru.',
        available: false,
      });
    }

    const defaultSubjectDescriptions: Record<string, string> = {
      math: 'Matematika (počítání z hlavy, násobilka, slovní úlohy, jednoduchá geometrie)',
      czech: 'Český jazyk (vyjmenovaná slova, pravopis i/y, slovní druhy, shoda přísudku s podmětem)',
      geography: 'Vlastivěda (Česká republika, krajská města, řeky, hory, české dějiny a pověsti)',
      science: 'Přírodověda (živá a neživá příroda, zvířata, stromy, lidské tělo, vesmír)',
      english: 'Anglický jazyk (základní slovní zásoba: barvy, čísla, zvířata, rodina, jednoduché věty)',
    };

    let activeSubjectId = subjectId;
    let categoryName = '';
    let categoryDesc = '';
    const numQuestions = Math.min(Math.max(Number(count) || 3, 1), 10);
    const targetGrade = Math.min(Math.max(Number(grade) || 3, 1), 5);

    // If a new category is being created on the fly
    if (newCategory && newCategory.name && String(newCategory.name).trim()) {
      categoryName = String(newCategory.name).trim();
      categoryDesc = String(newCategory.description || '').trim();

      // Create a slug-like or unique category ID
      const sanitizedSlug = categoryName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '') || 'kategorie';
      
      activeSubjectId = `custom_${sanitizedSlug}_${Date.now().toString(36)}`;

      if (!parentSettings.modules) {
        parentSettings.modules = {} as any;
      }

      parentSettings.modules[activeSubjectId] = {
        id: activeSubjectId,
        name: categoryName,
        description: categoryDesc || `Vlastní výuková kategorie: ${categoryName}`,
        icon: newCategory.icon || 'Sparkles',
        color: newCategory.color || 'indigo',
        enabled: true,
        requiredQuestionsCount: Number(newCategory.requiredQuestionsCount) || 3,
        grade: targetGrade as GradeLevel,
        isCustom: true,
      };

      syncModuleRequirements();
    } else if (parentSettings.modules && parentSettings.modules[activeSubjectId]) {
      categoryName = parentSettings.modules[activeSubjectId].name;
      categoryDesc = parentSettings.modules[activeSubjectId].description;
    } else {
      categoryName = activeSubjectId;
    }

    const finalSubjectDesc =
      defaultSubjectDescriptions[activeSubjectId] ||
      `${categoryName}${categoryDesc ? ` (${categoryDesc})` : ''}`;

    const prompt = `Jsi vynikající, vlídný a didakticky přesný učitel na české základní škole.
Vytvoř přesně ${numQuestions} nových, pestrých a didakticky hodnotných výukových úloh pro žáka ${targetGrade}. třídy ZŠ.
Kategorie / Předmět: "${categoryName}".
Charakteristika kategorie: ${finalSubjectDesc}.
${topic && topic.trim() ? `Konkrétní probírané téma v rámci této kategorie: "${topic.trim()}".` : `Všechny úlohy musí vycházet z názvu a podstaty kategorie "${categoryName}" a být přizpůsobeny ${targetGrade}. třídě ZŠ.`}

Požadavky na úlohy:
1. Jazyk: spisovná, přirozená a srozumitelná čeština odpovídající věku ${targetGrade}. třídy.
2. Věcná správnost: otázky musí didakticky a fakticky odpovídat kategorii "${categoryName}". Pokud je to např. Dějepis, Dopravní výchova, Finanční gramotnost, Němčina, Vesmír, Zvířata nebo Programování, vytvoř autentické příklady pro daný obor.
3. Formát ('type'):
   - "multiple_choice": výběr ze 4 možností ('options'), právě jedna je správná ('correctAnswer').
   - "number": číselný výpočet nebo číselný fakt (např. 24 + 18, počet měsíců, rok), kde 'correctAnswer' je přesné číslo v textové podobě (např. "42").
   - "text": jednoslovná doplňovačka (např. název, chybějící slovo, pojem), 'correctAnswer' je přesné slovo.
4. 'hint': krátká milá nápověda pro dítě, která ho navede na správnou myšlenku.
5. 'explanation': srozumitelné a povzbudivé vysvětlení, proč je odpověď správná.
6. Vrať čistě strukturovaný JSON pole objektů.`;

    const candidateModels = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];
    let lastError: any = null;
    let responseText: string | null = null;

    for (const modelName of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: {
                    type: Type.STRING,
                    description: 'Znění otázky v češtině',
                  },
                  type: {
                    type: Type.STRING,
                    description: 'Typ: multiple_choice, number nebo text',
                  },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: 'Čtyři možnosti odpovědí (pokud type=multiple_choice)',
                  },
                  correctAnswer: {
                    type: Type.STRING,
                    description: 'Správná odpověď',
                  },
                  hint: {
                    type: Type.STRING,
                    description: 'Nápověda pro dítě',
                  },
                  explanation: {
                    type: Type.STRING,
                    description: 'Vysvětlení správného řešení',
                  },
                },
                required: ['question', 'type', 'correctAnswer', 'hint', 'explanation'],
              },
            },
          },
        });

        if (response.text) {
          responseText = response.text;
          break;
        }
      } catch (err: any) {
        console.warn(`Pokus s modelem ${modelName} selhal, zkouším další...`, err?.message || err);
        lastError = err;
      }
    }

    if (!responseText) {
      return res.status(500).json({
        error: `Chyba při komunikaci s Gemini API: ${lastError?.message || 'Modely jsou momentálně vytížené.'}`,
      });
    }

    try {
      const text = responseText;
      let parsed: any[] = [];
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = [];
      }

      if (!Array.isArray(parsed) || parsed.length === 0) {
        return res.status(500).json({ error: 'AI model nevrátil očekávaný formát úloh.' });
      }

      const newQuestions: Question[] = parsed.map((item, idx) => ({
        id: `ai-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
        subjectId: activeSubjectId as SubjectId,
        grade: targetGrade as GradeLevel,
        question: String(item.question || ''),
        type: (['multiple_choice', 'number', 'text'].includes(item.type) ? item.type : 'multiple_choice') as any,
        options: Array.isArray(item.options) && item.options.length > 0 ? item.options.map(String) : undefined,
        correctAnswer: String(item.correctAnswer || '').trim(),
        hint: item.hint ? String(item.hint) : undefined,
        explanation: item.explanation ? String(item.explanation) : undefined,
      }));

      // Append to parentSettings.customQuestions
      if (!parentSettings.customQuestions) {
        parentSettings.customQuestions = [];
      }
      parentSettings.customQuestions = [...parentSettings.customQuestions, ...newQuestions];

      persistData();
      broadcastState();

      res.json({
        success: true,
        generatedCount: newQuestions.length,
        questions: newQuestions,
        subjectId: activeSubjectId,
        category: parentSettings.modules[activeSubjectId],
        settings: parentSettings,
        allCustomQuestionsCount: parentSettings.customQuestions.length,
      });
    } catch (err: any) {
      console.error('Chyba při volání Gemini API:', err);
      res.status(500).json({
        error: `Chyba při komunikaci s Gemini API: ${err.message || String(err)}`,
      });
    }
  });

  // Category management: Add or update custom category
  app.post('/api/categories', (req, res) => {
    const category = req.body.category || req.body;
    const pin = req.body.pin || (req.body.category && req.body.category.pin);
    if (pin && pin !== parentSettings.parentPin) {
      return res.status(401).json({ error: 'Nesprávný rodičovský PIN kód' });
    }
    if (!category || !category.name || !String(category.name).trim()) {
      return res.status(400).json({ error: 'Název kategorie je povinný' });
    }

    const catName = String(category.name).trim();
    const catId =
      category.id ||
      `custom_${catName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')}_${Date.now().toString(36)}`;

    parentSettings.modules[catId] = {
      id: catId,
      name: catName,
      description: String(category.description || `Vlastní výuková kategorie: ${catName}`),
      icon: category.icon || 'Sparkles',
      color: category.color || 'indigo',
      enabled: category.enabled !== undefined ? Boolean(category.enabled) : true,
      requiredQuestionsCount: Number(category.requiredQuestionsCount) || 3,
      grade: (Number(category.grade) || 3) as GradeLevel,
      isCustom: true,
    };

    syncModuleRequirements();
    persistData();
    broadcastState();

    res.json({
      success: true,
      category: parentSettings.modules[catId],
      settings: parentSettings,
    });
  });

  // Delete a category
  app.delete('/api/categories/:id', (req, res) => {
    const { id } = req.params;
    const { pin, deleteQuestions } = req.body || {};
    if (pin && pin !== parentSettings.parentPin) {
      return res.status(401).json({ error: 'Nesprávný rodičovský PIN kód' });
    }

    if (parentSettings.modules[id]) {
      delete parentSettings.modules[id];
      if (childState.moduleProgress[id]) {
        delete childState.moduleProgress[id];
      }
      if (deleteQuestions && parentSettings.customQuestions) {
        parentSettings.customQuestions = parentSettings.customQuestions.filter(
          (q) => q.subjectId !== id
        );
      }
      syncModuleRequirements();
      persistData();
      broadcastState();
    }

    res.json({ success: true, settings: parentSettings });
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

    const isAgentOnline = Date.now() - desktopAgentState.lastHeartbeat < 15000;
    childState.agent = {
      isOnline: isAgentOnline,
      lastHeartbeat: desktopAgentState.lastHeartbeat,
      hostname: desktopAgentState.hostname,
      os: desktopAgentState.os,
      version: desktopAgentState.version,
      killedProcessesCount: desktopAgentState.killedProcessesCount,
      lastKilledProcess: desktopAgentState.lastKilledProcess,
      lastKilledTimestamp: desktopAgentState.lastKilledTime,
      blockedProcessNames: desktopAgentState.blockedProcesses,
      blockedWebsites: parentSettings.blockedWebsites,
      webFilterEnabled: parentSettings.webFilterEnabled,
      webFilterMode: parentSettings.webFilterMode,
      activeBlockedDomains: getActiveBlockedDomains(),
      webBlockCount: desktopAgentState.webBlockCount,
      lastWebBlockEvent: desktopAgentState.lastWebBlockEvent,
    };

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

  // Dedicated endpoint for Windows Agent and quick scripts: child state & blocked processes & web filter
  app.get('/api/child-state', (req, res) => {
    const isAgentOnline = Date.now() - desktopAgentState.lastHeartbeat < 15000;
    const activeDomains = getActiveBlockedDomains();
    res.json({
      status: childState.status,
      playtimeRemainingSeconds: childState.playtimeRemainingSeconds,
      isKioskActive: childState.isKioskActive,
      lastHeartbeat: childState.lastHeartbeat,
      blockedProcesses: desktopAgentState.blockedProcesses,
      webFilter: {
        enabled: activeDomains.length > 0,
        domains: activeDomains,
        mode: parentSettings.webFilterMode || 'always',
      },
      agent: {
        ...desktopAgentState,
        isOnline: isAgentOnline,
        blockedWebsites: parentSettings.blockedWebsites,
        webFilterEnabled: parentSettings.webFilterEnabled,
        webFilterMode: parentSettings.webFilterMode,
        activeBlockedDomains: activeDomains,
      },
      childState,
    });
  });

  // Agent Heartbeat & action reporting from child's Windows system
  app.post('/api/agent/heartbeat', (req, res) => {
    const {
      hostname,
      os,
      version,
      killedProcess,
      killedCount,
      webBlockCount,
      lastWebBlockEvent,
    } = req.body || {};

    desktopAgentState.lastHeartbeat = Date.now();
    desktopAgentState.isOnline = true;
    if (hostname) desktopAgentState.hostname = String(hostname);
    if (os) desktopAgentState.os = String(os);
    if (version) desktopAgentState.version = String(version);
    if (typeof killedCount === 'number') {
      desktopAgentState.killedProcessesCount = killedCount;
    }
    if (killedProcess) {
      desktopAgentState.lastKilledProcess = String(killedProcess);
      desktopAgentState.lastKilledTime = Date.now();
    }
    if (typeof webBlockCount === 'number') {
      desktopAgentState.webBlockCount = webBlockCount;
    }
    if (lastWebBlockEvent) {
      desktopAgentState.lastWebBlockEvent = String(lastWebBlockEvent);
    }

    const activeDomains = getActiveBlockedDomains();

    // Reflect onto childState
    childState.agent = {
      isOnline: true,
      lastHeartbeat: Date.now(),
      hostname: desktopAgentState.hostname,
      os: desktopAgentState.os,
      version: desktopAgentState.version,
      killedProcessesCount: desktopAgentState.killedProcessesCount,
      lastKilledProcess: desktopAgentState.lastKilledProcess,
      lastKilledTimestamp: desktopAgentState.lastKilledTime,
      blockedProcessNames: desktopAgentState.blockedProcesses,
      blockedWebsites: parentSettings.blockedWebsites,
      webFilterEnabled: parentSettings.webFilterEnabled,
      webFilterMode: parentSettings.webFilterMode,
      activeBlockedDomains: activeDomains,
      webBlockCount: desktopAgentState.webBlockCount,
      lastWebBlockEvent: desktopAgentState.lastWebBlockEvent,
    };

    broadcastState();

    res.json({
      success: true,
      status: childState.status,
      playtimeRemainingSeconds: childState.playtimeRemainingSeconds,
      blockedProcesses: desktopAgentState.blockedProcesses,
      webFilter: {
        enabled: activeDomains.length > 0,
        domains: activeDomains,
        mode: parentSettings.webFilterMode || 'always',
      },
      commands: pendingCommands,
    });
  });

  // Get full agent status
  app.get('/api/agent/status', (req, res) => {
    const isAgentOnline = Date.now() - desktopAgentState.lastHeartbeat < 15000;
    const activeDomains = getActiveBlockedDomains();
    res.json({
      isOnline: isAgentOnline,
      ...desktopAgentState,
      blockedWebsites: parentSettings.blockedWebsites,
      webFilterEnabled: parentSettings.webFilterEnabled,
      webFilterMode: parentSettings.webFilterMode,
      activeBlockedDomains: activeDomains,
      childStatus: childState.status,
      playtimeRemainingSeconds: childState.playtimeRemainingSeconds,
    });
  });

  // Web filter configuration endpoint (remote instant control)
  app.get('/api/agent/web-filter', (req, res) => {
    const activeDomains = getActiveBlockedDomains();
    res.json({
      enabled: parentSettings.webFilterEnabled ?? true,
      mode: parentSettings.webFilterMode || 'always',
      blockedWebsites: parentSettings.blockedWebsites || DEFAULT_BLOCKED_WEBSITES,
      activeBlockedDomains: activeDomains,
      webBlockCount: desktopAgentState.webBlockCount,
      lastWebBlockEvent: desktopAgentState.lastWebBlockEvent,
    });
  });

  app.post('/api/agent/web-filter', (req, res) => {
    const { pin, action, siteId, enabled, name, domain, mode } = req.body || {};
    if (pin && pin !== parentSettings.parentPin) {
      return res.status(401).json({ error: 'Nesprávný rodičovský PIN' });
    }

    if (!parentSettings.blockedWebsites) {
      parentSettings.blockedWebsites = JSON.parse(JSON.stringify(DEFAULT_BLOCKED_WEBSITES));
    }

    if (action === 'toggle-master') {
      parentSettings.webFilterEnabled = Boolean(enabled);
    } else if (action === 'set-mode') {
      if (mode === 'always' || mode === 'only_locked') {
        parentSettings.webFilterMode = mode;
      }
    } else if (action === 'toggle-site' && siteId) {
      const site = parentSettings.blockedWebsites.find((s) => s.id === siteId);
      if (site) {
        site.enabled = Boolean(enabled);
      }
    } else if (action === 'add-custom-site') {
      const cleanDomain = String(domain || '')
        .trim()
        .toLowerCase()
        .replace(/^https?:\/\//i, '')
        .replace(/\/.*$/, '');
      const cleanName = String(name || cleanDomain).trim();
      if (cleanDomain) {
        const domainsList = [cleanDomain];
        const wwwDomain = `www.${cleanDomain}`.replace(/^www\.www\./, 'www.');
        if (!domainsList.includes(wwwDomain)) domainsList.push(wwwDomain);

        const newSite: BlockedWebSite = {
          id: 'custom-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          name: cleanName || cleanDomain,
          domains: domainsList,
          category: 'custom',
          enabled: true,
          isPreset: false,
        };
        parentSettings.blockedWebsites.push(newSite);
      }
    } else if (action === 'remove-custom-site' && siteId) {
      parentSettings.blockedWebsites = parentSettings.blockedWebsites.filter((s) => s.id !== siteId);
    } else if (action === 'block-now') {
      parentSettings.webFilterEnabled = true;
      parentSettings.webFilterMode = 'always';
    } else if (action === 'unblock-now') {
      parentSettings.webFilterEnabled = false;
    }

    persistData();
    broadcastState();

    const activeDomains = getActiveBlockedDomains();
    res.json({
      success: true,
      webFilterEnabled: parentSettings.webFilterEnabled,
      webFilterMode: parentSettings.webFilterMode,
      blockedWebsites: parentSettings.blockedWebsites,
      activeBlockedDomains: activeDomains,
    });
  });

  // Manage blocked processes list (add or remove custom games)
  app.post('/api/agent/blocked-processes', (req, res) => {
    const { pin, action, processName } = req.body || {};
    if (pin && pin !== parentSettings.parentPin) {
      return res.status(401).json({ error: 'Nesprávný rodičovský PIN' });
    }

    if (action === 'add' && processName && typeof processName === 'string') {
      const cleanName = processName.trim().replace(/\.exe$/i, '');
      if (cleanName && !desktopAgentState.blockedProcesses.map((p) => p.toLowerCase()).includes(cleanName.toLowerCase())) {
        desktopAgentState.blockedProcesses.push(cleanName);
      }
    } else if (action === 'remove' && processName && typeof processName === 'string') {
      const cleanName = processName.trim().replace(/\.exe$/i, '');
      desktopAgentState.blockedProcesses = desktopAgentState.blockedProcesses.filter(
        (p) => p.toLowerCase() !== cleanName.toLowerCase()
      );
    }

    persistData();
    broadcastState();

    res.json({
      success: true,
      blockedProcesses: desktopAgentState.blockedProcesses,
    });
  });

  // Agent download endpoints with auto-configured server host
  app.get('/api/agent/download/script', (req, res) => {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.get('host') || 'localhost:3000';
    const currentServerUrl = `${protocol}://${host}`;

    const agentPs1Path = path.join(process.cwd(), 'public', 'agent', 'Agent-Zamek-PC.ps1');
    let content = fs.existsSync(agentPs1Path) ? fs.readFileSync(agentPs1Path, 'utf-8') : '';

    content = content.replace(
      /\$DefaultCloudUrl\s*=\s*"[^"]*"/,
      `$DefaultCloudUrl = "${currentServerUrl}"`
    );

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="Agent-Zamek-PC.ps1"');
    res.send(content);
  });

  app.get('/api/agent/download/installer', (req, res) => {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.get('host') || 'localhost:3000';
    const currentServerUrl = `${protocol}://${host}`;

    const batPath = path.join(process.cwd(), 'public', 'agent', 'Instalovat-Agenta-Windows.bat');
    let content = fs.existsSync(batPath) ? fs.readFileSync(batPath, 'utf-8') : '';

    const inject = `\r\necho ${currentServerUrl}> "%INSTALL_DIR%\\server_url.txt"\r\n`;
    content = content.replace(
      'echo [2/4] Kopíruji soubory agenta...',
      `echo [2/4] Kopíruji soubory agenta...${inject}`
    );

    res.setHeader('Content-Type', 'application/x-bat; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="Instalovat-Agenta-Windows.bat"');
    res.send(content);
  });

  app.get('/api/agent/download/vbs', (req, res) => {
    const vbsPath = path.join(process.cwd(), 'public', 'agent', 'Spustit-Agenta-Skryte.vbs');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="Spustit-Agenta-Skryte.vbs"');
    if (fs.existsSync(vbsPath)) {
      res.sendFile(vbsPath);
    } else {
      res.status(404).send('VBS file not found');
    }
  });

  app.get('/api/agent/download/uninstaller', (req, res) => {
    const batPath = path.join(process.cwd(), 'public', 'agent', 'Odinstalovat-Agenta-Windows.bat');
    res.setHeader('Content-Type', 'application/x-bat; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="Odinstalovat-Agenta-Windows.bat"');
    if (fs.existsSync(batPath)) {
      res.sendFile(batPath);
    } else {
      res.status(404).send('Uninstaller not found');
    }
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

    if (!stats.subjectBreakdown[subjectId as SubjectId]) {
      stats.subjectBreakdown[subjectId as SubjectId] = { answered: 0, correct: 0, accuracy: 0 };
    }
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
    broadcastState();

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
    broadcastState();
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
      broadcastState();
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

set "DEFAULT_TARGET=${targetUrl}"
set "LOCAL_URL=http://localhost:3000/?mode=child"
set "TARGET_URL=%DEFAULT_TARGET%"

echo [1/3] Kontroluji dostupnost serveru...
curl -s -m 1 http://localhost:3000/api/health >nul 2>&1
if %errorlevel% equ 0 (
    echo       -> Nalezen bezici lokalni server na http://localhost:3000
    set "TARGET_URL=%LOCAL_URL%"
) else (
    echo       -> Pouzivam server: %DEFAULT_TARGET%
)
echo.

echo [2/3] Hledam webovy prohlizec (Google Chrome nebo Microsoft Edge)...
set "BROWSER_EXE="
set "BROWSER_NAME="
set "BROWSER_TYPE="

if exist "%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe" (
    set "BROWSER_EXE=%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe"
    set "BROWSER_NAME=Google Chrome (64-bit)"
    set "BROWSER_TYPE=chrome"
    goto :browser_found
)
if exist "%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe" (
    set "BROWSER_EXE=%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe"
    set "BROWSER_NAME=Google Chrome (32-bit)"
    set "BROWSER_TYPE=chrome"
    goto :browser_found
)
if exist "%LocalAppData%\\Google\\Chrome\\Application\\chrome.exe" (
    set "BROWSER_EXE=%LocalAppData%\\Google\\Chrome\\Application\\chrome.exe"
    set "BROWSER_NAME=Google Chrome (Uzivatelsky profil AppData)"
    set "BROWSER_TYPE=chrome"
    goto :browser_found
)

if exist "%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe" (
    set "BROWSER_EXE=%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe"
    set "BROWSER_NAME=Microsoft Edge"
    set "BROWSER_TYPE=edge"
    goto :browser_found
)
if exist "%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe" (
    set "BROWSER_EXE=%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe"
    set "BROWSER_NAME=Microsoft Edge (64-bit)"
    set "BROWSER_TYPE=edge"
    goto :browser_found
)
if exist "%LocalAppData%\\Microsoft\\Edge\\Application\\msedge.exe" (
    set "BROWSER_EXE=%LocalAppData%\\Microsoft\\Edge\\Application\\msedge.exe"
    set "BROWSER_NAME=Microsoft Edge (Uzivatelsky)"
    set "BROWSER_TYPE=edge"
    goto :browser_found
)

:browser_found
if "%BROWSER_EXE%"=="" (
    echo [VAROVANI] Nebyl nalezen Chrome ani Edge ve standardnich cestach.
    echo Oteviram ve vychozim systemovem prohlizeci...
    start "" "%TARGET_URL%"
    goto :finished
)

echo       -> Nalezen: %BROWSER_NAME%
echo       -> Cesta: "%BROWSER_EXE%"
echo.

echo [3/3] Spoustim Kiosk rezim na popredi...
set "KIOSK_PROFILE=%TEMP%\\kiosk_browser_profile"

if "%BROWSER_TYPE%"=="chrome" (
    start "" "%BROWSER_EXE%" --kiosk "%TARGET_URL%" --user-data-dir="%KIOSK_PROFILE%" --no-first-run --no-default-browser-check --disable-translate --disable-features=Translate --disable-pinch --overscroll-history-navigation=0 --disable-background-mode --disable-component-update --disable-sync
) else (
    start "" "%BROWSER_EXE%" --kiosk "%TARGET_URL%" --edge-kiosk-type=fullscreen --user-data-dir="%KIOSK_PROFILE%" --no-first-run --no-default-browser-check
)

:finished
echo.
echo ===================================================================
echo [HOTOVO] Rodicovsky zamek byl uspesne spusten.
echo.
echo Cilova adresa: %TARGET_URL%
echo.
echo Pokud se okno prohlizece otevrelo, muzete toto okno zavrit.
echo Stisknete libovolnou klavesu pro ukonceni...
echo ===================================================================
pause >nul
exit /b 0
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
