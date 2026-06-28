import type { Request, Response, NextFunction } from 'express';

/** One structured JSON log line per request (quiet under NODE_ENV=test). */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  if (process.env.NODE_ENV === 'test') {
    next();
    return;
  }
  const start = Date.now();
  res.on('finish', () => {
    console.log(
      JSON.stringify({
        t: new Date().toISOString(),
        id: req.id,
        method: req.method,
        path: req.path,
        status: res.statusCode,
        ms: Date.now() - start,
      }),
    );
  });
  next();
}
