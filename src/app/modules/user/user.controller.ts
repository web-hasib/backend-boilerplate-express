import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import { UserService } from "./user.service";
import sendResponse from "../../utils/sendResponse";
import type { GetUsersQuery } from "./user.validation";

const getProfile = catchAsync(async (req: Request, res: Response) => {
  const result = await UserService.getProfile(req.user!.userId);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Profile retrieved successfully",
    data: result,
  });
});

const updateProfile = catchAsync(async (req: Request, res: Response) => {
  const result = await UserService.updateProfile(req.user!.userId, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Profile updated successfully",
    data: result,
  });
});

const deleteProfileImage = catchAsync(async (req: Request, res: Response) => {
  const result = await UserService.deleteProfileImage(req.user!.userId);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: result.message,
  });
});

const getAllUsers = catchAsync(async (req: Request, res: Response) => {
  // req.query is Zod-validated and coerced by validateRequest.
  const result = await UserService.getAllUsers(
    req.query as unknown as GetUsersQuery,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Users retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const deleteUser = catchAsync(async (req: Request, res: Response) => {
  const result = await UserService.deleteUser(req.params.id as string);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: result.message,
  });
});

export const UserController = {
  getProfile,
  updateProfile,
  deleteProfileImage,
  getAllUsers,
  deleteUser,
};
