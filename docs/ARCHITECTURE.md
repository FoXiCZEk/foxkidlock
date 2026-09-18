# 🏛️ Architektura a technický popis systému: Rodičovský Zámek PC

Tento dokument detailně popisuje softwarovou architekturu, životní cyklus stavů, komunikační protokoly a bezpečnostní mechanismy platformy **Rodičovský Zámek PC** (verze 2.4.0+).

---

## 1. Celkový architektonický model

Systém je navržen na bázi **autoritativního serveru (Server-Authoritative State Engine)** s asynchronními klienty:

```
                  ┌────────────────────────────────────────────────────────┐
                  │                 VZDÁLENÝ SERVER / NAS                  │
                  │               (Node.js + Express + Vite)               │
                  │                                                        │
                  │  ┌────────────────────────┐  ┌──────────────────────┐  │
                  │  │     State Engine       │  │    Persistent Store  │  │
                  │  │  (ChildLiveState, PIN) │  │  (JSON / SQLite / FS)│  │
                  │  └───────────┬────────────┘  └──────────────────────┘  │
                  │              │                                         │
                  │  ┌───────────┴────────────┐  ┌──────────────────────┐  │
                  │  │   Command Queue / REST │  │  SSE State Broadcast │  │
                  │  │ (/api/state, /heartbeat│  │    (/api/events)     │  │
                  │  └───────▲────────────▲───┘  └──────────┬───────────┘  │
                  └──────────┼────────────┼─────────────────┼──────────────┘
                             │            │                 │
             HTTP Heartbeats │            │ REST Commands   │ SSE Live Sync
             každé 3 sekundy │            │ & Auth PIN      │
                             │            │                 │
    ┌────────────────────────┴───┐       ┌┴─────────────────▼───────────┐
    │     WINDOWS AGENT          │       │    RODIČOVSKÝ PANEL          │
    │  (Powershell + VBS WScript)│       │ (Mobil / Tablet / Web Prohl.)│
    │                            │       │                              │
    │ • Watchdog herních procesů │       │ • Okamžité dálkové odemčení  │
    │ • Hlídání Kiosk okna       │       │ • Úprava otázek a obtížnosti │
    │ • Automatické zavření Kiosku│      │ • Blokování vybraných webů   │
    │ • Dvouvrstvý Web Filter    │       │ • Přehled statistik a času   │
    └──────────────┬─────────────┘       └──────────────────────────────┘
                   │
         Spouští a ukončuje
                   │
    ┌──────────────▼─────────────┐
    │     DĚTSKÝ KIOSK           │
    │ (Celoobrazovkový prohlížeč)│
    │                            │
    │ • Otázky Matematika, ČJ... │
    │ • Ochrana proti zavření    │
    │ • Odpočet hracího času     │
    │ • Automatické ukončení     │
    └────────────────────────────┘
```

---

## 2. Životní cyklus stavového automatu (State Machine)

Server udržuje centrální stav relace `childState.status`, který nabývá následujících hodnot:

| Stav | Popis | Chování Agenta na PC |
|---|---|---|
| `locked_studying` | PC je zamčeno. Dítě musí odpovědět na stanovený počet otázek. | Ukončuje zakázané herní procesy. Spouští celoobrazovkový Kiosk s otázkami. Aktivuje blokování webů. |
| `unlocked_playing` | Úkoly splněny, běží volný hrací čas (např. 60 min). | **Zavře okno Kiosku**, uvolní obrazovku a hry jsou povoleny. |
| `time_expired` | Vypršel denní limit pro hraní her. | Znovu okamžitě ukončí herní procesy a zobrazí informaci o vypršení času. |
| `parent_bypass` | Rodič dočasně odemkl PC na dálku bez plnění úkolů. | Kiosk se okamžitě zavře, všechny procesy jsou povoleny. |

### Diagram přechodů:

```
[Start PC / Nový den]
        │
        ▼
 (locked_studying) ────── Dítě správně zodpoví úkoly ─────► (unlocked_playing)
        ▲                                                          │
        │                                             Časomíra     │
        │ Dálkový příkaz 'force_lock'                 vyprší na 0  │
        │ nebo vypršení povoleného bonusu                          ▼
        └────────────────────────────────────────────────── (time_expired)
```

---

## 3. Komunikační protokol Windows Agenta

Agent běží jako proces na pozadí stanice a komunikuje se serverem přes standardní HTTP/HTTPS REST rozhraní:

1. **Heartbeat cyklus (každé 3 sekundy):**
   - Agent volá `POST /api/agent/heartbeat` s tělem:
     ```json
     {
       "hostname": "PC-PETRIK",
       "agentVersion": "2.4.0",
       "kioskRunning": true,
       "lastKilledProcess": ""
     }
     ```
   - Server v odpovědi vrací aktuální požadovaný stav:
     ```json
     {
       "success": true,
       "status": "unlocked_playing",
       "playtimeRemainingSeconds": 3600,
       "blockedProcesses": ["minecraft.exe", "RobloxPlayerBeta.exe", ...],
       "webFilter": { "enabled": true, "domains": ["youtube.com", ...] },
       "commands": [{ "type": "close_kiosk", "timestamp": 1726650000000 }]
     }
     ```

2. **Dálkové příkazy (Remote Command Queue):**
   - Rodič může v reálném čase odeslat povel:
     - `skip_tasks`: Okamžitě považuje úkoly za splněné a odemkne PC.
     - `force_lock`: Okamžitě zamkne PC bez ohledu na zbývající čas.
     - `add_playtime`: Přičte bonusový čas hraní (např. +15 minut).
     - `send_message`: Zobrazí dítěti na Kiosku zprávu od rodiče.
     - `close_kiosk`: Povel agentovi k okamžitému zavření okna Kiosku.

---

## 4. Ochrana a izolace Kiosk okna

Prohlížeč je spouštěn s vyhrazeným uživatelským profilem:
```powershell
--user-data-dir="$env:LOCALAPPDATA\RodicovskyZamekPC\kiosk_agent_profile"
--kiosk "https://server/?mode=child"
--no-first-run
--disable-pinch
--disable-features=TranslateUI
```

### Výhody tohoto přístupu:
1. **Nenarušuje osobní data:** Dětský běžný prohlížeč (záložky, hesla) zůstává zcela nedotčen.
2. **Nemožnost obejít Kiosk:** Speciální argument `--kiosk` zakrývá Taskbar, nabídku Start i tlačítka zavřít/minimalizovat.
3. **Přesná identifikace procesu:** Agent dokáže Kiosk bezpečně detekovat i ukončit bez rizika zavření rodičovských nebo školních oken.

---

## 5. Bezpečnostní model (Security & Integrity)

- **Správa PINu:** Veškeré operace měnící konfiguraci (změna otázek, úprava času, přímé odemčení z PC) vyžadují ověření 4místným rodičovským PINem.
- **Fail-Safe Mechanism:** Pokud server není dočasně dostupný, agent zachová poslední známý bezpečnostní stav (PC zůstane zamčeno).
- **Procesní watchdog:** Pokud se dítě pokusí ukončit prohlížeč přes Správce úloh, agent jej do 3 sekund opětovně spustí na popředí.
- **Odolnost proti haváriím:** Data relace a statistiky jsou ukládány do perzistentního souboru `parental_lock_data.json`, data přežijí výpadek proudu i restart PC.
