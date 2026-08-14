import cors from "cors";
import config from "../config";

const allowedOrigins = config.client_url
  ? config.client_url.split(",").map((origin) => origin.trim()).filter(Boolean)
  : [];

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests with no origin (like mobile apps, curl, Postman, server-to-server)
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Return false without throwing an error so the browser blocks it cleanly
    // without triggering a 500 Internal Server Error in Express.
    return callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  maxAge: 86400, // 24 hours preflight cache
  optionsSuccessStatus: 200,
};

export default cors(corsOptions);

