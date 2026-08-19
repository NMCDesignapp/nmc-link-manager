$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root
$log = Join-Path $root 'data-hub.log'
$supervisorLog = Join-Path $root 'data-hub-supervisor.log'

function Write-SupervisorLog([string]$message) {
  $stamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
  Add-Content -LiteralPath $supervisorLog -Value "[$stamp] $message" -Encoding UTF8
}

Write-SupervisorLog 'Hidden watchdog started.'

while ($true) {
  try {
    $stamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    Add-Content -LiteralPath $log -Value "`r`n[$stamp] START Data Hub" -Encoding UTF8
    & node.exe index.mjs *>> $log
    $exitCode = $LASTEXITCODE
    Write-SupervisorLog "Data Hub exited with code $exitCode. Restarting in 5 seconds."
  } catch {
    Write-SupervisorLog ("Watchdog caught error: " + $_.Exception.Message)
  }
  Start-Sleep -Seconds 5
}
