import { UserRole } from "@prisma/client";
import config from "./config";
import hashPassword from "./utils/hashPassword";
import { prisma } from "./lib/prisma";
import comparePassword from "./utils/comparePassword";

export const seedAdmin = async (): Promise<void> => {
  try {
    const { email, password, fullName } = config.admin;

    if (!email || !password) {
      throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD are required");
    }

    const hashedPassword = await hashPassword(password);

    // Check if ANY super admin exists (not just by email)
    const existingSuperAdmin = await prisma.user
      .findFirst({
        where: { role: UserRole.SUPER_ADMIN },
      })
      .catch(() => null);

    if (existingSuperAdmin) {
      // Update the existing super admin
      const updates: any = {};
      let hasChanges = false;

      if (existingSuperAdmin.email !== email) {
        updates.email = email;
        hasChanges = true;
      }

      if (existingSuperAdmin.fullName !== fullName) {
        updates.fullName = fullName;
        hasChanges = true;
      }

      // Check if password needs update
      const passwordMatch = await comparePassword(
        password,
        existingSuperAdmin.password,
      );
      if (!passwordMatch) {
        updates.password = hashedPassword;
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
        // Use Prisma update for PostgreSQL
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
      // No super admin exists, create one
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
  } catch (error: any) {
    console.error("❌ Admin seeding failed:", error.message);

    // If there's a data inconsistency, try to fix it
    if (error.code === "P2023") {
      console.log("🔧 Attempting to fix data inconsistency...");
      try {
        // Delete all super admins and recreate
        await prisma.user.deleteMany({
          where: { role: UserRole.SUPER_ADMIN },
        });

        const hashedPassword = await hashPassword(config.admin.password);

        await prisma.user.create({
          data: {
            email: config.admin.email,
            password: hashedPassword,
            fullName: config.admin.fullName,
            role: UserRole.SUPER_ADMIN,
            isVerified: true,
            isActive: true,
            isDeleted: false,
          },
        });
        console.log(
          `✅ Super Admin recreated successfully: ${config.admin.email}`,
        );
      } catch (fixError: any) {
        console.error("❌ Failed to fix data:", fixError.message);
        throw fixError;
      }
    } else {
      throw error;
    }
  }
};
