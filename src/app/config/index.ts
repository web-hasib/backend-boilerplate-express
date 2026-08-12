import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env") });

export default {
  env: process.env.NODE_ENV || "development",
  port: process.env.PORT || 5000,
  database_url: process.env.DATABASE_URL!,

  client_url: process.env.CLIENT_URL!,
  backend_url: process.env.BACKEND_URL!,

  jwt: {
    access_secret: process.env.JWT_ACCESS_SECRET!,
    access_expires_in: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
    refresh_secret: process.env.JWT_REFRESH_SECRET!,
    refresh_expires_in: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
    // Separate secret for password-reset tokens — must NOT share with access tokens
    reset_secret: process.env.JWT_RESET_SECRET!,
  },


  smtp: {
    host: process.env.SMTP_HOST || "smtp-relay.brevo.com",
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER!,
    pass: process.env.SMTP_PASS!,
    from_email: process.env.SMTP_FROM_EMAIL!,
    from_name: process.env.SMTP_FROM_NAME || "Hasan Jamil",
  },

  otp_expiry_minutes: Number(process.env.OTP_EXPIRY_MINUTES) || 5,

  admin: {
    email: process.env.ADMIN_EMAIL!,
    password: process.env.ADMIN_PASSWORD!,
    fullName: process.env.ADMIN_FULL_NAME || "Admin User",
  },

  aws: {
    region: process.env.AWS_REGION!,
    access_key_id: process.env.AWS_ACCESS_KEY_ID!,
    secret_access_key: process.env.AWS_SECRET_ACCESS_KEY!,
    s3_bucket_name: process.env.AWS_S3_BUCKET_NAME!,
  },
};
