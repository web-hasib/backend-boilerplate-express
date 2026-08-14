import { prisma } from "../lib/prisma";
import logger from "../utils/logger";

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
  logger.info("🧹 Starting token and OTP cleanup tasks...");

  try {
    const [deletedTokens, deletedOTPs] = await Promise.all([
      cleanupExpiredRefreshTokens(),
      cleanupExpiredOTPs(),
    ]);

    logger.info("✅ Cleanup completed successfully:", {
      deletedTokens,
      deletedOTPs,
    });
  } catch (error) {
    logger.error("❌ Cleanup failed:", error);
    throw error;
  }
};

/**
 * Start the cleanup job that runs periodically
 */
export const startTokenCleanupJob = () => {
  logger.info("🔧 Initializing background cleanup job...");

  // Run cleanup immediately on startup
  runAllCleanupTasks().catch((error) => {
    logger.error("❌ Initial cleanup failed:", error);
  });

  // Run cleanup every 24 hours
  const intervalId = setInterval(
    () => {
      runAllCleanupTasks().catch((error) => {
        logger.error("❌ Scheduled cleanup failed:", error);
      });
    },
    24 * 60 * 60 * 1000,
  );

  logger.info("✅ Cleanup job scheduled (runs every 24 hours)");

  return intervalId;
};
