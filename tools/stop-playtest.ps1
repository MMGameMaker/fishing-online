# Tat ban choi thu public do run-playtest.ps1 bat: Funnel, Caddy, API (theo .local\playtest\pids.json).
# GIU du lieu: khong xoa volume Docker. Them -StopInfra de dung luon container Postgres + Redis.
# -ProcessesOnly: chi dung tien trinh API/Caddy cu (run-playtest.ps1 goi truoc khi chay lai), khong dong Funnel.
param([switch]$StopInfra, [switch]$ProcessesOnly)
$ErrorActionPreference = 'Continue'
$repo = Split-Path $PSScriptRoot
$pidFile = Join-Path $repo '.local\playtest\pids.json'

function Stop-Tracked([string]$label, [int]$procId, [string]$expectedName) {
    $p = Get-Process -Id $procId -ErrorAction SilentlyContinue
    # Chi dung neu ID van la tien trinh do chinh script nay mo (tranh dung nham tien trinh khac dung lai ID).
    if ($p -and $p.ProcessName -match $expectedName) {
        & taskkill /PID $procId /T /F *> $null
        Write-Host "$label : da tat (PID $procId)."
    } else { Write-Host "$label : khong con chay." }
}

if (-not $ProcessesOnly -and (Get-Command tailscale -ErrorAction SilentlyContinue)) {
    & tailscale funnel reset 2>&1 | ForEach-Object { Write-Host $_ }
    Write-Host 'Funnel : da tat (tailscale funnel reset).'
}
if (Test-Path $pidFile) {
    $ids = Get-Content $pidFile -Raw | ConvertFrom-Json
    Stop-Tracked 'Caddy' $ids.caddy 'caddy'
    Stop-Tracked 'API' $ids.api 'dotnet|FishingOnline'
    Remove-Item $pidFile -ErrorAction SilentlyContinue
} elseif (-not $ProcessesOnly) { Write-Host 'Khong co pids.json: khong co API/Caddy nao do run-playtest.ps1 bat.' }

if ($StopInfra) {
    & docker info *> $null
    if ($LASTEXITCODE -eq 0) {
        & docker compose --project-directory (Join-Path $repo 'server') -f (Join-Path $repo 'server\compose.yaml') stop 2>&1 | ForEach-Object { Write-Host $_ }
        Write-Host 'Du lieu nguoi choi van con trong volume.'
    }
}
if (-not $ProcessesOnly) { Write-Host 'Da tat xong.' }
