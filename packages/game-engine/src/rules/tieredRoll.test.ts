/**
 * Tiered Roll Results System Tests - Issue #234
 * 
 * 分層擲骰結果系統測試
 */

import {
  resolveTieredOutcome,
  hasTieredOutcomes,
  getOutcomeDescriptions,
  formatRollRange,
  isRollInOutcomeRange,
  getOutcomeIndex,
  applyTieredOutcome,
  validateTieredOutcomes,
} from './tieredRoll';
import { TieredOutcome } from '@betrayal/shared';

describe('Tiered Roll Results System', () => {
  // 測試資料：燃燒的人影
  const burningFigureOutcomes: TieredOutcome[] = [
    { minRoll: 5, maxRoll: 8, effect: '獲得 1 點理智', statChange: { stat: 'sanity', amount: 1 } },
    { minRoll: 2, maxRoll: 4, effect: '承受 1 點精神傷害', damage: { type: 'mental', amount: 1 } },
    { minRoll: 0, maxRoll: 1, effect: '承受 2 點精神傷害', damage: { type: 'mental', amount: 2 } },
  ];

  // 測試資料：詭異的感覺
  const eerieFeelingOutcomes: TieredOutcome[] = [
    { minRoll: 4, maxRoll: 4, effect: '無事發生' },
    { minRoll: 3, maxRoll: 3, effect: '失去 1 點速度', statChange: { stat: 'speed', amount: -1 } },
    { minRoll: 2, maxRoll: 2, effect: '失去 1 點理智', statChange: { stat: 'sanity', amount: -1 } },
    { minRoll: 1, maxRoll: 1, effect: '失去 1 點知識', statChange: { stat: 'knowledge', amount: -1 } },
    { minRoll: 0, maxRoll: 0, effect: '失去 1 點力量', statChange: { stat: 'might', amount: -1 } },
  ];

  describe('resolveTieredOutcome', () => {
    it('應該返回正確的高分結果 (5-8)', () => {
      const result = resolveTieredOutcome(6, burningFigureOutcomes);
      expect(result).not.toBeNull();
      expect(result?.effect).toBe('獲得 1 點理智');
      expect(result?.statChange).toEqual({ stat: 'sanity', amount: 1 });
    });

    it('應該返回正確的中分結果 (2-4)', () => {
      const result = resolveTieredOutcome(3, burningFigureOutcomes);
      expect(result).not.toBeNull();
      expect(result?.effect).toBe('承受 1 點精神傷害');
      expect(result?.damage).toEqual({ type: 'mental', amount: 1 });
    });

    it('應該返回正確的低分結果 (0-1)', () => {
      const result = resolveTieredOutcome(0, burningFigureOutcomes);
      expect(result).not.toBeNull();
      expect(result?.effect).toBe('承受 2 點精神傷害');
      expect(result?.damage).toEqual({ type: 'mental', amount: 2 });
    });

    it('應該處理邊界值 (5)', () => {
      const result = resolveTieredOutcome(5, burningFigureOutcomes);
      expect(result?.effect).toBe('獲得 1 點理智');
    });

    it('應該處理邊界值 (4)', () => {
      const result = resolveTieredOutcome(4, burningFigureOutcomes);
      expect(result?.effect).toBe('承受 1 點精神傷害');
    });

    it('應該處理邊界值 (1)', () => {
      const result = resolveTieredOutcome(1, burningFigureOutcomes);
      expect(result?.effect).toBe('承受 2 點精神傷害');
    });

    it('應該對超出範圍的擲骰返回 null', () => {
      const result = resolveTieredOutcome(10, burningFigureOutcomes);
      expect(result).toBeNull();
    });

    it('應該處理詭異的感覺的單一數字結果', () => {
      expect(resolveTieredOutcome(4, eerieFeelingOutcomes)?.effect).toBe('無事發生');
      expect(resolveTieredOutcome(3, eerieFeelingOutcomes)?.effect).toBe('失去 1 點速度');
      expect(resolveTieredOutcome(2, eerieFeelingOutcomes)?.effect).toBe('失去 1 點理智');
      expect(resolveTieredOutcome(1, eerieFeelingOutcomes)?.effect).toBe('失去 1 點知識');
      expect(resolveTieredOutcome(0, eerieFeelingOutcomes)?.effect).toBe('失去 1 點力量');
    });

    it('應該處理空陣列', () => {
      const result = resolveTieredOutcome(5, []);
      expect(result).toBeNull();
    });

    it('應該處理 undefined', () => {
      const result = resolveTieredOutcome(5, undefined as unknown as TieredOutcome[]);
      expect(result).toBeNull();
    });
  });

  describe('hasTieredOutcomes', () => {
    it('應該對有結果的陣列返回 true', () => {
      expect(hasTieredOutcomes(burningFigureOutcomes)).toBe(true);
    });

    it('應該對空陣列返回 false', () => {
      expect(hasTieredOutcomes([])).toBe(false);
    });

    it('應該對 undefined 返回 false', () => {
      expect(hasTieredOutcomes(undefined)).toBe(false);
    });
  });

  describe('getOutcomeDescriptions', () => {
    it('應該返回格式化的結果描述', () => {
      const descriptions = getOutcomeDescriptions(burningFigureOutcomes);
      expect(descriptions).toHaveLength(3);
      expect(descriptions[0]).toEqual({ range: '5+', effect: '獲得 1 點理智' });
      expect(descriptions[1]).toEqual({ range: '2-4', effect: '承受 1 點精神傷害' });
      expect(descriptions[2]).toEqual({ range: '0-1', effect: '承受 2 點精神傷害' });
    });

    it('應該處理單一數字範圍', () => {
      const descriptions = getOutcomeDescriptions(eerieFeelingOutcomes);
      expect(descriptions[0]).toEqual({ range: '4', effect: '無事發生' });
      expect(descriptions[1]).toEqual({ range: '3', effect: '失去 1 點速度' });
    });

    it('應該處理空陣列', () => {
      const descriptions = getOutcomeDescriptions([]);
      expect(descriptions).toHaveLength(0);
    });
  });

  describe('formatRollRange', () => {
    it('應該格式化高分範圍為 X+', () => {
      expect(formatRollRange(5, 8)).toBe('5+');
      expect(formatRollRange(6, 12)).toBe('6+');
    });

    it('應該格式化一般範圍為 X-Y', () => {
      expect(formatRollRange(2, 4)).toBe('2-4');
      expect(formatRollRange(0, 1)).toBe('0-1');
      expect(formatRollRange(1, 3)).toBe('1-3');
    });

    it('應該格式化單一數字', () => {
      expect(formatRollRange(4, 4)).toBe('4');
      expect(formatRollRange(0, 0)).toBe('0');
    });
  });

  describe('isRollInOutcomeRange', () => {
    it('應該正確判斷擲骰值是否在範圍內', () => {
      const outcome: TieredOutcome = { minRoll: 2, maxRoll: 4, effect: 'Test' };
      expect(isRollInOutcomeRange(2, outcome)).toBe(true);
      expect(isRollInOutcomeRange(3, outcome)).toBe(true);
      expect(isRollInOutcomeRange(4, outcome)).toBe(true);
      expect(isRollInOutcomeRange(1, outcome)).toBe(false);
      expect(isRollInOutcomeRange(5, outcome)).toBe(false);
    });
  });

  describe('getOutcomeIndex', () => {
    it('應該返回正確的結果索引', () => {
      expect(getOutcomeIndex(6, burningFigureOutcomes)).toBe(0); // 5-8
      expect(getOutcomeIndex(3, burningFigureOutcomes)).toBe(1); // 2-4
      expect(getOutcomeIndex(0, burningFigureOutcomes)).toBe(2); // 0-1
    });

    it('應該對未匹配的擲骰返回 -1', () => {
      expect(getOutcomeIndex(10, burningFigureOutcomes)).toBe(-1);
    });
  });

  describe('applyTieredOutcome', () => {
    it('應該正確應用屬性變化', () => {
      const outcome: TieredOutcome = {
        minRoll: 5,
        maxRoll: 8,
        effect: '獲得 1 點理智',
        statChange: { stat: 'sanity', amount: 1 },
      };
      const result = applyTieredOutcome(outcome);
      expect(result.statChange).toEqual({ stat: 'sanity', amount: 1 });
      expect(result.damage).toBeUndefined();
      expect(result.description).toBe('獲得 1 點理智');
    });

    it('應該正確應用傷害', () => {
      const outcome: TieredOutcome = {
        minRoll: 0,
        maxRoll: 1,
        effect: '承受 2 點精神傷害',
        damage: { type: 'mental', amount: 2 },
      };
      const result = applyTieredOutcome(outcome);
      expect(result.damage).toEqual({ type: 'mental', amount: 2 });
      expect(result.statChange).toBeUndefined();
    });

    it('應該處理無效果的情況', () => {
      const outcome: TieredOutcome = {
        minRoll: 4,
        maxRoll: 4,
        effect: '無事發生',
      };
      const result = applyTieredOutcome(outcome);
      expect(result.statChange).toBeUndefined();
      expect(result.damage).toBeUndefined();
      expect(result.description).toBe('無事發生');
    });
  });

  describe('validateTieredOutcomes', () => {
    it('應該驗證有效的配置', () => {
      const result = validateTieredOutcomes(burningFigureOutcomes);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('應該檢測範圍重疊', () => {
      const invalidOutcomes: TieredOutcome[] = [
        { minRoll: 0, maxRoll: 3, effect: '低' },
        { minRoll: 2, maxRoll: 5, effect: '中' }, // 與第一個重疊
        { minRoll: 6, maxRoll: 8, effect: '高' },
      ];
      const result = validateTieredOutcomes(invalidOutcomes);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('範圍重疊');
    });

    it('應該檢測最小值大於最大值', () => {
      const invalidOutcomes: TieredOutcome[] = [
        { minRoll: 5, maxRoll: 3, effect: '無效' },
      ];
      const result = validateTieredOutcomes(invalidOutcomes);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('大於最大值');
    });

    it('應該處理空陣列', () => {
      const result = validateTieredOutcomes([]);
      expect(result.valid).toBe(true);
    });
  });
});
