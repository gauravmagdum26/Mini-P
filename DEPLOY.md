# Production deployment (Cloudflare)

```
Browser ──► Cloudflare (Worker + static assets) ──/api/*──► Node API (Docker) ──► MongoDB Atlas
                 │ serves React build, security headers, WAF        └──► Cloudinary (images)
```

The React app is served from Cloudflare's edge. The Worker proxies only `/api/*`
to your Express server, so the browser sees one origin (cookie auth keeps working,
no CORS). Express and Mongoose rely on TCP, Mongo transactions and `$geoNear`,
so the API stays on a Node host rather than being rewritten for Workers.

## 1. Database: MongoDB Atlas
- Create a cluster (a replica set is required: order creation uses transactions;
  the free M0 supports them).
- Network access: allow your API host's egress IPs (avoid `0.0.0.0/0` if you can).
- Create a least-privilege DB user; copy the `mongodb+srv://` URI.
- Optional: `npm run seed --prefix server` once against the new DB (demo data only).
- Existing products: `npm run migrate:stock --prefix server`.

## 2. API: any Docker host (Render, Fly.io, Railway, a VPS)
- Build from `server/` using `server/Dockerfile`; health check path `/healthz`.
- Set the env vars from `server/.env.example`. Generate secrets with
  `openssl rand -hex 48` (JWT_SECRET) and `openssl rand -hex 32` (ORIGIN_SECRET).
- The server refuses to boot in production if required vars are missing.
- Note the public URL, e.g. `https://artisan-local-api.onrender.com`.

## 3. Cloudflare
1. `npm install` (installs Wrangler), then `npx wrangler login`.
2. Edit `wrangler.jsonc`: set `vars.ORIGIN_URL` to your API URL; add your domain
   under `routes` (domain's DNS must be on Cloudflare).
3. Set the shared secret (same value as the API's `ORIGIN_SECRET`):
   `npx wrangler secret put ORIGIN_SECRET`
4. Deploy: `npm run deploy`
5. Preview locally first: `npm run build && npm run preview:cf`

## 4. CI/CD
`.github/workflows/deploy.yml` tests, lints, builds and deploys on push to `main`.
Add repo secrets `CLOUDFLARE_API_TOKEN` (Workers edit permission) and
`CLOUDFLARE_ACCOUNT_ID`. Redeploy the API separately via your host's Git integration.

## 5. Recommended Cloudflare dashboard settings
- SSL/TLS: Full (strict); Always Use HTTPS; HSTS enabled.
- WAF: managed rules on; add a rate-limiting rule for `/api/auth/*`.
- Bot Fight Mode on. Turn on Workers Logs (already enabled in config).

## What changed in the code
- `server/server.js`: Helmet, rate limiting (strict on login/register), `trust proxy`,
  env-driven CORS, `/healthz`, JSON body cap, startup config checks, graceful shutdown.
- `server/middleware/originGuard.js`: API only accepts requests from the Worker.
- `authController.js`: `Secure` cookie in production, default 30d JWT expiry.
- `worker/index.js`, `wrangler.jsonc`: edge proxy + SPA hosting.
- `client/public/_headers`: CSP and security headers, immutable asset caching.

## Known follow-ups
- Routing uses the public OSRM demo server (via leaflet-routing-machine), which is
  not meant for production traffic: self-host OSRM or use a paid routing API, and
  update `connect-src` in `client/public/_headers`.
- Nominatim reverse geocoding has a strict usage policy; consider a paid geocoder.
- JS bundle is ~570 kB: route-level `React.lazy` code-splitting would help.
- JWT is also returned in the login JSON body; the client doesn't need it, so
  consider removing `token` from the response.
