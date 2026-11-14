# Tắt mọi thứ do run-real.bat / run-mock.bat bật trên máy local, theo thứ tự:
#   1. Client Vite (cổng 5173)
#   2. API (cổng 5080) cùng cửa sổ "Fishing Online API"
#   3. Container Postgres + Redis của dự án (docker compose stop, GIỮ dữ liệu: không xoá volume)
#   4. Docker Desktop (bỏ qua nếu máy còn container khác đang chạy, hoặc dùng -KeepDocker)
# Không bao giờ chạy `down -v` hay xoá volume. Không in mật khẩu hay connection string.
param([switch]$KeepDocker)
$ErrorActionPreference = 'Continue'
$repo = Split-Path $PSScriptRoot
$clientPort = 5173
$apiPort = 5080

function Write-Step([string]$text) { Write-Host "`n==> $text" -ForegroundColor Cyan }

# Tắt tiến trình đang nghe $port cùng các tiến trình cha thuộc dự án (cửa sổ powershell -NoExit chạy start-api.ps1).
function Stop-Port([int]$port, [string]$label, [string]$ownerPattern) {
    $pids = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty OwningProcess -Unique
    if (-not $pids) { Write-Host "$label : không chạy (cổng $port trống)."; return }
    foreach ($procId in $pids) {
        $cur = Get-CimInstance Win32_Process -Filter "ProcessId = $procId" -ErrorAction SilentlyContinue
        if (-not $cur) { continue }
        if ($cur.CommandLine -notmatch $ownerPattern -and $cur.Name -notmatch $ownerPattern) {
            Write-Host "$label : cổng $port đang do '$($cur.Name)' (PID $procId) giữ, không phải của dự án, bỏ qua." -ForegroundColor Yellow
            continue
        }
        $top = $procId
        for ($i = 0; $i -lt 6; $i++) {
            $parent = Get-CimInstance Win32_Process -Filter "ProcessId = $($cur.ParentProcessId)" -ErrorAction SilentlyContinue
            if (-not $parent -or $parent.CommandLine -notmatch 'start-api|FishingOnline|dotnet|vite|run-local') { break }
            $top = $parent.ProcessId
            $cur = $parent
        }
        & taskkill /PID $top /T /F *> $null
        Write-Host "$label : đã tắt (PID $top và các tiến trình con)."
    }
}

Write-Step 'Client (Vite)'
Stop-Port $clientPort 'Client' 'vite|node'

Write-Step 'API'
Stop-Port $apiPort 'API' 'FishingOnline|start-api|dotnet'

Write-Step 'Postgres + Redis'
& docker info *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Host 'Docker engine không chạy, không có container nào cần tắt.'
} else {
    & docker compose --project-directory (Join-Path $repo 'server') -f (Join-Path $repo 'server\compose.yaml') stop 2>&1 |
        ForEach-Object { Write-Host $_ }
    Write-Host 'Dữ liệu người chơi vẫn còn trong volume (không bị xoá).'
}

Write-Step 'Docker Desktop'
if ($KeepDocker) {
    Write-Host 'Giữ Docker Desktop (đã chọn -KeepDocker).'
} elseif (-not (Get-Process 'Docker Desktop' -ErrorAction SilentlyContinue)) {
    Write-Host 'Docker Desktop không chạy.'
} else {
    & docker info *> $null
    $others = @()
    if ($LASTEXITCODE -eq 0) { $others = @(& docker ps --format '{{.Names}}' 2>$null | Where-Object { $_ }) }
    if ($others.Count -gt 0) {
        Write-Host "Còn container khác đang chạy ($($others -join ', ')), giữ Docker Desktop để không làm gián đoạn." -ForegroundColor Yellow
    } else {
        Write-Host 'Đang thoát Docker Desktop...'
        & docker desktop stop 2>&1 | ForEach-Object { Write-Host $_ }
        if ($LASTEXITCODE -ne 0) {
            Write-Host 'Lệnh "docker desktop stop" không dùng được, đóng tiến trình Docker Desktop.' -ForegroundColor Yellow
            Get-Process 'Docker Desktop' -ErrorAction SilentlyContinue | Stop-Process -Force
        }
    }
}

Write-Host "`nĐã tắt xong. Chạy lại bằng run-real.bat hoặc run-mock.bat." -ForegroundColor Green
