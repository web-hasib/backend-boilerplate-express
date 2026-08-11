import app from "./app";
import config from "./config";
import { startTokenCleanupJob } from "./jobs/cleanupTokens";
import { prisma } from "./lib/prisma";
import { seedAdmin } from "./seedSuperAdmin";

const PORT = config.port;

async function startServer() {
  try {
    // Test database connection
    await prisma.$connect();
    console.log("✅ Database connected successfully");

    // Start cleanup job for expired tokens and OTPs
    startTokenCleanupJob();

    // Seed admin automatically
    await seedAdmin();

    // Start server
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`📦 Environment: ${config.env}`);
      console.log(`🏥 Server: ${config.backend_url}`);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n${signal} received. Shutting down gracefully...`);

      server.close(async () => {
        console.log("✅ HTTP server closed");

        try {
          await prisma.$disconnect();
          console.log("✅ Database connections closed");
          process.exit(0);
        } catch (error) {
          console.error("❌ Error during database disconnect:", error);
          process.exit(1);
        }
      });

      setTimeout(() => {
        console.error("⚠️ Forced shutdown after 10s timeout");
        process.exit(1);
      }, 10000);
    };

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

process.on("unhandledRejection", (reason: any) => {
  console.error("❌ Unhandled Rejection:", reason);
  process.exit(1);
});

process.on("uncaughtException", (error: Error) => {
  console.error("❌ Uncaught Exception:", error);
  process.exit(1);
});

startServer();
