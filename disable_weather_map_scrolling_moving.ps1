param(
  [string]$Project = "C:\Users\jedpa\Downloads\weather-dashboard"
)

$ErrorActionPreference = "Stop"

$mapFile = Join-Path $Project "src\components\LiveWeatherTrackMap.tsx"

if (!(Test-Path $mapFile)) {
  throw "Missing: $mapFile"
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backup = "$mapFile.$stamp.bak"
Copy-Item $mapFile $backup -Force

$text = Get-Content $mapFile -Raw

$start = $text.IndexOf("<MapContainer")
if ($start -lt 0) {
  throw "Weather Track MapContainer not found."
}

$end = $text.IndexOf(">", $start)
if ($end -lt 0) {
  throw "Could not locate end of MapContainer opening tag."
}

$tag = $text.Substring($start, $end - $start + 1)

# Remove existing interaction props so there are no duplicates.
$tag = [regex]::Replace($tag, '\s+scrollWheelZoom(?:=\{(?:true|false)\})?', '')
$tag = [regex]::Replace($tag, '\s+dragging(?:=\{(?:true|false)\})?', '')
$tag = [regex]::Replace($tag, '\s+keyboard(?:=\{(?:true|false)\})?', '')
$tag = [regex]::Replace($tag, '\s+boxZoom(?:=\{(?:true|false)\})?', '')

# Keep zoom controls usable, but stop mouse/touch panning and page-wheel zoom.
$insert = ' dragging={false} scrollWheelZoom={false} keyboard={false} boxZoom={false}'
$tag = $tag.Substring(0, $tag.Length - 1) + $insert + ">"

$text = $text.Substring(0, $start) + $tag + $text.Substring($end + 1)

Set-Content -Path $mapFile -Value $text -Encoding UTF8

Write-Host ""
Write-Host "Weather Track movement lock applied." -ForegroundColor Green
Write-Host "Backup: $backup"
Write-Host ""
Write-Host "Map interaction settings:"
Select-String -Path $mapFile -SimpleMatch 'dragging={false} scrollWheelZoom={false} keyboard={false} boxZoom={false}'
