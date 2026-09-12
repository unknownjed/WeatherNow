param(
  [string]$ProjectPath = "C:\Users\jedpa\Downloads\weather-dashboard",
  [string]$TaskName = "WeatherNow Background Dev Server"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $ProjectPath)) {
  throw "Project path not found: $ProjectPath"
}

# Remove the old task definition if it exists.
$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existing) {
  Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

# Run WeatherNow in a hidden detached cmd process.
$command = "Start-Process -FilePath 'cmd.exe' -ArgumentList '/c npm.cmd run dev:watch' -WorkingDirectory '$ProjectPath' -WindowStyle Hidden"

$action = New-ScheduledTaskAction `
  -Execute "powershell.exe" `
  -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -Command `"$command`""

$trigger = New-ScheduledTaskTrigger -AtLogOn

$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -MultipleInstances IgnoreNew

$principal = New-ScheduledTaskPrincipal `
  -UserId $env:USERNAME `
  -LogonType Interactive `
  -RunLevel Limited

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $action `
  -Trigger $trigger `
  -Settings $settings `
  -Principal $principal `
  -Force | Out-Null

Start-ScheduledTask -TaskName $TaskName

Start-Sleep -Seconds 4

$listener = Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue

Write-Host ""
if ($listener) {
  Write-Host "WeatherNow is running in the background on port 3001."
  Write-Host "You can close this PowerShell window."
} else {
  Write-Host "The scheduled task was created, but port 3001 is not listening yet."
  Write-Host "Check the task with:"
  Write-Host "  Get-ScheduledTaskInfo -TaskName `"$TaskName`""
}
Write-Host ""
