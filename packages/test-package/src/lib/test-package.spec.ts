import { testPackage } from './test-package.js';

describe('testPackage', () => {
  it('should work', () => {
    expect(testPackage()).toEqual('test-package');
  });
});
