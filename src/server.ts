import app from "./app";
import config from "./app/config";
import { startTokenCleanupJob } from "./app/jobs/cleanupTokens";
import { prisma, pool } from "./app/lib/prisma";
import { seedAdmin } from "./seedSuperAdmin";
import logger from "./app/utils/logger";

const PORT = config.port;

async function startServer() {
  try {
    // Test database connection
    await prisma.$connect();
    logger.info("✅ Database connected successfully");

    // Start cleanup job for expired tokens and OTPs
    const cleanupIntervalId = startTokenCleanupJob();

    // Seed admin automatically (non-blocking for startup)
    try {
      await seedAdmin();
    } catch (seedErr) {
      logger.warn("⚠️ Admin seeding warning:", seedErr);
    }

    // Start server
    const server = app.listen(Number(PORT), "0.0.0.0", () => {
      logger.info(`🚀 Server running on port ${PORT} [${config.env}]`);
      logger.info(`🏥 Base URL: ${config.backend_url}`);
    });

    // Graceful shutdown
    let isShuttingDown = false;
    const gracefulShutdown = async (signal: string) => {
      if (isShuttingDown) return;
      isShuttingDown = true;
      logger.info(`\n${signal} received. Shutting down gracefully...`);

      // Stop cleanup job timer
      clearInterval(cleanupIntervalId);

      server.close(async () => {
        logger.info("✅ HTTP server closed");

        try {
          await prisma.$disconnect();
          await pool.end();
          logger.info("✅ Database connection pool drained and closed");
          process.exit(0);
        } catch (error) {
          logger.error("❌ Error during database pool shutdown:", error);
          process.exit(1);
        }
      });

      setTimeout(() => {
        logger.error("⚠️ Forced shutdown after 10s timeout");
        process.exit(1);
      }, 10000).unref();
    };

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  } catch (error) {
    logger.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

process.on("unhandledRejection", (reason: unknown) => {
  logger.error("❌ Unhandled Rejection:", reason);
  process.exit(1);
});

process.on("uncaughtException", (error: Error) => {
  logger.error("❌ Uncaught Exception:", error);
  process.exit(1);
});

startServer();

