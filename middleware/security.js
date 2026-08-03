const crypto = require("crypto");

function securityHeaders(req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  // Google Identity completes sign-in in a popup and must be able to message
  // its opener. `same-origin` blocks that callback and leaves the popup blank.
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  res.setHeader("X-DNS-Prefetch-Control", "off");
  // Inline scripts/styles are still used by the existing templates; restrict
  // every other source while preserving their current functionality.
  res.setHeader("Content-Security-Policy", "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self' 'unsafe-inline' https://accounts.google.com; connect-src 'self' https://accounts.google.com https://oauth2.googleapis.com; frame-src https://accounts.google.com; worker-src 'self'; manifest-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'");
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
}

function rateLimit({ windowMs, max, message }) {
  const hits = new Map();
  return (req, res, next) => {
    const key = req.ip || req.socket.remoteAddress || "unknown";
    const now = Date.now();
    const record = hits.get(key);
    const current = !record || now - record.startedAt > windowMs
      ? { startedAt: now, count: 1 }
      : { ...record, count: record.count + 1 };
    hits.set(key, current);
    if (current.count > max) {
      res.setHeader("Retry-After", Math.ceil((windowMs - (now - current.startedAt)) / 1000));
      return res.status(429).send(message || "Too many requests. Please try again later.");
    }
    next();
  };
}

function blockCrossSiteWrites(req, res, next) {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) return next();
  const fetchSite = req.get("sec-fetch-site");
  if (fetchSite === "cross-site") return res.status(403).send("Cross-site request blocked.");
  const origin = req.get("origin");
  if (origin) {
    const expected = `${req.protocol}://${req.get("host")}`;
    if (origin !== expected) return res.status(403).send("Invalid request origin.");
  }
  next();
}

module.exports = {
  securityHeaders,
  blockCrossSiteWrites,
  generalWriteLimit: rateLimit({ windowMs: 15 * 60 * 1000, max: 150 }),
  authLimit: rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: "Too many sign-in attempts. Please wait 15 minutes." }),
  recoveryLimit: rateLimit({ windowMs: 60 * 60 * 1000, max: 8, message: "Too many recovery attempts. Please wait before trying again." })
};
