# 🛡️ Rodičovský Zámek PC (Windows Parental Control & Learning Lock)

[![Verze](https://img.shields.io/badge/Verze-2.4.0-brightgreen.svg)](https://github.com/)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-blue.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ed.svg)](https://www.docker.com/)
[![Windows](https://img.shields.io/badge/Windows-10%20%7C%2011-0078d6.svg)](https://www.microsoft.com/windows)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

> **Moderní, bezpečný a edukativní rodičovský zámek pro počítače s Windows 10 a 11.**  
> Zamezí bezcílnému sezení u počítače a hraní her tím, že před odemčením vyžaduje splnění přizpůsobitelných výukových úkolů (matematika, český jazyk, angličtina, zeměpis, přírodověda a logika). Rodič má plnou kontrolu v reálném čase odkudkoliv ze svého mobilního telefonu či tabletu.

---

## 📑 Obsah

1. [Klíčové vlastnosti](#-klíčové-vlastnosti)
2. [Jak systém funguje](#-jak-systém-funguje)
3. [Rychlý start (Nasazení a spuštění)](#-rychlý-start)
   - [A. Dětský počítač (Instalace systémového agenta)](#a-dětský-počítač-instalace-agenta)
   - [B. Nasazení serveru přes Docker Compose](#b-nasazení-serveru-přes-docker-compose)
   - [C. Lokální spuštění na Windows (Bez Dockeru)](#c-lokální-spuštění-na-windows-bez-dockeru)
4. [Výukové moduly a předměty](#-výukové-moduly-a-předměty)
5. [Blokování her a procesů](#-blokování-her-a-procesů)
6. [Dvouúrovňový webový filtr](#-dvouúrovňový-webový-filtr)
7. [Dálkové ovládání pro rodiče](#-dálkové-ovládání-pro-rodiče)
8. [Struktura repozitáře](#-struktura-repozitáře)
9. [Podrobná dokumentace](#-podrobná-dokumentace)
10. [FAQ a řešení potíží](#-faq-a-řešení-potíží)

---

## ✨ Klíčové vlastnosti

- 🔒 **Nekompromisní Kiosk zámek:** Po zapnutí PC se zobrazí celoobrazovková zamykací plocha zakrývající nabídku Start, Taskbar i běžné zkratky.
- 🎯 **Výuka jako klíč k zábavě:** Dítě si přístup k hraní zaslouží správným zodpovězením zadaného počtu otázek.
- 🔓 **Automatické uvolnění stanice:** Po úspěšném zodpovězení úkolů se zamykací obrazovka automaticky a čistě zavře a počítač je ihned 100% přístupný.
- 🎮 **Automatický procesní watchdog:** Při zamknutí agent okamžitě detekuje a ukončuje spuštěné hry (Minecraft, Roblox, Steam, Epic Games, Fortnite atd.).
- 🌐 **Webový filtr (DNS + Browser):** Možnost vypnout rozptylující weby (YouTube, Netflix, TikTok, Twitch...) během doby určené na úkoly.
- 📱 **Okamžitá vzdálená správa z mobilu:** Rodič může kdykoliv na jedno kliknutí PC odemknout, přeskočit otázky, přidat čas nebo na monitor poslat vzkaz.
- 🔕 **Tichý běh bez otravných oken:** Systémový agent běží skrytě na pozadí prostřednictvím Windows Script Host (`wscript.exe`).
- 📊 **Statistiky a úspěšnost:** Přehledné grafy správnosti odpovědí, vývoje vědomostí a stráveného času.
- ☁️ **Zálohování do Google Drive:** Možnost exportu a zálohy výsledků a otázek na disk Google.

---

## 📐 Jak systém funguje

```
┌────────────────────────────────────────┐
│     MOBILNÍ ZAŘÍZENÍ RODIČE           │
│   (Přístup přes webový prohlížeč)      │
│   URL: https://server/?mode=parent     │
└──────────────────┬─────────────────────┘
                   │
                   │  1. Dálková konfigurace & příkazy
                   │     (odemknout, přidat čas, úprava otázek)
                   ▼
┌────────────────────────────────────────┐
│         CENTRÁLNÍ SERVER / NAS         │
│     (Node.js + Express + Vite)         │
│     Docker / Cloud Run / Lokální PC    │
└──────────────────┬─────────────────────┘
                   │
                   │  2. Synchronizace stavu (každé 3 s)
                   │     a předávání příkazů
                   ▼
┌────────────────────────────────────────┐
│     DĚTSKÝ POČÍTAČ S WINDOWS 10/11     │
│                                        │
│   ┌────────────────────────────────┐   │
│   │ SYSTÉMOVÝ AGENT (NA POZADÍ)    │   │
│   │ - Hlídá a ukončuje hry         │   │
│   │ - Spravuje Kiosk okno          │   │
│   │ - Po splnění Kiosk zavře       │   │
│   └──────────────┬─────────────────┘   │
│                  │                     │
│                  ▼                     │
│   ┌────────────────────────────────┐   │
│   │ PLNOOBRAZOVKOVÝ VÝUKOVÝ KIOSK  │   │
│   │ - Matematika, ČJ, AJ, Vlast.   │   │
│   │ - Po splnění se sám zavře!     │   │
│   └────────────────────────────────┘   │
└────────────────────────────────────────┘
```

---

## 🚀 Rychlý start

### A. Dětský počítač (Instalace agenta)

1. Stáhněte nejnovější balíček **`RodicovskyZamek-WindowsAgent-latest.zip`** (z GitHub Releases nebo přímo z rodičovského panelu tlačítkem *"Stáhnout kompletní balíček agenta"*).
2. Rozbalte ZIP archiv na dětském počítači do libovolné složky.
3. Pokud máte vlastní server, otevřete `server_url.txt` a zadejte jeho URL adresu (např. `https://muj-server.cz`).
4. Klikněte pravým tlačítkem na **`Instalovat-Agenta-Windows.bat`** a zvolte **"Spustit jako správce"**.
5. **Hotovo!** Agent se spustí, nastaví automatický start po zapnutí PC a v rodičovském panelu se rozsvítí zelená kontrolka **ONLINE**.

---

### B. Nasazení serveru přes Docker Compose

Pro stálý provoz na domácím serveru, NASu (Synology, QNAP) nebo VPS:

```bash
# 1. Klonování repozitáře
git clone https://github.com/vas-ucet/rodicovsky-zamek-pc.git
cd rodicovsky-zamek-pc

# 2. Spuštění kontejneru na pozadí
docker compose up -d --build
```

Aplikace bude okamžitě dostupná na:
- **Rozhraní pro rodiče:** `http://<IP-SERVERU>:3000/?mode=parent` (výchozí PIN: `1234`)
- **Rozhraní pro dětský Kiosk:** `http://<IP-SERVERU>:3000/?mode=child`
- **Zdravotní test API:** `http://<IP-SERVERU>:3000/api/health`

Veškerá data (statistiky, nastavení, otázky) se trvale ukládají do složky `./data`.

---

### C. Lokální spuštění na Windows (Bez Dockeru)

Pokud chcete server provozovat přímo na Windows:

1. Nainstalujte [Node.js](https://nodejs.org/) (verze 18 nebo novější).
2. Poklepejte na soubor **`Spustit-Komplet-Lokalne.bat`**.
3. Dávkový soubor automaticky zkontroluje závislosti a spustí server i výukový Kiosk.

---

## 📚 Výukové moduly a předměty

Aplikace obsahuje rozsáhlou sadu interaktivních otázek rozdělených podle věku a ročníků:

| Ikona | Předmět | Zaměření otázek |
|:---:|---|---|
| 🧮 | **Matematika** | Malá a velká násobilka, sčítání/odčítání, zlomky, slovní úlohy, geometrie |
| 📖 | **Český jazyk** | Vyjmenovaná slova, shoda přísudku s podmětem, pády, synonyma a slovní druhy |
| 🌍 | **Angličtina** | Slovní zásoba, nepravidelná slovesa, barvy, zvířata, předložky a tvorba vět |
| 🧭 | **Vlastivěda a zeměpis** | Krajská města ČR, řeky, pohoří, sousední státy a hlavní města Evropy |
| 🌿 | **Přírodověda** | Živočichové, stromy, lidské tělo, fotosyntéza, ekologie a vesmír |
| 💻 | **Logika a programování** | Algoritmické myšlení, číselné řady, logické hádanky, základy podmínek a smyček |

*Rodiče mohou v panelu aktivovat libovolné předměty, měnit počet požadovaných otázek nebo vytvářet vlastní otázky.*

---

## 🎮 Blokování her a procesů

Pokud je počítač zamčený, agent automaticky a nekompromisně ukončuje herní klienty:

- **Minecraft:** `javaw.exe`, `java.exe`, `Minecraft.exe`, `MinecraftLauncher.exe`
- **Roblox:** `RobloxPlayerBeta.exe`, `RobloxStudioBeta.exe`
- **Platformy:** `steam.exe`, `EpicGamesLauncher.exe`, `Battle.net.exe`, `RiotClientServices.exe`, `upc.exe`
- **Populární tituly:** `FortniteClient-Win64-Shipping.exe`, `VALORANT-Win64-Shipping.exe`, `cs2.exe`, `Discord.exe`

Jakmile dítě splní úkoly, zamykání se vypne a hry lze okamžitě spustit.

---

## 🌐 Dvouúrovňový webový filtr

Pro zabránění prokrastinaci u videí při plnění úkolů systém nabízí:

1. **DNS blokace (Hosts soubor):** Dočasný zápis do `C:\Windows\System32\drivers\etc\hosts`, který přesměruje vybrané domény (`youtube.com`, `netflix.com`, `tiktok.com`...) na lokální adresu `127.0.0.1`.
2. **Prohlížečový monitor:** Automatické ukončení či přesměrování nevhodných panelů.
3. **Automatické obnovení:** Po odemčení počítače se hosts soubor okamžitě vrátí do původního stavu.

---

## 📱 Dálkové ovládání pro rodiče

Přístup k panelu je zabezpečen **4místným PIN kódem** (výchozí: `1234`).

V panelu můžete:
- 🟢 Sledovat stav počítače v reálném čase (**ONLINE / OFFLINE**, název stanice, aktivní proces).
- 🔓 **Odemknout PC na dálku** jedním kliknutím bez nutnosti plnit otázky.
- 🔒 **Okamžitě zamknout PC**, i když má dítě ještě zbývající čas.
- ⏱️ **Přidat hrací čas** (+15, +30, +60 minut) za odměnu (např. za úklid pokoje).
- 💬 **Poslat zprávu na monitor**, která se dítěti zobrazí přes celou obrazovku.
- 📋 Upravovat požadovaný počet otázek pro každé odemčení.

---

## 📁 Struktura repozitáře

```
rodicovsky-zamek-pc/
├── public/agent/                  # Soubory instalačního balíčku pro Windows
│   ├── Agent-Zamek-PC.ps1         # Výkonné jádro systémového agenta (PowerShell)
│   ├── Instalovat-Agenta-Windows.bat # 1-klik instalátor pro Windows
│   ├── Spustit-Agenta-Skryte.vbs  # Tichý spouštěč bez blikání oken (VBScript)
│   ├── Odinstalovat-Agenta-Windows.bat # Kompletní odinstalace ze systému
│   └── NAVOD-K-POUZITI.txt        # Textový návod k instalaci
├── docs/                          # Rozšířená technická dokumentace
│   ├── ARCHITECTURE.md            # Architektura, stavový automat, komunikace
│   ├── WINDOWS-AGENT-GUIDE.md     # Podrobná příručka Windows agenta
│   └── API-REFERENCE.md           # Kompletní specifikace REST API endpointů
├── src/                           # Frontend aplikace (React 19 + TypeScript + Tailwind)
│   ├── components/                # UI komponenty (Kiosk, ParentDashboard, WebFilter...)
│   ├── data/                      # Výchozí otázky pro jednotlivé předměty
│   └── types.ts                   # Datové typy a rozhraní
├── .github/workflows/             # Automatizace sestavení a vydávání balíčků
│   └── release-agent.yml          # GitHub Actions pro automatický ZIP release
├── docker-compose.yml             # Konfigurace pro rychlé nasazení v Dockeru
├── Dockerfile                     # Produkční vícefázový Docker build
├── Spustit-Komplet-Lokalne.bat    # Lokální spouštěč pro Windows bez Dockeru
└── server.ts                      # Backend server (Express + SSE + API)
```

---

## 📖 Podrobná dokumentace

Pro podrobné technické informace navštivte dokumenty ve složce [`docs/`](./docs):
- 🏛️ [Architektura a stavový automat (`docs/ARCHITECTURE.md`)](./docs/ARCHITECTURE.md)
- 💻 [Provozní příručka pro Windows Agenta (`docs/WINDOWS-AGENT-GUIDE.md`)](./docs/WINDOWS-AGENT-GUIDE.md)
- 📡 [REST API Reference (`docs/API-REFERENCE.md`)](./docs/API-REFERENCE.md)

---

## ❓ FAQ a řešení potíží

<details>
<summary><b>Otázka: Co když dítě počítač restartuje?</b></summary>
Agent je zaregistrován v Plánovači úloh Windows i v registrech pro automatické spuštění. Ihned po přihlášení do Windows se agent aktivuje na pozadí, ověří stav na serveru a pokud nejsou splněny úkoly, okamžitě spustí Kiosk a ukončí hry.
</details>

<details>
<summary><b>Otázka: Co se stane po splnění všech zadaných otázek?</b></summary>
Systém vyvolá oslavnou animaci s fanfárou, spustí 4sekundový odpočet a Kiosk okno se automaticky a čistě zavře. Počítač je ihned uvolněn a dítě může hrát povolené hry až do vypršení denního limitu.
</details>

<details>
<summary><b>Otázka: Může dítě proces agenta ukončit ve Správci úloh?</b></summary>
Pokud se dítě pokusí zavřít Kiosk okno nebo ukončit proces, watchdog agenta do 3 sekund zkontroluje stav a Kiosk znovu obnoví na popředí. Pro plnou ochranu doporučujeme dětskému účtu ve Windows odebrat práva administrátora.
</details>

<details>
<summary><b>Otázka: Jak změnit rodičovský PIN?</b></summary>
V rodičovském panelu klikněte na záložku <b>"Zabezpečení & PIN"</b>. Po zadání stávajícího PINu (výchozí: `1234`) můžete nastavit nový libovolný 4místný kód.
</details>

---

## 📄 Licence

Tento projekt je šířen pod otevřenou licencí MIT. Můžete jej volně používat, upravovat i nasazovat ve svých rodinách či školách.
