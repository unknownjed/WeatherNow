param(
  [string]$Project = "C:\Users\jedpa\Downloads\weather-dashboard"
)

$ErrorActionPreference = "Stop"

$mapFile = Join-Path $Project "src\components\LiveWeatherTrackMap.tsx"
$serverFile = Join-Path $Project "server.ts"

if (!(Test-Path $mapFile)) { throw "Missing: $mapFile" }
if (!(Test-Path $serverFile)) { throw "Missing: $serverFile" }

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
Copy-Item $mapFile "$mapFile.$stamp.bak" -Force
Copy-Item $serverFile "$serverFile.$stamp.bak" -Force

$server = Get-Content $serverFile -Raw
$map = Get-Content $mapFile -Raw

# ------------------------------------------------------------
# SERVER: switch Europe/Africa product to MTG IR10.5.
# Reuse whatever MTG endpoint exists.
# ------------------------------------------------------------
$server = $server.Replace("/api/mtg-truecolour-tile", "/api/mtg-enhanced-ir-tile")
$server = $server.Replace("/api/mtg-geocolour-tile", "/api/mtg-enhanced-ir-tile")
$server = $server.Replace("/api/mtg-visible-tile", "/api/mtg-enhanced-ir-tile")

$server = $server.Replace("mtg_fd:rgb_truecolour", "mtg_fd:ir105_hrfi")
$server = $server.Replace("mtg_fd:rgb_geocolour", "mtg_fd:ir105_hrfi")
$server = $server.Replace("mtg_fd:vis06_hrfi", "mtg_fd:ir105_hrfi")

$server = $server.Replace("MTG True Colour", "MTG Enhanced IR")
$server = $server.Replace("MTG GeoColour", "MTG Enhanced IR")
$server = $server.Replace("MTG Visible", "MTG Enhanced IR")

# If the endpoint doesn't exist at all, add a clean one.
if (-not $server.Contains("/api/mtg-enhanced-ir-tile")) {
$endpoint = @'

  // MTG IR10.5 for Europe/Africa, styled client-side to match Himawari enhanced IR.
  app.get('/api/mtg-enhanced-ir-tile', async (req, res) => {
    try {
      const z = Number(req.query.z);
      const x = Number(req.query.x);
      const y = Number(req.query.y);

      if (
        !Number.isInteger(z) || z < 0 || z > 10 ||
        !Number.isInteger(x) || x < 0 || x >= 2 ** z ||
        !Number.isInteger(y) || y < 0 || y >= 2 ** z
      ) {
        return res.status(400).send('Invalid MTG IR tile request');
      }

      const n = 2 ** z;
      const west = x / n * 360 - 180;
      const east = (x + 1) / n * 360 - 180;

      const tileYToLat = (tileY: number) => {
        const a = Math.PI - (2 * Math.PI * tileY) / n;
        return (180 / Math.PI) * Math.atan(Math.sinh(a));
      };

      const south = tileYToLat(y + 1);
      const north = tileYToLat(y);

      const params = new URLSearchParams({
        SERVICE: 'WMS',
        REQUEST: 'GetMap',
        VERSION: '1.1.1',
        LAYERS: 'mtg_fd:ir105_hrfi',
        STYLES: '',
        FORMAT: 'image/png',
        TRANSPARENT: 'TRUE',
        SRS: 'EPSG:4326',
        BBOX: `${west},${south},${east},${north}`,
        WIDTH: '256',
        HEIGHT: '256',
      });

      const response = await fetch(
        `https://view.eumetsat.int/geoserver/wms?${params.toString()}`,
        {
          headers: {
            Accept: 'image/png,image/*;q=0.9,*/*;q=0.5',
            Referer: 'https://view.eumetsat.int/',
            'User-Agent': 'WeatherNow dashboard/1.0',
          },
          signal: AbortSignal.timeout(20000),
        },
      );

      if (!response.ok) {
        throw new Error(`MTG IR returned ${response.status}`);
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.toLowerCase().startsWith('image/')) {
        throw new Error(`MTG IR returned ${contentType || 'non-image'}`);
      }

      const bytes = Buffer.from(await response.arrayBuffer());

      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=300');
      return res.send(bytes);
    } catch (error) {
      console.error('MTG enhanced IR tile failed:', error);
      return res.status(502).send('MTG enhanced IR unavailable');
    }
  });
'@

  $insertAt = $server.IndexOf("  // 7. Radar Proxy")
  if ($insertAt -lt 0) {
    $insertAt = $server.IndexOf("  // Vite middleware for development.")
  }
  if ($insertAt -lt 0) {
    throw "Could not find safe server insertion point."
  }

  $server = $server.Insert($insertAt, $endpoint + "`r`n`r`n")
}

# ------------------------------------------------------------
# MAP: remove old marked MTG Europe/Africa block(s).
# ------------------------------------------------------------
$markerPairs = @(
  @("{/* MTG True Colour Europe Africa */}", "{/* End MTG True Colour Europe Africa */}"),
  @("{/* MTG GeoColour Europe Africa */}", "{/* End MTG GeoColour Europe Africa */}"),
  @("{/* MTG Visible Europe Africa */}", "{/* End MTG Visible Europe Africa */}"),
  @("{/* MTG Enhanced IR Europe Africa */}", "{/* End MTG Enhanced IR Europe Africa */}")
)

foreach ($pair in $markerPairs) {
  while ($true) {
    $s = $map.IndexOf($pair[0])
    if ($s -lt 0) { break }
    $e = $map.IndexOf($pair[1], $s)
    if ($e -lt 0) { break }
    $e += $pair[1].Length
    $map = $map.Substring(0, $s) + $map.Substring($e)
  }
}

# ------------------------------------------------------------
# Add a client-side MTG enhanced-IR layer matching the PH palette.
# ------------------------------------------------------------
$whiteFunction = "function WhiteMapBoundaryLayer"
$whitePos = $map.IndexOf($whiteFunction)
if ($whitePos -lt 0) {
  throw "WhiteMapBoundaryLayer function not found."
}

# Remove an earlier helper if rerun.
$helperName = "function MtgEnhancedIrLayer"
$helperStart = $map.IndexOf($helperName)
if ($helperStart -ge 0) {
  $helperEnd = $map.IndexOf($whiteFunction, $helperStart)
  if ($helperEnd -gt $helperStart) {
    $map = $map.Substring(0, $helperStart) + $map.Substring($helperEnd)
    $whitePos = $map.IndexOf($whiteFunction)
  }
}

$helper = @'
function MtgEnhancedIrLayer() {
  const map = useMap();

  useEffect(() => {
    let disposed = false;

    const enhancedIrColor = (gray: number): [number, number, number] | null => {
      if (gray < 142) return null;

      const stops: Array<[number, [number, number, number]]> = [
        [142, [35, 70, 210]],
        [158, [0, 145, 255]],
        [174, [0, 220, 190]],
        [188, [25, 205, 70]],
        [202, [230, 235, 0]],
        [216, [255, 150, 0]],
        [232, [245, 45, 0]],
        [245, [255, 235, 225]],
      ];

      for (let i = 1; i < stops.length; i += 1) {
        const [rightLevel, rightColor] = stops[i];
        if (gray > rightLevel) continue;
        const [leftLevel, leftColor] = stops[i - 1];
        const f = (gray - leftLevel) / Math.max(1, rightLevel - leftLevel);
        return [
          Math.round(leftColor[0] + (rightColor[0] - leftColor[0]) * f),
          Math.round(leftColor[1] + (rightColor[1] - leftColor[1]) * f),
          Math.round(leftColor[2] + (rightColor[2] - leftColor[2]) * f),
        ];
      }

      return stops[stops.length - 1][1];
    };

    const Layer = L.GridLayer.extend({
      createTile(coords: L.Coords, done: L.DoneCallback) {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          queueMicrotask(() => done(new Error('Canvas unavailable'), canvas));
          return canvas;
        }

        const image = new Image();
        image.crossOrigin = 'anonymous';

        image.onload = () => {
          if (disposed) return;

          try {
            ctx.clearRect(0, 0, 256, 256);
            ctx.drawImage(image, 0, 0, 256, 256);

            const pixels = ctx.getImageData(0, 0, 256, 256);
            const data = pixels.data;

            for (let i = 0; i < data.length; i += 4) {
              if (data[i + 3] === 0) continue;

              const gray = Math.round((data[i] + data[i + 1] + data[i + 2]) / 3);

              // Remove near-black no-data.
              if (gray <= 10) {
                data[i + 3] = 0;
                continue;
              }

              const enhanced = enhancedIrColor(gray);
              if (!enhanced) continue;

              data[i] = enhanced[0];
              data[i + 1] = enhanced[1];
              data[i + 2] = enhanced[2];
            }

            ctx.putImageData(pixels, 0, 0);
            done(null, canvas);
          } catch (error) {
            done(error as Error, canvas);
          }
        };

        image.onerror = () => {
          if (!disposed) done(new Error('MTG IR tile unavailable'), canvas);
        };

        image.src = apiUrl(
          `/api/mtg-enhanced-ir-tile?z=${coords.z}&x=${coords.x}&y=${coords.y}`
        );

        return canvas;
      },
    });

    const layer = new Layer({
      tileSize: 256,
      minZoom: 5,
      maxZoom: 10,
      noWrap: true,
      bounds: L.latLngBounds([[-60, -30], [72, 77]]),
      updateWhenIdle: true,
      updateWhenZooming: false,
      attribution: 'MTG Enhanced IR — EUMETSAT',
    });

    layer.setZIndex(491);
    layer.addTo(map);

    return () => {
      disposed = true;
      if (map.hasLayer(layer)) map.removeLayer(layer);
    };
  }, [map]);

  return null;
}

'@

$map = $map.Insert($whitePos, $helper)

# Insert JSX mount before WhiteMapBoundaryLayer.
$jsxMarker = "<WhiteMapBoundaryLayer />"
$jsxPos = $map.IndexOf($jsxMarker)
if ($jsxPos -lt 0) {
  throw "WhiteMapBoundaryLayer JSX not found."
}

# remove existing MtgEnhancedIrLayer mount if rerun
$map = [regex]::Replace(
  $map,
  '(?m)^\s*\{showHimawari\s*&&\s*<MtgEnhancedIrLayer\s*/>\}\s*\r?\n',
  ''
)

$jsxPos = $map.IndexOf($jsxMarker)
$lineStart = $map.LastIndexOf("`n", $jsxPos)
if ($lineStart -lt 0) { $lineStart = 0 } else { $lineStart += 1 }

$mount = "        {/* MTG Enhanced IR Europe Africa */}`r`n" +
         "        {showHimawari && <MtgEnhancedIrLayer />}`r`n" +
         "        {/* End MTG Enhanced IR Europe Africa */}`r`n"

$map = $map.Substring(0, $lineStart) + $mount + $map.Substring($lineStart)

Set-Content -Path $serverFile -Value $server -Encoding UTF8
Set-Content -Path $mapFile -Value $map -Encoding UTF8

Write-Host ""
Write-Host "Europe/Africa now matches the Philippines enhanced IR style." -ForegroundColor Green
Write-Host "Backups timestamp: $stamp"
Write-Host ""
Write-Host "Checks:"
Select-String -Path $serverFile -SimpleMatch "/api/mtg-enhanced-ir-tile"
Select-String -Path $serverFile -SimpleMatch "mtg_fd:ir105_hrfi"
Select-String -Path $mapFile -SimpleMatch "function MtgEnhancedIrLayer"
Select-String -Path $mapFile -SimpleMatch "MTG Enhanced IR Europe Africa"
