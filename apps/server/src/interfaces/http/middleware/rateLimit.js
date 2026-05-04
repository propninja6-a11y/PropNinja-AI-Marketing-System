import { errorResponse } from "../../../shared/response.js";

const buckets = new Map();

const cleanExpired = () => {
  const now = Date.now();
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.expiresAt <= now) buckets.delete(key);
  }
};

const makeKey = (prefix, req) => `${prefix}:${req.path}`;

export const createRateLimiter = ({
  prefix,
  windowMs,
  max,
  keyBuilder = (_req) => "global",
  errorMessage
}) => {
  return (req, res, next) => {
    cleanExpired();
    const baseKey = keyBuilder(req);
    if (!baseKey) return next();

    const key = makeKey(`${prefix}:${baseKey}`, req);
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || bucket.expiresAt <= now) {
      buckets.set(key, { count: 1, expiresAt: now + windowMs });
      return next();
    }

    if (bucket.count >= max) {
      return res.status(429).json(errorResponse(errorMessage || "Rate limit exceeded"));
    }

    bucket.count += 1;
    buckets.set(key, bucket);
    next();
  };
};

export const ipRateLimiter = createRateLimiter({
  prefix: "ip",
  windowMs: 60_000,
  max: 300,
  keyBuilder: (req) => req.ip || "unknown",
  errorMessage: "Too many requests from this IP"
});

export const phoneRateLimiter = createRateLimiter({
  prefix: "phone",
  windowMs: 10 * 60_000,
  max: 15,
  keyBuilder: (req) => req.body?.phone || null,
  errorMessage: "Too many requests for this phone number"
});
