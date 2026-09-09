# 🐳 Nasazení Rodičovského Zámku PC pomocí Dockeru

Tento návod popisuje, jak spustit server **Rodičovského zámku** ve vašem vlastním prostředí (domácí server, NAS Synology/QNAP, Raspberry Pi, VPS nebo lokální počítač) v Docker kontejneru.

---

## 🚀 Rychlý start (Docker Compose)

Nejjednodušší způsob nasazení je pomocí Docker Compose:

1. Naklonujte nebo stáhněte soubory aplikace.
2. Ve složce projektu spusťte:

```bash
docker compose up -d --build
```

Server se sestaví a spustí na pozadí na portu `3000`.

- **Web pro rodiče (vzdálená správa):** `http://<IP-VASEHO-SERVERU>:3000/?mode=parent`
- **Obrazovka pro dětské PC:** `http://<IP-VASEHO-SERVERU>:3000/?mode=child`
- **Kontrola stavu kontejneru:** `http://<IP-VASEHO-SERVERU>:3000/api/health`

---

## 📦 Spuštění pomocí čistého Docker CLI (bez Compose)

Pokud preferujete přímo příkaz `docker run`:

```bash
# 1. Sestavení image
docker build -t parental-lock:latest .

# 2. Vytvoření složky pro trvalé ukládání dat
mkdir -p ./data

# 3. Spuštění kontejneru s namapovaným portem a daty
docker run -d \
  --name parental-lock-server \
  --restart unless-stopped \
  -p 3000:3000 \
  -v "$(pwd)/data:/app/data" \
  parental-lock:latest
```

---

## 💾 Trvalé ukládání dat (Persistent Storage)

Všechna data aplikace (nastavený PIN, povolené aplikace, splněné úkoly, statistiky a časové limity) se automaticky ukládají do souboru `parental_lock_data.json`.

V Docker konfiguraci je tento soubor směrován do složky `/app/data`, která je namapována na lokální složku `./data` na vašem hostiteli:
```yaml
volumes:
  - ./data:/app/data
```
Při restartu nebo aktualizaci kontejneru se **žádná nastavení ani statistiky neztratí**.

---

## ⚙️ Proměnné prostředí (Environment Variables)

| Proměnná | Výchozí hodnota | Popis |
|---|---|---|
| `PORT` | `3000` | Port, na kterém server naslouchá uvnitř kontejneru |
| `DATA_FILE` | `/app/data/parental_lock_data.json` | Cesta k JSON databázi pro perzistentní data |
| `NODE_ENV` | `production` | Režim prostředí Node.js |
| `GEMINI_API_KEY` | *(volitelné)* | API klíč pro AI generování nových otázek do kvízů |

---

## 🖥️ Propojení s dětským PC (.BAT skript)

Po spuštění v Dockeru stačí upravit cílovou adresu v souboru `Spustit-Kiosk-Zamek.bat` na dětském počítači, aby se připojoval k vašemu Docker serveru v lokální síti:

```bat
set "TARGET_URL=http://192.168.1.100:3000/?mode=child"
```
*(Nahraďte `192.168.1.100` lokální IP adresou počítače, kde běží Docker).*

Tento upravený `.BAT` skript si můžete také **stáhnout přímo z webové aplikace** v záložce *Docker & Server*, kde stačí zadat vaši IP adresu a kliknout na *Stáhnout předkonfigurovaný .BAT*!
