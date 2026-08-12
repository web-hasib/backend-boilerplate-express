import nodemailer, { Transporter } from "nodemailer";
import config from "../config";
import {
  EmailType,
  EmailPayloadMap,
  renderEmailTemplate,
  IEmailResult,
} from "./email.templates";

export interface ISendEmailOptions {
  to: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
}

/**
 * Enterprise-Grade Email Service Singleton (Optimized for Speed, Security & High Deliverability)
 */
export class EmailService {
  private static instance: EmailService;
  private transporter: Transporter;

  private constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465, // SSL for 465, STARTTLS for 587
      requireTLS: config.smtp.port === 587, // Enforce TLS security for port 587
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass,
      },
      // 🚀 Performance: SMTP Connection Pooling & KeepAlive
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      rateDelta: 1000,
      rateLimit: 5,
      // ⏱️ Network Timeouts to prevent event loop blocking
      connectionTimeout: 5000,
      socketTimeout: 10000,
    });
  }

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  /**
   * Health check for SMTP connection on startup or monitoring.
   */
  public async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log("✅ SMTP Connection verified & ready.");
      return true;
    } catch (error: any) {
      console.error("❌ SMTP Connection verification failed:", error.message);
      return false;
    }
  }

  /**
   * Sends email with Anti-Spam headers, TLS Encryption, and High Priority.
   */
  public async sendMail(options: ISendEmailOptions): Promise<void> {
    try {
      const info = await this.transporter.sendMail({
        from: `"${config.smtp.from_name}" <${config.smtp.from_email}>`,
        to: options.to,
        subject: options.subject,
        html: options.htmlContent,
        text: options.textContent,
        // 🎯 Deliverability & Anti-Spam Headers
        headers: {
          "X-Priority": "1", // High Priority for transactional OTP
          "X-MSMail-Priority": "High",
          Importance: "high",
          "Auto-Submitted": "auto-generated", // Prevents auto-responders & assists inbox classification
        },
      });

      console.log(
        `✉️ Email delivered successfully to [${options.to}]. MessageId: ${info.messageId}`,
      );
    } catch (error: any) {
      console.error("❌ Failed to send email via SMTP:", {
        to: options.to,
        subject: options.subject,
        message: error.message,
      });
      throw new Error(`Email delivery failed: ${error.message || "Unknown error"}`);
    }
  }

  /**
   * Type-safe templated email dispatch.
   */
  public async sendTemplate<K extends EmailType>(
    type: K,
    to: string,
    payload: EmailPayloadMap[K],
  ): Promise<void> {
    const rendered: IEmailResult = renderEmailTemplate(type, payload);
    await this.sendMail({
      to,
      subject: rendered.subject,
      htmlContent: rendered.html,
      textContent: rendered.text,
    });
  }
}

export const emailService = EmailService.getInstance();

export const sendEmail = async (options: ISendEmailOptions): Promise<void> => {
  return emailService.sendMail(options);
};

export const sendOTPEmail = async (
  email: string,
  otp: string,
  type: string,
): Promise<void> => {
  const expiryMinutes = config.otp_expiry_minutes;

  const emailType =
    type === "FORGOT_PASSWORD"
      ? EmailType.FORGOT_PASSWORD_OTP
      : EmailType.SIGNUP_OTP;

  await emailService.sendTemplate(emailType, email, {
    otp,
    expiryMinutes,
  });
};

export default sendEmail;
