import { add } from './add';

describe('add function', () => {
  it('should return 200 when adding 100 + 100', () => {
    const result = add(100, 100);
    expect(result).toBe(200);
  });

  it('should return correct sum for positive numbers', () => {
    expect(add(1, 2)).toBe(3);
    expect(add(10, 20)).toBe(30);
  });

  it('should return correct sum for negative numbers', () => {
    expect(add(-5, -3)).toBe(-8);
    expect(add(-10, 5)).toBe(-5);
  });

  it('should return correct sum for zero', () => {
    expect(add(0, 0)).toBe(0);
    expect(add(5, 0)).toBe(5);
  });
});
