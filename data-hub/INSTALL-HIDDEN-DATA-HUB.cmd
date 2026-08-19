@echo off
chcp 65001 >nul
setlocal EnableExtensions
title NMC Data Hub - Cai che do chay an nen

set "REPO=https://raw.githubusercontent.com/NMCDesignapp/nmc-link-manager/main/data-hub"
set "TARGET="

if exist "%~dp0data-hub.config.json" set "TARGET=%~dp0"
if not defined TARGET if exist "C:\NMCDataHub\data-hub.config.json" set "TARGET=C:\NMCDataHub"
if not defined TARGET if exist "C:\NMC-DataHub\data-hub.config.json" set "TARGET=C:\NMC-DataHub"
if not defined TARGET if exist "C:\NMC-Data\DataHub\data-hub.config.json" set "TARGET=C:\NMC-Data\DataHub"

if not defined TARGET (
  echo KHONG TIM THAY data-hub.config.json.
  echo Hay chay REPAIR-NMC-DATA-HUB.cmd truoc.
  pause
  exit /b 1
)

cd /d "%TARGET%"
echo ============================================================
echo NMC DATA HUB - CAI CHE DO CHAY AN NEN
 echo Thu muc: %TARGET%
echo ============================================================

 echo [1/5] Dung launcher cu neu dang chay...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$p=Get-CimInstance Win32_Process; $p ^| Where-Object { ($_.Name -eq 'node.exe' -and $_.CommandLine -match 'index\.mjs') -or ($_.Name -eq 'powershell.exe' -and $_.CommandLine -match 'DATA-HUB-WATCHDOG\.ps1') -or ($_.Name -eq 'cmd.exe' -and $_.CommandLine -match 'START-DATA-HUB\.cmd') } ^| ForEach-Object { try { Stop-Process -Id $_.ProcessId -Force -ErrorAction Stop } catch {} }" >nul 2>&1

 echo [2/5] Tai watchdog va launcher an nen...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; $ProgressPreference='SilentlyContinue'; Invoke-WebRequest '%REPO%/DATA-HUB-WATCHDOG.ps1' -OutFile 'DATA-HUB-WATCHDOG.ps1'; Invoke-WebRequest '%REPO%/RUN-DATA-HUB-HIDDEN.vbs' -OutFile 'RUN-DATA-HUB-HIDDEN.vbs'; Invoke-WebRequest '%REPO%/RESTART-DATA-HUB.cmd' -OutFile 'RESTART-DATA-HUB.cmd'"
if errorlevel 1 (
  echo LOI: Khong tai duoc bo chay nen.
  pause
  exit /b 2
)

 echo [3/5] Xoa launcher cua so den cu khoi Startup...
set "STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
if exist "%STARTUP%\NMC Data Hub.cmd" del /q "%STARTUP%\NMC Data Hub.cmd" >nul 2>&1
copy /y "RUN-DATA-HUB-HIDDEN.vbs" "%STARTUP%\NMC Data Hub.vbs" >nul

 echo [4/5] Khoi dong Data Hub an nen...
start "" wscript.exe "%TARGET%\RUN-DATA-HUB-HIDDEN.vbs"

 echo [5/5] Kiem tra ket noi...
timeout /t 8 /nobreak >nul
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $r=Invoke-RestMethod 'https://nc-link.vercel.app/api/sync-source' -TimeoutSec 20; Write-Host ('source=' + $r.source); Write-Host ('dataHubOnline=' + $r.dataHubOnline); Write-Host ('lastSeenAt=' + $r.lastSeenAt); if(-not $r.dataHubOnline){ exit 9 } } catch { Write-Host ('LOI KIEM TRA: ' + $_.Exception.Message); exit 10 }"

if errorlevel 1 (
  echo.
  echo DATA HUB CHUA ONLINE. Hay chay RESTART-DATA-HUB.cmd trong %TARGET%.
  pause
  exit /b 9
)

echo.
echo ============================================================
echo DA XONG: DATA HUB DANG CHAY AN HOAN TOAN DUOI NEN.
echo Khong con cua so CMD phai giu mo.
echo Windows dang nhap lai se tu khoi dong Data Hub an nen.
echo Lenh khoi dong lai: %TARGET%\RESTART-DATA-HUB.cmd
echo ============================================================
timeout /t 5 /nobreak >nul
endlocal
