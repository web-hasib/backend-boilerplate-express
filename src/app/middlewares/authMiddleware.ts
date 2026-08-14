import { UserRole, UserStatus } from "@prisma/client";
import { Request, Response, NextFunction } from "express";
import catchAsync from "../utils/catchAsync";
import AppError from "../errors/AppError";
import { verifyAccessToken } from "../utils/generateToken";

const auth = (...requiredRoles: UserRole[]) => {
  return catchAsync(
    async (req: Request, _res: Response, next: NextFunction) => {
      // 1. Get token from Authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        throw new AppError(401, "Access token is required");
      }

      const token = authHeader.split(" ")[1];
      if (!token) throw new AppError(401, "Access token is required");

      // 2. Verify token signature and expiration (stateless — no DB round-trip)
      let decoded;
      try {
        decoded = verifyAccessToken(token);
      } catch {
        throw new AppError(401, "Invalid or expired access token");
      }

      // 3. Validate domain status from JWT claims — status is embedded at sign time.
      // This eliminates one DB query per request on the hot path.
      // If a user's status changes (block/delete), their current access tokens
      // remain valid until they expire (max 15m by default), which is the
      // standard trade-off for stateless JWTs.
      if (decoded.status === UserStatus.DELETED) {
        throw new AppError(401, "User account has been deleted");
      }

      if (decoded.status === UserStatus.BLOCKED) {
        throw new AppError(403, "User account is suspended");
      }

      // 4. Role-based access control (RBAC)
      if (
        requiredRoles.length > 0 &&
        !requiredRoles.includes(decoded.role as UserRole)
      ) {
        throw new AppError(403, "Access denied. Insufficient permissions");
      }

      // 5. Attach user details to express request context
      req.user = {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role as UserRole,
      };

      next();
    },
  );
};

export default auth;
