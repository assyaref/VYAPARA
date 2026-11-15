Get-CimInstance Win32_Process -Filter "Name='electron.exe'" | ForEach-Object { "$($_.ProcessId): $($_.CommandLine)" }
