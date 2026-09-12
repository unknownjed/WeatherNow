# PAGASA radar alignment

PAGASA's official `/themes/hiraia/assets/js/app/radar/map.js` supplies a
geographic (EPSG:4326) rainfall mosaic with extent (west, south, east, north):
`[115.969111093, 3.80912641587, 129.511990464, 22.322581275]`.
Its OpenLayers ImageStatic source explicitly declares EPSG:4326.

Leaflet's basemap uses Web Mercator (EPSG:3857). An ImageOverlay only stretches
the corners: interior latitude positions were displaced by up to about 19.7 km.
`PagasaRadarLayer` instead inverse-projects each destination tile row to latitude
and samples the corresponding source-image rows. Longitude remains linear.
It clips to the official extent, preserves transparency and palette, and does
not wrap the PH image around the world. RainViewer's existing Mercator tiles
are unchanged and must not be reprojected again.

The image is drawn directly into display-only canvas tiles. No pixel readback
or canvas export is used, so displaying PAGASA images does not require an
additional CORS proxy. Image errors/timeouts remove the layer; an unavailable
image is not an all-clear. The source timestamp remains visible in the bulletin.

Run the regression suite with:

```powershell
node --test src/lib/radarProjection.test.ts
npx.cmd tsc --noEmit
```

Tests reproduce the old ~20 km defect, check eight Philippine reference
locations at zooms 3–10, verify clipping/tile seams, and ensure PH data is not
drawn over Europe/America. Correct projection is not proof of meteorological
accuracy or coverage. The source raster's resolution and timestamp still apply.

## Forecast source is separate

`server.ts` `/api/weather` and the browser fallback in `src/lib/api.ts` both
request the Open-Meteo base data. For Philippine locations, the separate
`/api/pagasa-forecast` endpoint supplies supported PAGASA current observations
and complete five-day city outlooks. Unavailable five-day outlooks fall back to
Open-Meteo; the 24-hour forecast remains Open-Meteo. See
`FORECAST_AND_PLAYLISTS.md` for coverage limits. Cyclone forecast tracks use NHC/JMA. Correcting
the radar projection does not make those products identical to PAGASA bulletins.
The map's source details explicitly distinguish these products and link to
PAGASA's official forecast. No synthetic PAGASA forecast values are inserted.
