import { Request, Response } from "express";
import status from "http-status";
import catchAsync from "../../utils/catchAsync";
import { AuthService } from "./auth.service";
import sendResponse from "../../utils/sendResponse";

const signup = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.signup(req.body);

  sendResponse(res, {
    statusCode: result.isNewUser ? status.CREATED : status.OK,
    success: true,
    message: result.message,
    data: { email: result.email },
  });
});

const verifyOTP = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.verifyOTP(req.body);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Account verified successfully",
    data: result,
  });
});

const login = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.login(req.body);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Login successful",
    data: result,
  });
});

const forgotPassword = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.forgotPassword(req.body.email);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: result.message,
    data: { email: result.email },
  });
});

const verifyForgotPasswordOTP = catchAsync(
  async (req: Request, res: Response) => {
    const result = await AuthService.verifyForgotPasswordOTP(req.body);

    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: result.message,
      data: { resetToken: result.resetToken },
    });
  },
);

const resetPassword = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.resetPassword(req.body);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: result.message,
  });
});

const changePassword = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.changePassword(
    req.user!.userId,
    req.body.oldPassword,
    req.body.newPassword,
  );

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: result.message,
  });
});

const resendSignupOTP = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.resendOTP(req.body.email, "SIGNUP");

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: result.message,
    data: { email: result.email },
  });
});

const resendForgotPasswordOTP = catchAsync(
  async (req: Request, res: Response) => {
    const result = await AuthService.resendOTP(
      req.body.email,
      "FORGOT_PASSWORD",
    );

    sendResponse(res, {
      statusCode: status.OK,
      success: true,
      message: result.message,
      data: { email: result.email },
    });
  },
);

const refreshToken = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.refreshAccessToken(req.body.refreshToken);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: "Access token refreshed successfully",
    data: result,
  });
});

const logout = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.logout(
    req.user!.userId,
    req.body.refreshToken,
  );

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: result.message,
  });
});

const logoutAllDevices = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.logoutAllDevices(req.user!.userId);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: result.message,
  });
});

export const AuthController = {
  signup,
  verifyOTP,
  login,
  forgotPassword,
  verifyForgotPasswordOTP,
  resetPassword,
  changePassword,
  resendSignupOTP,
  resendForgotPasswordOTP,
  refreshToken,
  logout,
  logoutAllDevices,
};
