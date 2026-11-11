@echo off
rem Bat API Fishing Online voi PostgreSQL portable. Chay tu cmd hoac bam dup chuot vao file nay.
cd /d "%~dp0.."
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-api-portable.ps1"
pause
