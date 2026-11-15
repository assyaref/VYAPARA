param([int]$WaitSeconds = 60)

$ErrorActionPreference = 'Continue'
$root = 'D:\PROJECT - FullStack Developer\PROGRESS\VYAPARA POS Windows Desktop hybird'
$electron = Join-Path $root 'node_modules\electron\dist\electron.exe'
$entry = Join-Path $root 'apps\desktop\out\main\main.js'
$profileDir = Join-Path $env:TEMP 'vyapara-invest-profile'
$out = Join-Path $env:TEMP 'vyapara-invest-stdout.log'
$err = Join-Path $env:TEMP 'vyapara-invest-stderr.log'
$result = Join-Path $env:TEMP 'vyapara-invest-result.txt'

foreach ($f in @($out, $err, $result)) { if (Test-Path $f) { Remove-Item $f -Force } }
if (Test-Path $profileDir) { Remove-Item $profileDir -Recurse -Force }
New-Item -ItemType Directory -Path $profileDir | Out-Null

$env:ELECTRON_ENABLE_LOGGING = '1'
Write-Host "Launching Electron: $electron"
Write-Host "Entry: $entry"
Write-Host "Profile: $profileDir"

$sw = [System.Diagnostics.Stopwatch]::StartNew()
$p = Start-Process -FilePath $electron `
  -ArgumentList @("`"$entry`"", '--no-sandbox', "--user-data-dir=`"$profileDir`"") `
  -WorkingDirectory (Join-Path $root 'apps\desktop') `
  -RedirectStandardOutput $out -RedirectStandardError $err `
  -PassThru -NoNewWindow
Write-Host "PID: $($p.Id)"

$exited = $p.WaitForExit($WaitSeconds * 1000)
$elapsed = $sw.Elapsed.TotalSeconds
if ($exited) {
  $line = "EXITED code=$($p.ExitCode) elapsed=$([math]::Round($elapsed,1))s"
  Write-Host $line
  $line | Out-File $result
} else {
  $line = "STILL_RUNNING after ${WaitSeconds}s elapsed=$([math]::Round($elapsed,1))s pid=$($p.Id)"
  Write-Host $line
  $line | Out-File $result
  try { $p.Kill($true); Write-Host 'Killed after timeout' } catch { Write-Host "Kill failed: $_" }
}
Write-Host '--- stdout tail ---'
if (Test-Path $out) { Get-Content $out -Tail 50 } else { Write-Host '(no stdout file)' }
Write-Host '--- stderr tail ---'
if (Test-Path $err) { Get-Content $err -Tail 50 } else { Write-Host '(no stderr file)' }
