import express, { Application } from "express";
import corsHandler from "./app/middlewares/corsHandler";
import securityHeaders from "./app/middlewares/securityHeaders";
import config from "./app/config";
import router from "./app/routes";
import notFoundHandler from "./app/middlewares/notFoundHandler";
import globalErrorHandler from "./app/middlewares/globalErrorHandler";

const app: Application = express();

// === BODY PARSERS ===
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// === GLOBAL MIDDLEWARES ===
app.use(corsHandler);
app.use(securityHeaders);

// === ROOT ===
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to Your API",
    version: "1.0.0",
    server: `${config.backend_url}`,
  });
});

// === API ROUTES ===
app.use("/api/v1", router);

// === ERROR HANDLERS ===
app.use(notFoundHandler);
app.use(globalErrorHandler);

export default app;
