import AppError from "../../errors/AppError";
import { prisma } from "../../lib/prisma";
import calculatePagination from "../../utils/paginationHelper";
import {
  deleteImageFromS3,
  extractS3KeyFromUrl,
  replaceImage,
} from "../../utils/s3Uploader";

interface IUpdateUserRequest {
  fullName?: string;
}

interface IUserFilterRequest {
  searchTerm?: string;
  role?: string;
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
    const uploadedImage = await replaceImage(user.profileImage, file, {
      folder: "profiles",
      resize: {
        width: 400,
        height: 400,
        fit: "cover",
      },
      quality: 85,
    });

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
  const uploadedImage = await replaceImage(user.profileImage, file, {
    folder: "profiles",
    resize: {
      width: 400,
      height: 400,
      fit: "cover",
    },
    quality: 85,
  });

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

const getAllUsers = async (
  options: Record<string, unknown>,
  filters: IUserFilterRequest,
) => {
  const { page, limit, skip, sortBy, sortOrder } = calculatePagination(options);

  const where: Record<string, unknown> = {};

  if (filters.searchTerm) {
    where.OR = [
      { email: { contains: filters.searchTerm, mode: "insensitive" } },
      { fullName: { contains: filters.searchTerm, mode: "insensitive" } },
    ];
  }

  if (filters.role) {
    where.role = filters.role;
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
    meta: { page, limit, total },
    data: users,
  };
};

const deleteUser = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, profileImage: true },
  });

  if (!user) {
    throw new AppError(404, "User not found");
  }

  // Delete profile image from S3 if exists
  if (user.profileImage) {
    const imageKey = extractS3KeyFromUrl(user.profileImage);
    if (imageKey) {
      await deleteImageFromS3(imageKey);
    }
  }

  // Delete user (cascade will handle related records)
  await prisma.user.delete({
    where: { id: userId },
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
