# 📡 REST API Reference: Rodičovský Zámek PC

Tato specifikace popisuje veškerá rozhraní REST API vystavená serverem pro komunikaci mezi klientským webem, mobilním panelem rodiče a systémovým agentem na stanici Windows.

Výchozí základní URL: `http://<SERVER_HOST>:3000`

---

## 1. Stav a inicializace aplikace

### `GET /api/state`
Vrací kompletní stav relace dítěte, nastavení rodiče a přehledové statistiky.

- **Query parametry:**
  - `mode=child` (volitelné): Oznámí serveru, že požadavek odesílá Kiosk obrazovka. Automaticky vyvolá vyzvednutí čekajících dálkových příkazů.
- **Příklad odpovědi (200 OK):**
```json
{
  "childState": {
    "status": "locked_studying",
    "requiredAnswers": 5,
    "completedAnswers": 2,
    "currentStreak": 2,
    "playtimeRemainingSeconds": 3600,
    "sessionStartTime": 1726650000000,
    "activeSubject": "math",
    "agent": {
      "isInstalled": true,
      "lastHeartbeat": 1726650120000,
      "hostname": "PC-DITE",
      "version": "2.4.0",
      "kioskRunning": true,
      "lastKilledProcess": ""
    }
  },
  "settings": {
    "dailyPlaytimeMinutes": 60,
    "questionsPerSession": 5,
    "difficultyGrade": "grade_3_4",
    "soundEffectsEnabled": true,
    "streakBonusEnabled": true
  },
  "stats": {
    "totalQuestionsAnswered": 42,
    "correctAnswers": 38,
    "totalPlaytimeMinutes": 180,
    "daysStreak": 4
  }
}
```

---

### `GET /api/events` (Server-Sent Events)
Stream reálného času pro okamžité promítnutí změn do všech připojených klientů (rodičovský panel, kiosk).
- **Protokol:** HTTP SSE (`text/event-stream`)
- **Event `state_update`:** Obsahuje aktualizovaný JSON objekt stavu.

---

## 2. Klientské akce dítěte (Kiosk)

### `POST /api/answer`
Odeslání odpovědi dítěte na aktuální otázku.

- **Tělo požadavku (JSON):**
```json
{
  "questionId": "math_multiplication_01",
  "isCorrect": true,
  "subjectId": "math"
}
```
- **Odpověď (200 OK):**
```json
{
  "success": true,
  "childState": { ... },
  "stats": { ... },
  "justUnlocked": true
}
```
*Poznámka:* Pokud dítě splnilo poslední požadovanou otázku, server automaticky změní stav na `unlocked_playing` a zařadí příkaz `close_kiosk` pro ukončení zamykacího okna.

---

### `POST /api/agent/dismiss-kiosk`
Povel pro explicitní zavření zamykacího Kiosku z klientského rozhraní (např. kliknutí na tlačítko "Přejít na plochu").

- **Podmínka:** Stav musí být `unlocked_playing` nebo `parent_bypass`.
- **Odpověď (200 OK):**
```json
{
  "success": true,
  "message": "Příkaz k zavření Kiosku byl předán agentovi"
}
```

---

## 3. Komunikace systémového agenta

### `POST /api/agent/heartbeat`
Pravidelné hlášení Windows Agenta (odesíláno každé 3 sekundy).

- **Tělo požadavku (JSON):**
```json
{
  "hostname": "PC-DITE",
  "agentVersion": "2.4.0",
  "kioskRunning": true,
  "lastKilledProcess": "javaw.exe"
}
```
- **Odpověď (200 OK):**
```json
{
  "success": true,
  "status": "locked_studying",
  "playtimeRemainingSeconds": 0,
  "blockedProcesses": [
    "minecraft.exe",
    "javaw.exe",
    "RobloxPlayerBeta.exe",
    "steam.exe"
  ],
  "webFilter": {
    "enabled": true,
    "domains": ["youtube.com", "netflix.com", "tiktok.com"]
  },
  "commands": [
    { "type": "close_kiosk", "timestamp": 1726650500000 }
  ]
}
```

---

### `GET /api/agent/download/installer`
Vygeneruje a stáhne skript `Instalovat-Agenta-Windows.bat` s automaticky předkonfigurovanou URL adresou aktuálního serveru.

### `GET /api/agent/download/script`
Stáhne jádro agenta `Agent-Zamek-PC.ps1`.

### `GET /api/agent/download/uninstaller`
Stáhne čistící odinstalátor `Odinstalovat-Agenta-Windows.bat`.

---

## 4. Rodičovské rozhraní a vzdálená správa

### `POST /api/parent/command`
Odeslání dálkového řídicího povelu z mobilu či počítače rodiče.

- **Tělo požadavku (JSON):**
```json
{
  "command": "skip_tasks"
}
```
*Podporované hodnoty parametru `command`:*
- `skip_tasks`: Okamžitě odemkne PC a zavře Kiosk bez dalších otázek.
- `force_lock`: Okamžitě zamkne PC a spustí výukový Kiosk.
- `add_playtime`: Přičte minuty hraní. Vyžaduje `payload: { "minutes": 15 }`.
- `send_message`: Zobrazí zprávu na monitoru dítěte. Vyžaduje `payload: { "message": "Za 10 minut oběd!" }`.
- `reset_session`: Vynuluje denní počítadlo a vyžádá nové plnění úkolů.

---

### `POST /api/parent/settings`
Uložení nových parametrů aplikace (chráněno PINem).

- **Tělo požadavku (JSON):**
```json
{
  "pin": "1234",
  "settings": {
    "dailyPlaytimeMinutes": 90,
    "questionsPerSession": 8,
    "difficultyGrade": "grade_5_6",
    "soundEffectsEnabled": true,
    "streakBonusEnabled": true
  }
}
```

---

### `POST /api/agent/web-filter`
Aktualizace pravidel pro blokování webových stránek.

- **Tělo požadavku (JSON):**
```json
{
  "enabled": true,
  "domains": [
    "youtube.com",
    "youtu.be",
    "netflix.com",
    "tiktok.com",
    "twitch.tv",
    "discord.com"
  ]
}
```

---

### `POST /api/agent/blocked-processes`
Aktualizace seznamu her a spustitelných souborů, které agent na stanici ukončuje při zamknutí.
