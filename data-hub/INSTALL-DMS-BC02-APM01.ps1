# Data Hub DMS BC02/APM01 - one-file Windows PowerShell installer.
# It keeps all 11 source definitions and normalizes every workbook to G:\NMC-Data.
$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
$root='C:\NMCDataHub'
$cfgFile=Join-Path $root 'data-hub.config.json'
$rev='60cf0086edbbd7762bcb1515b84a6d511288893d'
$remote="https://raw.githubusercontent.com/NMCDesignapp/nmc-link-manager/$rev/data-hub"
$stamp=Get-Date -Format yyyyMMdd-HHmmss
$stage=Join-Path $root ("_dms-stage-"+$stamp)
$backup=Join-Path $root ("backup-before-dms-"+$stamp)
$oldEnv=$env:NMC_DATA_HUB_CONFIG
$replaced=$false
function Field($o,[string]$n,$v){$o | Add-Member -NotePropertyName $n -NotePropertyValue $v -Force}
function Src([string]$id){
  $r=@($cfg.sources | Where-Object {$_.id -eq $id})
  if($r.Count -ne 1){throw "Khong tim thay dung 1 nguon: $id"}
  return $r[0]
}
function Need([string]$p){if(!(Test-Path -LiteralPath $p -PathType Leaf)){throw "Thieu file: $p"}}
function StopHub {
  $all=@(Get-CimInstance Win32_Process)
  $watch=@($all | Where-Object {
    $_.Name -eq 'powershell.exe' -and $_.CommandLine -match 'DATA-HUB-WATCHDOG[.]ps1'
  })
  foreach($p in $watch){Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue}
  $nodes=@($all | Where-Object {$_.Name -eq 'node.exe' -and $_.CommandLine -match '(^|[ /\\])index[.]mjs'})
  foreach($p in $nodes){Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue}
  Start-Sleep -Seconds 2
  if(@(Get-CimInstance Win32_Process | Where-Object {
    $_.Name -eq 'node.exe' -and $_.CommandLine -match '(^|[ /\\])index[.]mjs'
  }).Count){throw 'Van con Data Hub cu dang chay'}
}
try{
  Write-Host '1/6 KIEM TRA FILE VA CAU HINH' -ForegroundColor Cyan
  if(!(Get-Command node -ErrorAction SilentlyContinue) -or
     !(Get-Command npm.cmd -ErrorAction SilentlyContinue)){throw 'Thieu Node.js/npm'}
  Need $cfgFile
  Need 'G:\NMC-Data\NEW_BC02.xlsx'
  Need 'G:\NMC-Data\Cautruc.xlsx'
  Need 'G:\NMC-Data\Doanhso.xlsx'
  Need 'G:\NMC-Data\83An Giang_SaoViet2026TT.xlsx'
  if(!@(Get-ChildItem 'G:\NMC-Data\APM01 Agents_*.xlsx' -File -ErrorAction SilentlyContinue).Count){
    throw 'Khong thay APM01 Agents_*.xlsx o o G:'
  }
  $cfg=Get-Content -LiteralPath $cfgFile -Raw -Encoding UTF8 | ConvertFrom-Json
  if(@($cfg.sources).Count -lt 11){throw 'Cau hinh cu thieu nguon; dung an toan'}
  foreach($id in @('structure-tvv','structure-leaders','structure-recruiters',
    'revenue-current-month','tamthu-detail-view','structure-clb-members',
    'structure-tuyen-ngang','saoviet-ca-nhan','saoviet-tn-ktm',
    'saoviet-tn-td','revenue-completed-months')){$null=Src $id}
  New-Item -ItemType Directory -Force -Path $stage,$backup | Out-Null
  Write-Host '2/6 TAI MA MOI TU GITHUB - KHONG CAN ZIP' -ForegroundColor Cyan
  foreach($name in @('index.mjs','dms-auto-source.mjs','package.json',
    'DATA-HUB-WATCHDOG.ps1','RUN-DATA-HUB-HIDDEN.vbs')){
    Invoke-WebRequest -UseBasicParsing -TimeoutSec 90 -Uri "$remote/$name" -OutFile (Join-Path $stage $name)
  }
  node --check (Join-Path $stage 'index.mjs')
  if($LASTEXITCODE){throw 'Index sai cu phap'}
  node --check (Join-Path $stage 'dms-auto-source.mjs')
  if($LASTEXITCODE){throw 'Bo doc DMS sai cu phap'}
  npm.cmd install --prefix $stage --omit=dev --no-audit --no-fund
  if($LASTEXITCODE){throw 'Khong cai duoc xlsx'}
  Write-Host '3/6 CHUYEN TOAN BO NGUON EXCEL SANG O G' -ForegroundColor Cyan
  $apm='G:\NMC-Data\APM01 Agents_*.xlsx'
  $bc='G:\NMC-Data\NEW_BC02.xlsx'
  $ct='G:\NMC-Data\Cautruc.xlsx'
  $sv='G:\NMC-Data\83An Giang_SaoViet2026TT.xlsx'
  $doanhso='G:\NMC-Data\Doanhso.xlsx'
  foreach($s in @(
    @{id='structure-tvv';kind='structure';transform='apm01-tvv';min=1000},
    @{id='structure-leaders';kind='structure';transform='apm01-leaders';min=20},
    @{id='structure-recruiters';kind='structure';transform='apm01-recruiters';min=25},
    @{id='revenue-current-month';kind='revenue';transform='bc02-sheet4';min=1},
    @{id='tamthu-detail-view';kind='tamthu-detail';transform='bc02-sheet2';min=1}
  )){
    $o=Src $s.id
    Field $o 'file' $(if($s.transform.StartsWith('bc02')){$bc}else{$apm})
    Field $o 'kind' $s.kind
    Field $o 'dmsTransform' $s.transform
    Field $o 'apmFile' $apm
    Field $o 'structureReferenceFile' $ct
    Field $o 'minRows' $s.min
    Field $o 'allowEmpty' $false
    Field $o 'enableWrite' $false
    if($s.id -eq 'revenue-current-month'){Field $o 'replaceCurrentMonth' $true}
    $o.PSObject.Properties.Remove('sheet')
  }
  foreach($s in @(@{id='structure-clb-members';name='DS CLB'},
                 @{id='structure-tuyen-ngang';name='tuyen-ngang'})){
    $o=Src $s.id
    Field $o 'file' $ct
    Field $o 'sheet' $s.name
    Field $o 'allowEmpty' $false
  }
  foreach($s in @(@{id='saoviet-ca-nhan';name='TVV'},
                  @{id='saoviet-tn-ktm';name='Nhom'},
                  @{id='saoviet-tn-td';name='NhomTD'})){
    $o=Src $s.id
    Field $o 'file' $sv
    Field $o 'sheet' $s.name
  }
  Field (Src 'revenue-completed-months') 'file' $doanhso
  Field $cfg 'requiredSourceRoot' 'G:\NMC-Data'
  Field $cfg 'enableDmsWrites' $false
  $shadow=Join-Path $stage 'data-hub.config.json'
  [IO.File]::WriteAllText($shadow,($cfg | ConvertTo-Json -Depth 40),
    (New-Object System.Text.UTF8Encoding($false)))
  Write-Host '4/6 DOI CHIEU SHADOW - KHONG GHI VAO SERVER' -ForegroundColor Cyan
  $env:NMC_DATA_HUB_CONFIG=$shadow
  node (Join-Path $stage 'index.mjs') --dms-shadow
  $passed=($LASTEXITCODE -eq 0)
  $env:NMC_DATA_HUB_CONFIG=$oldEnv
  if(!$passed){throw 'Shadow loi. Bo Data Hub cu va config cu khong bi ghi de'}
  Write-Host '5/6 BACKUP, TAT DATA HUB CU, CAI BAN MOI' -ForegroundColor Cyan
  foreach($name in @('index.mjs','package.json','package-lock.json','data-hub.config.json',
    'dms-auto-source.mjs','.nmc-data-hub-state.json','DATA-HUB-WATCHDOG.ps1',
    'RUN-DATA-HUB-HIDDEN.vbs')){
    $old=Join-Path $root $name
    if(Test-Path -LiteralPath $old -PathType Leaf){
      Copy-Item -LiteralPath $old -Destination (Join-Path $backup $name) -Force
    }
  }
  StopHub
  Field $cfg 'enableDmsWrites' $true
  foreach($s in $cfg.sources){if($s.dmsTransform){Field $s 'enableWrite' $true}}
  [IO.File]::WriteAllText($shadow,($cfg | ConvertTo-Json -Depth 40),
    (New-Object System.Text.UTF8Encoding($false)))
  foreach($name in @('index.mjs','dms-auto-source.mjs','package.json','package-lock.json',
    'DATA-HUB-WATCHDOG.ps1','RUN-DATA-HUB-HIDDEN.vbs')){
    $source=Join-Path $stage $name
    if(Test-Path $source){Copy-Item $source (Join-Path $root $name) -Force}
  }
  $targetModules=Join-Path $root 'node_modules'
  New-Item -ItemType Directory -Path $targetModules -Force | Out-Null
  Copy-Item (Join-Path $stage 'node_modules\*') $targetModules -Recurse -Force
  Copy-Item $shadow $cfgFile -Force
  $replaced=$true
  $control=@'
param([ValidateSet('start','stop','restart','status')][string]$Mode='status')
$ErrorActionPreference='Stop'
$hub='C:\NMCDataHub'
function Processes {
 @(Get-CimInstance Win32_Process | Where-Object {
  ($_.Name -eq 'node.exe' -and $_.CommandLine -match '(^|[ /\\])index[.]mjs') -or
  ($_.Name -eq 'powershell.exe' -and $_.CommandLine -match 'DATA-HUB-WATCHDOG[.]ps1')
 })
}
if($Mode -in @('stop','restart')){
 foreach($p in @(Processes | Where-Object Name -eq 'powershell.exe')){
  Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
 }
 foreach($p in @(Processes | Where-Object Name -eq 'node.exe')){
  Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
 }
 Start-Sleep -Seconds 2
 if($Mode -eq 'stop'){Write-Host 'DATA HUB DA TAT';exit}
}
if($Mode -in @('start','restart')){
 if(!@(Processes | Where-Object Name -eq 'powershell.exe').Count){
  Start-Process wscript.exe -ArgumentList (Join-Path $hub 'RUN-DATA-HUB-HIDDEN.vbs')
 }
 Start-Sleep -Seconds 7
}
Write-Host ('So tien trinh: '+@(Processes).Count)
try {
 $r=Invoke-RestMethod 'https://nc-link.vercel.app/api/sync-source' -TimeoutSec 20
 Write-Host ('Nguon: '+$r.source+'; Online: '+$r.dataHubOnline+'; Lan dong bo: '+$r.lastSyncAt)
 if($r.lastResult){$r.lastResult | ConvertFrom-Json | Select-Object id,ok,changed,count,error | Format-Table}
} catch {Write-Host ('Chua lay duoc trang thai: '+$_.Exception.Message)}
'@
  [IO.File]::WriteAllText((Join-Path $root 'NMC-DATA-HUB-CONTROL.ps1'),$control,
    (New-Object System.Text.UTF8Encoding($false)))
  $desktop=[Environment]::GetFolderPath('DesktopDirectory')
  $startup=[Environment]::GetFolderPath('Startup')
  $ws=New-Object -ComObject WScript.Shell
  foreach($s in @(
    @{mode='stop';name='TAT DATA HUB'},@{mode='start';name='KHOI DONG DATA HUB'},
    @{mode='restart';name='KHOI DONG LAI DATA HUB'},@{mode='status';name='KIEM TRA DATA HUB'}
  )){
    $cmdFile=Join-Path $root ('NMC-'+$s.mode+'.cmd')
    $cmdText='@echo off'+[Environment]::NewLine+
      'powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0NMC-DATA-HUB-CONTROL.ps1" -Mode '+$s.mode+
      [Environment]::NewLine+'pause'+[Environment]::NewLine
    [IO.File]::WriteAllText($cmdFile,$cmdText,[Text.Encoding]::ASCII)
    $lnk=$ws.CreateShortcut((Join-Path $desktop ($s.name+'.lnk')))
    $lnk.TargetPath=$cmdFile;$lnk.WorkingDirectory=$root;$lnk.Save()
  }
  $auto=$ws.CreateShortcut((Join-Path $startup 'NMC Data Hub.lnk'))
  $auto.TargetPath=(Join-Path $env:WINDIR 'System32\wscript.exe')
  $auto.Arguments='"'+(Join-Path $root 'RUN-DATA-HUB-HIDDEN.vbs')+'"'
  $auto.WorkingDirectory=$root;$auto.Save()
  foreach($old in @('NMC Data Hub.vbs','NMC Data Hub.cmd')){
    $file=Join-Path $startup $old
    if(Test-Path $file){Remove-Item $file -Force}
  }
  Write-Host '6/6 KHOI DONG TU DONG NEU SERVER CHON DATA HUB' -ForegroundColor Cyan
  $server=Invoke-RestMethod 'https://nc-link.vercel.app/api/sync-source' -TimeoutSec 20
  if($server.source -eq 'data-hub'){
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $root 'NMC-DATA-HUB-CONTROL.ps1') -Mode start
  } else {
    Write-Host 'Server dang chon Google: KHONG TU DOI NGUON. Bat lai khi da kiem tra.' -ForegroundColor Yellow
  }
  Write-Host 'DA CAI DAT, 4 NUT O DESKTOP. KHONG XOA EXCEL/DOANHSO/SAOVIET.' -ForegroundColor Green
  Write-Host ('Ban backup de phuc hoi: '+$backup)
} catch {
  Write-Host ('CAI DAT LOI: '+$_.Exception.Message) -ForegroundColor Red
  if($replaced){
    foreach($name in @('index.mjs','package.json','package-lock.json','data-hub.config.json',
      'dms-auto-source.mjs','.nmc-data-hub-state.json','DATA-HUB-WATCHDOG.ps1',
      'RUN-DATA-HUB-HIDDEN.vbs')){
      $old=Join-Path $backup $name
      if(Test-Path $old){Copy-Item $old (Join-Path $root $name) -Force}
    }
    Write-Host 'Da phuc hoi config/cu. Khong tu bat lai de tranh ghi sai.' -ForegroundColor Yellow
  } else {
    Write-Host 'Chua ghi de cau hinh/cu (hoac chi backup).' -ForegroundColor Yellow
  }
  Write-Host ('Backup: '+$backup)
  exit 1
} finally {$env:NMC_DATA_HUB_CONFIG=$oldEnv}
