@echo off
rem Tat het cac tool chay local: client, API, Postgres/Redis (giu du lieu), Docker Desktop (neu khong con container khac).
rem Bam dup chuot de chay. Khong xoa du lieu nguoi choi.
chcp 65001 >nul
title Fishing Online - tat het
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\stop-local.ps1"
echo.
echo Nhan phim bat ky de dong cua so.
pause >nul
