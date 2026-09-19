import type { Request, Response } from 'express';
import { createApp } from '../server';

const appPromise = createApp();

export default async function handler(req: Request, res: Response) {
  const app = await appPromise;

  // For a Vercel rewrite such as /api/:path* -> /api/index,
  // Vercel forwards the captured :path* value as the `path` query parameter.
  // Rebuild the original WeatherNow Express URL before handing off to Express.
  const rawPath = req.query?.path;
  const capturedPath = Array.isArray(rawPath) ? rawPath.join('/') : rawPath;

  if (typeof capturedPath === 'string' && capturedPath.length > 0) {
    const query = new URLSearchParams();

    for (const [key, value] of Object.entries(req.query || {})) {
      if (key === 'path' || value == null) continue;
      if (Array.isArray(value)) {
        for (const item of value) query.append(key, String(item));
      } else {
        query.append(key, String(value));
      }
    }

    const queryString = query.toString();
    req.url = `/api/${capturedPath}${queryString ? `?${queryString}` : ''}`;
  }

  return app(req, res);
}
