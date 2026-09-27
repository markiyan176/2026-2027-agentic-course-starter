import { describe, it, expect } from 'vitest';
import { formatDuration } from '../src/format';

describe('formatDuration', () => {
  it('handles 0ms, negative numbers, and invalid numbers', () => {
    expect(formatDuration(0)).toBe('0s');
    expect(formatDuration(-500)).toBe('0s');
    expect(formatDuration(NaN)).toBe('0s');
  });

  it('formats seconds only', () => {
    expect(formatDuration(45000)).toBe('45s');
    expect(formatDuration(5000)).toBe('5s');
  });

  it('formats minutes and seconds', () => {
    expect(formatDuration(125000)).toBe('2m 5s');
    expect(formatDuration(60000)).toBe('1m');
  });

  it('formats hours, minutes, and seconds', () => {
    expect(formatDuration(5025000)).toBe('1h 23m 45s');
    expect(formatDuration(3600000)).toBe('1h');
  });
});
