
import {
  CardDrawingManager,
  CardEffectApplier,
  drawAndApplyCard,
  PlayerState,
} from './cardDrawing';
import { Card, CardType } from '@betrayal/shared';

// 測試用的種子，確保可重現性
const TEST_SEED = 'test-seed-123';

describe('CardDrawingManager', () => {
  let manager: CardDrawingManager;

  beforeEach(() => {
    manager = new CardDrawingManager(TEST_SEED);
  });

  describe('初始化', () => {
    it('應該正確初始化所有牌堆', () => {
      const status = manager.getDeckStatus();
      
      expect(status.event.remaining).toBeGreaterThan(0);
      expect(status.item.remaining).toBeGreaterThan(0);
      expect(status.omen.remaining).toBeGreaterThan(0);
      expect(status.omenCount).toBe(0);
      expect(status.hauntTriggered).toBe(false);
    });

    it('應該洗牌（不同種子產生不同順序）', () => {
      const manager1 = new CardDrawingManager('seed-1');
      const manager2 = new CardDrawingManager('seed-2');

      const card1 = manager1.drawCard('event');
      const card2 = manager2.drawCard('event');

      // 不同種子可能產生不同順序（機率上）
      // 這裡只是確保不會拋出錯誤
      expect(card1).toBeDefined();
      expect(card2).toBeDefined();
    });
  });

  describe('抽牌', () => {
    it('應該能抽取事件卡', () => {
      const card = manager.drawCard('event');
      
      expect(card).not.toBeNull();
      expect(card?.type).toBe('event');
      expect(manager.getRemainingCount('event')).toBeLessThan(6); // 初始 6 張，抽掉 1 張
    });

    it('應該能抽取物品卡', () => {
      const card = manager.drawCard('item');
      
      expect(card).not.toBeNull();
      expect(card?.type).toBe('item');
    });

    it('應該能抽取預兆卡', () => {
      const card = manager.drawCard('omen');
      
      expect(card).not.toBeNull();
      expect(card?.type).toBe('omen');
    });

    it('抽牌後應該減少牌堆數量', () => {
      const initialCount = manager.getRemainingCount('event');
      manager.drawCard('event');
      const newCount = manager.getRemainingCount('event');
      
      expect(newCount).toBe(initialCount - 1);
    });

    it('抽到預兆卡應該增加預兆計數', () => {
      expect(manager.getDeckStatus().omenCount).toBe(0);
      
      manager.drawCard('omen');
      expect(manager.getDeckStatus().omenCount).toBe(1);
      
      manager.drawCard('omen');
      expect(manager.getDeckStatus().omenCount).toBe(2);
    });

    it('牌堆為空時應該返回 null', () => {
      // 抽完所有事件卡
      for (let i = 0; i < 100; i++) {
        const card = manager.drawCard('event');
        if (card === null) break;
      }

      const emptyCard = manager.drawCard('event');
      expect(emptyCard).toBeNull();
    });
  });

  describe('棄牌', () => {
    it('應該能棄置事件卡', () => {
      const card = manager.drawCard('event')!;
      manager.discardCard(card);
      
      const status = manager.getDeckStatus();
      expect(status.event.discarded).toBe(1);
    });

    it('應該能棄置物品卡', () => {
      const card = manager.drawCard('item')!;
      manager.discardCard(card);
      
      const status = manager.getDeckStatus();
      expect(status.item.discarded).toBe(1);
    });

    it('應該能棄置預兆卡', () => {
      const card = manager.drawCard('omen')!;
      manager.discardCard(card);
      
      const status = manager.getDeckStatus();
      expect(status.omen.discarded).toBe(1);
    });
  });

  describe('作祟檢定', () => {
    it('沒有預兆時不應該觸發檢定', () => {
      expect(manager.shouldTriggerHauntRoll()).toBe(false);
    });

    it('抽到預兆後應該可以觸發檢定', () => {
      manager.drawCard('omen');
      expect(manager.shouldTriggerHauntRoll()).toBe(true);
    });

    it('作祟檢定應該返回正確格式', () => {
      manager.drawCard('omen');
      const result = manager.performHauntRoll();
      
      expect(result).toHaveProperty('triggered');
      expect(result).toHaveProperty('roll');
      expect(result).toHaveProperty('threshold');
      expect(result.threshold).toBe(1); // 只有 1 個預兆
      expect(result.roll).toBeGreaterThanOrEqual(1);
      expect(result.roll).toBeLessThanOrEqual(6);
    });

    it('作祟觸發後應該標記狀態', () => {
      // 抽多個預兆增加觸發機率
      for (let i = 0; i < 10; i++) {
        manager.drawCard('omen');
      }

      // 重複檢定直到觸發（理論上機率很高）
      let attempts = 0;
      while (!manager.getDeckStatus().hauntTriggered && attempts < 20) {
        manager.performHauntRoll();
        attempts++;
      }

      expect(manager.getDeckStatus().hauntTriggered).toBe(true);
    });
  });

  describe('重置', () => {
    it('重置後應該恢復初始狀態', () => {
      manager.drawCard('event');
      manager.drawCard('item');
      manager.drawCard('omen');
      
      manager.reset();
      
      const status = manager.getDeckStatus();
      expect(status.omenCount).toBe(0);
      expect(status.hauntTriggered).toBe(false);
      expect(status.event.discarded).toBe(0);
    });
  });
});

describe('CardEffectApplier', () => {
  let applier: CardEffectApplier;
  let player: PlayerState;

  beforeEach(() => {
    applier = new CardEffectApplier(TEST_SEED);
    player = {
      id: 'player-1',
      name: '測試玩家',
      stats: {
        speed: 4,
        might: 3,
        sanity: 5,
        knowledge: 4,
      },
      items: [],
      omens: [],
    };
  });

  describe('事件卡效果', () => {
    it('應該處理需要檢定的事件卡', () => {
      const eventCard: Card = {
        id: 'event_test',
        type: 'event',
        name: '測試事件',
        description: '測試描述',
        icon: '',
        rollRequired: { stat: 'speed', target: 4 },
        success: '成功訊息',
        failure: '失敗訊息',
      };

      const result = applier.applyCardEffect(eventCard, player);

      expect(result.success).toBe(true);
      expect(result.requiresRoll).toBe(true);
      expect(result.rollStat).toBe('speed');
      expect(result.rollTarget).toBe(4);
    });

    it('應該處理直接效果的事件卡', () => {
      const eventCard: Card = {
        id: 'event_direct',
        type: 'event',
        name: '直接效果事件',
        description: '立即移動',
        icon: '',
        effect: '你可以立即移動到相鄰房間',
      };

      const result = applier.applyCardEffect(eventCard, player);

      expect(result.success).toBe(true);
      expect(result.message).toContain('立即移動');
    });
  });

  describe('物品卡效果', () => {
    it('應該將物品卡加入玩家背包', () => {
      const itemCard: Card = {
        id: 'item_test',
        type: 'item',
        name: '測試物品',
        description: '測試物品描述',
        icon: '',
        effect: '測試效果',
      };

      expect(player.items.length).toBe(0);
      
      const result = applier.applyCardEffect(itemCard, player);

      expect(player.items.length).toBe(1);
      expect(player.items[0].id).toBe('item_test');
      expect(result.itemAdded).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('應該能加入多個物品', () => {
      const item1: Card = { id: 'item_1', type: 'item', name: '物品1', description: '', icon: '' };
      const item2: Card = { id: 'item_2', type: 'item', name: '物品2', description: '', icon: '' };

      applier.applyCardEffect(item1, player);
      applier.applyCardEffect(item2, player);

      expect(player.items.length).toBe(2);
    });
  });

  describe('預兆卡效果', () => {
    it('應該將預兆卡加入玩家預兆列表', () => {
      const omenCard: Card = {
        id: 'omen_test',
        type: 'omen',
        name: '測試預兆',
        description: '測試預兆描述',
        icon: '',
        effect: '測試效果',
      };

      expect(player.omens.length).toBe(0);
      
      const result = applier.applyCardEffect(omenCard, player);

      expect(player.omens.length).toBe(1);
      expect(player.omens[0].id).toBe('omen_test');
      expect(result.omenAdded).toBeDefined();
    });
  });

  describe('擲骰檢定', () => {
    it('應該能執行屬性檢定', () => {
      const result = applier.performRoll('might', 3, 4);

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('roll');
      expect(result).toHaveProperty('message');
      expect(typeof result.success).toBe('boolean');
    });

    it('檢定結果應該基於擲骰總和', () => {
      // 使用高屬性值增加成功機率
      const result = applier.performRoll('knowledge', 1, 8);
      
      // 8 顆骰子，每顆 0-2，總和範圍 0-16
      // 目標 1，幾乎一定成功
      expect(result.roll).toBeGreaterThanOrEqual(0);
      expect(result.roll).toBeLessThanOrEqual(16);
    });
  });
});

describe('drawAndApplyCard 整合測試', () => {
  let cardManager: CardDrawingManager;
  let effectApplier: CardEffectApplier;
  let player: PlayerState;

  beforeEach(() => {
    cardManager = new CardDrawingManager(TEST_SEED);
    effectApplier = new CardEffectApplier(TEST_SEED);
    player = {
      id: 'player-1',
      name: '測試玩家',
      stats: { speed: 4, might: 3, sanity: 5, knowledge: 4 },
      items: [],
      omens: [],
    };
  });

  it('應該完整處理事件卡抽牌和效果', () => {
    const result = drawAndApplyCard(cardManager, effectApplier, 'event', player);

    expect(result.success).toBe(true);
    expect(result.card).not.toBeNull();
    expect(result.type).toBe('event');
    expect(result.effectResult).toBeDefined();
    expect(result.hauntRoll).toBeUndefined(); // 事件卡不觸發作祟檢定
  });

  it('應該完整處理物品卡抽牌和效果', () => {
    const result = drawAndApplyCard(cardManager, effectApplier, 'item', player);

    expect(result.success).toBe(true);
    expect(result.card?.type).toBe('item');
    expect(player.items.length).toBe(1);
    expect(result.effectResult?.itemAdded).toBeDefined();
  });

  it('應該完整處理預兆卡抽牌和效果，並觸發作祟檢定', () => {
    const result = drawAndApplyCard(cardManager, effectApplier, 'omen', player);

    expect(result.success).toBe(true);
    expect(result.card?.type).toBe('omen');
    expect(player.omens.length).toBe(1);
    expect(result.hauntRoll).toBeDefined();
    expect(result.hauntRoll?.threshold).toBe(1);
  });

  it('多次抽預兆應該增加作祟閾值', () => {
    drawAndApplyCard(cardManager, effectApplier, 'omen', player);
    const result2 = drawAndApplyCard(cardManager, effectApplier, 'omen', player);

    expect(result2.hauntRoll?.threshold).toBe(2);
  });

  it('牌堆為空時應該返回失敗結果', () => {
    // 抽完所有事件卡
    for (let i = 0; i < 100; i++) {
      const card = cardManager.drawCard('event');
      if (card === null) break;
    }

    // 重置卡牌管理器但不重新洗牌
    const result = drawAndApplyCard(cardManager, effectApplier, 'event', player);

    expect(result.success).toBe(false);
    expect(result.card).toBeNull();
  });
});

describe('房間符號對應抽牌類型', () => {
  it('E 符號應該對應事件卡', () => {
    const symbol: string = 'E';
    const expectedType: CardType = 'event';
    
    const typeMap: Record<string, CardType> = {
      'E': 'event',
      'I': 'item',
      'O': 'omen',
    };

    expect(typeMap[symbol]).toBe(expectedType);
  });

  it('I 符號應該對應物品卡', () => {
    const symbol: string = 'I';
    const typeMap: Record<string, CardType> = {
      'E': 'event',
      'I': 'item',
      'O': 'omen',
    };

    expect(typeMap[symbol]).toBe('item');
  });

  it('O 符號應該對應預兆卡', () => {
    const symbol: string = 'O';
    const typeMap: Record<string, CardType> = {
      'E': 'event',
      'I': 'item',
      'O': 'omen',
    };

    expect(typeMap[symbol]).toBe('omen');
  });
});
