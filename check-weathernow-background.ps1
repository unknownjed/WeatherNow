$TaskName = "WeatherNow Background Dev Server"
Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue |
  Select-Object TaskName, State
Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue |
  Where-Object { $_.OwningProcess -gt 0 } |
  Select-Object LocalAddress, LocalPort, OwningProcess, State
