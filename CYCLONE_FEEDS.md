# Live cyclone tracks

The existing Weather Track map now reads `/api/cyclones`. No API key is required.

- **NHC:** `https://www.nhc.noaa.gov/CurrentStorms.json`, followed by the forecast-advisory URL in each storm entry. Current positions and forecast/outlook coordinates are parsed from these official products.
- **JMA:** `https://www.jma.go.jp/bosai/typhoon/data/targetTc.json`, followed by each listed cyclone's `forecast.json`. These provide western Pacific positions, history, forecast points, and uncertainty-circle radii in metres.
- **JTWC:** not connected. Direct access returned HTTP 403 during verification. Do not bypass this response or present JMA data as JTWC data.
- **PAGASA:** existing radar and current-position parser remain separate. The parser does not verify the bulletin's observation time, so its point is labelled accordingly and no forecast is inferred from it. PAGASA remains the authority for Philippine warnings.

The server caches results for ten minutes and combines concurrent requests. Agency failures are reported separately from an empty active-storm list. Advisories older than 18 hours are omitted; partially available feeds are labelled. Map popups show issue/valid times and official-source links. Grey lines are past positions; dashed lines are forecasts. Forecasts are uncertain.

This is not complete worldwide coverage. IBTrACS archival data is not used as a live forecast. No generated storm tracks, wind fields, pressure values or simulated cones are displayed.

## Run and verify

Stop only the existing WeatherNow server, then from this project directory:

```powershell
$env:PORT = '3001'
$env:NODE_ENV = 'production'
npm.cmd start
```

For subsequent source changes, rebuild with `npm.cmd run build`, then restart WeatherNow.

```powershell
Invoke-RestMethod http://localhost:3001/api/cyclones | ConvertTo-Json -Depth 8
node --test server/cyclones.test.ts
```

In the dashboard, open **Weather Track → Cyclone bulletin**, choose a storm, and enable **Forecast tracks**. JMA uncertainty circles can be switched on separately. Source outages must never be interpreted as an all-clear.
