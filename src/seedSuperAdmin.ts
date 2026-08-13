import { UserRole } from "@prisma/client";
import config from "./app/config";
import hashPassword from "./app/utils/hashPassword";
import { prisma } from "./app/lib/prisma";
import comparePassword from "./app/utils/comparePassword";

export const seedAdmin = async (): Promise<void> => {
  try {
    const { email, password, fullName } = config.admin;

    if (!email || !password) {
      throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD are required");
    }

    // Check if ANY super admin exists (not just by email)
    const existingSuperAdmin = await prisma.user
      .findFirst({
        where: { role: UserRole.SUPER_ADMIN },
      })
      .catch(() => null);

    if (existingSuperAdmin) {
      // Update the existing super admin
      const updates: Record<string, unknown> = {};
      let hasChanges = false;

      if (existingSuperAdmin.email !== email) {
        updates.email = email;
        hasChanges = true;
      }

      if (existingSuperAdmin.fullName !== fullName) {
        updates.fullName = fullName;
        hasChanges = true;
      }

      // Only hash + compare password when necessary (bcrypt is ~300ms at cost 12)
      const passwordMatch = await comparePassword(
        password,
        existingSuperAdmin.password,
      );
      if (!passwordMatch) {
        updates.password = await hashPassword(password);
        hasChanges = true;
      }

      if (!existingSuperAdmin.isVerified) {
        updates.isVerified = true;
        hasChanges = true;
      }

      if (!existingSuperAdmin.isActive) {
        updates.isActive = true;
        hasChanges = true;
      }

      if (existingSuperAdmin.isDeleted) {
        updates.isDeleted = false;
        hasChanges = true;
      }

      if (hasChanges) {
        await prisma.user.update({
          where: { id: existingSuperAdmin.id },
          data: updates,
        });
        console.log(
          `✅ Super Admin updated: ${email}${
            existingSuperAdmin.email !== email
              ? ` (previously: ${existingSuperAdmin.email})`
              : ""
          }`,
        );
      } else {
        console.log(`✅ Super Admin already exists: ${email}`);
      }
    } else {
      // No super admin exists — hash password only when creating
      const hashedPassword = await hashPassword(password);
      await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          fullName,
          role: UserRole.SUPER_ADMIN,
          isVerified: true,
          isActive: true,
          isDeleted: false,
        },
      });
      console.log(`✅ Super Admin created: ${email}`);
    }
  } catch (error: unknown) {
    const err = error as Error & { code?: string };

    // P2002: Unique constraint failed — another container replica created the admin simultaneously
    if (err.code === "P2002") {
      console.log(
        "✅ Super Admin was created concurrently by another replica.",
      );
      return;
    }

    console.error("❌ Admin seeding failed:", err.message);
  }
};
