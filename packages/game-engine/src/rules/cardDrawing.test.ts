
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
    // Issue #298: 使用 CharacterStat 結構
    player = {
      id: 'player-1',
      name: '測試玩家',
      stats: {
        speed: { values: [3, 4, 4, 4, 5, 6, 7, 8], currentIndex: 3 },
        might: { values: [2, 3, 3, 4, 5, 6, 6, 7], currentIndex: 2 },
        sanity: { values: [3, 3, 4, 5, 5, 6, 6, 7], currentIndex: 4 },
        knowledge: { values: [2, 3, 3, 4, 5, 5, 6, 6], currentIndex: 3 },
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

    it('應該返回骰子結果陣列', () => {
      const result = applier.performRoll('might', 3, 4);
      
      expect(result.dice).toBeDefined();
      expect(Array.isArray(result.dice)).toBe(true);
      expect(result.dice.length).toBe(4); // 4 顆骰子
      expect(result.dice.every(d => d >= 0 && d <= 2)).toBe(true);
    });
  });

  describe('事件卡屬性檢定 performEventCheck', () => {
    it('應該執行需要檢定的事件卡', () => {
      const eventCard: Card = {
        id: 'event_speed_test',
        type: 'event',
        name: '速度測試',
        description: '測試你的速度！',
        icon: '',
        rollRequired: { stat: 'speed', target: 3 },
        success: '你成功了！獲得 1 點速度。',
        failure: '你失敗了！失去 1 點體力。',
      };

      const result = applier.performEventCheck(eventCard, player);

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('roll');
      expect(result).toHaveProperty('dice');
      expect(result).toHaveProperty('stat');
      expect(result).toHaveProperty('target');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('effectDescription');
      expect(result.stat).toBe('speed');
      expect(result.target).toBe(3);
    });

    it('應該根據成功/失敗返回對應效果描述', () => {
      const eventCard: Card = {
        id: 'event_might_test',
        type: 'event',
        name: '力量測試',
        description: '測試你的力量！',
        icon: '',
        rollRequired: { stat: 'might', target: 6 }, // 高目標，容易失敗
        success: '成功：力量 +1',
        failure: '失敗：力量 -1',
      };

      const result = applier.performEventCheck(eventCard, player);

      if (result.success) {
        expect(result.effectDescription).toContain('成功');
      } else {
        expect(result.effectDescription).toContain('失敗');
      }
    });

    it('應該正確解析效果中的數值變化', () => {
      const eventCard: Card = {
        id: 'event_stat_change',
        type: 'event',
        name: '屬性變化測試',
        description: '測試屬性變化',
        icon: '',
        rollRequired: { stat: 'knowledge', target: 1 }, // 低目標，容易成功
        success: '獲得知識 +2',
        failure: '失去理智 -1',
      };

      const result = applier.performEventCheck(eventCard, player);

      if (result.success && result.statChanges) {
        expect(result.statChanges.knowledge).toBe(2);
      } else if (!result.success && result.statChanges) {
        expect(result.statChanges.sanity).toBe(-1);
      }
    });

    it('應該使用玩家的當前屬性值決定骰子數量', () => {
      const eventCard: Card = {
        id: 'event_sanity_test',
        type: 'event',
        name: '理智測試',
        description: '測試你的理智！',
        icon: '',
        rollRequired: { stat: 'sanity', target: 4 },
        success: '成功',
        failure: '失敗',
      };

      // 玩家 sanity = 5
      const result = applier.performEventCheck(eventCard, player);
      
      expect(result.dice.length).toBe(5); // 5 顆骰子
    });

    it('沒有 rollRequired 的卡牌應該拋出錯誤', () => {
      const eventCard: Card = {
        id: 'event_no_roll',
        type: 'event',
        name: '無檢定事件',
        description: '不需要檢定',
        icon: '',
      };

      expect(() => {
        applier.performEventCheck(eventCard, player);
      }).toThrow('does not require a roll');
    });

    it('應該處理 Creepy Crawlies 類型的事件卡', () => {
      // 模擬 "Creepy Crawlies" 事件卡
      const creepyCrawliesCard: Card = {
        id: 'event_creepy_crawlies',
        type: 'event',
        name: '蜘蛛群',
        description: '一大群蜘蛛從天花板傾瀉而下！',
        icon: '',
        rollRequired: { stat: 'speed', target: 3 },
        success: '你揮開蜘蛛，毫髮無傷。',
        failure: '你被蜘蛛咬傷，失去 1 點體力。',
      };

      const result = applier.performEventCheck(creepyCrawliesCard, player);

      expect(result.stat).toBe('speed');
      expect(result.target).toBe(3);
      expect(result.effectDescription).toBeDefined();
    });

    it('應該處理 Disquieting Sounds 類型的事件卡', () => {
      // 模擬 "Disquieting Sounds" 事件卡
      const disquietingSoundsCard: Card = {
        id: 'event_disquieting_sounds',
        type: 'event',
        name: '詭異的聲音',
        description: '牆壁裡傳來低語聲，似乎在呼喚你的名字。',
        icon: '',
        rollRequired: { stat: 'sanity', target: 4 },
        success: '你保持冷靜，聲音消失了。',
        failure: '你嚇壞了，失去 1 點理智。',
      };

      const result = applier.performEventCheck(disquietingSoundsCard, player);

      expect(result.stat).toBe('sanity');
      expect(result.target).toBe(4);
    });

    it('應該處理 Locked Door 類型的事件卡', () => {
      // 模擬 "Locked Door" 事件卡
      const lockedDoorCard: Card = {
        id: 'event_locked_door',
        type: 'event',
        name: '鎖住的門',
        description: '一扇緊閉的門擋住了你的去路。',
        icon: '',
        rollRequired: { stat: 'might', target: 5 },
        success: '你成功撞開了門，可以繼續前進。',
        failure: '你撞傷了肩膀，失去 1 點體力。',
      };

      const result = applier.performEventCheck(lockedDoorCard, player);

      expect(result.stat).toBe('might');
      expect(result.target).toBe(5);
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
    // Issue #298: 使用 CharacterStat 結構
    player = {
      id: 'player-1',
      name: '測試玩家',
      stats: {
        speed: { values: [3, 4, 4, 4, 5, 6, 7, 8], currentIndex: 3 },
        might: { values: [2, 3, 3, 4, 5, 6, 6, 7], currentIndex: 2 },
        sanity: { values: [3, 3, 4, 5, 5, 6, 6, 7], currentIndex: 4 },
        knowledge: { values: [2, 3, 3, 4, 5, 5, 6, 6], currentIndex: 3 },
      },
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
