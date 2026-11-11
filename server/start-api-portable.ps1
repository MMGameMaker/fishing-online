# Runs the API against the portable PostgreSQL (no Docker): starts the database, creates
# fishing_online if missing, applies migrations, then serves http://localhost:5080.
param(
    [string]$Database = 'fishing_online',
    [int]$PostgresPort = 55432,
    [string]$Psql = 'D:\Tools\postgres\bin\psql.exe'
)
$ErrorActionPreference = 'Stop'
& (Join-Path $PSScriptRoot 'start-postgres-portable.ps1') -Port $PostgresPort

$exists = & $Psql -h 127.0.0.1 -p $PostgresPort -U postgres -Atc "select 1 from pg_database where datname = '$Database'"
if ($exists -ne '1') {
    & $Psql -h 127.0.0.1 -p $PostgresPort -U postgres -qc "create database $Database" | Out-Null
    Write-Output "Created database $Database."
}

$env:ConnectionStrings__Postgres = "Host=127.0.0.1;Port=$PostgresPort;Username=postgres;Database=$Database"
$env:ConnectionStrings__Redis = $null
$env:ASPNETCORE_ENVIRONMENT = 'Development'
# Vòng quét ghế/lần câu chạy liên tục; ẩn log từng câu SQL để terminal còn đọc được.
Set-Item 'env:Logging__LogLevel__Microsoft.EntityFrameworkCore' 'Warning'
Push-Location (Split-Path $PSScriptRoot)
try {
    & dotnet tool restore | Out-Null
    & dotnet ef database update --project (Join-Path $PSScriptRoot 'FishingOnline.Api')
    if ($LASTEXITCODE -ne 0) { throw 'Migration failed.' }
} finally {
    Pop-Location
}
& dotnet run --project (Join-Path $PSScriptRoot 'FishingOnline.Api') --urls http://localhost:5080
