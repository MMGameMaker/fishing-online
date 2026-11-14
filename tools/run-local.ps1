# Chạy Fishing Online trên máy local, hai chế độ (gọi qua run-mock.bat / run-real.bat ở thư mục gốc):
#   -Mode mock : chỉ chạy client (Vite) với dữ liệu giả trong trình duyệt, không cần Docker/server.
#   -Mode real : bật Docker Desktop, Postgres + Redis, áp migration, chạy API thật cổng 5080 (cửa sổ riêng),
#                rồi chạy client nối server thật. Mặc định đăng nhập Google thật (Firebase), không bypass.
#                -DevLogin: bật thêm Auth:DevBypass và mở ?dev=Tên (chỉ để test nhiều người chơi trên một máy).
# Chế độ được đặt bằng biến môi trường VITE_USE_MOCK của tiến trình này (ưu tiên hơn client-v0/.env.local),
# nên không phải sửa file khi đổi chế độ. Không in mật khẩu hay connection string.
param(
    [Parameter(Mandatory = $true)][ValidateSet('mock', 'real')][string]$Mode,
    [switch]$DevLogin,
    [string]$DevName = 'Anh',
    [switch]$NoBrowser
)
$ErrorActionPreference = 'Stop'
$repo = Split-Path $PSScriptRoot
$client = Join-Path $repo 'client-v0'
$server = Join-Path $repo 'server'
$clientPort = 5173
$apiPort = 5080
# Map pier: Server phải trả đúng mapId và số ghế như client-v0/src/online/scenes/pier/fishingPierMap.json.
$pierMap = @{ MapId = 'fishing-pier'; MapVersion = 'pier-1'; SeatCount = '16' }

function Write-Step([string]$text) { Write-Host "`n==> $text" -ForegroundColor Cyan }

function Test-ApiReady {
    try {
        $r = Invoke-RestMethod "http://localhost:$apiPort/health/ready" -TimeoutSec 3
        return $r.status -eq 'ready'
    } catch { return $false }
}

# API đang bật Auth:DevBypass không: gọi /me kèm header dev (bật thì 200, tắt thì 401).
function Test-ApiDevBypass {
    try {
        Invoke-RestMethod "http://localhost:$apiPort/api/v1/me" -Headers @{ 'X-Dev-Player' = '00000000-0000-4000-8000-000000000001' } -TimeoutSec 5 | Out-Null
        return $true
    } catch { return $false }
}

# Tắt API đang chạy ở cổng 5080 cùng cửa sổ chạy nó (cây tiến trình từ start-api.ps1 xuống FishingOnline.Api).
function Stop-OldApi {
    $pids = Get-NetTCPConnection -LocalPort $apiPort -State Listen -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($procId in $pids) {
        $top = $procId
        $cur = Get-CimInstance Win32_Process -Filter "ProcessId = $procId" -ErrorAction SilentlyContinue
        for ($i = 0; $i -lt 6 -and $cur; $i++) {
            $parent = Get-CimInstance Win32_Process -Filter "ProcessId = $($cur.ParentProcessId)" -ErrorAction SilentlyContinue
            if (-not $parent -or $parent.CommandLine -notmatch 'start-api|FishingOnline|dotnet') { break }
            $top = $parent.ProcessId
            $cur = $parent
        }
        & taskkill /PID $top /T /F *> $null
    }
    $deadline = (Get-Date).AddSeconds(15)
    while ((Get-Date) -lt $deadline -and (Get-NetTCPConnection -LocalPort $apiPort -State Listen -ErrorAction SilentlyContinue)) {
        Start-Sleep -Milliseconds 500
    }
}

function Wait-DockerEngine([int]$timeoutSec = 240) {
    $ErrorActionPreference = 'Continue'
    & docker info *> $null
    if ($LASTEXITCODE -eq 0) { return }
    $exe = 'C:\Program Files\Docker\Docker\Docker Desktop.exe'
    if (-not (Test-Path $exe)) { throw 'Chưa cài Docker Desktop (không thấy Docker Desktop.exe).' }
    if (-not (Get-Process 'Docker Desktop' -ErrorAction SilentlyContinue)) {
        Write-Host 'Docker Desktop chưa chạy, đang mở...'
        Start-Process $exe
    }
    $deadline = (Get-Date).AddSeconds($timeoutSec)
    while ((Get-Date) -lt $deadline) {
        & docker info *> $null
        if ($LASTEXITCODE -eq 0) { return }
        Start-Sleep -Seconds 3
    }
    throw "Docker engine chưa sẵn sàng sau $timeoutSec giây. Mở Docker Desktop, đợi nó chạy rồi chạy lại."
}

# Vite đã chạy từ trước có thể đang ở chế độ khác (chế độ nạp lúc Vite khởi động) nên tắt đi để chạy lại đúng chế độ.
function Stop-OldClient {
    # Tắt cả cây tiến trình của Vite cũ (taskkill /T kéo theo tiến trình con cũng đang giữ cổng), rồi xét lại cổng.
    # Chỉ báo lỗi nếu sau khi đã tắt vẫn còn tiến trình không phải Vite giữ cổng.
    for ($pass = 1; $pass -le 3; $pass++) {
        $pids = Get-NetTCPConnection -LocalPort $clientPort -State Listen -ErrorAction SilentlyContinue |
            Select-Object -ExpandProperty OwningProcess -Unique
        if (-not $pids) { return }
        foreach ($procId in $pids) {
            $p = Get-CimInstance Win32_Process -Filter "ProcessId = $procId" -ErrorAction SilentlyContinue
            if (-not $p) { continue }
            if ($p.CommandLine -match 'vite') {
                Write-Host "Tắt client cũ đang giữ cổng $clientPort (PID $procId) để chạy lại đúng chế độ."
                & taskkill /PID $procId /T /F *> $null
            } elseif ($pass -eq 3) {
                throw "Cổng $clientPort đang bị '$($p.Name)' (PID $procId) giữ, không phải Vite. Tắt nó rồi chạy lại."
            }
        }
        Start-Sleep -Seconds 1
    }
}

function Start-RealBackend {
    Write-Step 'Server thật: kiểm tra API'
    if (Test-ApiReady) {
        if ((Test-ApiDevBypass) -eq [bool]$DevLogin) {
            Write-Host "API đã chạy sẵn ở cổng $apiPort đúng chế độ đăng nhập, dùng lại (không khởi động lại)."
            return
        }
        Write-Host "API đang chạy sai chế độ đăng nhập (cần $(if ($DevLogin) { 'bật' } else { 'tắt' }) dev-bypass), tắt để chạy lại."
        Stop-OldApi
    }
    $listening = Get-NetTCPConnection -LocalPort $apiPort -State Listen -ErrorAction SilentlyContinue
    if ($listening) {
        throw "Cổng $apiPort đang bị tiến trình khác giữ nhưng /health/ready chưa đạt. Tắt nó rồi chạy lại."
    }

    Write-Step 'Docker Desktop'
    Wait-DockerEngine

    Write-Step 'Postgres + Redis'
    $ErrorActionPreference = 'Continue'
    & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $server 'start-infra.ps1') | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'start-infra.ps1 thất bại.' }

    Write-Step 'Áp migration database'
    & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $server 'migrate-local.ps1') | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'migrate-local.ps1 thất bại.' }
    $ErrorActionPreference = 'Stop'

    Write-Step "Chạy API thật ở cửa sổ riêng (cổng $apiPort)"
    # Mặc định tắt bypass: đăng nhập bằng tài khoản Google thật. Xoá biến phòng khi terminal đang mang giá trị cũ.
    if ($DevLogin) { $env:Auth__DevBypass = 'true' } else { Remove-Item Env:\Auth__DevBypass -ErrorAction SilentlyContinue }
    $env:Lake__MapId = $pierMap.MapId
    $env:Lake__MapVersion = $pierMap.MapVersion
    $env:Lake__SeatCount = $pierMap.SeatCount
    $env:Logging__LogLevel__Microsoft__EntityFrameworkCore = 'Warning'
    $apiScript = Join-Path $server 'start-api.ps1'
    Start-Process powershell -ArgumentList '-NoProfile', '-ExecutionPolicy', 'Bypass', '-NoExit', '-Command',
        "`$Host.UI.RawUI.WindowTitle = 'Fishing Online API (cổng $apiPort)'; & '$apiScript'"

    $deadline = (Get-Date).AddSeconds(180)
    while ((Get-Date) -lt $deadline) {
        if (Test-ApiReady) { Write-Host 'API sẵn sàng (Postgres và Redis đều ready).'; return }
        Start-Sleep -Seconds 2
    }
    throw 'API chưa sẵn sàng sau 180 giây. Xem cửa sổ "Fishing Online API" để biết lỗi.'
}

if ($Mode -eq 'real') { Start-RealBackend }

Write-Step "Client ($Mode)"
Stop-OldClient
$env:VITE_USE_MOCK = if ($Mode -eq 'mock') { 'true' } else { 'false' }

if (-not (Test-Path (Join-Path $client 'node_modules'))) {
    Write-Host 'Chưa có node_modules, đang cài (npm install)...'
    Push-Location $client; & npm install; Pop-Location
}

$url = if ($Mode -eq 'real' -and $DevLogin) { "http://localhost:$clientPort/pier.html?dev=$DevName" } else { "http://localhost:$clientPort/pier.html" }
if (-not $NoBrowser) {
    # Mở trình duyệt khi cổng client đã nghe.
    Start-Job -ScriptBlock {
        param($port, $url)
        for ($i = 0; $i -lt 60; $i++) {
            if (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) { Start-Process $url; return }
            Start-Sleep -Seconds 1
        }
    } -ArgumentList $clientPort, $url | Out-Null
}

Write-Host ''
if ($Mode -eq 'real' -and $DevLogin) {
    Write-Host "Chế độ SERVER THẬT + đăng nhập dev. Mở: $url" -ForegroundColor Green
    Write-Host 'Thêm người chơi: mở tab mới, đổi ?dev=Tên khác. API chạy ở cửa sổ "Fishing Online API".'
} elseif ($Mode -eq 'real') {
    Write-Host "Chế độ SERVER THẬT, đăng nhập Google thật. Mở: $url" -ForegroundColor Green
    Write-Host 'Vào trang rồi bấm vào màn hình để đăng nhập bằng tài khoản Google. API chạy ở cửa sổ "Fishing Online API".'
} else {
    Write-Host "Chế độ MOCK (dữ liệu giả, không cần server). Mở: $url" -ForegroundColor Green
}
Write-Host 'Đóng cửa sổ này (hoặc Ctrl+C) để tắt client.'
Push-Location $client
try { & npx vite --port $clientPort --strictPort } finally { Pop-Location }
