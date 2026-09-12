@echo off
setlocal
cd /d "%~dp0"

echo Building the latest WeatherNow changes...
call npm.cmd run build
if errorlevel 1 (
  echo.
  echo WeatherNow could not be built. Press any key to close.
  pause >nul
  exit /b 1
)

set "NODE_ENV=production"
set "PORT=3001"

powershell.exe -NoProfile -WindowStyle Hidden -Command "$listener = Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue; if (-not $listener) { Start-Process -FilePath 'C:\Program Files\nodejs\node.exe' -ArgumentList 'dist\server.cjs' -WorkingDirectory '%~dp0' -WindowStyle Hidden }"

timeout /t 2 /nobreak >nul

if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
  start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --app=http://localhost:3001
) else if exist "C:\Program Files\Microsoft\Edge\Application\msedge.exe" (
  start "" "C:\Program Files\Microsoft\Edge\Application\msedge.exe" --app=http://localhost:3001
) else (
  start "" http://localhost:3001
)

endlocal
