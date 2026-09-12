param(
  [string]$Project = "C:\Users\jedpa\Downloads\weather-dashboard"
)

$ErrorActionPreference = "Stop"

$appFile = Join-Path $Project "src\App.tsx"

if (!(Test-Path $appFile)) {
  throw "Missing: $appFile"
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backup = "$appFile.$stamp.bak"
Copy-Item $appFile $backup -Force

$text = Get-Content $appFile -Raw

$startMarker = "{isHeaderLogoutConfirmOpen && ("
$start = $text.IndexOf($startMarker)
if ($start -lt 0) {
  throw "Header logout confirmation block not found in App.tsx"
}

# Find the end of this JSX conditional by looking for the next top-level section
# after the modal. This is intentionally anchored to the existing modal content.
$nextMarkerCandidates = @(
  "`r`n      <main",
  "`n      <main",
  "`r`n      {activeTab",
  "`n      {activeTab"
)

$end = -1
foreach ($marker in $nextMarkerCandidates) {
  $candidate = $text.IndexOf($marker, $start)
  if ($candidate -gt $start -and ($end -lt 0 -or $candidate -lt $end)) {
    $end = $candidate
  }
}

if ($end -lt 0) {
  throw "Could not safely locate the end of the header logout modal."
}

$oldBlock = $text.Substring($start, $end - $start)

# Verify that we are replacing the expected header modal, not another JSX block.
if (-not $oldBlock.Contains("header-logout-title") -or
    -not $oldBlock.Contains("setIsHeaderLogoutConfirmOpen")) {
  throw "Located block does not look like the header logout modal. No changes made."
}

$newBlock = @'
{isHeaderLogoutConfirmOpen && (
        <div
          className="fixed inset-0 z-[120000] flex items-center justify-center bg-black/55 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="header-logout-title"
          onClick={() => setIsHeaderLogoutConfirmOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-sky-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id="header-logout-title" className="text-base font-bold text-slate-950 dark:text-white">
              <span className="lg:hidden">Sign out of Google Calendar?</span>
              <span className="hidden lg:inline">Sign out of Google?</span>
            </h3>

            <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
              <span className="lg:hidden">
                Your local journal records and photos will remain saved. Calendar updates and cloud journal sync will pause until you reconnect.
              </span>
              <span className="hidden lg:inline">
                Your journal stays saved. Sign in with this Google account again to resume Drive sync across devices.
              </span>
            </p>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsHeaderLogoutConfirmOpen(false)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="text-[10px] sm:text-xs bg-blue-600 hover:bg-blue-500 text-white dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 px-3 py-1.5 sm:px-4 sm:py-2 rounded-md transition-colors border border-blue-700 dark:border-slate-700 font-bold shadow-sm"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
'@

$text = $text.Substring(0, $start) + $newBlock + $text.Substring($end)

Set-Content -Path $appFile -Value $text -Encoding UTF8

Write-Host ""
Write-Host "Header Google account popup updated for mobile/tablet." -ForegroundColor Green
Write-Host "Backup: $backup"
Write-Host ""
Write-Host "Checks:"
Select-String -Path $appFile -SimpleMatch 'Sign out of Google Calendar?'
Select-String -Path $appFile -SimpleMatch 'Your local journal records and photos will remain saved.'
Select-String -Path $appFile -SimpleMatch 'border border-sky-200 bg-white p-5 shadow-2xl'
