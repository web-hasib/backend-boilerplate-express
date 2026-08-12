import config from "../config";

// ==========================================
// 1. TYPES & ENUMS
// ==========================================
export enum EmailType {
  SIGNUP_OTP = "SIGNUP_OTP",
  FORGOT_PASSWORD_OTP = "FORGOT_PASSWORD_OTP",
}

export interface IEmailResult {
  subject: string;
  html: string;
  text: string;
}

export interface ISignupOTPPayload {
  otp: string;
  expiryMinutes: number;
}

export interface IForgotPasswordOTPPayload {
  otp: string;
  expiryMinutes: number;
}

export type EmailPayloadMap = {
  [EmailType.SIGNUP_OTP]: ISignupOTPPayload;
  [EmailType.FORGOT_PASSWORD_OTP]: IForgotPasswordOTPPayload;
};

// ==========================================
// 2. HELPERS (XSS Prevention & Plain Text)
// ==========================================
export const escapeHTML = (str: string): string => {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

export const htmlToText = (html: string): string => {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\n\s*\n/g, "\n\n")
    .trim();
};

// ==========================================
// 3. BASE HTML LAYOUT
// ==========================================
interface IBaseLayoutOptions {
  title: string;
  contentBody: string;
  plainTextBody?: string;
  senderName?: string;
}

export const renderBaseLayout = ({
  title,
  contentBody,
  plainTextBody,
  senderName = config.smtp.from_name,
}: IBaseLayoutOptions): { html: string; text: string } => {
  const sanitizedTitle = escapeHTML(title);
  const sanitizedSenderName = escapeHTML(senderName);

  const html = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333333;
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
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            overflow: hidden;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #ffffff;
            padding: 32px 24px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
          }
          .content {
            padding: 32px 24px;
          }
          .otp-box { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #ffffff;
            padding: 20px;
            text-align: center;
            font-size: 36px;
            font-weight: 700;
            letter-spacing: 8px;
            border-radius: 8px;
            margin: 24px 0;
          }
          .info-text {
            background: #f8f9fa;
            padding: 16px;
            border-left: 4px solid #667eea;
            margin: 20px 0;
            border-radius: 4px;
          }
          .footer { 
            margin-top: 32px;
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
            font-size: 12px;
            color: #666666;
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
            <h1>${sanitizedTitle}</h1>
          </div>
          <div class="content">
            ${contentBody}
            <div class="footer">
              <p><strong>This is an automated message. Please do not reply to this email.</strong></p>
              <p>© ${new Date().getFullYear()} ${sanitizedSenderName}. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `.trim();

  const text = plainTextBody
    ? `${title}\n\n${plainTextBody}\n\n© ${new Date().getFullYear()} ${senderName}. All rights reserved.`
    : htmlToText(html);

  return { html, text };
};

// ==========================================
// 4. INDIVIDUAL TEMPLATE BUILDERS
// ==========================================

export const templates = {
  [EmailType.SIGNUP_OTP]: ({
    otp,
    expiryMinutes,
  }: ISignupOTPPayload): IEmailResult => {
    const subject = "Verify Your Account";
    const sanitizedOTP = escapeHTML(otp);

    const contentBody = `
      <p>Welcome! Please verify your email address to complete your registration.</p>
      
      <div class="otp-box">${sanitizedOTP}</div>
      
      <div class="info-text">
        <p style="margin: 0;"><strong>⏱️ Valid for ${expiryMinutes} minutes</strong></p>
      </div>
      
      <p>Enter this code to complete your signup process.</p>
      
      <p class="warning">⚠️ If you didn't request this code, please ignore this email and ensure your account is secure.</p>
    `;

    const plainTextBody = `Welcome! Please verify your email address to complete your registration.

Your Verification OTP: ${otp}
Valid for ${expiryMinutes} minutes.

If you didn't request this code, please ignore this email.`;

    const { html, text } = renderBaseLayout({
      title: subject,
      contentBody,
      plainTextBody,
    });
    return { subject, html, text };
  },

  [EmailType.FORGOT_PASSWORD_OTP]: ({
    otp,
    expiryMinutes,
  }: IForgotPasswordOTPPayload): IEmailResult => {
    const subject = "Reset Your Password";
    const sanitizedOTP = escapeHTML(otp);

    const contentBody = `
      <p>You've requested to reset your password.</p>
      
      <div class="otp-box">${sanitizedOTP}</div>
      
      <div class="info-text">
        <p style="margin: 0;"><strong>⏱️ Valid for ${expiryMinutes} minutes</strong></p>
      </div>
      
      <p>Enter this code to complete your password reset.</p>
      
      <p class="warning">⚠️ If you didn't request this code, please ignore this email and ensure your account is secure.</p>
    `;

    const plainTextBody = `You've requested to reset your password.

Your Reset Password OTP: ${otp}
Valid for ${expiryMinutes} minutes.

If you didn't request this code, please ignore this email.`;

    const { html, text } = renderBaseLayout({
      title: subject,
      contentBody,
      plainTextBody,
    });
    return { subject, html, text };
  },
};

// ==========================================
// 5. UNIFIED TEMPLATE RENDERER
// ==========================================
export const renderEmailTemplate = <K extends EmailType>(
  type: K,
  payload: EmailPayloadMap[K],
): IEmailResult => {
  const templateFn = templates[type] as (
    payload: EmailPayloadMap[K],
  ) => IEmailResult;
  if (!templateFn) {
    throw new Error(`No email template registered for type '${type}'`);
  }
  return templateFn(payload);
};
