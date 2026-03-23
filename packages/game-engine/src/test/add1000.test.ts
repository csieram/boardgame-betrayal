import { add1000 } from './add1000';

describe('add1000', () => {
  it('should return 2000', () => {
    const result = add1000();
    expect(result).toBe(2000);
  });

  it('should return a number', () => {
    const result = add1000();
    expect(typeof result).toBe('number');
  });
});
