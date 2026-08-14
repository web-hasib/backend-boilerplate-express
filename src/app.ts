import express, { Application } from "express";
import compression from "compression";
import corsHandler from "./app/middlewares/corsHandler";
import securityHeaders from "./app/middlewares/securityHeaders";
import config from "./app/config";
import router from "./app/routes";
import notFoundHandler from "./app/middlewares/notFoundHandler";
import globalErrorHandler from "./app/middlewares/globalErrorHandler";
import { apiRateLimiter } from "./app/middlewares/rateLimiter";
import { HealthController } from "./app/modules/health/health.controller";

const app: Application = express();

// Trust reverse proxy (Nginx) for accurate client IP in rate limiters & headers
app.set("trust proxy", 1);

// === COMPRESSION & BODY PARSERS ===
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// === GLOBAL MIDDLEWARES ===
app.use(corsHandler);
app.use(securityHeaders);
app.use(apiRateLimiter);

// === ROOT & HEALTH CHECK ===
app.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to Your API",
    version: "1.0.0",
    server: `${config.backend_url}`,
  });
});

app.get("/health", HealthController.checkHealth);

// === API ROUTES ===
app.use("/api/v1", router);

// === ERROR HANDLERS ===
app.use(notFoundHandler);
app.use(globalErrorHandler);

export default app;
