import { describe, it, expect, beforeEach, vi } from 'vitest';
import { validateData, CreateJournalEntrySchema, MoodboardElementSchema, UpdateProfileSchema } from '../../app/shared/validation/schemas';

// Mock CSRF token system
vi.mock('../../app/shared/security/csrf', () => ({
  useCSRFToken: () => ({
    getToken: vi.fn().mockResolvedValue('mock-csrf-token-12345678901234567890123456789012'),
    clearToken: vi.fn(),
  }),
  createSecureFormData: vi.fn().mockImplementation(async (data) => ({
    ...data,
    csrf_token: 'mock-csrf-token-12345678901234567890123456789012',
  })),
  CSRFProtection: {
    getInstance: vi.fn().mockReturnValue({
      getToken: vi.fn().mockResolvedValue('mock-csrf-token-12345678901234567890123456789012'),
      clearToken: vi.fn(),
    }),
  },
}));

describe('CSRF Protection & Schema Validation', () => {
  describe('Journal Entry Validation', () => {
    it('should validate a correct journal entry', () => {
      const validJournalEntry = {
        entry_date: new Date().toISOString(),
        content: 'Today was a great day! I accomplished my goals and felt grateful for the opportunities.',
        mood: 'happy',
        category: 'gratitude',
        tags: ['goals', 'gratitude', 'success'],
        csrf_token: 'mock-csrf-token-12345678901234567890123456789012',
      };

      const result = validateData(CreateJournalEntrySchema, validJournalEntry);
      expect(result.success).toBe(true);
    });

    it('should reject journal entry without CSRF token', () => {
      const invalidJournalEntry = {
        entry_date: new Date().toISOString(),
        content: 'Today was a great day!',
        mood: 'happy',
      };

      const result = validateData(CreateJournalEntrySchema, invalidJournalEntry);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Required');
    });

    it('should reject journal entry with malicious content', () => {
      const maliciousJournalEntry = {
        entry_date: new Date().toISOString(),
        content: '<script>alert("XSS")</script>Today was a day with javascript:void(0) and onclick="hack()" content',
        csrf_token: 'mock-csrf-token-12345678901234567890123456789012',
      };

      const result = validateData(CreateJournalEntrySchema, maliciousJournalEntry);
      expect(result.success).toBe(true);
      // Content should be sanitized
      if (result.success) {
        expect(result.data.content).not.toContain('<script>');
        expect(result.data.content).not.toContain('javascript:');
        expect(result.data.content).not.toContain('onclick=');
      }
    });

    it('should reject journal entry with excessive content length', () => {
      const longContent = 'a'.repeat(50001); // Exceeds 50000 char limit
      const invalidJournalEntry = {
        entry_date: new Date().toISOString(),
        content: longContent,
        csrf_token: 'mock-csrf-token-12345678901234567890123456789012',
      };

      const result = validateData(CreateJournalEntrySchema, invalidJournalEntry);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Must be at most 50000 characters');
    });

    it('should reject journal entry with too many tags', () => {
      const tooManyTags = Array.from({ length: 21 }, (_, i) => `tag${i}`);
      const invalidJournalEntry = {
        entry_date: new Date().toISOString(),
        content: 'Valid content',
        tags: tooManyTags,
        csrf_token: 'mock-csrf-token-12345678901234567890123456789012',
      };

      const result = validateData(CreateJournalEntrySchema, invalidJournalEntry);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Too many tags');
    });

    it('should reject journal entry with invalid mood', () => {
      const invalidJournalEntry = {
        entry_date: new Date().toISOString(),
        content: 'Valid content',
        mood: 'invalid_mood_type',
        csrf_token: 'mock-csrf-token-12345678901234567890123456789012',
      };

      const result = validateData(CreateJournalEntrySchema, invalidJournalEntry);
      expect(result.success).toBe(false);
    });
  });

  describe('Moodboard Element Validation', () => {
    it('should validate a correct moodboard element', () => {
      const validElement = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'text',
        content: 'My vision for the future is bright and full of possibilities',
        position: { x: 100, y: 200 },
        size: { width: 300, height: 100 },
        style: {
          fontSize: 16,
          color: '#333333',
          backgroundColor: '#ffffff',
          textAlign: 'center',
        },
        metadata: {
          priority: 'high',
        },
      };

      const result = validateData(MoodboardElementSchema, validElement);
      expect(result.success).toBe(true);
    });

    it('should reject moodboard element with malicious content', () => {
      const maliciousElement = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'text',
        content: '<script>alert("XSS")</script>My vision with javascript:hack() and onclick="malicious()"',
        position: { x: 100, y: 200 },
        size: { width: 300, height: 100 },
        style: {},
      };

      const result = validateData(MoodboardElementSchema, maliciousElement);
      expect(result.success).toBe(true);
      // Content should be sanitized
      if (result.success) {
        expect(result.data.content).not.toContain('<script>');
        expect(result.data.content).not.toContain('javascript:');
        expect(result.data.content).not.toContain('onclick=');
      }
    });

    it('should reject moodboard element with invalid position coordinates', () => {
      const invalidElement = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'text',
        content: 'Valid content',
        position: { x: -100, y: 3000 }, // x negative, y too large
        size: { width: 300, height: 100 },
        style: {},
      };

      const result = validateData(MoodboardElementSchema, invalidElement);
      expect(result.success).toBe(false);
    });

    it('should reject moodboard element with excessive content length', () => {
      const longContent = 'a'.repeat(5001); // Exceeds 5000 char limit
      const invalidElement = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'text',
        content: longContent,
        position: { x: 100, y: 200 },
        size: { width: 300, height: 100 },
        style: {},
      };

      const result = validateData(MoodboardElementSchema, invalidElement);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Must be at most 5000 characters');
    });

    it('should reject moodboard element with invalid UUID', () => {
      const invalidElement = {
        id: 'not-a-valid-uuid',
        type: 'text',
        content: 'Valid content',
        position: { x: 100, y: 200 },
        size: { width: 300, height: 100 },
        style: {},
      };

      const result = validateData(MoodboardElementSchema, invalidElement);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid UUID format');
    });

    it('should reject moodboard element with invalid color format', () => {
      const invalidElement = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'text',
        content: 'Valid content',
        position: { x: 100, y: 200 },
        size: { width: 300, height: 100 },
        style: {
          color: 'invalid-color-format',
          backgroundColor: 'not-a-color',
        },
      };

      const result = validateData(MoodboardElementSchema, invalidElement);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid color format');
    });
  });

  describe('Profile Validation', () => {
    it('should validate a correct profile update', () => {
      const validProfile = {
        full_name: 'John Doe',
        user_metadata: {
          full_name: 'John Doe',
          avatar_url: 'https://example.com/avatar.jpg',
        },
        csrf_token: 'mock-csrf-token-12345678901234567890123456789012',
      };

      const result = validateData(UpdateProfileSchema, validProfile);
      expect(result.success).toBe(true);
    });

    it('should reject profile update without CSRF token', () => {
      const invalidProfile = {
        full_name: 'John Doe',
      };

      const result = validateData(UpdateProfileSchema, invalidProfile);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Required');
    });

    it('should reject profile with malicious name', () => {
      const maliciousProfile = {
        full_name: '<script>alert("XSS")</script>John javascript:hack() Doe',
        csrf_token: 'mock-csrf-token-12345678901234567890123456789012',
      };

      const result = validateData(UpdateProfileSchema, maliciousProfile);
      expect(result.success).toBe(false);
      // Should fail regex validation before sanitization occurs
      expect(result.error).toContain('invalid characters');
    });

    it('should reject profile with invalid name characters', () => {
      const invalidProfile = {
        full_name: 'John123!@#$%^&*()Doe',
        csrf_token: 'mock-csrf-token-12345678901234567890123456789012',
      };

      const result = validateData(UpdateProfileSchema, invalidProfile);
      expect(result.success).toBe(false);
      expect(result.error).toContain('invalid characters');
    });

    it('should reject profile with excessive name length', () => {
      const longName = 'a'.repeat(101); // Exceeds 100 char limit
      const invalidProfile = {
        full_name: longName,
        csrf_token: 'mock-csrf-token-12345678901234567890123456789012',
      };

      const result = validateData(UpdateProfileSchema, invalidProfile);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Name exceeds maximum length');
    });

    it('should reject profile with invalid avatar URL', () => {
      const invalidProfile = {
        full_name: 'John Doe',
        user_metadata: {
          avatar_url: 'not-a-valid-url',
        },
        csrf_token: 'mock-csrf-token-12345678901234567890123456789012',
      };

      const result = validateData(UpdateProfileSchema, invalidProfile);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid avatar URL');
    });
  });

  describe('CSRF Token Validation', () => {
    it('should reject requests with short CSRF tokens', () => {
      const invalidData = {
        entry_date: new Date().toISOString(),
        content: 'Valid content',
        csrf_token: 'short-token', // Too short
      };

      const result = validateData(CreateJournalEntrySchema, invalidData);
      expect(result.success).toBe(false);
      expect(result.error).toContain('CSRF token required');
    });

    it('should accept requests with properly formatted CSRF tokens', () => {
      const validData = {
        entry_date: new Date().toISOString(),
        content: 'Valid content',
        csrf_token: 'a'.repeat(32), // Proper length
      };

      const result = validateData(CreateJournalEntrySchema, validData);
      expect(result.success).toBe(true);
    });
  });

  describe('Input Sanitization', () => {
    it('should remove script tags from all text inputs', () => {
      const maliciousInputs = [
        '<script>alert("XSS")</script>Hello',
        'Hello<script src="evil.js"></script>World',
        '<SCRIPT>alert("XSS")</SCRIPT>Content',
      ];

      maliciousInputs.forEach(input => {
        const validData = {
          entry_date: new Date().toISOString(),
          content: input,
          csrf_token: 'mock-csrf-token-12345678901234567890123456789012',
        };

        const result = validateData(CreateJournalEntrySchema, validData);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.content).not.toContain('<script');
          expect(result.data.content).not.toContain('</script>');
        }
      });
    });

    it('should remove javascript: URIs from all text inputs', () => {
      const maliciousInputs = [
        'Click here: javascript:alert("XSS")',
        'Link: javascript:void(0)',
        'JAVASCRIPT:hack()',
      ];

      maliciousInputs.forEach(input => {
        const validData = {
          entry_date: new Date().toISOString(),
          content: input,
          csrf_token: 'mock-csrf-token-12345678901234567890123456789012',
        };

        const result = validateData(CreateJournalEntrySchema, validData);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.content).not.toContain('javascript:');
        }
      });
    });

    it('should remove event handlers from all text inputs', () => {
      const maliciousInputs = [
        'Hello onclick="hack()" World',
        'Content onmouseover="evil()" here',
        'Text onload="malicious()" content',
      ];

      maliciousInputs.forEach(input => {
        const validData = {
          entry_date: new Date().toISOString(),
          content: input,
          csrf_token: 'mock-csrf-token-12345678901234567890123456789012',
        };

        const result = validateData(CreateJournalEntrySchema, validData);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.content).not.toMatch(/on\w+\s*=/i);
        }
      });
    });
  });
});