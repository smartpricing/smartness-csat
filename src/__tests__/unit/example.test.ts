import { describe, it, expect } from 'vitest';

describe('Example Unit Test', () => {
  it('should pass a basic assertion', () => {
    expect(1 + 1).toBe(2);
  });

  it('should handle string operations', () => {
    const greeting = 'Hello, World!';
    expect(greeting).toContain('Hello');
    expect(greeting.length).toBeGreaterThan(0);
  });

  it('should handle array operations', () => {
    const items = [1, 2, 3];
    expect(items).toHaveLength(3);
    expect(items).toContain(2);
  });
});
