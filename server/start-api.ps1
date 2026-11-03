$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'load-local-env.ps1')
$env:ASPNETCORE_ENVIRONMENT = 'Development'
& dotnet run --project (Join-Path $PSScriptRoot 'FishingOnline.Api') --urls http://localhost:5080
if ($LASTEXITCODE -ne 0) { throw 'API process failed.' }
