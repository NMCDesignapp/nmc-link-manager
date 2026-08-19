@echo off
chcp 65001 >nul
setlocal EnableExtensions
title NMC Data Hub - Khoi dong lai

set "TARGET="
if exist "%~dp0data-hub.config.json" set "TARGET=%~dp0"
if not defined TARGET if exist "C:\NMCDataHub\data-hub.config.json" set "TARGET=C:\NMCDataHub"
if not defined TARGET if exist "C:\NMC-DataHub\data-hub.config.json" set "TARGET=C:\NMC-DataHub"
if not defined TARGET if exist "C:\NMC-Data\DataHub\data-hub.config.json" set "TARGET=C:\NMC-Data\DataHub"

if not defined TARGET (
  echo KHONG TIM THAY DATA HUB.
  pause
  exit /b 1
)

cd /d "%TARGET%"
echo Dang khoi dong lai NMC Data Hub...

powershell -NoProfile -ExecutionPolicy Bypass -Command "$p=Get-CimInstance Win32_Process; $p ^| Where-Object { ($_.Name -eq 'node.exe' -and $_.CommandLine -match 'index\.mjs') -or ($_.Name -eq 'powershell.exe' -and $_.CommandLine -match 'DATA-HUB-WATCHDOG\.ps1') -or ($_.Name -eq 'cmd.exe' -and $_.CommandLine -match 'START-DATA-HUB\.cmd') } ^| ForEach-Object { try { Stop-Process -Id $_.ProcessId -Force -ErrorAction Stop } catch {} }" >nul 2>&1

timeout /t 2 /nobreak >nul

if not exist "RUN-DATA-HUB-HIDDEN.vbs" (
  echo Thieu RUN-DATA-HUB-HIDDEN.vbs. Hay chay INSTALL-HIDDEN-DATA-HUB.cmd truoc.
  pause
  exit /b 2
)

start "" wscript.exe "%TARGET%\RUN-DATA-HUB-HIDDEN.vbs"

timeout /t 8 /nobreak >nul
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $r=Invoke-RestMethod 'https://nc-link.vercel.app/api/sync-source' -TimeoutSec 20; Write-Host ('source=' + $r.source); Write-Host ('dataHubOnline=' + $r.dataHubOnline); Write-Host ('lastSeenAt=' + $r.lastSeenAt); if(-not $r.dataHubOnline){ exit 9 } } catch { Write-Host ('LOI KIEM TRA: ' + $_.Exception.Message); exit 10 }"

if errorlevel 1 (
  echo.
  echo CHUA KET NOI DUOC. Xem log:
  echo   %TARGET%\data-hub.log
  echo   %TARGET%\data-hub-supervisor.log
  pause
  exit /b 9
)

echo.
echo DATA HUB DA KHOI DONG LAI VA DANG CHAY AN NEN.
timeout /t 3 /nobreak >nul
endlocal
