==============================================================================
RODIČOVSKÝ ZÁMEK PC - NÁVOD K INSTALACI SYSTÉMOVÉHO AGENTA NA PC DÍTĚTE
==============================================================================

CO AGENT ŘEŠÍ:
1. Automatický start při přihlášení (Windows Login):
   - Ihned po zapnutí PC / přihlášení dítěte ověří stav na serveru.
   - Pokud je PC zamknuté (dítě ještě nesplnilo úkoly nebo vypršel čas),
     okamžitě vyvolá Kiosk s otázkami do popředí.
2. Zamezení hraní her (Minecraft, Roblox, Steam, Epic, Fortnite...):
   - Agent běží skrytě na pozadí bez jakéhokoliv blikání oken.
   - V případě zamknutí nebo vypršení denního limitu okamžitě ukončí
     všechny herní procesy.
   - Watchdog: Pokud se dítě pokusí Kiosk shodit, agent ho do 1 sekundy znovu otevře.
3. Bezpečné uvolnění her po splnění úloh:
   - Jakmile dítě splní požadovaný počet správných odpovědí, agent hry povolí
     a dítě může hrát až do vypršení nastaveného herního limitu.

------------------------------------------------------------------------------
JAK AGENTA NAINSTALOVAT NA PC DÍTĚTE (1 KLIKNUTÍ):
------------------------------------------------------------------------------
1. Stáhněte celou složku / balíček "agent" nebo spusťte:
   Instalovat-Agenta-Windows.bat
2. Skript automaticky:
   - Nakopíruje soubory do bezpečné složky uživatele
   - Zaregistruje agenta k automatickému spouštění po přihlášení do Windows
   - Okamžitě agenta spustí na pozadí (přes tichý Spustit-Agenta-Skryte.vbs)
3. Hotovo! V rodičovském rozhraní se rozsvítí zelená kontrolka:
   "Windows Agent: AKTIVNÍ"

------------------------------------------------------------------------------
JAK AGENTA ODINSTALOVAT:
------------------------------------------------------------------------------
Spusťte soubor:
   Odinstalovat-Agenta-Windows.bat
Tento soubor ukončí běžící procesy a odstraní automatické spouštění.
==============================================================================
