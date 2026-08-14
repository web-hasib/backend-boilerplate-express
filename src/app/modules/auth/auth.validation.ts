import { z } from "zod";

// Central reusable Password Validation Schema (Bank-Grade Security)
export const passwordSchema = z
  .string({ message: "Password is required" })
  .min(8, "Password must be at least 8 characters long")
  .max(50, "Password cannot exceed 50 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(
    /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/]/,
    "Password must contain at least one special character (!@#$%^&*)",
  );

export const signupValidation = {
  body: z.object({
    email: z
      .string({ message: "Email is required" })
      .email("Please enter a valid email address"),

    password: passwordSchema,

    fullName: z
      .string({ message: "Full name is required" })
      .min(2, "Full name must be at least 2 characters")
      .max(100, "Full name cannot exceed 100 characters")
      .trim(),
  }),
};

export const verifyOTPValidation = {
  body: z.object({
    email: z
      .string({ message: "Email is required" })
      .email("Please enter a valid email address"),

    otp: z
      .string({ message: "OTP code is required" })
      .length(4, "OTP must be exactly 4 digits")
      .regex(/^\d+$/, "OTP must contain only numbers"),
  }),
};

export const loginValidation = {
  body: z.object({
    email: z
      .string({ message: "Email is required" })
      .email("Please enter a valid email address"),

    password: z
      .string({ message: "Password is required" })
      .min(1, "Password cannot be empty"),
  }),
};

export const forgotPasswordValidation = {
  body: z.object({
    email: z
      .string({ message: "Email is required" })
      .email("Please enter a valid email address"),
  }),
};

export const verifyForgotPasswordOTPValidation = {
  body: z.object({
    email: z
      .string({ message: "Email is required" })
      .email("Please enter a valid email address"),

    otp: z
      .string({ message: "OTP code is required" })
      .length(4, "OTP must be exactly 4 digits")
      .regex(/^\d+$/, "OTP must contain only numbers"),
  }),
};

export const resetPasswordValidation = {
  body: z.object({
    resetToken: z
      .string({ message: "Reset token is required" })
      .min(1, "Invalid reset token"),

    newPassword: passwordSchema,
  }),
};

export const changePasswordValidation = {
  body: z
    .object({
      oldPassword: z
        .string({ message: "Current password is required" })
        .min(1, "Current password cannot be empty"),

      newPassword: passwordSchema,
    })
    .refine((data) => data.oldPassword !== data.newPassword, {
      message: "New password must be different from current password",
      path: ["newPassword"],
    }),
};

export const resendOTPValidation = {
  body: z.object({
    email: z
      .string({ message: "Email is required" })
      .email("Please enter a valid email address"),
  }),
};

export const refreshTokenValidation = {
  body: z.object({
    refreshToken: z
      .string({ message: "Refresh token is required" })
      .min(1, "Invalid refresh token"),
  }),
};

export const logoutValidation = {
  body: z.object({
    refreshToken: z.string().optional(),
  }),
};

export const googleLoginValidation = {
  body: z
    .object({
      idToken: z.string().optional(),
      accessToken: z.string().optional(),
      token: z.string().optional(),
    })
    .refine((data) => Boolean(data.idToken || data.accessToken || data.token), {
      message: "Google token (idToken, accessToken, or token) is required",
    }),
};
