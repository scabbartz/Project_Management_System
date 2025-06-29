import nodemailer from 'nodemailer';
import pool from '../config/database';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface ProjectNotificationData {
  projectId: number;
  projectName: string;
  action: 'created' | 'updated' | 'deleted' | 'commented' | 'file_uploaded';
  user: {
    name: string;
    email: string;
  };
  recipients: Array<{
    name: string;
    email: string;
  }>;
  additionalData?: any;
}

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Create transporter for development (using Gmail or other SMTP)
    this.transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  // Send a basic email
  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || this.stripHtml(options.html),
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`Email sent successfully to ${options.to}`);
      return true;
    } catch (error) {
      console.error('Email sending failed:', error);
      return false;
    }
  }

  // Send project notification emails
  async sendProjectNotification(data: ProjectNotificationData): Promise<void> {
    const { projectId, projectName, action, user, recipients, additionalData } = data;

    // Don't send emails to the user who performed the action
    const filteredRecipients = recipients.filter(recipient => recipient.email !== user.email);

    if (filteredRecipients.length === 0) return;

    const subject = this.getNotificationSubject(action, projectName);
    const html = this.generateProjectNotificationHTML(data);

    // Send emails to all recipients
    const emailPromises = filteredRecipients.map(recipient =>
      this.sendEmail({
        to: recipient.email,
        subject,
        html: this.personalizeEmail(html, recipient.name),
      })
    );

    await Promise.all(emailPromises);
  }

  // Send welcome email to new users
  async sendWelcomeEmail(user: { name: string; email: string; role: string }): Promise<boolean> {
    const subject = 'Welcome to Khelo Tech Project Management System';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1976d2;">Welcome to Khelo Tech PMS!</h2>
        <p>Hi ${user.name},</p>
        <p>Welcome to the Khelo Tech Project Management System! Your account has been successfully created.</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Account Details:</strong></p>
          <p>Email: ${user.email}</p>
          <p>Role: ${user.role}</p>
        </div>
        <p>You can now:</p>
        <ul>
          <li>View and manage projects</li>
          <li>Upload files and attachments</li>
          <li>Collaborate with team members</li>
          <li>Track project progress</li>
        </ul>
        <p>If you have any questions, please contact your system administrator.</p>
        <p>Best regards,<br>The Khelo Tech Team</p>
      </div>
    `;

    return this.sendEmail({ to: user.email, subject, html });
  }

  // Send password reset email
  async sendPasswordResetEmail(user: { name: string; email: string }, resetToken: string): Promise<boolean> {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    const subject = 'Password Reset Request - Khelo Tech PMS';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1976d2;">Password Reset Request</h2>
        <p>Hi ${user.name},</p>
        <p>You have requested to reset your password for the Khelo Tech Project Management System.</p>
        <p>Click the button below to reset your password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p>If you didn't request this password reset, please ignore this email.</p>
        <p>This link will expire in 1 hour.</p>
        <p>Best regards,<br>The Khelo Tech Team</p>
      </div>
    `;

    return this.sendEmail({ to: user.email, subject, html });
  }

  // Get notification subject based on action
  private getNotificationSubject(action: string, projectName: string): string {
    switch (action) {
      case 'created':
        return `New Project Created: ${projectName}`;
      case 'updated':
        return `Project Updated: ${projectName}`;
      case 'deleted':
        return `Project Deleted: ${projectName}`;
      case 'commented':
        return `New Comment on Project: ${projectName}`;
      case 'file_uploaded':
        return `New File Uploaded to Project: ${projectName}`;
      default:
        return `Project Update: ${projectName}`;
    }
  }

  // Generate HTML for project notifications
  private generateProjectNotificationHTML(data: ProjectNotificationData): string {
    const { projectName, action, user, additionalData } = data;
    const actionText = this.getActionText(action);
    const additionalInfo = this.getAdditionalInfo(action, additionalData);

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1976d2;">Project Notification</h2>
        <p><strong>${user.name}</strong> ${actionText} the project <strong>${projectName}</strong>.</p>
        ${additionalInfo ? `<p>${additionalInfo}</p>` : ''}
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Project:</strong> ${projectName}</p>
          <p><strong>Action:</strong> ${actionText}</p>
          <p><strong>User:</strong> ${user.name}</p>
          <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        </div>
        <p>Please log in to the system to view the latest updates.</p>
        <p>Best regards,<br>The Khelo Tech Team</p>
      </div>
    `;
  }

  // Get action text for notifications
  private getActionText(action: string): string {
    switch (action) {
      case 'created':
        return 'created';
      case 'updated':
        return 'updated';
      case 'deleted':
        return 'deleted';
      case 'commented':
        return 'added a comment to';
      case 'file_uploaded':
        return 'uploaded a file to';
      default:
        return 'updated';
    }
  }

  // Get additional information for specific actions
  private getAdditionalInfo(action: string, additionalData: any): string {
    switch (action) {
      case 'commented':
        return additionalData?.comment ? `Comment: "${additionalData.comment.substring(0, 100)}${additionalData.comment.length > 100 ? '...' : ''}"` : '';
      case 'file_uploaded':
        return additionalData?.fileName ? `File: ${additionalData.fileName}` : '';
      default:
        return '';
    }
  }

  // Personalize email with recipient name
  private personalizeEmail(html: string, recipientName: string): string {
    return html.replace(/<p>Hi /, `<p>Hi ${recipientName}, `);
  }

  // Strip HTML tags for text version
  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '');
  }

  // Get project team members for notifications
  async getProjectTeamMembers(projectId: number): Promise<Array<{ name: string; email: string }>> {
    try {
      const client = await pool.connect();
      const result = await client.query(
        `SELECT DISTINCT u.name, u.email
         FROM users u
         LEFT JOIN projects p ON p.created_by = u.id
         WHERE p.id = $1 OR u.role IN ('Admin', 'Manager')
         ORDER BY u.name`,
        [projectId]
      );
      client.release();

      return result.rows;
    } catch (error) {
      console.error('Error fetching project team members:', error);
      return [];
    }
  }
}

export default new EmailService(); 