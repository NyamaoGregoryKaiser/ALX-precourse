```typescript
import nodemailer from 'nodemailer';
import { config } from '../config';
import { logger } from '../utils/logger';

class MailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport(config.email.smtp);
    this.verifyConnection();
  }

  private async verifyConnection() {
    try {
      await this.transporter.verify();
      logger.info('Email transporter connected successfully to SMTP server.');
    } catch (error) {
      logger.error('Failed to connect to email SMTP server. Check configuration.', error);
      // In production, you might want to exit or send an alert.
      // process.exit(1);
    }
  }

  public async sendEmail(to: string, subject: string, html: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: config.email.from,
        to,
        subject,
        html,
      });
      logger.info(`Email sent to ${to} with subject: "${subject}"`);
    } catch (error) {
      logger.error(`Error sending email to ${to}:`, error);
      throw new Error(`Could not send email to ${to}`);
    }
  }

  public async sendVerificationEmail(to: string, userName: string, token: string): Promise<void> {
    const verifyEmailUrl = `${config.clientUrl}/verify-email?token=${token}`;
    const subject = 'Verify Your Email Address for Our Application';
    const html = `
      <p>Hi ${userName},</p>
      <p>Thank you for registering! Please click on the link below to verify your email address:</p>
      <p><a href="${verifyEmailUrl}">Verify Email</a></p>
      <p>This link will expire in ${config.jwt.verifyEmailExpirationMinutes} minutes.</p>
      <p>If you did not request this, please ignore this email.</p>
      <p>Regards,<br/>The Authentication System Team</p>
    `;
    await this.sendEmail(to, subject, html);
  }

  public async sendResetPasswordEmail(to: string, userName: string, token: string): Promise<void> {
    const resetPasswordUrl = `${config.clientUrl}/reset-password?token=${token}`;
    const subject = 'Reset Your Password for Our Application';
    const html = `
      <p>Hi ${userName},</p>
      <p>You recently requested to reset your password for your account.</p>
      <p>Please click on the link below to reset your password:</p>
      <p><a href="${resetPasswordUrl}">Reset Password</a></p>
      <p>This link will expire in ${config.jwt.resetPasswordExpirationMinutes} minutes.</p>
      <p>If you did not request a password reset, please ignore this email.</p>
      <p>Regards,<br/>The Authentication System Team</p>
    `;
    await this.sendEmail(to, subject, html);
  }
}

export const mailService = new MailService();
```