export function siteOrigin(req: Request) {
  if (process.env.APP_URL) return process.env.APP_URL.trim().replace(/\/$/, '');

  const h = req.headers;
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}