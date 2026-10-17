// Rejects requests that did not come through the Cloudflare Worker.
// Enabled only when ORIGIN_SECRET is set (set it in production).
const crypto = require('crypto');

module.exports = (req, res, next) => {
  const secret = process.env.ORIGIN_SECRET;
  if (!secret || req.path === '/healthz') return next();

  const provided = Buffer.from(String(req.get('x-origin-verify') || ''));
  const expected = Buffer.from(secret);
  if (provided.length === expected.length && crypto.timingSafeEqual(provided, expected)) {
    return next();
  }
  return res.status(403).json({ success: false, error: 'Forbidden' });
};
