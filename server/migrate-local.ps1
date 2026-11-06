# Applies migrations only using the local Compose configuration, not inherited remote settings.
$ErrorActionPreference = 'Stop'
$previousPostgres = $env:ConnectionStrings__Postgres
$previousRedis = $env:ConnectionStrings__Redis
Push-Location (Split-Path $PSScriptRoot)
try {
    $env:ConnectionStrings__Postgres = $null
    $env:ConnectionStrings__Redis = $null
    . (Join-Path $PSScriptRoot 'load-local-env.ps1')
    & dotnet tool restore
    if ($LASTEXITCODE -ne 0) { throw 'EF tool restore failed.' }
    & dotnet ef database update --project (Join-Path $PSScriptRoot 'FishingOnline.Api')
    if ($LASTEXITCODE -ne 0) { throw 'Local database migration failed.' }
} finally {
    $env:ConnectionStrings__Postgres = $previousPostgres
    $env:ConnectionStrings__Redis = $previousRedis
    Pop-Location
}
