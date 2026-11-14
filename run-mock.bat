@echo off
rem Chay client voi du lieu gia (MOCK): khong can Docker, khong can server. Bam dup chuot de chay.
chcp 65001 >nul
title Fishing Online - client MOCK
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\run-local.ps1" -Mode mock
echo.
echo Da dung. Nhan phim bat ky de dong cua so.
pause >nul
