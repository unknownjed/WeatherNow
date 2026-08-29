import fs from 'fs';
import { Resvg } from '@resvg/resvg-js';

function getSvg(rx = 14, isMaskable = false) {
  const cornerRadius = isMaskable ? 0 : rx;
  return `<svg viewBox="0 0 64 64" width="64" height="64" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4f46e5" />
      <stop offset="50%" stop-color="#3b82f6" />
      <stop offset="100%" stop-color="#1e1b4b" />
    </linearGradient>
    <linearGradient id="sunGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fde047" />
      <stop offset="100%" stop-color="#f59e0b" />
    </linearGradient>
    <linearGradient id="cloudGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="100%" stop-color="#e2e8f0" />
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="1.5" flood-color="#0f172a" flood-opacity="0.3" />
    </filter>
  </defs>

  <!-- Background rounded badge -->
  <rect width="64" height="64" rx="${cornerRadius}" fill="url(#bgGrad)" />

  <!-- Sun behind cloud -->
  <circle cx="38" cy="24" r="11" fill="url(#sunGrad)" />
  <!-- Sun rays -->
  <path
    d="M38 9v3M38 36v3M23 24h3M50 24h3M27.4 13.4l2.1 2.1M46.5 32.5l2.1 2.1M27.4 34.6l2.1-2.1M46.5 15.5l2.1-2.1"
    stroke="#fde047"
    stroke-width="2.2"
    stroke-linecap="round"
    opacity="0.85"
  />

  <!-- Crisp Modern Cloud -->
  <g filter="url(#shadow)">
    <path
      d="M20 45h26a9 9 0 0 0 1.5-17.9 12 12 0 0 0-21.8-3.6A8.5 8.5 0 0 0 20 45z"
      fill="url(#cloudGrad)"
    />
  </g>
</svg>`;
}

// 1. Save favicon.svg
fs.writeFileSync('public/favicon.svg', getSvg(14, false));
console.log('Written public/favicon.svg');

// 2. Render high resolution PNGs
const sizes = [
  { path: 'public/favicon.png', size: 64, maskable: false },
  { path: 'public/apple-touch-icon.png', size: 180, maskable: false },
  { path: 'public/icon-192x192.png', size: 192, maskable: false },
  { path: 'public/icon-512x512.png', size: 512, maskable: false },
  { path: 'public/icon-maskable-512x512.png', size: 512, maskable: true }
];

for (const item of sizes) {
  const svg = getSvg(item.maskable ? 0 : 14, item.maskable);
  const resvg = new Resvg(svg, {
    fitTo: {
      mode: 'width',
      value: item.size
    }
  });
  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();
  fs.writeFileSync(item.path, pngBuffer);
  console.log(`Generated ${item.path} (${item.size}x${item.size})`);
}
