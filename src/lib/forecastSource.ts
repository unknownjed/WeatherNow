export function isPhilippineLocation(country: string): boolean {
  return ['ph', 'phl', 'philippines', 'the philippines'].includes(country.trim().toLowerCase());
}

export function applyDailyForecast(base: any, country: string, pagasa: any) {
  if (!isPhilippineLocation(country)) return base;

  // PAGASA city outlooks are published for representative cities and can be
  // tens of kilometres from the user's GPS point. For Philippine locations,
  // show that official outlook when it is complete and current. The
  // coordinate-specific model remains the explicitly labelled fallback.
  const pagasaCurrentAvailable = pagasa?.current_source?.provider === 'PAGASA' && pagasa?.current_source?.available;
  const pagasaDailyAvailable = pagasa?.daily_source?.provider === 'PAGASA' && pagasa?.daily_source?.available;
  const pagasaCurrent = pagasaCurrentAvailable ? pagasa.current : null;
  const baseCurrent = base.current;

  // PAGASA is the primary Philippine source. Use a recent PAGASA station for
  // observed temperature/humidity/wind, and use today's official PAGASA city
  // outlook for the displayed sky-condition code when available. Open-Meteo is
  // retained only for fields PAGASA does not publish here (for example feels-like).
  const current = pagasaCurrentAvailable && baseCurrent ? {
    ...baseCurrent,
    temperature_2m: Number.isFinite(pagasaCurrent?.temperature_2m) ? pagasaCurrent.temperature_2m : baseCurrent.temperature_2m,
    relative_humidity_2m: Number.isFinite(pagasaCurrent?.relative_humidity_2m) ? pagasaCurrent.relative_humidity_2m : baseCurrent.relative_humidity_2m,
    wind_speed_10m: Number.isFinite(pagasaCurrent?.wind_speed_10m) ? pagasaCurrent.wind_speed_10m : baseCurrent.wind_speed_10m,
    // PAGASA's city outlook describes a broad daily area, not the sky at the
    // user's exact coordinate right now. Keep the exact-coordinate model for
    // current sky/precipitation while using PAGASA for recent observations.
    weather_code: baseCurrent.weather_code,
    weather_description: baseCurrent.weather_description,
  } : (pagasaCurrentAvailable ? pagasaCurrent : baseCurrent);

  const currentSource = pagasaCurrentAvailable
    ? {
        provider: 'PAGASA',
        available: true,
        station: pagasa?.current_source?.station,
        observedAt: pagasa?.current_source?.observedAt,
        city: pagasa?.daily_source?.city,
        url: pagasa?.current_source?.url || pagasa?.daily_source?.url,
        note: `${pagasa.current_source.note || 'PAGASA station observation used.'} Current sky, precipitation and feels-like use the exact-coordinate model because the station table does not publish those fields.`,
      }
    : { provider: 'Open-Meteo', available: Boolean(baseCurrent), fallback: true, note: 'PAGASA current sources are unavailable; coordinate-specific Open-Meteo data is being used as fallback.' };
  const daily = pagasaDailyAvailable
    ? { ...(base.daily || {}), ...pagasa.daily }
    : base.daily;
  const dailySource = pagasaDailyAvailable
    ? pagasa.daily_source
    : {
        provider: 'Open-Meteo',
        available: Boolean(base.daily),
        coordinateSpecific: true,
        fallback: true,
        note: 'PAGASA has no complete current five-day city outlook for this location; Open-Meteo is being used as fallback.',
      };
  return {
    ...base,
    hourly_current: base.current,
    current,
    current_source: currentSource,
    daily,
    daily_source: dailySource,
    pagasa_daily_reference: pagasaDailyAvailable ? { daily: pagasa.daily, source: pagasa.daily_source } : null,
  };
}
