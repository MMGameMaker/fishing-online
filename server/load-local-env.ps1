# Dot-source from local development scripts. Does not execute .env contents or print secrets.
$ErrorActionPreference = 'Stop'
$envPath = Join-Path $PSScriptRoot '.env'
if (-not (Test-Path -LiteralPath $envPath)) { throw 'Run server/start-infra.ps1 first to create server/.env.' }
$localValues = @{}
foreach ($line in [IO.File]::ReadAllLines($envPath)) {
    if ($line -match '^\s*(POSTGRES_PASSWORD|POSTGRES_PORT)=(.*)$') { $localValues[$matches[1]] = $matches[2] }
}
if (-not $localValues['POSTGRES_PASSWORD']) { throw 'POSTGRES_PASSWORD is missing in server/.env.' }
$localPort = if ($localValues['POSTGRES_PORT']) { $localValues['POSTGRES_PORT'] } else { '15432' }
if ($localPort -notmatch '^\d+$' -or [int]$localPort -lt 1 -or [int]$localPort -gt 65535) { throw 'Invalid POSTGRES_PORT.' }
if (-not $env:ConnectionStrings__Postgres) {
    $quotedPassword = $localValues['POSTGRES_PASSWORD'].Replace('"','""')
    $env:ConnectionStrings__Postgres = 'Host=127.0.0.1;Port=' + $localPort + ';Database=fishing_online;Username=fishing_dev;Password="' + $quotedPassword + '";Timeout=2;Command Timeout=2;Include Error Detail=false'
}
if (-not $env:ConnectionStrings__Redis) { $env:ConnectionStrings__Redis = '127.0.0.1:6379' }
$env:DOTNET_CLI_HOME = Join-Path (Split-Path $PSScriptRoot) '.local/dotnet'
$env:DOTNET_SKIP_FIRST_TIME_EXPERIENCE = '1'
Remove-Variable localValues, quotedPassword, line, localPort -ErrorAction SilentlyContinue
