import { Router } from "express";
import auth from "../../middlewares/authMiddleware";
import { UserController } from "./user.controller";
import validateRequest from "../../middlewares/validateRequest";
import {
  getUsersValidation,
  updateUserValidation,
  userIdParamValidation,
} from "./user.validation";
import { UserRole } from "@prisma/client";

const router = Router();

// Get own profile
router.get("/profile", auth(), UserController.getProfile);

// Update own profile (pure JSON: fullName, profileImage URL)
router.patch(
  "/profile",
  auth(),
  validateRequest(updateUserValidation),
  UserController.updateProfile,
);

// Delete profile image (cleans up from S3 & resets DB to null)
router.delete("/profile/image", auth(), UserController.deleteProfileImage);

// Admin-only: get all users
router.get(
  "/",
  auth(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  validateRequest(getUsersValidation),
  UserController.getAllUsers,
);

// Admin / Super admin only: delete user
router.delete(
  "/:id",
  auth(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  validateRequest(userIdParamValidation),
  UserController.deleteUser,
);

export const UserRoutes = router;
