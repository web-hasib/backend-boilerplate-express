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

/* ============================= REFRESH TOKEN ============================= */
export const generateRefreshToken = async (userId: string): Promise<string> => {
  // Calculate expiry date
  const expiresAt = new Date();
  const expiryDays = parseInt(config.jwt.refresh_expires_in.replace("d", ""));
  expiresAt.setDate(expiresAt.getDate() + expiryDays);

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
export const generateResetToken = (payload: { userId: string }): string => {
  return jwt.sign(
    { ...payload, purpose: "PASSWORD_RESET" } as IResetTokenPayload,
    config.jwt.access_secret as Secret,
    { expiresIn: "15m" }, // short-lived!
  );
};

export const verifyResetToken = (token: string): IResetTokenPayload => {
  return jwt.verify(
    token,
    config.jwt.access_secret as Secret,
  ) as IResetTokenPayload;
};
