# Chay ban choi thu PUBLIC tren may noi bo (docs/be/DEPLOY_PLAYTEST.md, PA2): Production, Google login that,
# Tailscale Funnel -> Caddy (cong 8080) -> API (127.0.0.1:5080) + client-v0/dist.
# Khac run-local.ps1: KHONG Development, KHONG Auth:DevBypass, KHONG /dev/topup.
#
# Can co san tren may nay: Docker (hoac Postgres 17 + Redis 7 va -SkipInfra), .NET SDK theo global.json, Node,
# Caddy, Tailscale da dang nhap (tailscale up) va Funnel da duoc bat cho tailnet. Cung can client-v0/.env.local
# co VITE_FIREBASE_* va domain public da them vao Firebase > Authentication > Authorized domains.
#
# Vi du: powershell -NoProfile -ExecutionPolicy Bypass -File tools\run-playtest.ps1 -PublicHost may-a.tailnet-1234.ts.net
# Tat: tools\stop-playtest.ps1. Khong in mat khau, connection string hay khoa ky token.
param(
    [Parameter(Mandatory = $true)][string]$PublicHost,
    [switch]$SkipInfra,
    [switch]$SkipBuild,
    [switch]$NoFunnel
)
$ErrorActionPreference = 'Stop'
$repo = Split-Path $PSScriptRoot
$server = Join-Path $repo 'server'
$client = Join-Path $repo 'client-v0'
$work = Join-Path $repo '.local\playtest'
$apiDir = Join-Path $work 'api'
$logDir = Join-Path $work 'logs'
$pidFile = Join-Path $work 'pids.json'
$apiPort = 5080
$webPort = 8080
# Map pier: phai khop client-v0/src/online/scenes/pier/fishingPierMap.json (cung gia tri voi run-local.ps1).
$pierMap = @{ MapId = 'fishing-pier'; MapVersion = 'pier-4'; SeatCount = '38'; RestSeatCount = '30' }

function Write-Step([string]$text) { Write-Host "`n==> $text" -ForegroundColor Cyan }
function Need([string]$cmd, [string]$hint) {
    if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) { throw "Thieu '$cmd'. $hint" }
}
function Run([string]$label, [scriptblock]$block) {
    & $block
    if ($LASTEXITCODE -ne 0) { throw "$label that bai (ma $LASTEXITCODE)." }
}
function Test-Url([string]$url) {
    try { Invoke-RestMethod $url -TimeoutSec 5 | Out-Null; return $true } catch { return $false }
}

if ($PublicHost -notmatch '^[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?$') {
    throw 'PublicHost chi gom ten mien (vi du may-a.tailnet-1234.ts.net), khong kem https:// hay duong dan.'
}
$origin = "https://$PublicHost"

Write-Step 'Kiem tra dieu kien'
Need dotnet 'Cai .NET SDK theo global.json.'
Need node 'Cai Node.js (de build client).'
Need npm 'Cai Node.js (de build client).'
Need caddy 'Cai Caddy (winget install CaddyServer.Caddy).'
if (-not $NoFunnel) { Need tailscale 'Cai Tailscale va chay "tailscale up" truoc.' }
if (-not $SkipInfra) { Need docker 'Cai Docker Desktop hoac dung -SkipInfra neu Postgres/Redis da co san.' }
$hasFirebase = (Test-Path (Join-Path $client '.env.local')) -or $env:VITE_FIREBASE_API_KEY
if (-not $hasFirebase) { throw 'Thieu cau hinh Firebase cho client: tao client-v0/.env.local (xem client-v0/.env.example).' }
New-Item -ItemType Directory -Force $work, $logDir | Out-Null

# Dung lai tien trinh playtest cu neu con (pids.json do chinh script nay ghi).
& (Join-Path $PSScriptRoot 'stop-playtest.ps1') -ProcessesOnly

if (-not $SkipInfra) {
    Write-Step 'Postgres + Redis (Docker)'
    Run 'start-infra.ps1' { & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $server 'start-infra.ps1') | Out-Null }
    Write-Step 'Ap migration database'
    Run 'migrate-local.ps1' { & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $server 'migrate-local.ps1') | Out-Null }
    . (Join-Path $server 'load-local-env.ps1')
} else {
    Write-Step 'Dung Postgres/Redis co san (-SkipInfra)'
    if (-not $env:ConnectionStrings__Postgres -or -not $env:ConnectionStrings__Redis) {
        throw 'Voi -SkipInfra phai dat bien moi truong ConnectionStrings__Postgres va ConnectionStrings__Redis.'
    }
    Push-Location $repo
    try {
        Run 'dotnet tool restore' { & dotnet tool restore | Out-Null }
        Run 'dotnet ef database update' { & dotnet ef database update --project (Join-Path $server 'FishingOnline.Api') }
    } finally { Pop-Location }
}

Write-Step 'Khoa ky token (Auth:JwtSigningKey)'
# Giu co dinh giua cac lan chay de khong lam het hieu luc phien dang nhap. File *.key da nam trong .gitignore.
$keyFile = Join-Path $server 'playtest-jwt.key'
if (-not (Test-Path $keyFile)) {
    $bytes = New-Object byte[] 48
    [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    [IO.File]::WriteAllText($keyFile, [Convert]::ToBase64String($bytes))
    Write-Host 'Da tao server\playtest-jwt.key (khong commit, khong chia se).'
} else { Write-Host 'Dung lai server\playtest-jwt.key.' }

if (-not $SkipBuild) {
    Write-Step "Build client (API base = $origin)"
    Push-Location $client
    try {
        if (-not (Test-Path 'node_modules')) { Run 'npm install' { & npm install } }
        $env:VITE_USE_MOCK = 'false'
        $env:VITE_API_BASE = $origin
        Run 'vite build' { & npx vite build }
    } finally { Pop-Location }
}
if (-not (Test-Path (Join-Path $client 'dist\pier.html'))) { throw 'Chua co client-v0\dist\pier.html. Chay lai khong kem -SkipBuild.' }

Write-Step 'Publish API (Release)'
Run 'dotnet publish' { & dotnet publish (Join-Path $server 'FishingOnline.Api') -c Release -o $apiDir --nologo -v quiet }
# Gameplay:ConfigPath mac dinh la duong dan tuong doi theo may dev; copy fixture va dung duong dan tuyet doi.
$configCopy = Join-Path $work 'gameplay-config.v0.json'
Copy-Item (Join-Path $repo 'docs\v01\fixtures\gameplay-config.v0.json') $configCopy -Force

Write-Step 'Chay API (Production, chi nghe 127.0.0.1)'
$env:ASPNETCORE_ENVIRONMENT = 'Production'
$env:ASPNETCORE_URLS = "http://127.0.0.1:$apiPort"
$env:AllowedHosts = "$PublicHost;localhost;127.0.0.1"
$env:ClientOrigins__0 = $origin
$env:Gameplay__ConfigPath = $configCopy
$env:Lake__MapId = $pierMap.MapId
$env:Lake__MapVersion = $pierMap.MapVersion
$env:Lake__SeatCount = $pierMap.SeatCount
$env:Lake__RestSeatCount = $pierMap.RestSeatCount
$env:Auth__JwtSigningKey = [IO.File]::ReadAllText($keyFile).Trim()
$env:Logging__LogLevel__Microsoft__EntityFrameworkCore = 'Warning'
Remove-Item Env:\Auth__DevBypass -ErrorAction SilentlyContinue
$apiProc = Start-Process dotnet -ArgumentList @('FishingOnline.Api.dll') -WorkingDirectory $apiDir -WindowStyle Hidden -PassThru `
    -RedirectStandardOutput (Join-Path $logDir 'api.out.log') -RedirectStandardError (Join-Path $logDir 'api.err.log')

$deadline = (Get-Date).AddSeconds(90)
$ready = $false
while ((Get-Date) -lt $deadline -and -not $apiProc.HasExited) {
    try { $r = Invoke-RestMethod "http://127.0.0.1:$apiPort/health/ready" -TimeoutSec 3; if ($r.status -eq 'ready') { $ready = $true; break } } catch { }
    Start-Sleep -Seconds 2
}
if (-not $ready) { throw "API chua san sang. Xem $logDir\api.err.log va api.out.log (khong chia se ra ngoai: co the chua thong tin may)." }
Write-Host 'API san sang (Postgres va Redis ready).'

# Checklist: Production phai tat DevBypass (header X-Dev-Player khong duoc co hieu luc).
$bypassOn = $false
try {
    Invoke-RestMethod "http://127.0.0.1:$apiPort/api/v1/me" -Headers @{ 'X-Dev-Player' = '00000000-0000-4000-8000-000000000001' } -TimeoutSec 5 | Out-Null
    $bypassOn = $true
} catch { }
if ($bypassOn) { Stop-Process -Id $apiProc.Id -Force; throw 'DevBypass dang BAT trong Production. Da dung API, khong mo public.' }
Write-Host 'DevBypass tat (X-Dev-Player khong co hieu luc).'

Write-Step "Chay Caddy (127.0.0.1:$webPort)"
$env:PLAYTEST_DIST = Join-Path $client 'dist'
$env:PLAYTEST_API = "127.0.0.1:$apiPort"
$caddyProc = Start-Process caddy -ArgumentList @('run', '--config', (Join-Path $PSScriptRoot 'playtest\Caddyfile'), '--adapter', 'caddyfile') `
    -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $logDir 'caddy.out.log') -RedirectStandardError (Join-Path $logDir 'caddy.err.log')
$deadline = (Get-Date).AddSeconds(20)
$up = $false
while ((Get-Date) -lt $deadline -and -not $caddyProc.HasExited) {
    if (Test-Url "http://127.0.0.1:$webPort/health/live") { $up = $true; break }
    Start-Sleep -Seconds 1
}
if (-not $up) { Stop-Process -Id $apiProc.Id -Force -ErrorAction SilentlyContinue; throw "Caddy chua len. Xem $logDir\caddy.err.log." }
Write-Host "Caddy san sang: /health/live qua proxy OK."

@{ api = $apiProc.Id; caddy = $caddyProc.Id } | ConvertTo-Json | Set-Content $pidFile -Encoding ASCII

if (-not $NoFunnel) {
    Write-Step 'Bat Tailscale Funnel'
    Run 'tailscale funnel' { & tailscale funnel --bg $webPort }
    & tailscale funnel status
}

Write-Host ''
Write-Host "San sang. URL cho tester: $origin/pier.html" -ForegroundColor Green
Write-Host 'Chua kiem chung: thu tren 1 may ngoai mang (Google login that, SignalR/WebSocket qua Funnel) truoc khi gui link.'
Write-Host 'Tat bang tools\stop-playtest.ps1. Giu may khong sleep trong luc test.'
