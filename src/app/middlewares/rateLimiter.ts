import rateLimit from "express-rate-limit";
import { Request } from "express";

/**
 * Custom Key Generator for Granular Per-User / Per-Email / Per-IP Tracking.
 * Ensures user A's requests NEVER count against user B's quota.
 */
const getRateLimitKey = (req: Request): string => {
  const userId = req.user?.userId;
  const email = req.body?.email;
  const clientIp = req.ip || req.headers["x-forwarded-for"] || "127.0.0.1";

  if (userId) return `user_${userId}`;
  if (email && typeof email === "string")
    return `email_${email.toLowerCase().trim()}`;
  return `ip_${clientIp}`;
};

/**
 * Rate Limiter for Sensitive Auth & OTP Endpoints.
 * Limit: 10 requests per 15 minutes per user / email / IP.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getRateLimitKey,
  validate: { keyGeneratorIpFallback: false },
  message: {
    success: false,
    statusCode: 429,
    message:
      "Too many authentication requests. Please try again after 15 minutes.",
  },
});

/**
 * Rate Limiter for General API Endpoints.
 * Limit: 100 requests per 1 minute per user / IP.
 */
export const apiRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getRateLimitKey,
  validate: { keyGeneratorIpFallback: false },
  message: {
    success: false,
    statusCode: 429,
    message: "Too many API requests. Please slow down.",
  },
});
