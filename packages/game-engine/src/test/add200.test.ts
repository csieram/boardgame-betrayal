import { add200 } from './add200';

describe('add200', () => {
  it('應該返回 400', () => {
    const result = add200();
    expect(result).toBe(400);
  });

  it('應該正確計算 200 + 200', () => {
    const result = add200();
    expect(result).toEqual(200 + 200);
  });
});
