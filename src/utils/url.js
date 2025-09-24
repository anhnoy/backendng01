const DEFAULT_PORT = process.env.PORT || 3000;
const DEFAULT_BASE = process.env.PUBLIC_BASE_URL || `http://localhost:${DEFAULT_PORT}`;

function computeBase(req) {
  if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/$/, '');
  if (req && req.protocol && req.get && req.get('host')) {
    return `${req.protocol}://${req.get('host')}`.replace(/\/$/, '');
  }
  return DEFAULT_BASE;
}

function toAbsoluteUrl(url, req) {
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) return url; // already absolute
  const base = computeBase(req);
  if (url.startsWith('/')) return base + url;
  return `${base}/${url}`;
}

module.exports = { toAbsoluteUrl };