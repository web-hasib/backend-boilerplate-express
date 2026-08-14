import { prisma } from "../lib/prisma";
import logger from "../utils/logger";

/**
 * Cleanup expired and old revoked refresh tokens
 */
export const cleanupExpiredRefreshTokens = async (): Promise<number> => {
  const result = await prisma.refreshToken.deleteMany({
    where: {
      OR: [
        // Delete expired refresh tokens
        { expiresAt: { lt: new Date() } },
        // Delete revoked refresh tokens older than 7 days
        {
          isRevoked: true,
          updatedAt: {
            lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      ],
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
 * Start the cleanup job that runs periodically.
 * Startup jitter spreads the load across replicas so that multiple pods
 * starting simultaneously do not all hammer the DB at the same instant.
 */
export const startTokenCleanupJob = () => {
  logger.info("🔧 Initializing background cleanup job...");

  // Random jitter between 0 and 5 minutes so replicas do not collide
  const jitterMs = Math.floor(Math.random() * 5 * 60 * 1000);

  // Delay initial run by jitter, then schedule every 24 hours
  const timeoutId = setTimeout(() => {
    runAllCleanupTasks().catch((error) => {
      logger.error("❌ Initial cleanup failed:", error);
    });

    const intervalId = setInterval(
      () => {
        runAllCleanupTasks().catch((error) => {
          logger.error("❌ Scheduled cleanup failed:", error);
        });
      },
      24 * 60 * 60 * 1000,
    );

    // Return the interval ID via the outer closure so graceful shutdown can
    // clear it. We store it on the timeout ref object for access below.
    (
      timeoutId as unknown as { _intervalId: ReturnType<typeof setInterval> }
    )._intervalId = intervalId;
  }, jitterMs);

  logger.info(
    `✅ Cleanup job scheduled (first run in ~${Math.round(jitterMs / 1000)}s, then every 24 hours)`,
  );

  return timeoutId;
};
