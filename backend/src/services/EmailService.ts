import nodemailer from 'nodemailer';
import { User } from '../models/User';

export interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export class EmailService {
  private static transporter: nodemailer.Transporter | null = null;

  /**
   * Initialize email transporter
   * Uses environment variables for configuration
   */
  private static getTransporter(): nodemailer.Transporter {
    if (!this.transporter) {
      // Check if email is configured
      const emailHost = process.env.EMAIL_HOST;
      const emailPort = process.env.EMAIL_PORT;
      const emailUser = process.env.EMAIL_USER;
      const emailPassword = process.env.EMAIL_PASSWORD;
      const emailFrom = process.env.EMAIL_FROM;

      // If email is not configured, use a test account or log-only mode
      if (!emailHost || !emailUser || !emailPassword) {
        console.warn('Email service not configured. Emails will be logged to console only.');
        
        // Create a test transporter that logs emails
        this.transporter = nodemailer.createTransport({
          streamTransport: true,
          newline: 'unix',
          buffer: true
        });
      } else {
        // Create real transporter
        this.transporter = nodemailer.createTransport({
          host: emailHost,
          port: parseInt(emailPort || '587'),
          secure: emailPort === '465', // true for 465, false for other ports
          auth: {
            user: emailUser,
            pass: emailPassword,
          },
        });
      }
    }

    return this.transporter;
  }

  /**
   * Send an email
   * @param options - Email options
   */
  public static async sendEmail(options: EmailOptions): Promise<void> {
    const transporter = this.getTransporter();
    const emailFrom = process.env.EMAIL_FROM || 'noreply@expensemanagement.com';

    try {
      const info = await transporter.sendMail({
        from: emailFrom,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html || options.text,
      });

      console.log('Email sent:', {
        messageId: info.messageId,
        to: options.to,
        subject: options.subject,
      });

      // If using streamTransport (test mode), log the email content
      if (info.message) {
        console.log('Email content:', info.message.toString());
      }
    } catch (error) {
      console.error('Failed to send email:', error);
      throw new Error('Failed to send email');
    }
  }

  /**
   * Send welcome email with generated password
   * @param user - User to send email to
   * @param password - Generated password
   */
  public static async sendWelcomeEmail(user: User, password: string): Promise<void> {
    const subject = 'Welcome to Expense Management System';
    const text = `
Hello ${user.firstName} ${user.lastName},

Welcome to the Expense Management System!

Your account has been created with the following credentials:

Email: ${user.email}
Temporary Password: ${password}

Please log in and change your password as soon as possible.

Login URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/login

Best regards,
Expense Management Team
    `.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .credentials { background-color: #fff; padding: 15px; border-left: 4px solid #4CAF50; margin: 20px 0; }
    .button { display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to Expense Management System</h1>
    </div>
    <div class="content">
      <p>Hello ${user.firstName} ${user.lastName},</p>
      <p>Welcome to the Expense Management System! Your account has been created successfully.</p>
      
      <div class="credentials">
        <p><strong>Your Login Credentials:</strong></p>
        <p><strong>Email:</strong> ${user.email}</p>
        <p><strong>Temporary Password:</strong> ${password}</p>
      </div>
      
      <p><strong>Important:</strong> Please log in and change your password as soon as possible for security reasons.</p>
      
      <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" class="button">Log In Now</a>
    </div>
    <div class="footer">
      <p>This is an automated message. Please do not reply to this email.</p>
      <p>&copy; ${new Date().getFullYear()} Expense Management System. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `.trim();

    await this.sendEmail({
      to: user.email,
      subject,
      text,
      html,
    });
  }

  /**
   * Send password reset email
   * @param user - User to send email to
   * @param resetToken - Password reset token
   */
  public static async sendPasswordResetEmail(user: User, resetToken: string): Promise<void> {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    
    const subject = 'Password Reset Request';
    const text = `
Hello ${user.firstName} ${user.lastName},

You have requested to reset your password for the Expense Management System.

Please click the following link to reset your password:
${resetUrl}

This link will expire in 1 hour.

If you did not request this password reset, please ignore this email.

Best regards,
Expense Management Team
    `.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .button { display: inline-block; padding: 10px 20px; background-color: #2196F3; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
    .warning { background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Password Reset Request</h1>
    </div>
    <div class="content">
      <p>Hello ${user.firstName} ${user.lastName},</p>
      <p>You have requested to reset your password for the Expense Management System.</p>
      
      <a href="${resetUrl}" class="button">Reset Password</a>
      
      <div class="warning">
        <p><strong>Important:</strong></p>
        <ul>
          <li>This link will expire in 1 hour</li>
          <li>If you did not request this password reset, please ignore this email</li>
        </ul>
      </div>
    </div>
    <div class="footer">
      <p>This is an automated message. Please do not reply to this email.</p>
      <p>&copy; ${new Date().getFullYear()} Expense Management System. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `.trim();

    await this.sendEmail({
      to: user.email,
      subject,
      text,
      html,
    });
  }
}
