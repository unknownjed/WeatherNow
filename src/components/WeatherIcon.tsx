import React from 'react';

interface WeatherIconProps {
  code: number;
  isDay?: number; // 1 for day, 0 for night
  className?: string;
  size?: number | string;
}

export const WeatherIcon: React.FC<WeatherIconProps> = ({
  code,
  isDay = 1,
  className = "w-6 h-6",
  size,
}) => {
  const isNight = Number(isDay) === 0;
  const style = size ? { width: typeof size === 'number' ? `${size}px` : size, height: typeof size === 'number' ? `${size}px` : size } : undefined;

  // Embedded self-contained styles for 100% reliable SVG animations in all browsers
  const animationStyles = (
    <style>{`
      @keyframes icon-spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      @keyframes icon-pulse {
        0%, 100% { transform: scale(1); opacity: 0.95; }
        50% { transform: scale(1.12); opacity: 1; filter: drop-shadow(0 0 6px rgba(245, 158, 11, 0.8)); }
      }
      @keyframes icon-float {
        0%, 100% { transform: translateY(0px) translateX(0px); }
        50% { transform: translateY(-3px) translateX(2px); }
      }
      @keyframes icon-drift {
        0%, 100% { transform: translateX(-3px); }
        50% { transform: translateX(3px); }
      }
      @keyframes icon-moon {
        0%, 100% { transform: rotate(-6deg); }
        50% { transform: rotate(6deg); }
      }
      @keyframes icon-star {
        0%, 100% { opacity: 0.2; transform: scale(0.6); }
        50% { opacity: 1; transform: scale(1.4); }
      }
      @keyframes icon-rain {
        0% { transform: translateY(-6px); opacity: 0; }
        30% { opacity: 1; }
        80% { opacity: 1; }
        100% { transform: translateY(12px); opacity: 0; }
      }
      @keyframes icon-snow {
        0% { transform: translateY(-6px) rotate(0deg); opacity: 0; }
        25% { opacity: 1; }
        75% { opacity: 1; }
        100% { transform: translateY(14px) rotate(360deg); opacity: 0; }
      }
      @keyframes icon-lightning {
        0%, 100% { opacity: 0; transform: scale(0.9); }
        8%, 22% { opacity: 1; transform: scale(1.15); filter: drop-shadow(0 0 8px #facc15); }
        12% { opacity: 0.2; }
        28% { opacity: 0; }
      }
      @keyframes icon-fog {
        0%, 100% { transform: translateX(-4px); opacity: 0.5; }
        50% { transform: translateX(4px); opacity: 0.9; }
      }
      .w-sun-spin { transform-origin: 32px 32px; animation: icon-spin 12s linear infinite; }
      .w-sun-pulse { transform-origin: 32px 32px; animation: icon-pulse 2.8s ease-in-out infinite; }
      .w-cloud-float { animation: icon-float 3.5s ease-in-out infinite; }
      .w-cloud-drift { animation: icon-drift 4.5s ease-in-out infinite; }
      .w-moon-rock { transform-origin: 32px 32px; animation: icon-moon 3.5s ease-in-out infinite; }
      .w-star-1 { transform-origin: 48px 16px; animation: icon-star 2s ease-in-out infinite; }
      .w-star-2 { transform-origin: 20px 18px; animation: icon-star 2.5s ease-in-out infinite 0.7s; }
      .w-rain-1 { animation: icon-rain 0.8s linear infinite; }
      .w-rain-2 { animation: icon-rain 0.8s linear infinite 0.25s; }
      .w-rain-3 { animation: icon-rain 0.8s linear infinite 0.5s; }
      .w-snow-1 { transform-origin: 22px 43px; animation: icon-snow 2.2s ease-in-out infinite; }
      .w-snow-2 { transform-origin: 33px 43px; animation: icon-snow 2.6s ease-in-out infinite 0.8s; }
      .w-snow-3 { transform-origin: 43px 43px; animation: icon-snow 2s ease-in-out infinite 1.4s; }
      .w-lightning { transform-origin: 32px 47px; animation: icon-lightning 2.2s ease-in-out infinite; }
      .w-fog-1 { animation: icon-fog 3.5s ease-in-out infinite; }
      .w-fog-2 { animation: icon-fog 4s ease-in-out infinite 0.6s; }
    `}</style>
  );

  // 0, 1: Clear Sky / Mainly Clear
  if (code === 0 || code === 1) {
    if (isNight) {
      return (
        <svg viewBox="0 0 64 64" className={`inline-block select-none overflow-visible ${className}`} style={style}>
          {animationStyles}
          <path
            d="M36 12a18 18 0 1 0 16 26 18 18 0 0 1-16-26z"
            fill="#facc15"
            className="w-moon-rock"
          />
          <circle cx="48" cy="16" r="2.5" fill="#ffffff" className="w-star-1" />
          <circle cx="20" cy="18" r="2" fill="#93c5fd" className="w-star-2" />
        </svg>
      );
    }

    return (
      <svg viewBox="0 0 64 64" className={`inline-block select-none overflow-visible ${className}`} style={style}>
        {animationStyles}
        <defs>
          <linearGradient id="sunGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="50%" stopColor="#facc15" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
        </defs>
        {/* Rotating Sun Rays */}
        <g className="w-sun-spin" stroke="#f59e0b" strokeWidth="3.5" strokeLinecap="round">
          <line x1="32" y1="7" x2="32" y2="13" />
          <line x1="32" y1="51" x2="32" y2="57" />
          <line x1="7" y1="32" x2="13" y2="32" />
          <line x1="51" y1="32" x2="57" y2="32" />
          <line x1="14.3" y1="14.3" x2="18.5" y2="18.5" />
          <line x1="45.5" y1="45.5" x2="49.7" y2="49.7" />
          <line x1="14.3" y1="49.7" x2="18.5" y2="45.5" />
          <line x1="45.5" y1="18.5" x2="49.7" y2="14.3" />
        </g>
        {/* Pulsing Sun Body */}
        <circle cx="32" cy="32" r="14" fill="url(#sunGradient)" className="w-sun-pulse" />
      </svg>
    );
  }

  // 2: Partly Cloudy
  if (code === 2) {
    return (
      <svg viewBox="0 0 64 64" className={`inline-block select-none overflow-visible ${className}`} style={style}>
        {animationStyles}
        <defs>
          <linearGradient id="partlySun" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
          <linearGradient id="partlyCloud" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#cbd5e1" />
          </linearGradient>
        </defs>

        {!isNight ? (
          <g className="w-sun-pulse" style={{ transformOrigin: "42px 22px" }}>
            <circle cx="42" cy="22" r="11" fill="url(#partlySun)" />
            <g stroke="#f59e0b" strokeWidth="2.6" strokeLinecap="round" className="w-sun-spin" style={{ transformOrigin: "42px 22px" }}>
              <line x1="42" y1="7" x2="42" y2="10" />
              <line x1="54" y1="14" x2="57" y2="12" />
              <line x1="57" y1="22" x2="60" y2="22" />
              <line x1="53" y1="31" x2="56" y2="33" />
            </g>
          </g>
        ) : (
          <path
            d="M42 12a11 11 0 1 0 9 16 11 11 0 0 1-9-16z"
            fill="#facc15"
            className="w-moon-rock"
            style={{ transformOrigin: "42px 22px" }}
          />
        )}

        {/* Floating animated Cloud */}
        <path
          d="M17 48h28a10 10 0 0 0 2-19.8 13 13 0 0 0-23.8-3.6A9.5 9.5 0 0 0 17 48z"
          fill="url(#partlyCloud)"
          className="w-cloud-float"
        />
      </svg>
    );
  }

  // 3: Overcast / Cloudy
  if (code === 3) {
    return (
      <svg viewBox="0 0 64 64" className={`inline-block select-none overflow-visible ${className}`} style={style}>
        {animationStyles}
        <defs>
          <linearGradient id="cloudDark" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#64748b" />
          </linearGradient>
          <linearGradient id="cloudLight" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#94a3b8" />
          </linearGradient>
        </defs>
        {/* Back Cloud drifting */}
        <path
          d="M26 38h24a8 8 0 0 0 1.5-15.8 11 11 0 0 0-20-2.8A7.5 7.5 0 0 0 26 38z"
          fill="url(#cloudDark)"
          className="w-cloud-drift"
        />
        {/* Front Cloud floating */}
        <path
          d="M15 48h30a10 10 0 0 0 2-19.8 13 13 0 0 0-24-3.6A9.5 9.5 0 0 0 15 48z"
          fill="url(#cloudLight)"
          className="w-cloud-float"
        />
      </svg>
    );
  }

  // 45, 48: Fog / Mist
  if (code === 45 || code === 48) {
    return (
      <svg viewBox="0 0 64 64" className={`inline-block select-none overflow-visible ${className}`} style={style}>
        {animationStyles}
        <path
          d="M18 36h28a8 8 0 0 0 1.5-15.8 11 11 0 0 0-20-2.8A7.5 7.5 0 0 0 18 36z"
          fill="#94a3b8"
          opacity="0.85"
          className="w-cloud-float"
        />
        <line x1="12" y1="42" x2="48" y2="42" stroke="#cbd5e1" strokeWidth="3.5" strokeLinecap="round" className="w-fog-1" />
        <line x1="18" y1="49" x2="54" y2="49" stroke="#94a3b8" strokeWidth="3.5" strokeLinecap="round" className="w-fog-2" />
        <line x1="14" y1="56" x2="44" y2="56" stroke="#cbd5e1" strokeWidth="3" strokeLinecap="round" className="w-fog-1" />
      </svg>
    );
  }

  // 51-57, 61-67, 80-82: Drizzle & Rain
  if (
    [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)
  ) {
    const isHeavy = code === 65 || code === 82;
    return (
      <svg viewBox="0 0 64 64" className={`inline-block select-none overflow-visible ${className}`} style={style}>
        {animationStyles}
        <defs>
          <linearGradient id="rainCloudGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#475569" />
          </linearGradient>
        </defs>
        <path
          d="M16 38h32a9 9 0 0 0 2-17.8 12 12 0 0 0-22-3.4A8.5 8.5 0 0 0 16 38z"
          fill="url(#rainCloudGrad)"
          className="w-cloud-float"
        />
        <g stroke="#38bdf8" strokeWidth={isHeavy ? "3.2" : "2.6"} strokeLinecap="round">
          <line x1="22" y1="43" x2="19" y2="51" className="w-rain-1" />
          <line x1="32" y1="43" x2="29" y2="52" className="w-rain-2" />
          <line x1="42" y1="43" x2="39" y2="51" className="w-rain-3" />
        </g>
      </svg>
    );
  }

  // 71-77, 85-86: Snow
  if ([71, 73, 75, 77, 85, 86].includes(code)) {
    return (
      <svg viewBox="0 0 64 64" className={`inline-block select-none overflow-visible ${className}`} style={style}>
        {animationStyles}
        <defs>
          <linearGradient id="snowCloudGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#e2e8f0" />
            <stop offset="100%" stopColor="#94a3b8" />
          </linearGradient>
        </defs>
        <path
          d="M16 36h32a9 9 0 0 0 2-17.8 12 12 0 0 0-22-3.4A8.5 8.5 0 0 0 16 36z"
          fill="url(#snowCloudGrad)"
          className="w-cloud-float"
        />
        <g className="w-snow-1" stroke="#bae6fd" strokeWidth="2" strokeLinecap="round">
          <line x1="22" y1="40" x2="22" y2="46" />
          <line x1="19" y1="43" x2="25" y2="43" />
        </g>
        <g className="w-snow-2" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round">
          <line x1="33" y1="39" x2="33" y2="47" />
          <line x1="29" y1="43" x2="37" y2="43" />
        </g>
        <g className="w-snow-3" stroke="#bae6fd" strokeWidth="2" strokeLinecap="round">
          <line x1="43" y1="40" x2="43" y2="46" />
          <line x1="40" y1="43" x2="46" y2="43" />
        </g>
      </svg>
    );
  }

  // 95-99: Thunderstorm
  if ([95, 96, 99].includes(code)) {
    return (
      <svg viewBox="0 0 64 64" className={`inline-block select-none overflow-visible ${className}`} style={style}>
        {animationStyles}
        <defs>
          <linearGradient id="thunderCloudGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#475569" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>
        </defs>
        <path
          d="M16 36h32a9 9 0 0 0 2-17.8 12 12 0 0 0-22-3.4A8.5 8.5 0 0 0 16 36z"
          fill="url(#thunderCloudGrad)"
          className="w-cloud-float"
        />
        <polygon
          points="33,35 24,47 31,47 27,60 41,44 33,44"
          fill="#facc15"
          className="w-lightning"
        />
        <g stroke="#38bdf8" strokeWidth="2.4" strokeLinecap="round">
          <line x1="18" y1="44" x2="15" y2="52" className="w-rain-2" />
          <line x1="46" y1="44" x2="43" y2="52" className="w-rain-3" />
        </g>
      </svg>
    );
  }

  // Fallback (Sun / Day)
  return (
    <svg viewBox="0 0 64 64" className={`inline-block select-none overflow-visible ${className}`} style={style}>
      {animationStyles}
      <circle cx="32" cy="32" r="14" fill="#f59e0b" className="w-sun-pulse" />
    </svg>
  );
};
