import AppError from "../../errors/AppError";
import { prisma } from "../../lib/prisma";
import { Prisma, UserRole, UserStatus } from "@prisma/client";
import { buildOffsetListMeta } from "../../utils/listQuery";
import { deleteImageFromS3, extractS3KeyFromUrl } from "../../utils/s3Uploader";
import logger from "../../utils/logger";
import type { GetUsersQuery } from "./user.validation";

interface IUpdateUserRequest {
  fullName?: string;
  profileImage?: string | null;
}

const getProfile = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      fullName: true,
      profileImage: true,
      role: true,
      status: true,
      isVerified: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) throw new AppError(404, "User not found");
  return user;
};

const updateProfile = async (userId: string, payload: IUpdateUserRequest) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, profileImage: true },
  });

  if (!user) {
    throw new AppError(404, "User not found");
  }

  const updateData: Record<string, unknown> = {};

  if (payload.fullName !== undefined) {
    updateData.fullName = payload.fullName;
  }

  // If a new profile image URL is supplied, clean up the old image from S3
  if (
    payload.profileImage !== undefined &&
    payload.profileImage !== user.profileImage
  ) {
    if (user.profileImage) {
      const oldKey = extractS3KeyFromUrl(user.profileImage);
      if (oldKey) {
        deleteImageFromS3(oldKey).catch((err) =>
          logger.error("Failed to delete previous profile image from S3:", {
            error: err,
            oldKey,
          }),
        );
      }
    }
    updateData.profileImage = payload.profileImage;
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
      status: true,
      isVerified: true,
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

const getAllUsers = async (query: GetUsersQuery) => {
  // All values are already validated, coerced, and defaulted by Zod
  const { page, limit, sortBy, sortOrder, searchTerm, role } = query;
  const skip = (page - 1) * limit;

  // Build where clause — always exclude soft-deleted users
  const where: Prisma.UserWhereInput = { status: { not: UserStatus.DELETED } };

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
        status: true,
        isVerified: true,
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
    where: { id: userId, status: { not: UserStatus.DELETED } },
    select: { id: true, role: true, profileImage: true },
  });

  if (!user) {
    throw new AppError(404, "User not found");
  }

  // Prevent Super Admin account deletion
  if (user.role === UserRole.SUPER_ADMIN) {
    throw new AppError(403, "Super Admin accounts cannot be deleted");
  }

  // Soft delete — preserves data integrity and audit trail.
  // Atomically update user status, clear dangling image, revoke tokens, and purge active OTPs.
  if (user.profileImage) {
    const imageKey = extractS3KeyFromUrl(user.profileImage);
    if (imageKey) {
      deleteImageFromS3(imageKey).catch((err) =>
        logger.error("Failed to delete profile image on user delete:", {
          error: err,
        }),
      );
    }
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { status: UserStatus.DELETED, profileImage: null },
    }),
    prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    }),
    prisma.oTP.deleteMany({
      where: { userId },
    }),
  ]);

  return { message: "User deleted successfully" };
};

export const UserService = {
  getProfile,
  updateProfile,
  deleteProfileImage,
  getAllUsers,
  deleteUser,
};
