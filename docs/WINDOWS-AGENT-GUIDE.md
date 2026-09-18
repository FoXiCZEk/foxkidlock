# 💻 Příručka k systémovému agentovi pro Windows (Dětský počítač)

Systémový agent je lehká, vysoce optimalizovaná služba na pozadí, navržená speciálně pro operační systémy **Windows 10 a Windows 11**.

---

## 📋 Přehled funkcí agenta

- 🛡️ **Automatický start po zapnutí PC:** Spustí se neprodleně po přihlášení uživatele do Windows bez nutnosti ručního zásahu.
- 🔕 **Zcela tichý chod:** Nevytváří žádná blikající černá okna konzole ani ikony na hlavním panelu (spouštěno přes Windows Script Host `wscript.exe`).
- 🎮 **Automatické ukončování her:** Pokud je počítač v režimu `locked_studying`, agent nepřetržitě monitoruje a okamžitě ukončuje zakázané procesy (Minecraft, Roblox, Steam, Epic Games, Fortnite, Discord apod.).
- 🛑 **Dvouúrovňový webový filtr:**
  1. *Síťová úroveň:* Dočasné přesměrování domén (YouTube, Netflix, TikTok...) v souboru `C:\Windows\System32\drivers\etc\hosts` na `127.0.0.1`.
  2. *Prohlížečová úroveň:* Detekce a zavírání nepovolených panelů a procesů.
- 🖥️ **Kiosk Watchdog:** Udržuje zamykací výukové okno na popředí v plnoobrazovkovém režimu.
- 🔓 **Automatické uvolnění stanice po splnění:** Jakmile dítě zodpoví stanovený počet otázek, agent Kiosk okno čistě zavře a uvolní plochu pro hraní.

---

## 📦 Obsah instalačního balíčku

Po stažení archivu `RodicovskyZamek-WindowsAgent-vX.X.X.zip` získáte tyto soubory:

| Soubor | Popis |
|---|---|
| `Instalovat-Agenta-Windows.bat` | Hlavní instalační skript. Zkopíruje soubory do `%LOCALAPPDATA%\RodicovskyZamekPC\agent` a zaregistruje automatické spouštění. |
| `Agent-Zamek-PC.ps1` | Výkonné jádro agenta napsané v PowerShellu. Zajišťuje veškeré hlídání, komunikaci a Kiosk okno. |
| `Spustit-Agenta-Skryte.vbs` | Spouštěcí VBScript, který zajistí, že se PowerShell spustí v neviditelném okně (`WindowStyle Hidden`). |
| `Odinstalovat-Agenta-Windows.bat` | Čistý odinstalátor. Ukončí procesy, smaže záznamy z registrů a odstraní soubory. |
| `server_url.txt` | Textový soubor s URL adresou serveru (např. `https://muj-server.cz` nebo `http://192.168.1.50:3000`). |
| `NAVOD-K-POUZITI.txt` | Stručný offline návod v textovém formátu. |

---

## 🚀 Postup instalace krok za krokem

1. **Příprava serverové adresy:**
   - Otevřete soubor `server_url.txt` v Poznámkovém bloku.
   - Vložte do něj adresu vašeho běžícího serveru (např. URL adresa z Cloud Run nebo lokální IP vašeho NAS/PC).
   - Uložte soubor.

2. **Spuštění instalace:**
   - Klikněte pravým tlačítkem na soubor **`Instalovat-Agenta-Windows.bat`**.
   - Zvolte **"Spustit jako správce"** (doporučeno pro plnou aktivaci ochrany souboru hosts) nebo spusťte běžným poklepáním.
   - Během 3 sekund se vytvoří složka, zaregistruje se spouštění při startu a agent ihned začne běžet.

3. **Ověření v rodičovském panelu:**
   - Otevřete rodičovský panel na mobilu nebo v prohlížeči (`/?mode=parent`).
   - V sekci **"Počítačový agent"** uvidíte zelený indikátor **ONLINE**, název počítače a verzi agenta.

---

## 🔧 Jak agent registruje automatické spouštění

Pro maximální spolehlivost používá instalátor trojitý systém registrace:

1. **Plánovač úloh Windows (`schtasks`):**
   - Vytvoří úlohu `RodicovskyZamekAgent` spouštěnou s nejvyššími právy (`/rl highest`) při každém přihlášení uživatele (`/sc onlogon`).
2. **Uživatelský registr Windows Run:**
   - Zápis do klíče `HKCU\Software\Microsoft\Windows\CurrentVersion\Run`. Tento krok funguje spolehlivě i v případě, že uživatel nemá administrátorská práva.
3. **Složka Po spuštění (Startup):**
   - Umístění zástupce přímo do `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup`.

---

## 🎮 Seznam standardně monitorovaných her a platforem

Pokud je počítač zamčen, agent ukončuje tyto spustitelné soubory:

- **Minecraft:** `javaw.exe`, `java.exe`, `Minecraft.exe`, `MinecraftLauncher.exe`
- **Roblox:** `RobloxPlayerBeta.exe`, `RobloxStudioBeta.exe`
- **Herní platformy:** `steam.exe`, `EpicGamesLauncher.exe`, `Battle.net.exe`, `RiotClientServices.exe`, `upc.exe`
- **Oblíbené hry:** `FortniteClient-Win64-Shipping.exe`, `VALORANT-Win64-Shipping.exe`, `cs2.exe`, `csgo.exe`, `Overwatch.exe`, `GenshinImpact.exe`
- **Komunikační nástroje:** `Discord.exe`

*Seznam sledovaných procesů může rodič libovolně upravovat a rozšiřovat přímo v záložce "Počítačový agent".*

---

## 🗑️ Jak agenta odinstalovat

Pokud potřebujete agenta z počítače odstranit:
1. Spusťte soubor **`Odinstalovat-Agenta-Windows.bat`** (jako správce).
2. Skript ukončí běžící procesy na pozadí.
3. Vymaže naplánovanou úlohu i záznamy z registrů.
4. Odstraní složku `%LOCALAPPDATA%\RodicovskyZamekPC\agent`.
5. Počítač je ve výchozím stavu bez jakýchkoliv omezení.
