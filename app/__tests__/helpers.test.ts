import { describe, it, expect } from '@jest/globals';
import { formatTimestamp, truncateText, validateImage } from '../utils/helpers';

describe('formatTimestamp', () => {
  it('formats date correctly', () => {
    const date = new Date('2026-08-07T14:30:00');
    const formatted = formatTimestamp(date);
    expect(formatted).toMatch(/\d{1,2}:\d{2}\s?(AM|PM)/i);
  });
});

describe('truncateText', () => {
  it('truncates long text', () => {
    const text = 'This is a very long text that needs to be truncated';
    const result = truncateText(text, 20);
    expect(result).toBe('This is a very lo...');
    expect(result.length).toBe(20);
  });

  it('does not truncate short text', () => {
    const text = 'Short text';
    const result = truncateText(text, 20);
    expect(result).toBe('Short text');
  });
});

describe('validateImage', () => {
  it('validates image type', () => {
    const validFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
    const result = validateImage(validFile);
    expect(result.valid).toBe(true);
  });

  it('rejects invalid image type', () => {
    const invalidFile = new File([''], 'test.gif', { type: 'image/gif' });
    const result = validateImage(invalidFile);
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('rejects large images', () => {
    const largeFile = new File([new ArrayBuffer(6 * 1024 * 1024)], 'large.jpg', {
      type: 'image/jpeg',
    });
    const result = validateImage(largeFile);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('5MB');
  });
});
