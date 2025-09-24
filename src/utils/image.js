// Image helper: build absolute src and provide safe fallback
// Intended for server-side rendering assistance or to document FE usage.
// If integrating into FE directly, you can copy this logic.

const { toAbsoluteUrl } = require('./url');

// toSrc: convert a possibly relative /uploads/... path or external URL into absolute URL
// req optional: when omitted and PUBLIC_BASE_URL missing, may return relative for FE to resolve.
function toSrc(img, req) {
  if (!img) return '';
  return toAbsoluteUrl(img, req);
}

// safeImageSrc: returns { src, onErrorHandlerScript }
// Frontend usage example (React):
//   const { src, onErrorAttr } = safeImageSrc(raw, placeholder);
//   <img src={src} {...onErrorAttr} />
// For plain HTML string building, use onErrorAttr.onError value.
function safeImageSrc(img, placeholder = '/static/placeholder.png', req) {
  const src = toSrc(img, req) || placeholder;
  // onError attribute sets the image to placeholder only once, avoiding infinite loop
  const handler = `this.onerror=null;this.src='${placeholder}';`;
  return { src, onErrorAttr: { onError: handler } };
}

module.exports = { toSrc, safeImageSrc };
