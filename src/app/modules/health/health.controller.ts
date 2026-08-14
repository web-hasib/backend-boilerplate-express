import { Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import config from "../../config";
import logger from "../../utils/logger";

const checkHealth = async (_req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  let dbStatus = "connected";

  try {
    // Fast database ping
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    dbStatus = "disconnected";
    logger.error("Database health check failed:", error);
  }

  const responseTimeMs = Date.now() - startTime;
  const isHealthy = dbStatus === "connected";
  const mem = process.memoryUsage();

  const data = {
    status: isHealthy ? "OK" : "DEGRADED",
    database: dbStatus,
    environment: config.env,
    nodeVersion: process.version,
    uptimeSeconds: Math.floor(process.uptime()),
    responseTimeMs,
    memory: {
      heapUsedMb: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100,
      heapTotalMb: Math.round((mem.heapTotal / 1024 / 1024) * 100) / 100,
      rssMb: Math.round((mem.rss / 1024 / 1024) * 100) / 100,
    },
    timestamp: new Date().toISOString(),
  };

  res.status(isHealthy ? 200 : 503).json({
    success: isHealthy,
    message: isHealthy
      ? "All systems operational"
      : "Database service degraded",
    data,
  });
};

export const HealthController = {
  checkHealth,
};
