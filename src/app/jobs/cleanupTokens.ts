import { prisma } from "../lib/prisma";

/**
 * Cleanup expired refresh tokens
 */
export const cleanupExpiredRefreshTokens = async (): Promise<number> => {
  const result = await prisma.refreshToken.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  });

  return result.count;
};

/**
 * Cleanup expired and used OTPs
 */
export const cleanupExpiredOTPs = async (): Promise<number> => {
  const result = await prisma.oTP.deleteMany({
    where: {
      OR: [
        // Delete expired OTPs
        { expiresAt: { lt: new Date() } },
        // Delete used OTPs older than 7 days
        {
          isUsed: true,
          createdAt: {
            lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      ],
    },
  });

  return result.count;
};

/**
 * Run all cleanup tasks
 */
const runAllCleanupTasks = async (): Promise<void> => {
  console.log("🧹 Starting cleanup tasks...");

  try {
    const [deletedTokens, deletedOTPs] = await Promise.all([
      cleanupExpiredRefreshTokens(),
      cleanupExpiredOTPs(),
    ]);

    console.log(`✅ Cleanup completed successfully:`);
    console.log(`   - Deleted ${deletedTokens} expired refresh tokens`);
    console.log(`   - Deleted ${deletedOTPs} expired/used OTPs`);
  } catch (error) {
    console.error("❌ Cleanup failed:", error);
    throw error; // Re-throw to handle in calling function if needed
  }
};

/**
 * Start the cleanup job that runs periodically
 */
export const startTokenCleanupJob = () => {
  console.log("🔧 Initializing cleanup job...");

  // Run cleanup immediately on startup
  runAllCleanupTasks().catch((error) => {
    console.error("❌ Initial cleanup failed:", error);
  });

  // Run cleanup every 24 hours
  const intervalId = setInterval(
    () => {
      runAllCleanupTasks().catch((error) => {
        console.error("❌ Scheduled cleanup failed:", error);
      });
    },
    24 * 60 * 60 * 1000,
  ); // 24 hours in milliseconds

  console.log("✅ Cleanup job scheduled (runs every 24 hours)");

  // Return interval ID for potential cleanup/testing
  return intervalId;
};
