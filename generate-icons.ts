import fs from 'fs';
import { PNG } from 'pngjs';

function createIcon(size: number, isMaskable = false): Buffer {
  const png = new PNG({ width: size, height: size });
  const radius = isMaskable ? 0 : Math.round(size * 0.22); // Rounded corner radius
  const cx = size / 2;
  const cy = size / 2;

  // Background colors: Indigo 600 gradient (#4f46e5 to #4338ca)
  const topColor = [79, 70, 229]; // #4f46e5
  const botColor = [67, 56, 202]; // #4338ca

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (size * y + x) << 2;
      
      // Calculate corner rounding for non-maskable icons
      let inBounds = true;
      if (!isMaskable) {
        let dx = 0;
        let dy = 0;
        if (x < radius) dx = radius - x;
        else if (x > size - radius - 1) dx = x - (size - radius - 1);
        if (y < radius) dy = radius - y;
        else if (y > size - radius - 1) dy = y - (size - radius - 1);

        if (dx > 0 && dy > 0) {
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > radius) {
            inBounds = false;
          }
        }
      }

      if (!inBounds) {
        png.data[idx] = 0;
        png.data[idx + 1] = 0;
        png.data[idx + 2] = 0;
        png.data[idx + 3] = 0; // transparent
        continue;
      }

      // Vertical gradient factor
      const factor = y / size;
      const r = Math.round(topColor[0] + (botColor[0] - topColor[0]) * factor);
      const g = Math.round(topColor[1] + (botColor[1] - topColor[1]) * factor);
      const b = Math.round(topColor[2] + (botColor[2] - topColor[2]) * factor);

      png.data[idx] = r;
      png.data[idx + 1] = g;
      png.data[idx + 2] = b;
      png.data[idx + 3] = 255;
    }
  }

  // Draw crisp bold "W" matching dashboard logo
  // Letter "W" coordinates relative to icon size
  // Proportions: center area (scale 0.55 of size)
  const scale = isMaskable ? size * 0.45 : size * 0.54;
  const strokeW = Math.max(2, Math.round(size * 0.085));

  // The 5 key vertices of W:
  // p0: top-left, p1: bottom-left, p2: middle-top, p3: bottom-right, p4: top-right
  const halfW = scale * 0.48;
  const halfH = scale * 0.42;
  const yOffset = size * 0.01; // slight optical centering

  const p0 = { x: cx - halfW, y: cy - halfH + yOffset };
  const p1 = { x: cx - halfW * 0.52, y: cy + halfH + yOffset };
  const p2 = { x: cx, y: cy - halfH * 0.15 + yOffset };
  const p3 = { x: cx + halfW * 0.52, y: cy + halfH + yOffset };
  const p4 = { x: cx + halfW, y: cy - halfH + yOffset };

  const segments = [
    [p0, p1],
    [p1, p2],
    [p2, p3],
    [p3, p4]
  ];

  function distToSegment(px: number, py: number, v: { x: number; y: number }, w: { x: number; y: number }) {
    const l2 = (w.x - v.x) ** 2 + (w.y - v.y) ** 2;
    if (l2 === 0) return Math.sqrt((px - v.x) ** 2 + (py - v.y) ** 2);
    let t = ((px - v.x) * (w.x - v.x) + (py - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    const projX = v.x + t * (w.x - v.x);
    const projY = v.y + t * (w.y - v.y);
    return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (size * y + x) << 2;
      if (png.data[idx + 3] === 0) continue;

      let minDist = Infinity;
      for (const [v, w] of segments) {
        const d = distToSegment(x, y, v, w);
        if (d < minDist) minDist = d;
      }

      const halfStroke = strokeW / 2;
      if (minDist <= halfStroke - 0.5) {
        // Pure crisp white #FFFFFF
        png.data[idx] = 255;
        png.data[idx + 1] = 255;
        png.data[idx + 2] = 255;
      } else if (minDist <= halfStroke + 0.8) {
        // Anti-aliasing edge blend
        const alpha = Math.max(0, Math.min(1, (halfStroke + 0.8 - minDist) / 1.3));
        const bgR = png.data[idx];
        const bgG = png.data[idx + 1];
        const bgB = png.data[idx + 2];
        png.data[idx] = Math.round(bgR * (1 - alpha) + 255 * alpha);
        png.data[idx + 1] = Math.round(bgG * (1 - alpha) + 255 * alpha);
        png.data[idx + 2] = Math.round(bgB * (1 - alpha) + 255 * alpha);
      }
    }
  }

  return PNG.sync.write(png);
}

// Generate all sizes
const sizes = [
  { name: 'public/icon-192x192.png', size: 192, maskable: false },
  { name: 'public/icon-512x512.png', size: 512, maskable: false },
  { name: 'public/icon-maskable-512x512.png', size: 512, maskable: true },
  { name: 'public/apple-touch-icon.png', size: 180, maskable: false },
  { name: 'public/favicon.png', size: 64, maskable: false },
];

for (const s of sizes) {
  const buf = createIcon(s.size, s.maskable);
  fs.writeFileSync(s.name, buf);
  console.log(`Generated ${s.name} (${s.size}x${s.size})`);
}

// Also create an SVG favicon for ultra-crisp browser tabs
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#4f46e5" />
      <stop offset="100%" stop-color="#4338ca" />
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="14" fill="url(#grad)" />
  <path d="M 14 18 L 22.5 46 L 32 30 L 41.5 46 L 50 18" fill="none" stroke="#ffffff" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round" />
</svg>`;

fs.writeFileSync('public/favicon.svg', svgContent);
console.log('Generated public/favicon.svg');
