import { describe, it, expect } from 'vitest';
import { testPackage } from '@repo/test-package';

describe('Cross-package imports', () => {
  it('should be able to import from @repo/test-package', () => {
    expect(testPackage).toBeDefined();
    expect(typeof testPackage).toBe('function');
  });

  it('should execute test-package function correctly', () => {
    const result = testPackage();
    expect(result).toBe('test-package');
  });
});
