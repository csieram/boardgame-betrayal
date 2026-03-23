import { subtract } from './subtract';

describe('subtract', () => {
  it('should correctly calculate 400 - 300 = 100', () => {
    const result = subtract(400, 300);
    expect(result).toBe(100);
  });

  it('should handle other subtraction cases', () => {
    expect(subtract(10, 5)).toBe(5);
    expect(subtract(100, 50)).toBe(50);
    expect(subtract(0, 0)).toBe(0);
  });

  it('should handle negative results', () => {
    expect(subtract(100, 200)).toBe(-100);
  });
});
