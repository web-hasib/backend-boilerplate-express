import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import config from "../config";
import logger from "../utils/logger";

// Explicit Connection Pool for High Concurrency
const pool = new pg.Pool({
  connectionString: config.database_url,
  max: config.db_pool_max || 20, // Max concurrent DB connections
  idleTimeoutMillis: 30000, // Close idle connections after 30s
  connectionTimeoutMillis: 5000, // Fail fast if DB connection cannot be acquired in 5s
});

// Critical: Prevent unhandled process crashes on idle connection terminations
pool.on("error", (err) => {
  logger.error("Unexpected error on idle PostgreSQL pool client:", err);
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export { prisma, pool };
