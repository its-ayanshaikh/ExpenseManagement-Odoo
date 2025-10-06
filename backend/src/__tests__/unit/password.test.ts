import { generateSecurePassword, validatePasswordStrength } from '../../utils/password';

describe('Password Utility Functions', () => {
  describe('generateSecurePassword', () => {
    it('should generate password with default length of 12', () => {
      const password = generateSecurePassword();
      expect(password).toHaveLength(12);
    });

    it('should generate password with custom length', () => {
      const password = generateSecurePassword(16);
      expect(password).toHaveLength(16);
    });

    it('should generate password with minimum length of 8', () => {
      const password = generateSecurePassword(8);
      expect(password).toHaveLength(8);
    });

    it('should include lowercase letters', () => {
      const password = generateSecurePassword(12);
      expect(password).toMatch(/[a-z]/);
    });

    it('should include uppercase letters', () => {
      const password = generateSecurePassword(12);
      expect(password).toMatch(/[A-Z]/);
    });

    it('should include numbers', () => {
      const password = generateSecurePassword(12);
      expect(password).toMatch(/[0-9]/);
    });

    it('should include special characters', () => {
      const password = generateSecurePassword(12);
      expect(password).toMatch(/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/);
    });

    it('should generate unique passwords', () => {
      const password1 = generateSecurePassword(12);
      const password2 = generateSecurePassword(12);
      expect(password1).not.toBe(password2);
    });

    it('should generate passwords that pass strength validation', () => {
      const password = generateSecurePassword(12);
      const validation = validatePasswordStrength(password);
      expect(validation.valid).toBe(true);
    });
  });

  describe('validatePasswordStrength', () => {
    it('should reject passwords shorter than 8 characters', () => {
      const result = validatePasswordStrength('Short1!');
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Password must be at least 8 characters long');
    });

    it('should reject passwords without lowercase letters', () => {
      const result = validatePasswordStrength('PASSWORD123!');
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Password must contain at least one lowercase letter');
    });

    it('should reject passwords without uppercase letters', () => {
      const result = validatePasswordStrength('password123!');
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Password must contain at least one uppercase letter');
    });

    it('should reject passwords without numbers', () => {
      const result = validatePasswordStrength('Password!');
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Password must contain at least one number');
    });

    it('should accept valid passwords', () => {
      const result = validatePasswordStrength('ValidPass123!');
      expect(result.valid).toBe(true);
      expect(result.message).toBeUndefined();
    });

    it('should accept passwords with exactly 8 characters', () => {
      const result = validatePasswordStrength('Pass123!');
      expect(result.valid).toBe(true);
    });
  });
});
