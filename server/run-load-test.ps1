# BE-C-08: runs the real API against a throwaway local database and measures Move latency.
# Requires the portable PostgreSQL from start-postgres-portable.ps1 (or pass another local connection).
param(
    [int]$Seconds = 120,
    [string]$AdminConnection = 'Host=127.0.0.1;Port=55432;Username=postgres;Database=postgres',
    [string]$PsqlPath = 'D:\Tools\postgres\bin\psql.exe',
    [int]$Port = 5199
)
$ErrorActionPreference = 'Stop'
$repo = Split-Path $PSScriptRoot
Set-Location $repo
$db = 'fishing_load_' + [guid]::NewGuid().ToString('N')
$connection = $AdminConnection -replace 'Database=postgres', "Database=$db"
& $PsqlPath -h 127.0.0.1 -p 55432 -U postgres -c "CREATE DATABASE `"$db`"" | Out-Null

$api = $null
try {
    $env:ConnectionStrings__Postgres = $connection
    $env:ASPNETCORE_ENVIRONMENT = 'Development'
    $env:Auth__DevBypass = 'true'
    $env:Logging__LogLevel__Default = 'Warning'
    dotnet ef database update --project server/FishingOnline.Api --no-build | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Migration failed.' }

    $dll = Join-Path $repo 'server\FishingOnline.Api\bin\Debug\net10.0\FishingOnline.Api.dll'
    $api = Start-Process dotnet -ArgumentList @($dll, '--urls', "http://127.0.0.1:$Port", '--contentRoot', (Join-Path $repo 'server\FishingOnline.Api')) `
        -WorkingDirectory (Join-Path $repo 'server\FishingOnline.Api') -PassThru -WindowStyle Hidden
    $ready = $false
    for ($i = 0; $i -lt 120 -and -not $ready; $i++) {
        Start-Sleep -Milliseconds 500
        try { $ready = (Invoke-WebRequest "http://127.0.0.1:$Port/health/live" -UseBasicParsing -TimeoutSec 2).StatusCode -eq 200 } catch { $ready = $false }
    }
    if (-not $ready) { throw 'API did not start.' }

    dotnet run --project server/FishingOnline.LoadTest --no-build -- --url "http://127.0.0.1:$Port" --seconds $Seconds --database $connection --server-pid $api.Id
    if ($LASTEXITCODE -ne 0) { Write-Output "Load test finished with exit code $LASTEXITCODE." }
}
finally {
    if ($api -and -not $api.HasExited) { Stop-Process -Id $api.Id -Force -Confirm:$false }
    Start-Sleep -Seconds 1
    & $PsqlPath -h 127.0.0.1 -p 55432 -U postgres -c "DROP DATABASE IF EXISTS `"$db`" WITH (FORCE)" | Out-Null
}
