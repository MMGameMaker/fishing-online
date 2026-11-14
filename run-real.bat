@echo off
rem Chay client noi SERVER THAT local: tu bat Docker, Postgres, Redis, migrate, API (cua so rieng), roi client.
rem Dang nhap bang tai khoan Google that (khong bypass). Bam dup chuot de chay. Can Docker Desktop da cai.
chcp 65001 >nul
title Fishing Online - client SERVER THAT
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\run-local.ps1" -Mode real
echo.
echo Da dung. Nhan phim bat ky de dong cua so. (API van chay o cua so "Fishing Online API", dong rieng neu can.)
pause >nul
