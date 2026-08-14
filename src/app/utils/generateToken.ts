import jwt, { Secret, SignOptions } from "jsonwebtoken";
import config from "../config";
import { prisma } from "../lib/prisma";

interface IAccessTokenPayload {
  userId: string;
  email: string;
  role: string;
}

interface IRefreshTokenPayload {
  userId: string;
  tokenId: string;
}

interface IResetTokenPayload {
  userId: string;
  purpose: "PASSWORD_RESET";
}

/* ============================= ACCESS TOKEN ============================= */
export const generateAccessToken = (payload: IAccessTokenPayload): string => {
  return jwt.sign(
    payload,
    config.jwt.access_secret as Secret,
    {
      expiresIn: config.jwt.access_expires_in,
    } as SignOptions,
  );
};

export const verifyAccessToken = (token: string): IAccessTokenPayload => {
  return jwt.verify(
    token,
    config.jwt.access_secret as Secret,
  ) as IAccessTokenPayload;
};

/* ============================= HELPERS ============================= */
/**
 * Parse a JWT-style duration string (e.g. "7d", "24h", "30m", "60s", "1w", "1y") or raw ms into milliseconds.
 * Throws if the format is unrecognised so misconfiguration is caught at startup.
 */
const parseDurationMs = (duration: string): number => {
  // Allow raw number strings (e.g., "3600000")
  if (/^\d+$/.test(duration)) {
    return parseInt(duration, 10);
  }

  const match = duration.match(/^(\d+)(d|h|m|s|w|y)$/);
  if (!match) {
    throw new Error(
      `Invalid JWT duration format: "${duration}". Use Nd / Nh / Nm / Ns / Nw / Ny (e.g. "7d").`,
    );
  }
  const value = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    y: 365 * 86400000,
    w: 7 * 86400000,
    d: 86400000,
    h: 3600000,
    m: 60000,
    s: 1000,
  };
  return value * multipliers[unit];
};

/* ============================= REFRESH TOKEN ============================= */
export const generateRefreshToken = async (userId: string): Promise<string> => {
  // Calculate expiry date using safe duration parser
  const expiresAt = new Date(
    Date.now() + parseDurationMs(config.jwt.refresh_expires_in),
  );

  // Store in database
  const refreshTokenRecord = await prisma.refreshToken.create({
    data: {
      userId,
      expiresAt,
      isRevoked: false,
    },
  });

  // Sign JWT with token ID
  const jwtToken = jwt.sign(
    {
      userId,
      tokenId: refreshTokenRecord.id,
    } as IRefreshTokenPayload,
    config.jwt.refresh_secret as Secret,
    {
      expiresIn: config.jwt.refresh_expires_in,
    } as SignOptions,
  );

  return jwtToken;
};

export const verifyRefreshToken = (token: string): IRefreshTokenPayload => {
  return jwt.verify(
    token,
    config.jwt.refresh_secret as Secret,
  ) as IRefreshTokenPayload;
};

export const revokeRefreshToken = async (tokenId: string): Promise<void> => {
  await prisma.refreshToken.update({
    where: { id: tokenId },
    data: { isRevoked: true },
  });
};

export const revokeAllUserRefreshTokens = async (
  userId: string,
): Promise<void> => {
  await prisma.refreshToken.updateMany({
    where: { userId, isRevoked: false },
    data: { isRevoked: true },
  });
};

/* ============================= RESET TOKEN ============================= */
// Uses a dedicated secret — never share with access or refresh tokens
export const generateResetToken = (payload: { userId: string }): string => {
  return jwt.sign(
    { ...payload, purpose: "PASSWORD_RESET" } as IResetTokenPayload,
    config.jwt.reset_secret as Secret,
    { expiresIn: "15m" }, // short-lived!
  );
};

export const verifyResetToken = (token: string): IResetTokenPayload => {
  return jwt.verify(
    token,
    config.jwt.reset_secret as Secret,
  ) as IResetTokenPayload;
};
