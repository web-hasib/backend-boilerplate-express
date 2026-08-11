import { z } from "zod";

export const updateUserValidation = {
  body: z.object({
    fullName: z
      .string()
      .min(2, "Full name must be at least 2 characters")
      .max(100, "Full name cannot exceed 100 characters")
      .optional(),
  }),
};

export const getUsersValidation = {
  query: z.object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(10),
    sortBy: z.string().optional(),
    sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
    searchTerm: z.string().optional(),
    role: z.string().optional(),
  }),
};
