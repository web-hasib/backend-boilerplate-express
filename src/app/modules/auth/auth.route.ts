import { Router } from "express";
import validateRequest from "../../middlewares/validateRequest";
import {
  changePasswordValidation,
  forgotPasswordValidation,
  googleLoginValidation,
  loginValidation,
  logoutValidation,
  refreshTokenValidation,
  resendOTPValidation,
  resetPasswordValidation,
  signupValidation,
  verifyForgotPasswordOTPValidation,
  verifyOTPValidation,
} from "./auth.validation";
import { AuthController } from "./auth.controller";
import auth from "../../middlewares/authMiddleware";

import { authRateLimiter } from "../../middlewares/rateLimiter";

const router = Router();

// Signup & Verification
router.post(
  "/signup",
  authRateLimiter,
  validateRequest(signupValidation),
  AuthController.signup,
);

router.post(
  "/verify-otp",
  authRateLimiter,
  validateRequest(verifyOTPValidation),
  AuthController.verifyOTP,
);

router.post(
  "/resend-otp/signup",
  authRateLimiter,
  validateRequest(resendOTPValidation),
  AuthController.resendSignupOTP,
);

// Login
router.post(
  "/login",
  authRateLimiter,
  validateRequest(loginValidation),
  AuthController.login,
);

// Google OAuth Login
router.post(
  "/google-login",
  authRateLimiter,
  validateRequest(googleLoginValidation),
  AuthController.googleLogin,
);

// Forgot Password (3 steps)
router.post(
  "/forgot-password",
  authRateLimiter,
  validateRequest(forgotPasswordValidation),
  AuthController.forgotPassword,
);

router.post(
  "/verify-forgot-password-otp",
  authRateLimiter,
  validateRequest(verifyForgotPasswordOTPValidation),
  AuthController.verifyForgotPasswordOTP,
);

router.post(
  "/reset-password",
  authRateLimiter,
  validateRequest(resetPasswordValidation),
  AuthController.resetPassword,
);

router.post(
  "/resend-otp/forgot-password",
  authRateLimiter,
  validateRequest(resendOTPValidation),
  AuthController.resendForgotPasswordOTP,
);

// Change Password (authenticated)
router.post(
  "/change-password",
  auth(),
  validateRequest(changePasswordValidation),
  AuthController.changePassword,
);

// Refresh Token
router.post(
  "/refresh-token",
  validateRequest(refreshTokenValidation),
  AuthController.refreshToken,
);

// Logout (authenticated)
router.post(
  "/logout",
  auth(),
  validateRequest(logoutValidation),
  AuthController.logout,
);

// Logout All Devices (authenticated)
router.post("/logout-all", auth(), AuthController.logoutAllDevices);

export const AuthRoutes = router;
