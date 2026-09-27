import { describe, it, expect } from 'vitest';
import { formatDuration } from '../src/format';

describe('formatDuration', () => {
  it('formats duration', () => {
    expect(formatDuration(0)).toBe('0s');
    expect(formatDuration(125000)).toBe('2m 5s');
  });
});
