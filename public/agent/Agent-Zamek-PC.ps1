# ==============================================================================
# RODIČOVSKÝ ZÁMEK PC - SYSTÉMOVÝ DESKTOP AGENT PRO WINDOWS
# ==============================================================================
# Tento agent běží nepřetržitě na pozadí stanice dítěte:
# 1. Při přihlášení (Windows Login / Startup) okamžitě ověří stav zámku
# 2. Pokud je PC zamknuté nebo vypršel čas, neprodleně UKONČÍ všechny hry
#    (Minecraft, Roblox, Steam, Epic, Fortnite atd.)
# 3. Drží celoobrazovkový výukový Kiosk zámek na popředí obrazovky (Watchdog)
# 4. Jakmile dítě splní úkoly (nebo rodič vzdáleně odemkne), hry povolí
# 5. Blokování nepovolených webů (YouTube, Netflix, TikTok, Twitch, sociální sítě...)
#    - Spravuje Windows hosts soubor (127.0.0.1 DNS blokace)
#    - Aktivní hlídač otevřených panelů prohlížeče (okamžité zavření YouTube/Netflix)
#    - Možnost vzdáleně zablokovat/odblokovat weby kdykoli z rodičovského panelu
# 6. Odesílá rodiči živý stav (Online, aktivní procesy, počet ukončených her a webů)
# ==============================================================================

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = 'SilentlyContinue'

# Výchozí konfigurace serveru (Cloud vs. Lokální)
$DefaultCloudUrl = "https://ais-pre-q3orgyhhxwbamgxmw2ejcq-853779803326.europe-west2.run.app"
$LocalUrl = "http://localhost:3000"
$AgentVersion = "2.3.0"
$Hostname = $env:COMPUTERNAME

# Pokud existuje soubor server_url.txt vedle agenta, načte adresu z něj
$ConfigFile = Join-Path $PSScriptRoot "server_url.txt"
if (Test-Path $ConfigFile) {
    $CustomUrl = (Get-Content $ConfigFile -Raw).Trim()
    if ($CustomUrl) {
        $ServerUrl = $CustomUrl
    }
}

if (-not $ServerUrl) {
    # Zkusíme nejprve lokální server
    try {
        $test = Invoke-RestMethod -Uri "$LocalUrl/api/health" -Method Get -TimeoutSec 1 -ErrorAction Stop
        if ($test.status -eq 'ok') {
            $ServerUrl = $LocalUrl
        }
    } catch {
        $ServerUrl = $DefaultCloudUrl
    }
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   Rodičovský Zámek PC - Systémový Agent pro Windows      " -ForegroundColor Green
Write-Host "   Verze: $AgentVersion | Počítač: $Hostname             " -ForegroundColor White
Write-Host "   Server: $ServerUrl                                     " -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan

# Seznam výchozích herních procesů, které agent ukončuje při zamknutí
$GlobalBlockedProcesses = @(
    "Minecraft", "MinecraftLauncher", "javaw", "java",
    "RobloxPlayerBeta", "RobloxPlayerLauncher",
    "Steam", "steamwebhelper", "EpicGamesLauncher",
    "FortniteClient-Win64-Shipping", "VALORANT-Win64-Shipping",
    "LeagueClient", "GenshinImpact", "Brawlhalla",
    "Overwatch", "tslgame", "cs2", "RocketLeague"
)

$TotalKilledCount = 0
$LastKilledProcessName = ""
$TotalWebBlockCount = 0
$LastWebBlockEvent = ""
$ConsecutiveErrors = 0

# Cesta k hosts souboru ve Windows
$HostsFilePath = "$env:windir\System32\drivers\etc\hosts"
$HostsTagStart = "# === RODICOVSKY_ZAMEK_WEB_BLOCK_START ==="
$HostsTagEnd   = "# === RODICOVSKY_ZAMEK_WEB_BLOCK_END ==="
$LastAppliedHostsStateKey = ""

# Funkce: Správa blokování v hosts souboru Windows
function Update-HostsBlocking {
    param(
        [string[]]$Domains,
        [bool]$Enable
    )

    try {
        if (-not (Test-Path $HostsFilePath)) { return }

        # Sestavení klíče stavu pro zabránění zbytečným zápisům na disk
        $stateKey = if ($Enable -and $Domains.Count -gt 0) {
            ($Domains | Sort-Object) -join ","
        } else {
            "DISABLED"
        }

        if ($stateKey -eq $script:LastAppliedHostsStateKey) {
            return # Žádná změna, nepřepisujeme disk
        }

        # Načteme stávající obsah
        $content = Get-Content -Path $HostsFilePath -Raw -Encoding UTF8 -ErrorAction SilentlyContinue
        if ($null -eq $content) { return }

        # Odstranění předchozího bloku našeho agenta
        $pattern = "(?s)" + [regex]::Escape($HostsTagStart) + ".*?" + [regex]::Escape($HostsTagEnd) + "(\r?\n)?"
        $cleanedContent = [regex]::Replace($content, $pattern, "")

        if ($Enable -and $Domains.Count -gt 0) {
            $blockLines = @()
            $blockLines += ""
            $blockLines += $HostsTagStart
            $blockLines += "# Automaticky generováno Rodičovským zámkem PC: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"

            foreach ($domain in $Domains) {
                $clean = $domain.Trim().ToLower()
                if ($clean) {
                    $blockLines += "127.0.0.1 $clean"
                    $blockLines += "::1 $clean"
                }
            }

            $blockLines += $HostsTagEnd
            $blockLines += ""
            $newBlock = $blockLines -join "`r`n"
            $finalContent = $cleanedContent.TrimEnd() + "`r`n" + $newBlock
        } else {
            $finalContent = $cleanedContent
        }

        # Uložíme nový obsah
        Set-Content -Path $HostsFilePath -Value $finalContent -Encoding UTF8 -Force -ErrorAction Stop

        # Obnovení DNS cache Windows
        ipconfig /flushdns | Out-Null
        $script:LastAppliedHostsStateKey = $stateKey
        Write-Host "[WEB FILTER] Aktualizována DNS pravidla hosts (Aktivní domény: $(if ($Enable) { $Domains.Count } else { 0 }))" -ForegroundColor Magenta
    } catch {
        # Pokud agent nemá práva na zápis do hosts (např. neběží jako Admin), bude fungovat aktivní hlídač oken prohlížeče
    }
}

# Funkce: Aktivní hlídač oken prohlížeče (zavření panelu / okna s blokovaným webem)
function Enforce-BrowserTabRules {
    param([string[]]$BlockedDomains)

    if (-not $BlockedDomains -or $BlockedDomains.Count -eq 0) { return }

    # Klíčová slova v titulcích oken podle blokovaných domén
    $titleKeywords = @()
    foreach ($d in $BlockedDomains) {
        $clean = $d.ToLower()
        if ($clean -like "*youtube*" -or $clean -like "*youtu.be*") { $titleKeywords += "YouTube" }
        if ($clean -like "*netflix*") { $titleKeywords += "Netflix" }
        if ($clean -like "*tiktok*") { $titleKeywords += "TikTok" }
        if ($clean -like "*twitch*") { $titleKeywords += "Twitch" }
        if ($clean -like "*disneyplus*") { $titleKeywords += "Disney+" }
        if ($clean -like "*facebook*") { $titleKeywords += "Facebook" }
        if ($clean -like "*instagram*") { $titleKeywords += "Instagram" }
        if ($clean -like "*roblox*") { $titleKeywords += "Roblox" }
        if ($clean -like "*primevideo*") { $titleKeywords += "Prime Video" }
        # Přidat i samotné doménové jméno bez TLD
        $baseName = ($clean -replace "^www\.", "") -split "\." | Select-Object -First 1
        if ($baseName -and $baseName.Length -gt 3) {
            $titleKeywords += $baseName
        }
    }
    $titleKeywords = $titleKeywords | Select-Object -Unique

    $browserProcs = Get-Process -Name chrome, msedge, firefox, opera, brave -ErrorAction SilentlyContinue | Where-Object {
        $_.MainWindowHandle -ne 0 -and $_.MainWindowTitle
    }

    foreach ($proc in $browserProcs) {
        $title = $proc.MainWindowTitle
        foreach ($kw in $titleKeywords) {
            if ($title -like "*$kw*") {
                try {
                    # Z bezpečnostních důvodů pošleme klávesovou zkratku Ctrl+W (zavřít aktivní záložku)
                    $ws = New-Object -ComObject WScript.Shell
                    if ($ws.AppActivate($proc.Id)) {
                        Start-Sleep -Milliseconds 50
                        $ws.SendKeys("^w") # Zavře právě otevřený tab s YouTube / Netflix
                    }
                    $script:TotalWebBlockCount++
                    $script:LastWebBlockEvent = "$kw ($($proc.Name))"
                    Write-Host "[WEB FILTER ZÁSAH] Zavřena zakázaná záložka: $kw v prohlížeči $($proc.Name)" -ForegroundColor Red
                } catch {}
                break
            }
        }
    }
}

# Funkce: Hledání a spuštění prohlížeče v Kiosk režimu
function Ensure-KioskRunning {
    param([string]$TargetUrl)

    $runningKiosk = Get-Process -Name chrome, msedge -ErrorAction SilentlyContinue | Where-Object {
        $_.MainWindowHandle -ne 0
    }

    if (-not $runningKiosk) {
        Write-Host "[AGENT] Spouštím celoobrazovkový Kiosk zámek..." -ForegroundColor Yellow

        $kioskUrl = "$TargetUrl/?mode=child"
        $browserExe = $null
        $browserType = ""

        $chromePaths = @(
            "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
            "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
            "$env:LocalAppData\Google\Chrome\Application\chrome.exe"
        )
        foreach ($p in $chromePaths) {
            if (Test-Path $p) { $browserExe = $p; $browserType = "chrome"; break }
        }

        if (-not $browserExe) {
            $edgePaths = @(
                "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
                "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
                "$env:LocalAppData\Microsoft\Edge\Application\msedge.exe"
            )
            foreach ($p in $edgePaths) {
                if (Test-Path $p) { $browserExe = $p; $browserType = "edge"; break }
            }
        }

        $userProfile = "$env:TEMP\kiosk_agent_profile"

        if ($browserExe) {
            if ($browserType -eq "chrome") {
                Start-Process -FilePath $browserExe -ArgumentList @(
                    "--kiosk", "$kioskUrl",
                    "--user-data-dir=$userProfile",
                    "--no-first-run",
                    "--no-default-browser-check",
                    "--disable-pinch",
                    "--overscroll-history-navigation=0",
                    "--disable-background-mode"
                )
            } else {
                Start-Process -FilePath $browserExe -ArgumentList @(
                    "--kiosk", "$kioskUrl",
                    "--edge-kiosk-type=fullscreen",
                    "--user-data-dir=$userProfile",
                    "--no-first-run",
                    "--no-default-browser-check"
                )
            }
        } else {
            Start-Process $kioskUrl
        }
    }
}

function Set-KioskForeground {
    try {
        $ws = New-Object -ComObject WScript.Shell
        $proc = Get-Process -Name chrome, msedge -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
        if ($proc) {
            $ws.AppActivate($proc.Id) | Out-Null
        }
    } catch {}
}

function Kill-BlockedGames {
    param([string[]]$ProcessList)

    $killedAny = $false
    foreach ($procName in $ProcessList) {
        $found = Get-Process -Name $procName -ErrorAction SilentlyContinue
        if ($found) {
            foreach ($f in $found) {
                try {
                    Stop-Process -Id $f.Id -Force -ErrorAction SilentlyContinue
                    $script:TotalKilledCount++
                    $script:LastKilledProcessName = $procName
                    $killedAny = $true
                    Write-Host "[ZÁSAH AGENTA] Ukončen herní proces: $procName (PID: $($f.Id))" -ForegroundColor Red
                } catch {}
            }
        }
    }
    return $killedAny
}

# Hlavní smyčka agenta
Write-Host "[AGENT] Služba aktivována. Běžím nepřetržitě na pozadí..." -ForegroundColor Green

while ($true) {
    try {
        # 1. Odeslání heartbeat a telemetrie na server
        $heartbeatBody = @{
            hostname = $Hostname
            os = "$([System.Environment]::OSVersion.VersionString)"
            version = $AgentVersion
            killedCount = $TotalKilledCount
            killedProcess = if ($LastKilledProcessName) { $LastKilledProcessName } else { $null }
            webBlockCount = $TotalWebBlockCount
            lastWebBlockEvent = if ($LastWebBlockEvent) { $LastWebBlockEvent } else { $null }
        } | ConvertTo-Json

        $response = Invoke-RestMethod -Uri "$ServerUrl/api/agent/heartbeat" -Method Post -Body $heartbeatBody -ContentType "application/json" -TimeoutSec 3 -ErrorAction Stop
        $ConsecutiveErrors = 0

        $status = $response.status
        $blockedList = if ($response.blockedProcesses) { $response.blockedProcesses } else { $GlobalBlockedProcesses }

        # 2. Blokování webů (YouTube, Netflix, sociální sítě atd.)
        if ($response.webFilter) {
            $filterEnabled = [bool]$response.webFilter.enabled
            $filterDomains = @($response.webFilter.domains)

            Update-HostsBlocking -Domains $filterDomains -Enable $filterEnabled

            if ($filterEnabled -and $filterDomains.Count -gt 0) {
                Enforce-BrowserTabRules -BlockedDomains $filterDomains
            }
        }

        # 3. Kontrola her a zamykací obrazovky
        if ($status -eq 'locked_studying' -or $status -eq 'time_expired') {
            $didKill = Kill-BlockedGames -ProcessList $blockedList
            Ensure-KioskRunning -TargetUrl $ServerUrl
            Set-KioskForeground

            if ($didKill) {
                $script:LastKilledProcessName = ""
            }
        }

    } catch {
        $ConsecutiveErrors++
        if ($ConsecutiveErrors -eq 1) {
            Write-Host "[AGENT] Server nedostupný, opakuji spojení... ($ServerUrl)" -ForegroundColor DarkGray
        }
        Start-Sleep -Seconds 2
    }

    # Krátký interval kontroly pro bleskovou odezvu na povely rodiče
    Start-Sleep -Milliseconds 1500
}
