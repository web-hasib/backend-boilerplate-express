import dotenv from "dotenv";
import path from "path";
import { z } from "zod";

dotenv.config({ path: path.join(process.cwd(), ".env") });

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(5000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DIRECT_URL: z.string().optional(),

  CLIENT_URL: z.string().default("http://localhost:3000"),
  BACKEND_URL: z.string().default("http://localhost:5000"),

  JWT_ACCESS_SECRET: z.string().min(16, "JWT_ACCESS_SECRET is required (min 16 chars)"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_SECRET: z.string().min(16, "JWT_REFRESH_SECRET is required (min 16 chars)"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
  JWT_RESET_SECRET: z.string().min(16, "JWT_RESET_SECRET is required (min 16 chars)"),

  SMTP_HOST: z.string().default("smtp-relay.brevo.com"),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().default(""),
  SMTP_PASS: z.string().default(""),
  SMTP_FROM_EMAIL: z.string().default("no-reply@example.com"),
  SMTP_FROM_NAME: z.string().default("Backend App"),

  OTP_EXPIRY_MINUTES: z.coerce.number().default(5),

  ADMIN_EMAIL: z.string().default("admin@example.com"),
  ADMIN_PASSWORD: z.string().default("Admin1234!"),
  ADMIN_FULL_NAME: z.string().default("Admin User"),

  AWS_REGION: z.string().default("us-east-1"),
  AWS_ACCESS_KEY_ID: z.string().default(""),
  AWS_SECRET_ACCESS_KEY: z.string().default(""),
  AWS_S3_BUCKET_NAME: z.string().default(""),

  GOOGLE_CLIENT_ID: z.string().default(""),
  DB_POOL_MAX: z.coerce.number().default(20),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("❌ Invalid environment variables configuration:");
  parsedEnv.error.issues.forEach((issue) => {
    console.error(`   • [${issue.path.join(".")}] : ${issue.message}`);
  });
  process.exit(1);
}

const envVars = parsedEnv.data;

export default {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  database_url: envVars.DATABASE_URL,
  direct_url: envVars.DIRECT_URL,

  client_url: envVars.CLIENT_URL,
  backend_url: envVars.BACKEND_URL,

  jwt: {
    access_secret: envVars.JWT_ACCESS_SECRET,
    access_expires_in: envVars.JWT_ACCESS_EXPIRES_IN,
    refresh_secret: envVars.JWT_REFRESH_SECRET,
    refresh_expires_in: envVars.JWT_REFRESH_EXPIRES_IN,
    // Dedicated secret for password-reset tokens
    reset_secret: envVars.JWT_RESET_SECRET,
  },

  smtp: {
    host: envVars.SMTP_HOST,
    port: envVars.SMTP_PORT,
    user: envVars.SMTP_USER,
    pass: envVars.SMTP_PASS,
    from_email: envVars.SMTP_FROM_EMAIL,
    from_name: envVars.SMTP_FROM_NAME,
  },

  otp_expiry_minutes: envVars.OTP_EXPIRY_MINUTES,

  admin: {
    email: envVars.ADMIN_EMAIL,
    password: envVars.ADMIN_PASSWORD,
    fullName: envVars.ADMIN_FULL_NAME,
  },

  aws: {
    region: envVars.AWS_REGION,
    access_key_id: envVars.AWS_ACCESS_KEY_ID,
    secret_access_key: envVars.AWS_SECRET_ACCESS_KEY,
    s3_bucket_name: envVars.AWS_S3_BUCKET_NAME,
  },

  google: {
    client_id: envVars.GOOGLE_CLIENT_ID,
  },

  db_pool_max: envVars.DB_POOL_MAX,
};


