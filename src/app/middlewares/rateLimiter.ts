import rateLimit from "express-rate-limit";
import { Request } from "express";

/**
 * Rate Limiter for Sensitive Auth & OTP Endpoints.
 * Limit: 20 requests per 15 minutes per IP address.
 * Keying on IP prevents credential spraying across multiple emails from one IP
 * and prevents denial-of-service account lockouts against targeted users.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request): string => req.ip || "127.0.0.1",
  validate: { keyGeneratorIpFallback: false },
  message: {
    success: false,
    statusCode: 429,
    message:
      "Too many authentication requests from this IP. Please try again after 15 minutes.",
  },
});

/**
 * Rate Limiter for General API Endpoints.
 * Limit: 100 requests per 1 minute per authenticated user or IP address.
 */
export const apiRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request): string =>
    req.user?.userId ? `user_${req.user.userId}` : req.ip || "127.0.0.1",
  validate: { keyGeneratorIpFallback: false },
  message: {
    success: false,
    statusCode: 429,
    message: "Too many API requests. Please slow down.",
  },
});
