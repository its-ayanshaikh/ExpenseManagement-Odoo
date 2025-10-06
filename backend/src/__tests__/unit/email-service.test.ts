import { EmailService } from '../../services/EmailService';
import { User } from '../../models/User';

// Mock nodemailer module
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(),
}));

describe('EmailService', () => {
  let mockSendMail: jest.Mock;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock sendMail function
    mockSendMail = jest.fn().mockResolvedValue({
      messageId: 'test-message-id',
      message: Buffer.from('test email content'),
    });

    // Mock nodemailer.createTransport to return our mock transporter
    const nodemailer = require('nodemailer');
    nodemailer.createTransport.mockReturnValue({
      sendMail: mockSendMail,
    });

    // Reset the transporter in EmailService by accessing private property
    // This ensures each test gets a fresh transporter
    (EmailService as any).transporter = null;
  });

  describe('sendWelcomeEmail', () => {
    it('should send welcome email with password to new user (Requirement 11.3, 11.4)', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'newuser@example.com',
        firstName: 'John',
        lastName: 'Doe',
        companyId: 'company-123',
        role: 'EMPLOYEE',
      } as User;

      const password = 'TempPass123!';

      await EmailService.sendWelcomeEmail(mockUser, password);

      // Verify sendMail was called
      expect(mockSendMail).toHaveBeenCalledTimes(1);

      // Verify email details
      const emailCall = mockSendMail.mock.calls[0][0];
      expect(emailCall.to).toBe('newuser@example.com');
      expect(emailCall.subject).toContain('Welcome');
      expect(emailCall.text).toContain('John Doe');
      expect(emailCall.text).toContain('newuser@example.com');
      expect(emailCall.text).toContain('TempPass123!');
      expect(emailCall.html).toContain('John Doe');
      expect(emailCall.html).toContain('newuser@example.com');
      expect(emailCall.html).toContain('TempPass123!');
    });

    it('should include login URL in welcome email (Requirement 11.4)', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'newuser@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        companyId: 'company-123',
        role: 'MANAGER',
      } as User;

      const password = 'SecurePass456!';

      await EmailService.sendWelcomeEmail(mockUser, password);

      const emailCall = mockSendMail.mock.calls[0][0];
      expect(emailCall.text).toContain('login');
      expect(emailCall.html).toContain('Log In');
    });

    it('should throw error if email delivery fails (Requirement 11.6)', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'fail@example.com',
        firstName: 'Test',
        lastName: 'User',
        companyId: 'company-123',
        role: 'EMPLOYEE',
      } as User;

      const password = 'TestPass789!';

      // Mock sendMail to reject
      mockSendMail.mockRejectedValueOnce(new Error('SMTP connection failed'));

      await expect(EmailService.sendWelcomeEmail(mockUser, password)).rejects.toThrow('Failed to send email');
    });
  });

  describe('sendEmail', () => {
    it('should send email with provided options', async () => {
      await EmailService.sendEmail({
        to: 'test@example.com',
        subject: 'Test Subject',
        text: 'Test message',
        html: '<p>Test message</p>',
      });

      expect(mockSendMail).toHaveBeenCalledTimes(1);
      const emailCall = mockSendMail.mock.calls[0][0];
      expect(emailCall.to).toBe('test@example.com');
      expect(emailCall.subject).toBe('Test Subject');
      expect(emailCall.text).toBe('Test message');
      expect(emailCall.html).toBe('<p>Test message</p>');
    });

    it('should use text as html if html is not provided', async () => {
      await EmailService.sendEmail({
        to: 'test@example.com',
        subject: 'Test Subject',
        text: 'Test message',
      });

      const emailCall = mockSendMail.mock.calls[0][0];
      expect(emailCall.html).toBe('Test message');
    });

    it('should handle email delivery failures (Requirement 11.6)', async () => {
      mockSendMail.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        EmailService.sendEmail({
          to: 'test@example.com',
          subject: 'Test',
          text: 'Test',
        })
      ).rejects.toThrow('Failed to send email');
    });
  });
});
