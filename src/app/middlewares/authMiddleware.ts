import { UserRole, UserStatus } from "@prisma/client";
import { Request, Response, NextFunction } from "express";
import catchAsync from "../utils/catchAsync";
import AppError from "../errors/AppError";
import { verifyAccessToken } from "../utils/generateToken";
import { prisma } from "../lib/prisma";

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

      // 2. Verify token signature and expiration
      let decoded;
      try {
        decoded = verifyAccessToken(token);
      } catch {
        throw new AppError(401, "Invalid or expired access token");
      }

      // 3. Find user in DB and validate domain status
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
        },
      });

      if (!user) {
        throw new AppError(401, "User no longer exists");
      }

      if (user.status === UserStatus.DELETED) {
        throw new AppError(401, "User account has been deleted");
      }

      if (user.status === UserStatus.BLOCKED) {
        throw new AppError(403, "User account is suspended");
      }

      // 4. Role-based access control (RBAC)
      if (requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
        throw new AppError(403, "Access denied. Insufficient permissions");
      }

      // 5. Attach user details to express request context
      req.user = {
        userId: user.id,
        email: user.email,
        role: user.role,
      };

      next();
    },
  );
};

export default auth;
