param([string]$Out = "evidence\login-primary-logo.png")
$ErrorActionPreference = 'Stop'
$wshell = New-Object -ComObject WScript.Shell
$deadline = (Get-Date).AddSeconds(20)
$ok = $false
do {
  Start-Sleep -Milliseconds 700
  $ok = $wshell.AppActivate('VYAPARA POS')
} until ($ok -or (Get-Date) -gt $deadline)
if (-not $ok) { Write-Host 'WARN: window not activated, capturing anyway' }
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$b = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$bmp = New-Object System.Drawing.Bitmap($b.Width, $b.Height)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen(0, 0, 0, 0, $b.Size)
$target = [System.IO.Path]::GetFullPath((Join-Path (Get-Location) $Out))
$bmp.Save($target, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()
Write-Host "Saved: $target (activated=$ok)"
