import nodemailer from "nodemailer";
import config from "../config";

interface IEmailOptions {
  to: string;
  subject: string;
  htmlContent: string;
}

const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: config.smtp.port === 465,
  auth: {
    user: config.smtp.user,
    pass: config.smtp.pass,
  },
});

const sendEmail = async (options: IEmailOptions): Promise<void> => {
  try {
    const info = await transporter.sendMail({
      from: `"${config.smtp.from_name}" <${config.smtp.from_email}>`,
      to: options.to,
      subject: options.subject,
      html: options.htmlContent,
    });

    console.log(`Email sent successfully to ${options.to}. MessageId: ${info.messageId}`);
  } catch (error: any) {
    console.error("Failed to send email via SMTP:", {
      to: options.to,
      subject: options.subject,
      message: error.message,
    });

    throw new Error(`Email delivery failed: ${error.message || "Failed to send email"}`);
  }
};

export const sendOTPEmail = async (
  email: string,
  otp: string,
  type: string,
): Promise<void> => {
  const subjects: Record<string, string> = {
    SIGNUP: "Verify Your Account",
    FORGOT_PASSWORD: "Reset Your Password",
  };

  const messages: Record<string, string> = {
    SIGNUP:
      "Welcome! Please verify your email address to complete your registration.",
    FORGOT_PASSWORD: "You've requested to reset your password.",
  };

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f5f5f5;
          }
          .container { 
            max-width: 600px;
            margin: 40px auto;
            padding: 0;
            background: #ffffff;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 8px 8px 0 0;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
          }
          .content {
            padding: 30px;
          }
          .otp-box { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            text-align: center;
            font-size: 36px;
            font-weight: bold;
            letter-spacing: 8px;
            border-radius: 8px;
            margin: 25px 0;
          }
          .info-text {
            background: #f8f9fa;
            padding: 15px;
            border-left: 4px solid #667eea;
            margin: 20px 0;
            border-radius: 4px;
          }
          .footer { 
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
            font-size: 12px;
            color: #666;
            text-align: center;
          }
          .warning {
            color: #dc3545;
            font-weight: 600;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${subjects[type] || "Verification Code"}</h1>
          </div>
          <div class="content">
            <p>${messages[type] || "Your verification code is ready."}</p>
            
            <div class="otp-box">${otp}</div>
            
            <div class="info-text">
              <p style="margin: 0;"><strong>⏱️ Valid for ${
                config.otp_expiry_minutes
              } minutes</strong></p>
            </div>
            
            <p>Enter this code to complete your ${type
              .toLowerCase()
              .replace(/_/g, " ")}.</p>
            
            <p class="warning">⚠️ If you didn't request this code, please ignore this email and ensure your account is secure.</p>
            
            <div class="footer">
              <p><strong>This is an automated message. Please do not reply to this email.</strong></p>
              <p>© ${new Date().getFullYear()} ${
                config.smtp.from_name
              }. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  await sendEmail({
    to: email,
    subject: subjects[type] || "Verification Code",
    htmlContent,
  });
};

export default sendEmail;
