import React from 'react';

interface AppLogoProps {
  className?: string;
  size?: number;
}

export const AppLogo: React.FC<AppLogoProps> = ({ className = "w-8 h-8", size = 32 }) => {
  return (
    <img
      src="/icon-192x192.png"
      alt="WeatherNow"
      width={size}
      height={size}
      className={`block flex-none rounded-xl shadow-lg shadow-blue-500/25 ${className}`}
      style={{ width: size, height: size }}
      draggable={false}
    />
  );
};