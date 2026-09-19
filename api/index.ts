import type { Request, Response } from 'express';
import { createApp } from '../server';

const appPromise = createApp();

export default async function handler(req: Request, res: Response) {
  const app = await appPromise;

  // Vercel rewrites all backend requests to /api/index. Preserve the original
  // WeatherNow Express path in __path, then restore it before Express handles it.
  const incomingUrl = new URL(req.url || '/api/index', 'http://localhost');
  const originalPath = incomingUrl.searchParams.get('__path');

  if (originalPath) {
    incomingUrl.searchParams.delete('__path');
    const query = incomingUrl.searchParams.toString();
    req.url = `${originalPath}${query ? `?${query}` : ''}`;
  }

  return app(req, res);
}
