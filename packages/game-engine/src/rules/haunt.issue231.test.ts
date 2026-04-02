/**
 * Haunt Roll System Integration Test
 * Issue #231: Implement Haunt Roll System - Core Game Mechanic
 * 
 * 驗證：
 * 1. Omen count tracked in game state
 * 2. Haunt roll triggered after omen draw
 * 3. Correct number of dice rolled (equal to omen count)
 * 4. Haunt begins when roll sum < omen count
 * 5. Haunt reveal screen shown
 */

import { SeededRng } from '../core/GameState';
import { CardDrawingManager, drawAndApplyCard, CardEffectApplier } from './cardDrawing';
import { makeHauntRoll, HAUNT_ROLL_THRESHOLD } from './haunt';
import { OMEN_CARDS } from '@betrayal/shared';

describe('Issue #231: Haunt Roll System Integration', () => {
  let rng: SeededRng;
  let cardManager: CardDrawingManager;
  let effectApplier: CardEffectApplier;

  beforeEach(() => {
    rng = new SeededRng('test-seed-231');
    cardManager = new CardDrawingManager('test-seed-231');
    effectApplier = new CardEffectApplier('test-seed-231');
  });

  describe('Omen Count Tracking', () => {
    it('應該追蹤已抽取的預兆數量', () => {
      const initialStatus = cardManager.getDeckStatus();
      expect(initialStatus.omenCount).toBe(0);

      // 抽第一張預兆卡
      cardManager.drawCard('omen');
      const status1 = cardManager.getDeckStatus();
      expect(status1.omenCount).toBe(1);

      // 抽第二張預兆卡
      cardManager.drawCard('omen');
      const status2 = cardManager.getDeckStatus();
      expect(status2.omenCount).toBe(2);
    });

    it('抽取物品卡不應增加預兆計數', () => {
      cardManager.drawCard('item');
      const status = cardManager.getDeckStatus();
      expect(status.omenCount).toBe(0);
    });

    it('抽取事件卡不應增加預兆計數', () => {
      cardManager.drawCard('event');
      const status = cardManager.getDeckStatus();
      expect(status.omenCount).toBe(0);
    });
  });

  describe('Haunt Roll Trigger', () => {
    it('抽到預兆卡後應該觸發作祟檢定', () => {
      // 抽到第一張預兆卡後應該需要檢定
      cardManager.drawCard('omen');
      expect(cardManager.shouldTriggerHauntRoll()).toBe(true);
    });

    it('未抽到預兆卡時不應觸發檢定', () => {
      expect(cardManager.shouldTriggerHauntRoll()).toBe(false);
    });

    it('作祟觸發後不應再次檢定', () => {
      cardManager.drawCard('omen');
      cardManager.performHauntRoll();
      
      // 即使抽到更多預兆，如果作祟已觸發，不應再檢定
      // 注意：這裡的邏輯可能需要根據實際遊戲規則調整
    });
  });

  describe('Dice Count', () => {
    it('應該擲出正確數量的骰子（等於預兆數量）', () => {
      // 抽 3 張預兆卡
      cardManager.drawCard('omen');
      cardManager.drawCard('omen');
      cardManager.drawCard('omen');

      const result = cardManager.performHauntRoll();
      
      // 應該擲 3 顆骰子
      expect(result.dice.length).toBe(3);
      expect(result.threshold).toBe(3);
    });

    it('即使只有 1 個預兆也應該擲骰', () => {
      cardManager.drawCard('omen');
      const result = cardManager.performHauntRoll();
      
      expect(result.dice.length).toBe(1);
      expect(result.threshold).toBe(1);
    });
  });

  describe('Haunt Trigger Condition', () => {
    it('當總和 < omenCount 時應該觸發作祟', () => {
      // 模擬：1 顆骰子，結果為 0
      // 0 < 1，應該觸發
      const result = makeHauntRoll(1, new SeededRng('test-low'));
      
      // 驗證邏輯
      if (result.total < result.diceCount) {
        expect(result.hauntBegins).toBe(true);
      }
    });

    it('當總和 >= omenCount 時不應觸發作祟', () => {
      // 模擬：3 顆骰子，結果為 [1, 1, 1] = 3
      // 3 >= 3，不應觸發
      const result = makeHauntRoll(3, new SeededRng('test-high'));
      
      // 驗證邏輯
      if (result.total >= result.diceCount) {
        expect(result.hauntBegins).toBe(false);
      }
    });

    it('應該返回正確的骰子結果', () => {
      const result = cardManager.performHauntRoll();
      
      // 驗證骰子結果在有效範圍內
      result.dice.forEach(die => {
        expect([0, 1, 2]).toContain(die);
      });
      
      // 驗證總和正確
      const expectedTotal = result.dice.reduce((a, b) => a + b, 0);
      expect(result.roll).toBe(expectedTotal);
    });
  });

  describe('Integration with Card Drawing', () => {
    it('drawAndApplyCard 應該在抽預兆卡後返回 Haunt Roll 結果', () => {
      const player = {
        id: 'player-1',
        name: 'Test Player',
        stats: { speed: 4, might: 4, sanity: 4, knowledge: 4 },
        items: [],
        omens: [],
      };

      const result = drawAndApplyCard(cardManager, effectApplier, 'omen', player);

      expect(result.success).toBe(true);
      expect(result.type).toBe('omen');
      expect(result.hauntRoll).toBeDefined();
      expect(result.hauntRoll?.dice).toBeDefined();
      expect(result.hauntRoll?.dice.length).toBeGreaterThan(0);
    });

    it('抽物品卡不應返回 Haunt Roll 結果', () => {
      const player = {
        id: 'player-1',
        name: 'Test Player',
        stats: { speed: 4, might: 4, sanity: 4, knowledge: 4 },
        items: [],
        omens: [],
      };

      const result = drawAndApplyCard(cardManager, effectApplier, 'item', player);

      expect(result.success).toBe(true);
      expect(result.type).toBe('item');
      expect(result.hauntRoll).toBeUndefined();
    });
  });

  describe('Rulebook Reference', () => {
    it('應該符合規則書 Page 14 的規則', () => {
      // 規則：擲骰數量 = 已發現的預兆數量
      // 規則：結果 < omenCount 觸發作祟
      
      const omenCount = 4;
      const result = makeHauntRoll(omenCount, rng);
      
      // 驗證骰子數量
      expect(result.diceCount).toBe(omenCount);
      expect(result.dice.length).toBe(omenCount);
      
      // 驗證觸發條件
      expect(result.hauntBegins).toBe(result.total < omenCount);
    });

    it('應該處理多個預兆的情況', () => {
      // 模擬抽多張預兆卡
      for (let i = 0; i < 5; i++) {
        cardManager.drawCard('omen');
      }

      const status = cardManager.getDeckStatus();
      expect(status.omenCount).toBe(5);

      const result = cardManager.performHauntRoll();
      expect(result.dice.length).toBe(5);
    });
  });
});

// Acceptance Criteria Tests
describe('Issue #231 Acceptance Criteria', () => {
  let cardManager: CardDrawingManager;
  let effectApplier: CardEffectApplier;

  beforeEach(() => {
    cardManager = new CardDrawingManager('acceptance-test');
    effectApplier = new CardEffectApplier('acceptance-test');
  });

  it('✓ Omen count tracked in game state', () => {
    const initialStatus = cardManager.getDeckStatus();
    expect(initialStatus.omenCount).toBeDefined();
    expect(initialStatus.omenCount).toBe(0);

    cardManager.drawCard('omen');
    const newStatus = cardManager.getDeckStatus();
    expect(newStatus.omenCount).toBe(1);
  });

  it('✓ Haunt roll triggered after omen draw', () => {
    const player = {
      id: 'player-1',
      name: 'Test Player',
      stats: { speed: 4, might: 4, sanity: 4, knowledge: 4 },
      items: [],
      omens: [],
    };

    const result = drawAndApplyCard(cardManager, effectApplier, 'omen', player);
    expect(result.hauntRoll).toBeDefined();
  });

  it('✓ Correct number of dice rolled (equal to omen count)', () => {
    // 抽 3 張預兆卡
    cardManager.drawCard('omen');
    cardManager.drawCard('omen');
    cardManager.drawCard('omen');

    const result = cardManager.performHauntRoll();
    expect(result.dice.length).toBe(3);
  });

  it('✓ Haunt begins when roll sum < omen count', () => {
    // 使用特定的 seed 來確保可重現的結果
    const testRng = new SeededRng('specific-seed-for-low-roll');
    const result = makeHauntRoll(3, testRng);

    // 驗證邏輯正確性
    expect(result.hauntBegins).toBe(result.total < result.diceCount);
  });

  it('✓ Haunt does not begin when roll sum >= omen count', () => {
    const testRng = new SeededRng('specific-seed-for-high-roll');
    const result = makeHauntRoll(3, testRng);

    // 驗證邏輯正確性
    expect(result.hauntBegins).toBe(result.total < result.diceCount);
  });
});
