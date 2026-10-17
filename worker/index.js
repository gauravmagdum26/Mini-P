// Cloudflare Worker: serves the built React app (static assets binding) and
// reverse-proxies /api/* to the Node/Express origin so the browser only ever
// talks to ONE origin. That keeps the SameSite=Strict auth cookie working
// and removes the need for CORS in production.
//
// Static assets are served directly by Cloudflare (see wrangler.jsonc ->
// assets.run_worker_first), so this code only runs for API traffic.

const HOP_BY_HOP = ['connection', 'keep-alive', 'transfer-encoding', 'upgrade', 'proxy-authorization', 'te', 'trailer'];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (!env.ORIGIN_URL) {
      return json({ success: false, error: 'API origin is not configured' }, 500);
    }

    const target = new URL(url.pathname + url.search, env.ORIGIN_URL);

    const headers = new Headers(request.headers);
    for (const h of HOP_BY_HOP) headers.delete(h);

    // Overwrite (never append) so clients cannot spoof their IP for rate limiting
    const clientIp = request.headers.get('cf-connecting-ip');
    if (clientIp) headers.set('x-forwarded-for', clientIp);
    headers.set('x-forwarded-host', url.host);
    headers.set('x-forwarded-proto', 'https');

    // Shared secret: the origin rejects requests that don't carry it,
    // so nobody can bypass Cloudflare (WAF, rate limits) by hitting it directly.
    if (env.ORIGIN_SECRET) headers.set('x-origin-verify', env.ORIGIN_SECRET);

    try {
      const upstream = await fetch(
        new Request(target, {
          method: request.method,
          headers,
          body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
          redirect: 'manual',
        })
      );

      const response = new Response(upstream.body, upstream);
      // API responses are per-user (cookie auth): never let shared caches store them
      response.headers.set('Cache-Control', 'private, no-store');
      return response;
    } catch (err) {
      console.error('Origin fetch failed', err);
      return json({ success: false, error: 'Service temporarily unavailable' }, 502);
    }
  },
};

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}
