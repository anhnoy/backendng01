// Simple in-memory TTL cache (not for production scale)
// Key: string => { value, expiresAt }
const store = new Map();

function get(key) {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return entry.value;
}

function set(key, value, ttlMs = 60000) {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
  return value;
}

function makeKey(prefix, queryObj) {
  const parts = [];
  const keys = Object.keys(queryObj || {}).sort();
  for (const k of keys) parts.push(`${k}=${queryObj[k]}`);
  return `${prefix}?${parts.join('&')}`;
}

function wrap(prefix, ttlMs, handler) {
  return async function cachedHandler(req, res, ...rest) {
    const key = makeKey(prefix, req.query);
    const hit = get(key);
    if (hit !== undefined) {
      return res.json(hit);
    }
    const data = await handler(req, res, ...rest);
    if (res.headersSent) return; // handler already sent
    set(key, data, ttlMs);
    res.json(data);
  };
}

module.exports = { get, set, wrap, makeKey };
