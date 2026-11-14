# Starts the portable PostgreSQL used by integration tests on machines without Docker.
# Listens on 127.0.0.1 only and uses trust auth: never use this outside a development machine.
param(
    [string]$PostgresHome = 'D:\Tools\postgres',
    [string]$DataDir = 'D:\Tools\postgres-data',
    [int]$Port = 55432
)
$ErrorActionPreference = 'Stop'
$pgCtl = Join-Path $PostgresHome 'bin\pg_ctl.exe'
if (-not (Test-Path $pgCtl)) { throw "Missing $pgCtl." }
if (-not (Test-Path (Join-Path $DataDir 'PG_VERSION'))) {
    & (Join-Path $PostgresHome 'bin\initdb.exe') -D $DataDir -U postgres -A trust -E UTF8 --locale=C | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'initdb failed.' }
}
$ErrorActionPreference = 'Continue'
# Cổng đã nghe thì coi như đang chạy: sau khi máy/tiến trình tắt đột ngột, postmaster.pid cũ làm
# `pg_ctl start` báo "another server might be running" rồi treo. Không gọi start trong trường hợp này.
$listening = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($listening) { Write-Output 'PostgreSQL is already running.'; return }
& $pgCtl -D $DataDir status | Out-Null
if ($LASTEXITCODE -eq 0) { Write-Output 'PostgreSQL is already running.'; return }
$options = "-p $Port -c listen_addresses=127.0.0.1 -c max_connections=300 -c fsync=off"
& $pgCtl -D $DataDir -l (Join-Path $DataDir 'server.log') -o $options -w start | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL did not start.' }
Write-Output "PostgreSQL is running on 127.0.0.1:$Port."
