@echo off
chcp 65001 >nul
setlocal EnableExtensions EnableDelayedExpansion
title NMC Data Hub - Sua va ket noi lai

set "REPO=https://raw.githubusercontent.com/NMCDesignapp/nmc-link-manager/main/data-hub"
set "TARGET="

if exist "%~dp0data-hub.config.json" set "TARGET=%~dp0"
if not defined TARGET if exist "C:\NMCDataHub\data-hub.config.json" set "TARGET=C:\NMCDataHub"
if not defined TARGET if exist "C:\NMC-DataHub\data-hub.config.json" set "TARGET=C:\NMC-DataHub"
if not defined TARGET if exist "C:\NMC-Data\DataHub\data-hub.config.json" set "TARGET=C:\NMC-Data\DataHub"
if not defined TARGET set "TARGET=C:\NMCDataHub"

if not exist "%TARGET%" mkdir "%TARGET%"
cd /d "%TARGET%"

echo ============================================================
echo NMC DATA HUB - KET NOI EXCEL TREN MAY TINH VOI MAIN APP
echo Thu muc: %TARGET%
echo ============================================================

echo [1/7] Dung ban Data Hub cu neu con chay...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$p=Get-CimInstance Win32_Process; $p ^| Where-Object { ($_.Name -eq 'node.exe' -and $_.CommandLine -match 'index\.mjs') -or ($_.Name -eq 'powershell.exe' -and $_.CommandLine -match 'DATA-HUB-WATCHDOG\.ps1') -or ($_.Name -eq 'cmd.exe' -and $_.CommandLine -match 'START-DATA-HUB\.cmd') } ^| ForEach-Object { try { Stop-Process -Id $_.ProcessId -Force -ErrorAction Stop } catch {} }" >nul 2>&1

if exist "index.mjs" copy /y "index.mjs" "index.mjs.bak" >nul
if exist "package.json" copy /y "package.json" "package.json.bak" >nul

echo [2/7] Tai ban Data Hub moi nhat tu GitHub...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; $ProgressPreference='SilentlyContinue'; Invoke-WebRequest '%REPO%/index.mjs' -OutFile 'index.mjs'; Invoke-WebRequest '%REPO%/package.json' -OutFile 'package.json'; Invoke-WebRequest '%REPO%/data-hub.config.example.json' -OutFile 'data-hub.config.example.json'; Invoke-WebRequest '%REPO%/DATA-HUB-WATCHDOG.ps1' -OutFile 'DATA-HUB-WATCHDOG.ps1'; Invoke-WebRequest '%REPO%/RUN-DATA-HUB-HIDDEN.vbs' -OutFile 'RUN-DATA-HUB-HIDDEN.vbs'; Invoke-WebRequest '%REPO%/RESTART-DATA-HUB.cmd' -OutFile 'RESTART-DATA-HUB.cmd'"
if errorlevel 1 (
  echo.
  echo LOI: Khong tai duoc ban Data Hub moi. Kiem tra Internet roi chay lai file nay.
  pause
  exit /b 1
)

if not exist "data-hub.config.json" (
  echo [!] Khong tim thay cau hinh cu. Tao cau hinh mau...
  copy /y "data-hub.config.example.json" "data-hub.config.json" >nul
  echo.
  echo CAN KIEM TRA DUONG DAN CAC FILE EXCEL trong data-hub.config.json.
  echo Toi se mo file cau hinh. Sua xong, Save va chay lai REPAIR-NMC-DATA-HUB.cmd.
  notepad "data-hub.config.json"
  pause
  exit /b 2
)

echo [3/7] Kiem tra Node.js va cai thu vien...
where node >nul 2>&1
if errorlevel 1 (
  echo.
  echo LOI: May chua co Node.js hoac Node.js khong nam trong PATH.
  echo Cai Node.js LTS, sau do chay lai file nay.
  pause
  exit /b 3
)

call npm install --omit=dev
if errorlevel 1 (
  echo.
  echo LOI: npm install that bai.
  pause
  exit /b 4
)

echo [4/7] Chan doan token, Main App, file va sheet Excel...
node index.mjs --diagnose
if errorlevel 1 (
  echo.
  echo ============================================================
  echo CHAN DOAN CHUA DAT - KHONG XOA DU LIEU NAO.
  echo Doc dong co dau X o phia tren de biet dung file/token/sheet nao sai.
  echo ============================================================
  pause
  exit /b 5
)

echo [5/7] Bat Data Hub lam nguon dong bo chinh...
node index.mjs --activate
if errorlevel 1 (
  echo LOI: Khong bat duoc Data Hub tren Main App.
  pause
  exit /b 6
)

echo [6/7] Ep dong bo mot luot day du de kiem tra end-to-end...
node index.mjs --once --force
if errorlevel 1 (
  echo.
  echo CANH BAO: Mot hoac nhieu nguon vua dong bo loi. Agent van se duoc khoi dong de tu thu lai.
)

echo [7/7] Cai che do chay an nen va tu khoi dong cung Windows...
set "STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
if not exist "%STARTUP%" mkdir "%STARTUP%"
if exist "%STARTUP%\NMC Data Hub.cmd" del /q "%STARTUP%\NMC Data Hub.cmd" >nul 2>&1
copy /y "RUN-DATA-HUB-HIDDEN.vbs" "%STARTUP%\NMC Data Hub.vbs" >nul

start "" wscript.exe "%TARGET%\RUN-DATA-HUB-HIDDEN.vbs"

echo.
echo ============================================================
echo DA SUA XONG BO DATA HUB.
echo Data Hub dang chay AN HOAN TOAN duoi nen, khong can giu cua so CMD.
echo Neu Node bi dung, watchdog se tu khoi dong lai sau 5 giay.
echo Neu can khoi dong lai thu cong: %TARGET%\RESTART-DATA-HUB.cmd
echo ============================================================

timeout /t 8 /nobreak >nul
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $r=Invoke-RestMethod 'https://nc-link.vercel.app/api/sync-source' -TimeoutSec 20; Write-Host ('Main App: source=' + $r.source + ', dataHubOnline=' + $r.dataHubOnline + ', lastSeenAt=' + $r.lastSeenAt + ', lastSyncAt=' + $r.lastSyncAt) } catch { Write-Host ('Khong doc duoc trang thai Main App: ' + $_.Exception.Message) }"

echo.
echo Neu dong tren hien dataHubOnline=True thi ket noi da thanh cong.
pause
endlocal
