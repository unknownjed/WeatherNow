# Forecast and playlist changes

## Provider routing

For a resolved location whose country is Philippines/PH/PHL:

- Current: PAGASA's public automated-weather-station table. Only explicit
  locality/station matches are enabled. The station name and observation time
  are displayed; readings older than 90 minutes, future-dated readings, missing
  measurements and unsupported localities show unavailable. No Open-Meteo data
  is mislabeled as PAGASA. The table does not supply sky condition or apparent
  temperature, so those fields are not invented.
- Five days: PAGASA's nearest published city outlook, with that city's name and
  approximate distance from the requested GPS location. It is not an
  interpolated forecast for every point in the country. An unavailable/stale
  outlook falls back to Open-Meteo and is explicitly labeled.
- 24 hours and the temperature graph: existing Open-Meteo data, including the
  first/current entry inside that hourly widget.
- All other countries: existing Open-Meteo weather remains unchanged.

PAGASA sources:
https://bagong.pagasa.dost.gov.ph/automated-weather-station
https://bagong.pagasa.dost.gov.ph/weather/weather-outlook-selected-philippine-cities

Current station selection uses explicitly mapped major localities, not a
complete nationwide geolocated AWS catalogue. Stations are representative of
their locality, not measurements at the user's exact GPS position. The 35 km
locality-centre matching limit is an application selection limit, not a
guarantee of representativeness. More localities need verified station mappings.

## YouTube

Matching saved searches are case-insensitive, deduplicated, and capped at five.
The whole suggestion dropdown also never exceeds five entries. Empty input
displays none.

Choose **Playlists (auto-next)** before searching, then choose a real YouTube
playlist. Playback follows its playlistItems order; additional pages come from
that same playlist, not repeated searches for the first song. Videos that are
private/deleted or not embeddable are excluded. Duplicate video IDs and normalized
song titles (official/audio/lyrics/cover variants) are skipped. Normalization is
title-based, not audio fingerprinting. The playlist stops at its end; it does
not wrap to the first track or fabricate an unlimited playlist.

A standalone video has no unique playlist available through the YouTube Data
API. Song-only search plays the selected video; choose a playlist for auto-next.
Search and playlist endpoints require the existing server-side YOUTUBE_API_KEY.
No new account credentials or private playlist access is required.

## Verification and activation

```powershell
node --test src/lib/musicQueue.test.ts server/youtubePlaylists.test.ts server/pagasaForecast.test.ts
npx.cmd tsc --noEmit
npm.cmd run build
```

Backend routes were added. A running `tsx server.ts` process without a watcher
needs one restart, even though Vite automatically updates frontend edits.
Render also needs deployment of these files. No keys should be committed.
