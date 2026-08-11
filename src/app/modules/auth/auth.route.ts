import { Router } from "express";
import validateRequest from "../../middlewares/validateRequest";
import {
  changePasswordValidation,
  forgotPasswordValidation,
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

const router = Router();

// Signup & Verification
router.post(
  "/signup",
  validateRequest(signupValidation),
  AuthController.signup,
);

router.post(
  "/verify-otp",
  validateRequest(verifyOTPValidation),
  AuthController.verifyOTP,
);

router.post(
  "/resend-otp/signup",
  validateRequest(resendOTPValidation),
  AuthController.resendSignupOTP,
);

// Login
router.post("/login", validateRequest(loginValidation), AuthController.login);

// Forgot Password (3 steps)
router.post(
  "/forgot-password",
  validateRequest(forgotPasswordValidation),
  AuthController.forgotPassword,
);

router.post(
  "/verify-forgot-password-otp",
  validateRequest(verifyForgotPasswordOTPValidation),
  AuthController.verifyForgotPasswordOTP,
);

router.post(
  "/reset-password",
  validateRequest(resetPasswordValidation),
  AuthController.resetPassword,
);

router.post(
  "/resend-otp/forgot-password",
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
