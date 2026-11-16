@echo off
rem Chay ban choi thu PUBLIC tren may nay, KHONG can Docker: dung Postgres portable (D:\Tools\postgres, cong 55432)
rem va Redis/Memurai (cong 6379, service Windows). Sua PUBLIC_HOST neu doi may hoac doi tailnet.
rem Xem docs\be\DEPLOY_PLAYTEST.md. Tat bang tools\stop-playtest.ps1. Dong cua so nay KHONG tat server.
chcp 65001 >nul
set PUBLIC_HOST=desktop-oohtpvv.tail21ba23.ts.net
title Fishing Online - playtest public

set PG_HOME=D:\Tools\postgres
set PG_DATA=D:\Tools\postgres-data
if not exist "%PG_HOME%\bin\pg_ctl.exe" (
  echo Thieu %PG_HOME%\bin\pg_ctl.exe. Xem server\README.md muc "Test tren may khong co Docker".
  goto :end
)
"%PG_HOME%\bin\pg_ctl.exe" -D "%PG_DATA%" status >nul 2>&1
if errorlevel 1 (
  echo Bat PostgreSQL portable...
  "%PG_HOME%\bin\pg_ctl.exe" -D "%PG_DATA%" -l "%PG_DATA%\server.log" -o "-p 55432 -c listen_addresses=127.0.0.1 -c max_connections=300 -c fsync=off" -w start
  if errorlevel 1 ( echo PostgreSQL khong len. Xem %PG_DATA%\server.log & goto :end )
)
"%PG_HOME%\bin\psql.exe" -h 127.0.0.1 -p 55432 -U postgres -Atc "select 1 from pg_database where datname='fishing_online'" | findstr 1 >nul
if errorlevel 1 "%PG_HOME%\bin\psql.exe" -h 127.0.0.1 -p 55432 -U postgres -qc "create database fishing_online"

sc query Memurai | findstr RUNNING >nul
if errorlevel 1 ( echo Memurai chua chay. Mo services.msc, bat service "Memurai", roi chay lai. & goto :end )

rem Chi dat trong cua so nay (khong luu vao may). Khong co mat khau.
set ConnectionStrings__Postgres=Host=127.0.0.1;Port=55432;Username=postgres;Database=fishing_online
set ConnectionStrings__Redis=127.0.0.1:6379

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\run-playtest.ps1" -PublicHost %PUBLIC_HOST% -SkipInfra
:end
echo.
echo Xong. Nhan phim bat ky de dong cua so.
pause >nul
