import { z } from "zod";
import { UserRole } from "@prisma/client";

export const updateUserValidation = {
  body: z.object({
    fullName: z
      .string()
      .trim()
      .min(2, "Full name must be at least 2 characters")
      .max(100, "Full name cannot exceed 100 characters")
      .optional(),
    profileImage: z
      .string()
      .url("Invalid profile image URL")
      .nullable()
      .optional(),
  }),
};

export const userIdParamValidation = {
  params: z.object({
    id: z.string().uuid("Invalid user ID format"),
  }),
};

// Allowed sort columns — enforced at schema level, not scattered across service/helper
const USER_SORT_FIELDS = [
  "createdAt",
  "updatedAt",
  "fullName",
  "email",
] as const;

export const getUsersValidation = {
  query: z.object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(10),
    sortBy: z.enum(USER_SORT_FIELDS).optional().default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
    searchTerm: z.string().trim().optional(),
    role: z.nativeEnum(UserRole).optional(),
  }),
};

// Inferred type — single source of truth used by controller AND service
export type GetUsersQuery = z.infer<typeof getUsersValidation.query>;
