import React from 'react';

interface AnimatedWeatherIconProps {
  code: number;
  isDay?: number;
  className?: string;
  size?: number | string;
}

export const AnimatedWeatherIcon: React.FC<AnimatedWeatherIconProps> = ({
  code,
  isDay = 1,
  className = 'w-8 h-8',
  size,
}) => {
  const isNight = Number(isDay) === 0;
  const styleProp: React.CSSProperties = size
    ? { width: typeof size === 'number' ? `${size}px` : size, height: typeof size === 'number' ? `${size}px` : size }
    : {};

  // Common SVG animation styles embedded directly into the SVG
  const animationStyles = `
    @keyframes wn-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    @keyframes wn-sun-pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.12); }
    }
    @keyframes wn-cloud-float-1 {
      0%, 100% { transform: translate(0px, 0px); }
      50% { transform: translate(5px, -3px); }
    }
    @keyframes wn-cloud-float-2 {
      0%, 100% { transform: translate(0px, 0px); }
      50% { transform: translate(-5px, -2px); }
    }
    @keyframes wn-moon-rock {
      0%, 100% { transform: rotate(-8deg); }
      50% { transform: rotate(8deg); }
    }
    @keyframes wn-star-twinkle {
      0%, 100% { opacity: 0.2; transform: scale(0.6); }
      50% { opacity: 1; transform: scale(1.3); }
    }
    @keyframes wn-rain-fall {
      0% { transform: translateY(-8px); opacity: 0; }
      20% { opacity: 1; }
      80% { opacity: 1; }
      100% { transform: translateY(16px); opacity: 0; }
    }
    @keyframes wn-snow-flutter {
      0% { transform: translateY(-6px) rotate(0deg); opacity: 0; }
      25% { opacity: 1; }
      80% { opacity: 1; }
      100% { transform: translateY(16px) rotate(360deg); opacity: 0; }
    }
    @keyframes wn-lightning {
      0%, 100% { opacity: 0; transform: scale(0.9); }
      10%, 30% { opacity: 1; transform: scale(1.15); filter: drop-shadow(0 0 6px #fde047); }
      20% { opacity: 0.2; }
      35% { opacity: 0; }
    }
    @keyframes wn-storm-glow {
      0%, 100% { filter: drop-shadow(0 0 0px transparent); }
      15%, 28% { filter: drop-shadow(0 0 8px rgba(250, 204, 21, 0.9)); }
    }
    @keyframes wn-mist-1 {
      0%, 100% { transform: translateX(-6px); opacity: 0.5; }
      50% { transform: translateX(6px); opacity: 0.95; }
    }
    @keyframes wn-mist-2 {
      0%, 100% { transform: translateX(6px); opacity: 0.9; }
      50% { transform: translateX(-6px); opacity: 0.4; }
    }

    .wn-anim-spin {
      transform-origin: 32px 32px;
      animation: wn-spin 12s linear infinite;
    }
    .wn-anim-spin-corner {
      transform-origin: 40px 22px;
      animation: wn-spin 10s linear infinite;
    }
    .wn-anim-sun-pulse {
      transform-origin: 32px 32px;
      animation: wn-sun-pulse 2.8s ease-in-out infinite;
    }
    .wn-anim-sun-pulse-corner {
      transform-origin: 40px 22px;
      animation: wn-sun-pulse 2.8s ease-in-out infinite;
    }
    .wn-anim-cloud-1 {
      animation: wn-cloud-float-1 3.5s ease-in-out infinite;
    }
    .wn-anim-cloud-2 {
      animation: wn-cloud-float-2 4.2s ease-in-out infinite;
    }
    .wn-anim-moon {
      transform-origin: 32px 32px;
      animation: wn-moon-rock 4.5s ease-in-out infinite;
    }
    .wn-anim-moon-corner {
      transform-origin: 40px 22px;
      animation: wn-moon-rock 4.5s ease-in-out infinite;
    }
    .wn-anim-star-1 {
      transform-origin: 48px 16px;
      animation: wn-star-twinkle 2s ease-in-out infinite;
    }
    .wn-anim-star-2 {
      transform-origin: 18px 20px;
      animation: wn-star-twinkle 2.4s ease-in-out infinite 0.8s;
    }
    .wn-anim-rain-1 {
      animation: wn-rain-fall 0.85s linear infinite;
    }
    .wn-anim-rain-2 {
      animation: wn-rain-fall 0.85s linear infinite 0.28s;
    }
    .wn-anim-rain-3 {
      animation: wn-rain-fall 0.85s linear infinite 0.56s;
    }
    .wn-anim-snow-1 {
      transform-origin: 22px 43px;
      animation: wn-snow-flutter 2.4s ease-in-out infinite;
    }
    .wn-anim-snow-2 {
      transform-origin: 33px 43px;
      animation: wn-snow-flutter 2.8s ease-in-out infinite 0.8s;
    }
    .wn-anim-snow-3 {
      transform-origin: 43px 43px;
      animation: wn-snow-flutter 2.2s ease-in-out infinite 1.5s;
    }
    .wn-anim-lightning {
      transform-origin: 32px 48px;
      animation: wn-lightning 2.4s ease-in-out infinite;
    }
    .wn-anim-storm {
      animation: wn-storm-glow 2.4s ease-in-out infinite;
    }
    .wn-anim-mist-1 {
      animation: wn-mist-1 3.2s ease-in-out infinite;
    }
    .wn-anim-mist-2 {
      animation: wn-mist-2 3.8s ease-in-out infinite;
    }
  `;

  // 0: Clear sky
  if (code === 0) {
    if (isNight) {
      return (
        <svg viewBox="0 0 64 64" className={`inline-block select-none overflow-visible ${className}`} style={styleProp}>
          <style>{animationStyles}</style>
          {/* Moon */}
          <path
            d="M36 12a18 18 0 1 0 16 26 18 18 0 0 1-16-26z"
            fill="#facc15"
            className="wn-anim-moon"
          />
          {/* Twinkling stars */}
          <circle cx="48" cy="16" r="2.5" fill="#ffffff" className="wn-anim-star-1" />
          <circle cx="18" cy="20" r="2" fill="#93c5fd" className="wn-anim-star-2" />
        </svg>
      );
    }

    return (
      <svg viewBox="0 0 64 64" className={`inline-block select-none overflow-visible ${className}`} style={styleProp}>
        <style>{animationStyles}</style>
        <defs>
          <linearGradient id="sunGradMain" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="60%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#ea580c" />
          </linearGradient>
        </defs>
        {/* Rotating Sun Rays */}
        <g className="wn-anim-spin" stroke="#f59e0b" strokeWidth="3.5" strokeLinecap="round">
          <line x1="32" y1="6" x2="32" y2="13" />
          <line x1="32" y1="51" x2="32" y2="58" />
          <line x1="6" y1="32" x2="13" y2="32" />
          <line x1="51" y1="32" x2="58" y2="32" />
          <line x1="13.5" y1="13.5" x2="18.5" y2="18.5" />
          <line x1="45.5" y1="45.5" x2="50.5" y2="50.5" />
          <line x1="13.5" y1="50.5" x2="18.5" y2="45.5" />
          <line x1="45.5" y1="18.5" x2="50.5" y2="13.5" />
        </g>
        {/* Pulsing Sun Body */}
        <circle cx="32" cy="32" r="14.5" fill="url(#sunGradMain)" className="wn-anim-sun-pulse" />
      </svg>
    );
  }

  // 1, 2: Mainly clear, partly cloudy
  if (code === 1 || code === 2) {
    return (
      <svg viewBox="0 0 64 64" className={`inline-block select-none overflow-visible ${className}`} style={styleProp}>
        <style>{animationStyles}</style>
        <defs>
          <linearGradient id="sunCornerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
          <linearGradient id="cloudPartGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#cbd5e1" />
          </linearGradient>
        </defs>

        {!isNight ? (
          <g>
            <g className="wn-anim-spin-corner" stroke="#f59e0b" strokeWidth="2.8" strokeLinecap="round">
              <line x1="40" y1="8" x2="40" y2="12" />
              <line x1="52" y1="14" x2="55" y2="12" />
              <line x1="56" y1="22" x2="60" y2="22" />
              <line x1="52" y1="31" x2="55" y2="33" />
            </g>
            <circle cx="40" cy="22" r="11" fill="url(#sunCornerGrad)" className="wn-anim-sun-pulse-corner" />
          </g>
        ) : (
          <path
            d="M40 12a12 12 0 1 0 11 17 12 12 0 0 1-11-17z"
            fill="#facc15"
            className="wn-anim-moon-corner"
          />
        )}

        {/* Floating animated Cloud in front */}
        <path
          d="M17 48h28a10 10 0 0 0 2-19.8 13 13 0 0 0-23.8-3.6A9.5 9.5 0 0 0 17 48z"
          fill="url(#cloudPartGrad)"
          className="wn-anim-cloud-1"
        />
      </svg>
    );
  }

  // 3: Overcast / Cloudy
  if (code === 3) {
    return (
      <svg viewBox="0 0 64 64" className={`inline-block select-none overflow-visible ${className}`} style={styleProp}>
        <style>{animationStyles}</style>
        <defs>
          <linearGradient id="cloudOvercastBack" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#64748b" />
          </linearGradient>
          <linearGradient id="cloudOvercastFront" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#94a3b8" />
          </linearGradient>
        </defs>
        {/* Back cloud */}
        <path
          d="M26 38h24a8 8 0 0 0 1.5-15.8 11 11 0 0 0-20-2.8A7.5 7.5 0 0 0 26 38z"
          fill="url(#cloudOvercastBack)"
          className="wn-anim-cloud-2"
        />
        {/* Front cloud */}
        <path
          d="M15 48h30a10 10 0 0 0 2-19.8 13 13 0 0 0-24-3.6A9.5 9.5 0 0 0 15 48z"
          fill="url(#cloudOvercastFront)"
          className="wn-anim-cloud-1"
        />
      </svg>
    );
  }

  // 45, 48: Fog / Mist
  if (code === 45 || code === 48) {
    return (
      <svg viewBox="0 0 64 64" className={`inline-block select-none overflow-visible ${className}`} style={styleProp}>
        <style>{animationStyles}</style>
        <path
          d="M18 34h28a8 8 0 0 0 1.5-15.8 11 11 0 0 0-20-2.8A7.5 7.5 0 0 0 18 34z"
          fill="#94a3b8"
          opacity="0.85"
          className="wn-anim-cloud-1"
        />
        <line x1="12" y1="41" x2="48" y2="41" stroke="#cbd5e1" strokeWidth="3.5" strokeLinecap="round" className="wn-anim-mist-1" />
        <line x1="18" y1="48" x2="54" y2="48" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" className="wn-anim-mist-2" />
        <line x1="14" y1="54" x2="44" y2="54" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" className="wn-anim-mist-1" />
      </svg>
    );
  }

  // 51-57, 61-67, 80-82: Drizzle & Rain
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
    const isHeavy = code === 65 || code === 82;
    return (
      <svg viewBox="0 0 64 64" className={`inline-block select-none overflow-visible ${className}`} style={styleProp}>
        <style>{animationStyles}</style>
        <defs>
          <linearGradient id="cloudRainGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#475569" />
          </linearGradient>
        </defs>
        <path
          d="M16 38h32a9 9 0 0 0 2-17.8 12 12 0 0 0-22-3.4A8.5 8.5 0 0 0 16 38z"
          fill="url(#cloudRainGrad)"
          className="wn-anim-cloud-1"
        />
        {/* Animated Rain Drops */}
        <g stroke="#38bdf8" strokeWidth={isHeavy ? "3.2" : "2.6"} strokeLinecap="round">
          <line x1="22" y1="43" x2="19" y2="52" className="wn-anim-rain-1" />
          <line x1="32" y1="43" x2="29" y2="53" className="wn-anim-rain-2" />
          <line x1="42" y1="43" x2="39" y2="52" className="wn-anim-rain-3" />
        </g>
      </svg>
    );
  }

  // 71-77, 85-86: Snow
  if ([71, 73, 75, 77, 85, 86].includes(code)) {
    return (
      <svg viewBox="0 0 64 64" className={`inline-block select-none overflow-visible ${className}`} style={styleProp}>
        <style>{animationStyles}</style>
        <defs>
          <linearGradient id="cloudSnowGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#e2e8f0" />
            <stop offset="100%" stopColor="#94a3b8" />
          </linearGradient>
        </defs>
        <path
          d="M16 36h32a9 9 0 0 0 2-17.8 12 12 0 0 0-22-3.4A8.5 8.5 0 0 0 16 36z"
          fill="url(#cloudSnowGrad)"
          className="wn-anim-cloud-1"
        />
        {/* Spinning Fluttering Snowflakes */}
        <g className="wn-anim-snow-1" stroke="#bae6fd" strokeWidth="2" strokeLinecap="round">
          <line x1="22" y1="40" x2="22" y2="46" />
          <line x1="19" y1="43" x2="25" y2="43" />
        </g>
        <g className="wn-anim-snow-2" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round">
          <line x1="33" y1="39" x2="33" y2="47" />
          <line x1="29" y1="43" x2="37" y2="43" />
        </g>
        <g className="wn-anim-snow-3" stroke="#bae6fd" strokeWidth="2" strokeLinecap="round">
          <line x1="43" y1="40" x2="43" y2="46" />
          <line x1="40" y1="43" x2="46" y2="43" />
        </g>
      </svg>
    );
  }

  // 95, 96, 99: Thunderstorm
  if ([95, 96, 99].includes(code)) {
    return (
      <svg viewBox="0 0 64 64" className={`inline-block select-none overflow-visible ${className}`} style={styleProp}>
        <style>{animationStyles}</style>
        <defs>
          <linearGradient id="cloudStormGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#475569" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>
        </defs>
        <path
          d="M16 36h32a9 9 0 0 0 2-17.8 12 12 0 0 0-22-3.4A8.5 8.5 0 0 0 16 36z"
          fill="url(#cloudStormGrad)"
          className="wn-anim-storm"
        />
        {/* Flashing Lightning */}
        <polygon
          points="33,35 24,47 31,47 27,60 41,44 33,44"
          fill="#facc15"
          className="wn-anim-lightning"
        />
        {/* Storm rain streaks */}
        <g stroke="#38bdf8" strokeWidth="2.4" strokeLinecap="round">
          <line x1="18" y1="44" x2="15" y2="53" className="wn-anim-rain-2" />
          <line x1="46" y1="44" x2="43" y2="53" className="wn-anim-rain-3" />
        </g>
      </svg>
    );
  }

  // Fallback
  return (
    <svg viewBox="0 0 64 64" className={`inline-block select-none overflow-visible ${className}`} style={styleProp}>
      <style>{animationStyles}</style>
      <circle cx="32" cy="32" r="14" fill="#f59e0b" className="wn-anim-sun-pulse" />
    </svg>
  );
};
