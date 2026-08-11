import { Router } from "express";
import auth from "../../middlewares/authMiddleware";
import { UserController } from "./user.controller";
import { uploadSingle } from "../../middlewares/upload";
import parseBodyData from "../../middlewares/parseBodyData";
import validateRequest from "../../middlewares/validateRequest";
import { getUsersValidation, updateUserValidation } from "./user.validation";

const router = Router();

// Get own profile
router.get("/profile", auth(), UserController.getProfile);

// Update own profile (with optional image)
router.patch(
  "/profile",
  auth(),
  uploadSingle("profileImage"),
  parseBodyData,
  validateRequest(updateUserValidation),
  UserController.updateProfile,
);

// Upload/Update profile image (dedicated endpoint)
router.post(
  "/profile/image",
  auth(),
  uploadSingle("profileImage"),
  UserController.uploadProfileImage,
);

// Delete profile image
router.delete("/profile/image", auth(), UserController.deleteProfileImage);

// Admin-only: get all users
router.get(
  "/",
  auth("SUPER_ADMIN", "ADMIN"),
  validateRequest(getUsersValidation),
  UserController.getAllUsers,
);

// Super admin only: delete user
router.delete("/:id", auth("SUPER_ADMIN"), UserController.deleteUser);

export const UserRoutes = router;
