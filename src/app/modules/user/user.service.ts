import AppError from "../../errors/AppError";
import { prisma } from "../../lib/prisma";
import { Prisma, UserRole } from "@prisma/client";
import { buildOffsetListMeta } from "../../utils/listQuery";

import {
  deleteImageFromS3,
  extractS3KeyFromUrl,
  replaceImage,
} from "../../utils/s3Uploader";
import type { GetUsersQuery } from "./user.validation";

interface IUpdateUserRequest {
  fullName?: string;
}

// Shared upload options — update here once to affect all profile image operations
const PROFILE_IMAGE_OPTIONS = {
  folder: "profiles",
  resize: {
    width: 400,
    height: 400,
    fit: "cover" as const,
  },
  quality: 85,
};

const getProfile = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      fullName: true,
      profileImage: true,
      role: true,
      isVerified: true,
      isActive: true,
      isDeleted: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) throw new AppError(404, "User not found");
  return user;
};

const updateProfile = async (
  userId: string,
  payload: IUpdateUserRequest,
  file?: Express.Multer.File,
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, profileImage: true },
  });

  if (!user) {
    throw new AppError(404, "User not found");
  }

  const updateData: Record<string, unknown> = { ...payload };

  // Handle profile image upload
  if (file) {
    const uploadedImage = await replaceImage(
      user.profileImage,
      file,
      PROFILE_IMAGE_OPTIONS,
    );
    updateData.profileImage = uploadedImage.url;
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      email: true,
      fullName: true,
      profileImage: true,
      role: true,
      isVerified: true,
      isActive: true,
      isDeleted: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return updatedUser;
};

const deleteProfileImage = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, profileImage: true },
  });

  if (!user) {
    throw new AppError(404, "User not found");
  }

  if (!user.profileImage) {
    throw new AppError(400, "No profile image to delete");
  }

  // Delete from S3
  const imageKey = extractS3KeyFromUrl(user.profileImage);
  if (imageKey) {
    await deleteImageFromS3(imageKey);
  }

  // Remove from database
  await prisma.user.update({
    where: { id: userId },
    data: { profileImage: null },
  });

  return { message: "Profile image deleted successfully" };
};

const uploadProfileImage = async (
  userId: string,
  file: Express.Multer.File,
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, profileImage: true },
  });

  if (!user) {
    throw new AppError(404, "User not found");
  }

  // Upload new image (and delete old one if exists)
  const uploadedImage = await replaceImage(
    user.profileImage,
    file,
    PROFILE_IMAGE_OPTIONS,
  );

  // Update database
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { profileImage: uploadedImage.url },
    select: {
      id: true,
      email: true,
      fullName: true,
      profileImage: true,
      role: true,
    },
  });

  return updatedUser;
};

const getAllUsers = async (query: GetUsersQuery) => {
  // All values are already validated, coerced, and defaulted by Zod
  const { page, limit, sortBy, sortOrder, searchTerm, role } = query;
  const skip = (page - 1) * limit;

  // Build where clause — always exclude soft-deleted users
  const where: Prisma.UserWhereInput = { isDeleted: false };

  if (searchTerm) {
    where.OR = [
      { email: { contains: searchTerm, mode: "insensitive" } },
      { fullName: { contains: searchTerm, mode: "insensitive" } },
    ];
  }

  if (role) {
    where.role = role as UserRole;
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        fullName: true,
        profileImage: true,
        role: true,
        isVerified: true,
        isActive: true,
        isDeleted: true,
        createdAt: true,
        updatedAt: true,
      },
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    meta: buildOffsetListMeta(page, limit, total),
    data: users,
  };
};

const deleteUser = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId, isDeleted: false },
    select: { id: true, profileImage: true },
  });

  if (!user) {
    throw new AppError(404, "User not found");
  }

  // Soft delete — preserves data integrity and audit trail.
  // isDeleted flag is the pattern used everywhere else in this codebase.
  // S3 image is also removed to avoid orphaned storage charges.
  if (user.profileImage) {
    const imageKey = extractS3KeyFromUrl(user.profileImage);
    if (imageKey) {
      deleteImageFromS3(imageKey).catch((err) =>
        console.error("Failed to delete profile image on user delete:", err),
      );
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: { isDeleted: true, isActive: false },
  });

  return { message: "User deleted successfully" };
};

export const UserService = {
  getProfile,
  updateProfile,
  deleteProfileImage,
  uploadProfileImage,
  getAllUsers,
  deleteUser,
};
