import { envVars } from "./env";

const config = {
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
} as const;

export default config;
