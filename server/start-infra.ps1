# Run from any directory after Docker Desktop is running. Never prints secrets.
$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path $PSScriptRoot
$envPath = Join-Path $PSScriptRoot '.env'
if (-not (Test-Path -LiteralPath $envPath)) {
    $passwordBytes = New-Object byte[] 32
    $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
    try { $rng.GetBytes($passwordBytes) } finally { $rng.Dispose() }
    $localPassword = ([BitConverter]::ToString($passwordBytes)).Replace('-', '')
    [IO.File]::WriteAllText($envPath, "POSTGRES_PASSWORD=$localPassword`n", [Text.UTF8Encoding]::new($false))
    Remove-Variable localPassword, passwordBytes
    Write-Host 'Created server/.env with a random local password.'
}
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    $dockerPath = Join-Path $env:ProgramFiles 'Docker/Docker/resources/bin'
    if (Test-Path -LiteralPath (Join-Path $dockerPath 'docker.exe')) {
        $env:PATH = "$dockerPath;$env:PATH"
    } else { throw 'Docker CLI not found. Install Docker Desktop, then open a new terminal.' }
}
$engineType = & docker info --format '{{.OSType}}'
if ($LASTEXITCODE -ne 0) { throw 'Docker engine is unavailable. Open Docker Desktop and wait for Engine running.' }
if ($engineType -ne 'linux') { throw 'Switch Docker Desktop to Linux containers.' }
$composeArgs = @('compose', '--project-directory', $PSScriptRoot, '-f', (Join-Path $PSScriptRoot 'compose.yaml'))
& docker @composeArgs config --quiet
if ($LASTEXITCODE -ne 0) { throw 'Compose validation failed. Check server/.env without sharing its contents.' }
& docker @composeArgs up -d --wait --wait-timeout 120
if ($LASTEXITCODE -ne 0) { throw 'Services did not become healthy. Check Docker Desktop and compose logs.' }
& docker @composeArgs exec -T postgres psql -U fishing_dev -d fishing_online -v ON_ERROR_STOP=1 -c 'SELECT 1 AS connected;'
if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL query failed.' }
& docker @composeArgs exec -T redis redis-cli ping
if ($LASTEXITCODE -ne 0) { throw 'Redis PING failed.' }
& docker @composeArgs ps
if ($LASTEXITCODE -ne 0) { throw 'Compose status failed.' }
Write-Host 'Infrastructure ready. API persistence/migrations are a separate implementation step.'
