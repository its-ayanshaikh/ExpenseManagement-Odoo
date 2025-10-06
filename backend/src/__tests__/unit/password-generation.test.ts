import { generateSecurePassword, validatePasswordStrength } from '../../utils/password';

describe('Password Generation', () => {
  describe('generateSecurePassword', () => {
    it('should generate a password with default length of 12 characters', () => {
      const password = generateSecurePassword();
      expect(password).toHaveLength(12);
    });

    it('should generate a password with specified length', () => {
      const password = generateSecurePassword(16);
      expect(password).toHaveLength(16);
    });

    it('should generate a password with at least 8 characters', () => {
      const password = generateSecurePassword(8);
      expect(password).toHaveLength(8);
    });

    it('should generate password with at least one lowercase letter', () => {
      const password = generateSecurePassword(12);
      expect(password).toMatch(/[a-z]/);
    });

    it('should generate password with at least one uppercase letter', () => {
      const password = generateSecurePassword(12);
      expect(password).toMatch(/[A-Z]/);
    });

    it('should generate password with at least one number', () => {
      const password = generateSecurePassword(12);
      expect(password).toMatch(/[0-9]/);
    });

    it('should generate password with at least one special character', () => {
      const password = generateSecurePassword(12);
      expect(password).toMatch(/[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/);
    });

    it('should generate different passwords on each call', () => {
      const password1 = generateSecurePassword(12);
      const password2 = generateSecurePassword(12);
      expect(password1).not.toBe(password2);
    });

    it('should meet all security requirements (Requirement 11.2)', () => {
      const password = generateSecurePassword(12);
      
      // At least 8 characters
      expect(password.length).toBeGreaterThanOrEqual(8);
      
      // Contains uppercase
      expect(password).toMatch(/[A-Z]/);
      
      // Contains lowercase
      expect(password).toMatch(/[a-z]/);
      
      // Contains numbers
      expect(password).toMatch(/[0-9]/);
      
      // Contains special characters
      expect(password).toMatch(/[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/);
    });
  });

  describe('validatePasswordStrength', () => {
    it('should reject password shorter than 8 characters', () => {
      const result = validatePasswordStrength('Short1!');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('at least 8 characters');
    });

    it('should reject password without lowercase letter', () => {
      const result = validatePasswordStrength('PASSWORD123!');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('lowercase letter');
    });

    it('should reject password without uppercase letter', () => {
      const result = validatePasswordStrength('password123!');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('uppercase letter');
    });

    it('should reject password without number', () => {
      const result = validatePasswordStrength('Password!');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('number');
    });

    it('should accept valid strong password', () => {
      const result = validatePasswordStrength('StrongPass123!');
      expect(result.valid).toBe(true);
      expect(result.message).toBeUndefined();
    });
  });
});
