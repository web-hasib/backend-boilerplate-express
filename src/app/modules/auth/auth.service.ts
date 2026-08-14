import { OAuth2Client } from "google-auth-library";
import { UserStatus } from "@prisma/client";
import config from "../../config";
import AppError from "../../errors/AppError";
import { prisma } from "../../lib/prisma";
import comparePassword from "../../utils/comparePassword";
import { sendOTPEmail } from "../../email/email.service";
import {
  generateAccessToken,
  generateRefreshToken,
  generateResetToken,
  revokeAllUserRefreshTokens,
  revokeRefreshToken,
  verifyRefreshToken,
  verifyResetToken,
} from "../../utils/generateToken";
import hashPassword from "../../utils/hashPassword";
import generateOTP from "../../utils/otpGenerator";

const googleOAuthClient = new OAuth2Client();

interface IGoogleUserPayload {
  email: string;
  name: string;
  picture?: string;
  email_verified?: boolean;
}

const verifyGoogleToken = async (token: string): Promise<IGoogleUserPayload> => {
  // 1. Attempt ID Token cryptographic verification via google-auth-library
  try {
    const ticket = await googleOAuthClient.verifyIdToken({
      idToken: token,
      audience: config.google.client_id || undefined,
    });
    const payload = ticket.getPayload();
    if (payload && payload.email) {
      return {
        email: payload.email.toLowerCase(),
        name: payload.name || payload.email.split("@")[0],
        picture: payload.picture,
        email_verified: payload.email_verified,
      };
    }
  } catch {
    // If ID Token verification fails, proceed to Access Token fallback
  }

  // 2. Fallback: Query Google OAuth2 UserInfo API for Access Tokens (with 5s network timeout)
  try {
    const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = (await res.json()) as {
        email?: string;
        name?: string;
        picture?: string;
        email_verified?: boolean;
      };
      if (data.email) {
        return {
          email: data.email.toLowerCase(),
          name: data.name || data.email.split("@")[0],
          picture: data.picture,
          email_verified: data.email_verified,
        };
      }
    }
  } catch {
    throw new AppError(401, "Invalid or expired Google token");
  }

  throw new AppError(401, "Invalid Google token payload");
};

type OTPType = "SIGNUP" | "FORGOT_PASSWORD";

/**
 * DRY Helper to enforce domain status checks (DELETED -> 410, BLOCKED -> 403)
 */
const checkAccountStatus = (status: UserStatus) => {
  if (status === UserStatus.DELETED) {
    throw new AppError(410, "This account was previously deleted. Contact support.");
  }
  if (status === UserStatus.BLOCKED) {
    throw new AppError(403, "Your account is suspended. Contact support.");
  }
};

/* ============================= SIGNUP ============================= */
const signup = async (payload: {
  email: string;
  password: string;
  fullName: string;
}) => {
  const existingUser = await prisma.user.findUnique({
    where: { email: payload.email },
    select: { id: true, isVerified: true, status: true },
  });

  if (existingUser) {
    checkAccountStatus(existingUser.status);
  }

  if (existingUser?.isVerified) {
    throw new AppError(409, "An account with this email already exists");
  }

  let userId: string;
  let isNewUser: boolean;

  if (existingUser) {
    userId = existingUser.id;
    isNewUser = false;
    // Re-hash and update password & fullName if user is re-signing up prior to OTP verification
    const hashedPassword = await hashPassword(payload.password);
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        fullName: payload.fullName,
      },
    });
  } else {
    const hashedPassword = await hashPassword(payload.password);

    const newUser = await prisma.user.create({
      data: {
        email: payload.email,
        password: hashedPassword,
        fullName: payload.fullName,
        role: "USER",
        status: UserStatus.ACTIVE,
        isVerified: false,
      },
      select: { id: true },
    });

    userId = newUser.id;
    isNewUser = true;
  }

  const otp = generateOTP();

  // Atomically invalidate old SIGNUP OTPs and create new OTP in 1 DB transaction
  await prisma.$transaction([
    prisma.oTP.updateMany({
      where: {
        userId,
        type: "SIGNUP",
        isUsed: false,
      },
      data: { isUsed: true },
    }),
    prisma.oTP.create({
      data: {
        userId,
        otp,
        type: "SIGNUP",
        expiresAt: new Date(Date.now() + config.otp_expiry_minutes * 60 * 1000),
        isUsed: false,
      },
    }),
  ]);

  // Send email (fire and forget)
  sendOTPEmail(payload.email, otp, "SIGNUP").catch((error) => {
    console.error("Failed to send signup OTP email:", error);
  });

  return {
    isNewUser,
    message: isNewUser
      ? "Signup successful! Please check your email for verification OTP"
      : "New verification OTP sent to your email",
    email: payload.email,
  };
};

/* ============================= VERIFY OTP (SIGNUP) ============================= */
const verifyOTP = async (payload: { email: string; otp: string }) => {
  const user = await prisma.user.findUnique({
    where: { email: payload.email },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      status: true,
    },
  });

  if (!user) throw new AppError(404, "User not found");
  checkAccountStatus(user.status);

  const otpRecord = await prisma.oTP.findFirst({
    where: {
      userId: user.id,
      otp: payload.otp,
      type: "SIGNUP",
      isUsed: false,
      expiresAt: { gte: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!otpRecord) throw new AppError(400, "Invalid or expired OTP");

  // Mark this OTP as used
  await prisma.oTP.update({
    where: { id: otpRecord.id },
    data: { isUsed: true },
  });

  // Invalidate any other unused SIGNUP OTPs (defense in depth)
  await prisma.oTP.updateMany({
    where: {
      userId: user.id,
      type: "SIGNUP",
      id: { not: otpRecord.id },
      isUsed: false,
    },
    data: { isUsed: true },
  });

  // Mark user as verified
  await prisma.user.update({
    where: { id: user.id },
    data: { isVerified: true },
  });

  // Issue Access Token & Persistent Refresh Token
  const accessToken = generateAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  const refreshToken = await generateRefreshToken(user.id);

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    },
  };
};

/* ============================= LOGIN ============================= */
const login = async (payload: { email: string; password: string }) => {
  const user = await prisma.user.findUnique({
    where: { email: payload.email },
    select: {
      id: true,
      email: true,
      password: true,
      fullName: true,
      role: true,
      authProvider: true,
      status: true,
      isVerified: true,
    },
  });

  if (!user) throw new AppError(401, "Invalid email or password");
  checkAccountStatus(user.status);

  // Prevent Google OAuth users from logging in via Password Auth
  if (user.authProvider === "GOOGLE" || !user.password) {
    throw new AppError(
      400,
      "This account was created using Google Login. Please sign in using Google.",
    );
  }

  const isValid = await comparePassword(payload.password, user.password);
  if (!isValid) throw new AppError(401, "Invalid email or password");

  if (!user.isVerified)
    throw new AppError(403, "Please verify your email first");

  const accessToken = generateAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  const refreshToken = await generateRefreshToken(user.id);

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    },
  };
};

/* ============================= GOOGLE LOGIN ============================= */
const googleLogin = async (payload: {
  idToken?: string;
  accessToken?: string;
  token?: string;
}) => {
  const rawToken = payload.idToken || payload.accessToken || payload.token;
  if (!rawToken) {
    throw new AppError(400, "Google token is required");
  }

  const googleUser = await verifyGoogleToken(rawToken);

  let user = await prisma.user.findUnique({
    where: { email: googleUser.email },
    select: {
      id: true,
      email: true,
      fullName: true,
      profileImage: true,
      authProvider: true,
      role: true,
      status: true,
      isVerified: true,
    },
  });

  if (user) {
    checkAccountStatus(user.status);

    // Sync profile image and verification status if missing
    const updateData: Record<string, unknown> = {};
    if (!user.isVerified) updateData.isVerified = true;
    if (!user.profileImage && googleUser.picture) {
      updateData.profileImage = googleUser.picture;
    }

    if (Object.keys(updateData).length > 0) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: updateData,
        select: {
          id: true,
          email: true,
          fullName: true,
          profileImage: true,
          authProvider: true,
          role: true,
          status: true,
          isVerified: true,
        },
      });
    }
  } else {
    // Register Google OAuth user with null password (Signup)
    user = await prisma.user.create({
      data: {
        email: googleUser.email,
        fullName: googleUser.name,
        profileImage: googleUser.picture || null,
        password: null,
        authProvider: "GOOGLE",
        status: UserStatus.ACTIVE,
        isVerified: true,
        role: "USER",
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        profileImage: true,
        authProvider: true,
        role: true,
        status: true,
        isVerified: true,
      },
    });
  }

  const accessToken = generateAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  const refreshToken = await generateRefreshToken(user.id);

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      profileImage: user.profileImage,
      role: user.role,
    },
  };
};

/* ============================= FORGOT PASSWORD (STEP 1) ============================= */
const forgotPassword = async (email: string) => {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, status: true },
  });

  if (!user) throw new AppError(404, "No account found with this email");
  checkAccountStatus(user.status);

  const otp = generateOTP();

  // Atomically invalidate old FORGOT_PASSWORD OTPs and create new OTP in 1 DB transaction
  await prisma.$transaction([
    prisma.oTP.updateMany({
      where: {
        userId: user.id,
        type: "FORGOT_PASSWORD",
        isUsed: false,
      },
      data: { isUsed: true },
    }),
    prisma.oTP.create({
      data: {
        userId: user.id,
        otp,
        type: "FORGOT_PASSWORD",
        expiresAt: new Date(Date.now() + config.otp_expiry_minutes * 60 * 1000),
        isUsed: false,
      },
    }),
  ]);

  sendOTPEmail(email, otp, "FORGOT_PASSWORD").catch((error) => {
    console.error("Failed to send forgot password OTP email:", error);
  });

  return {
    message: "Password reset OTP sent to your email",
    email,
  };
};

/* ============================= VERIFY FORGOT PASSWORD OTP (STEP 2) ============================= */
const verifyForgotPasswordOTP = async (payload: {
  email: string;
  otp: string;
}) => {
  const user = await prisma.user.findUnique({
    where: { email: payload.email },
    select: { id: true, email: true, status: true },
  });

  if (!user) throw new AppError(404, "User not found");
  checkAccountStatus(user.status);

  const otpRecord = await prisma.oTP.findFirst({
    where: {
      userId: user.id,
      otp: payload.otp,
      type: "FORGOT_PASSWORD",
      isUsed: false,
      expiresAt: { gte: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!otpRecord) throw new AppError(400, "Invalid or expired OTP");

  // Mark as used + invalidate others
  await prisma.oTP.update({
    where: { id: otpRecord.id },
    data: { isUsed: true },
  });

  await prisma.oTP.updateMany({
    where: {
      userId: user.id,
      type: "FORGOT_PASSWORD",
      id: { not: otpRecord.id },
      isUsed: false,
    },
    data: { isUsed: true },
  });

  // Generate short-lived reset token
  const resetToken = generateResetToken({ userId: user.id });

  return {
    message: "OTP verified successfully. You can now reset your password.",
    resetToken,
  };
};

/* ============================= RESET PASSWORD (STEP 3) ============================= */
const resetPassword = async (payload: {
  resetToken: string;
  newPassword: string;
}) => {
  let decoded: { userId: string; purpose: string };
  try {
    decoded = verifyResetToken(payload.resetToken);
  } catch {
    throw new AppError(400, "Invalid or expired reset token");
  }

  if (decoded.purpose !== "PASSWORD_RESET") {
    throw new AppError(400, "Invalid reset token");
  }

  const hashed = await hashPassword(payload.newPassword);

  await prisma.user.update({
    where: { id: decoded.userId },
    data: { password: hashed },
  });

  // OWASP Standard: Immediately invalidate all active user sessions on password reset
  await revokeAllUserRefreshTokens(decoded.userId);

  // Clean up all forgot-password OTPs
  await prisma.oTP.deleteMany({
    where: {
      userId: decoded.userId,
      type: "FORGOT_PASSWORD",
    },
  });

  return {
    message:
      "Password reset successful. You can now log in with your new password.",
  };
};

/* ============================= CHANGE PASSWORD ============================= */
const changePassword = async (
  userId: string,
  oldPassword: string,
  newPassword: string,
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, password: true, authProvider: true },
  });

  if (!user) throw new AppError(404, "User not found");

  if (!user.password || user.authProvider === "GOOGLE") {
    throw new AppError(
      400,
      "This account was created using Google Login and does not have a password.",
    );
  }

  const isValid = await comparePassword(oldPassword, user.password);
  if (!isValid) throw new AppError(401, "Current password is incorrect");

  const hashed = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashed },
  });

  // OWASP Standard: Immediately invalidate all existing refresh sessions on password change
  await revokeAllUserRefreshTokens(userId);

  return {
    message: "Password changed successfully",
  };
};

/* ============================= RESEND OTP ============================= */
const resendOTP = async (email: string, type: OTPType) => {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      status: true,
      isVerified: true,
    },
  });

  if (!user) throw new AppError(404, "No account found with this email");
  checkAccountStatus(user.status);

  if (type === "SIGNUP" && user.isVerified) {
    throw new AppError(400, "Your account is already verified");
  }

  const otp = generateOTP();

  // Atomically invalidate old OTPs and create new OTP in 1 DB transaction
  await prisma.$transaction([
    prisma.oTP.updateMany({
      where: {
        userId: user.id,
        type,
        isUsed: false,
      },
      data: { isUsed: true },
    }),
    prisma.oTP.create({
      data: {
        userId: user.id,
        otp,
        type,
        expiresAt: new Date(Date.now() + config.otp_expiry_minutes * 60 * 1000),
        isUsed: false,
      },
    }),
  ]);

  sendOTPEmail(email, otp, type).catch((error) => {
    console.error("Failed to send OTP email:", error);
  });

  const context = type === "SIGNUP" ? "verification" : "password reset";
  return {
    message: `New ${context} OTP sent to your email`,
    email,
  };
};

/* ============================= REFRESH TOKEN ============================= */
const refreshAccessToken = async (refreshToken: string) => {
  // 1. Verify JWT token
  let decoded: { userId: string; tokenId: string };
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError(401, "Invalid or expired refresh token");
  }

  // 2. Check if token exists in database and is valid
  const tokenRecord = await prisma.refreshToken.findUnique({
    where: { id: decoded.tokenId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          isVerified: true,
        },
      },
    },
  });

  if (!tokenRecord) {
    throw new AppError(401, "Refresh token not found");
  }

  if (tokenRecord.isRevoked) {
    throw new AppError(401, "Refresh token has been revoked");
  }

  if (tokenRecord.expiresAt < new Date()) {
    throw new AppError(401, "Refresh token has expired");
  }

  // 3. Validate user status
  const user = tokenRecord.user;
  if (!user) throw new AppError(404, "User not found");
  checkAccountStatus(user.status);
  if (!user.isVerified) throw new AppError(403, "Account not verified");

  // 4. Generate new access token
  const accessToken = generateAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  return {
    accessToken,
  };
};

/* ============================= LOGOUT ============================= */
const logout = async (userId: string, refreshToken?: string) => {
  if (refreshToken) {
    try {
      const decoded = verifyRefreshToken(refreshToken);
      await revokeRefreshToken(decoded.tokenId);
    } catch {
      // Token already invalid, just continue
    }
  }

  return {
    message: "Logged out successfully",
  };
};

/* ============================= LOGOUT ALL DEVICES ============================= */
const logoutAllDevices = async (userId: string) => {
  await revokeAllUserRefreshTokens(userId);

  return {
    message: "Logged out from all devices successfully",
  };
};

export const AuthService = {
  signup,
  verifyOTP,
  login,
  googleLogin,
  forgotPassword,
  verifyForgotPasswordOTP,
  resetPassword,
  changePassword,
  resendOTP,
  refreshAccessToken,
  logout,
  logoutAllDevices,
};
