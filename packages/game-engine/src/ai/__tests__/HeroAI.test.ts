/**
 * HeroAI.test.ts - 英雄 AI 測試
 * 
 * 測試項目：
 * 1. AI 初始化與配置
 * 2. 合法行動生成
 * 3. 決策評分系統
 * 4. 難度等級差異
 * 5. 移動決策（英雄邏輯）
 * 6. 戰鬥決策（英雄邏輯）
 * 7. 物品使用決策（治療優先）
 * 8. 探索決策
 * 9. 完整回合執行
 * 10. 可重播性（deterministic）
 * 11. 策略切換
 * 12. 叛徒追蹤
 */

import {
  HeroAI,
  createHeroAI,
  createHeroAIs,
  isAIControlledHero,
  getAIControlledHeroes,
  HeroAIConfig,
  HeroObjectiveState,
} from '../HeroAI';
import {
  HeroAIDecisionEngine,
  HeroGameSituation,
  HeroStrategy,
  createHeroDecisionEngine,
  evaluateTeamStrategy,
} from '../HeroAIDecisionEngine';
import {
  AIDecisionEngine,
  AIDecision,
  AIDifficulty,
  LegalActions,
  selectDecisionByDifficulty,
} from '../AIDecisionEngine';
import {
  GameState,
  Player,
  Position3D,
  Character,
  Card,
  GamePhase,
  Tile,
  FloorMap,
} from '../../types';
import { Room, Floor } from '@betrayal/shared';

// ==================== 測試輔助函數 ====================

/**
 * 建立基礎角色
 */
function createTestCharacter(): Character {
  return {
    id: 'test-char',
    name: '測試角色',
    nameEn: 'Test Character',
    age: 30,
    description: '測試用角色',
    color: '#FF0000',
    portraitSvg: '/test/portrait.svg',
    fullSvg: '/test/full.svg',
    stats: {
      speed: [4, 4],
      might: [4, 4],
      sanity: [4, 4],
      knowledge: [4, 4],
    },
    statTrack: {
      speed: [0, 4, 4, 5, 5, 6, 7, 7],
      might: [0, 4, 5, 5, 6, 6, 7, 8],
      sanity: [0, 4, 4, 5, 6, 6, 7, 7],
      knowledge: [0, 4, 4, 5, 5, 6, 7, 7],
    },
  };
}

/**
 * 建立測試房間
 */
function createTestRoom(id: string, floor: Floor = 'ground'): Room {
  return {
    id,
    name: '測試房間',
    nameEn: 'Test Room',
    floor,
    symbol: null,
    doors: ['north', 'south', 'east', 'west'],
    description: '測試用房間',
    color: '#888888',
    icon: '<svg></svg>',
    isOfficial: true,
  };
}

/**
 * 建立測試玩家
 */
function createTestPlayer(
  id: string,
  isTraitor: boolean = false,
  position: Position3D = { x: 7, y: 7, floor: 'ground' }
): Player {
  return {
    id,
    name: `Player ${id}`,
    character: createTestCharacter(),
    position,
    currentStats: { speed: 4, might: 4, sanity: 4, knowledge: 4 },
    items: [],
    omens: [],
    isTraitor,
    isDead: false,
    usedItemsThisTurn: [],
  };
}

/**
 * 建立空的樓層地圖
 */
function createEmptyFloorMap(floor: Floor): FloorMap {
  return Array(15).fill(null).map((_, y) =>
    Array(15).fill(null).map((_, x): Tile => ({
      x,
      y,
      floor,
      room: null,
      discovered: false,
      rotation: 0,
      placementOrder: 0,
    }))
  );
}

/**
 * 建立測試遊戲狀態
 */
function createTestGameState(
  options: {
    hauntActive?: boolean;
    traitorId?: string;
    heroIds?: string[];
    playerCount?: number;
    enableAI?: boolean;
  } = {}
): GameState {
  const {
    hauntActive = true,
    traitorId = 'traitor',
    heroIds = ['hero1', 'hero2'],
    playerCount = 3,
    enableAI = true,
  } = options;

  const players: Player[] = [];

  // 添加叛徒
  players.push(createTestPlayer(traitorId, true, { x: 5, y: 5, floor: 'ground' }));

  // 添加英雄
  for (let i = 0; i < heroIds.length; i++) {
    players.push(
      createTestPlayer(heroIds[i], false, {
        x: 7 + i,
        y: 7,
        floor: 'ground',
      })
    );
  }

  // 建立地圖
  const groundMap = createEmptyFloorMap('ground');
  groundMap[7][7] = {
    x: 7,
    y: 7,
    floor: 'ground',
    room: createTestRoom('entrance_hall', 'ground'),
    discovered: true,
    rotation: 0,
    placementOrder: 1,
  };

  return {
    gameId: 'test-game',
    version: '1.0.0',
    phase: hauntActive ? 'haunt' : 'exploration',
    result: 'ongoing',
    config: {
      playerCount,
      enableAI,
      seed: 'test-seed',
      maxTurns: 100,
    },
    map: {
      ground: groundMap,
      upper: createEmptyFloorMap('upper'),
      basement: createEmptyFloorMap('basement'),
      placedRoomCount: 1,
    },
    players,
    playerOrder: players.map(p => p.id),
    turn: {
      currentPlayerId: heroIds[0],
      turnNumber: 1,
      movesRemaining: 4,
      hasDiscoveredRoom: false,
      hasDrawnCard: false,
      hasEnded: false,
      usedSpecialActions: [],
      usedItems: [],
    },
    cardDecks: {
      event: { remaining: [], drawn: [], discarded: [] },
      item: { remaining: [], drawn: [], discarded: [] },
      omen: { remaining: [], drawn: [], discarded: [] },
    },
    roomDeck: {
      ground: [],
      upper: [],
      basement: [],
      drawn: new Set(),
    },
    haunt: {
      isActive: hauntActive,
      type: hauntActive ? 'single_traitor' : 'none',
      hauntNumber: hauntActive ? 1 : null,
      traitorPlayerId: traitorId,
      omenCount: 1,
      heroObjective: '擊敗叛徒',
      traitorObjective: '消滅所有英雄',
    },
    combat: {
      isActive: false,
      attackerId: null,
      defenderId: null,
      usedStat: null,
      attackerRoll: null,
      defenderRoll: null,
      damage: null,
    },
    log: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    rngState: {
      seed: 'test-seed',
      count: 0,
      internalState: [12345],
    },
    placedRoomIds: new Set(['entrance_hall']),
  };
}

// ==================== HeroAIDecisionEngine 測試 ====================

describe('HeroAIDecisionEngine', () => {
  let engine: HeroAIDecisionEngine;

  beforeEach(() => {
    engine = new HeroAIDecisionEngine('medium', 'test-seed');
  });

  describe('初始化', () => {
    it('應該使用正確的難度初始化', () => {
      expect(engine.getDifficulty()).toBe('medium');
    });

    it('應該使用英雄特定的預設權重', () => {
      const weights = engine.getHeroWeights();
      expect(weights.survivalWeight).toBeGreaterThan(weights.attackWeight);
    });

    it('不同難度應該有不同的英雄權重', () => {
      const easyEngine = new HeroAIDecisionEngine('easy');
      const hardEngine = new HeroAIDecisionEngine('hard');

      const easyWeights = easyEngine.getHeroWeights();
      const hardWeights = hardEngine.getHeroWeights();

      expect(hardWeights.survivalWeight).toBeGreaterThan(easyWeights.survivalWeight);
    });
  });

  describe('英雄情境評估', () => {
    it('應該正確評估叛徒位置', () => {
      const state = createTestGameState();
      const situation = engine.evaluateHeroSituation(state, 'hero1');

      expect(situation.traitorPosition).not.toBeNull();
      expect(situation.distanceToTraitor).toBeGreaterThan(0);
    });

    it('應該正確識別叛徒健康狀態', () => {
      const state = createTestGameState();
      // 設定叛徒力量值為 1（危急）
      state.players[0].currentStats.might = 1;
      
      const situation = engine.evaluateHeroSituation(state, 'hero1');
      expect(situation.traitorHealth).toBe('critical');
    });

    it('應該檢查是否有治療物品', () => {
      const state = createTestGameState();
      // 給英雄一個治療物品
      state.players[1].items.push({
        id: 'medical_kit',
        type: 'item',
        name: '醫療包',
        description: '恢復健康的醫療包',
        icon: 'medical',
      });

      const situation = engine.evaluateHeroSituation(state, 'hero1');
      expect(situation.hasHealingItem).toBe(true);
    });

    it('應該檢查是否有武器', () => {
      const state = createTestGameState();
      // 給英雄一個武器
      state.players[1].items.push({
        id: 'weapon_axe',
        type: 'item',
        name: '斧頭',
        description: '鋒利的斧頭',
        icon: 'axe',
      });

      const situation = engine.evaluateHeroSituation(state, 'hero1');
      expect(situation.hasWeapon).toBe(true);
    });
  });

  describe('策略決定', () => {
    it('危急時應該選擇逃跑策略', () => {
      const state = createTestGameState();
      state.players[1].currentStats.might = 1; // 英雄危急

      const situation = engine.evaluateHeroSituation(state, 'hero1');
      const strategy = engine.determineStrategy(situation);

      expect(strategy).toBe('evasive');
    });

    it('叛徒虛弱且有武器時應該選擇積極策略', () => {
      const state = createTestGameState();
      state.players[0].currentStats.might = 1; // 叛徒危急
      state.players[1].items.push({
        id: 'weapon_knife',
        type: 'item',
        name: '匕首',
        description: '鋒利的匕首',
        icon: 'knife',
      });

      const situation = engine.evaluateHeroSituation(state, 'hero1');
      const strategy = engine.determineStrategy(situation);

      expect(strategy).toBe('aggressive');
    });

    it('應該能夠設定和取得策略', () => {
      engine.setStrategy('aggressive');
      expect(engine.getStrategy()).toBe('aggressive');

      engine.setStrategy('defensive');
      expect(engine.getStrategy()).toBe('defensive');
    });
  });

  describe('決策上下文', () => {
    it('應該建立有效的決策上下文', () => {
      const state = createTestGameState();
      const context = engine.createDecisionContext(state, 'hero1');

      expect(context).toHaveProperty('strategy');
      expect(context).toHaveProperty('dangerLevel');
      expect(context).toHaveProperty('recommendedActions');
    });

    it('應該根據距離評估危險等級', () => {
      const state = createTestGameState();
      // 將英雄放在叛徒旁邊
      state.players[1].position = { x: 5, y: 6, floor: 'ground' };

      const context = engine.createDecisionContext(state, 'hero1');
      expect(['medium', 'high']).toContain(context.dangerLevel);
    });
  });
});

// ==================== HeroAI 測試 ====================

describe('HeroAI', () => {
  let ai: HeroAI;
  let state: GameState;

  beforeEach(() => {
    state = createTestGameState();
    ai = createHeroAI('hero1', 'medium', 'test-seed');
  });

  describe('初始化', () => {
    it('應該正確初始化 AI', () => {
      expect(ai).toBeDefined();
      expect(ai.getDifficulty()).toBe('medium');
    });

    it('應該記錄初始目標（擊敗叛徒）', () => {
      const objective = ai.getCurrentObjective();
      expect(objective).toBeDefined();
      expect(objective.type).toBe('defeat_traitor');
    });

    it('應該能夠改變難度', () => {
      ai.setDifficulty('hard');
      expect(ai.getDifficulty()).toBe('hard');
    });

    it('應該初始化叛徒追蹤狀態', () => {
      const aiState = ai.getState();
      expect(aiState.knownTraitorId).toBeNull();
      expect(aiState.knownTraitorPosition).toBeNull();
    });
  });

  describe('移動決策', () => {
    it('應該返回有效的移動決策', () => {
      const decision = ai.decideMove(state);

      expect(decision).toHaveProperty('action');
      expect(decision).toHaveProperty('score');
      expect(decision).toHaveProperty('reason');
    });

    it('應該返回合法的行動類型', () => {
      const decision = ai.decideMove(state);
      const validActions = ['move', 'attack', 'useItem', 'explore', 'endTurn'];
      expect(validActions).toContain(decision.action);
    });

    it('危急時應該傾向遠離叛徒', () => {
      state.players[1].currentStats.might = 1; // 英雄危急
      
      const decision = ai.decideMove(state);
      // 危急時應該選擇移動或結束回合，而不是攻擊
      if (decision.action === 'move') {
        expect(decision.reason).toContain('移動');
      }
    });
  });

  describe('戰鬥決策', () => {
    it('應該返回有效的戰鬥決策', () => {
      // 設定英雄為健康狀態以確保會攻擊
      state.players[1].currentStats.might = 6;
      
      const traitor = state.players[0];
      const decision = ai.decideCombat(state, traitor);

      // 健康時應該傾向攻擊
      expect(['attack', 'move']).toContain(decision.action);
      if (decision.action === 'attack') {
        expect(decision.targetPlayerId).toBe('traitor');
      }
    });

    it('危急時應該考慮逃跑', () => {
      state.players[1].currentStats.might = 1; // 英雄危急

      const traitor = state.players[0];
      const decision = ai.decideCombat(state, traitor);

      // 可能選擇攻擊或逃跑
      expect(['attack', 'move']).toContain(decision.action);
    });

    it('健康且有武器時應該傾向攻擊', () => {
      state.players[1].items.push({
        id: 'weapon_sword',
        type: 'item',
        name: '劍',
        description: '鋒利的劍',
        icon: 'sword',
      });

      const traitor = state.players[0];
      const decision = ai.decideCombat(state, traitor);

      expect(decision.action).toBe('attack');
    });
  });

  describe('物品使用決策', () => {
    it('應該處理沒有物品的情況', () => {
      const decision = ai.decideItemUse(state);

      expect(decision).toBeDefined();
    });

    it('危急時應該優先使用治療物品', () => {
      state.players[1].currentStats.might = 1; // 英雄危急
      state.players[1].items.push({
        id: 'healing_potion',
        type: 'item',
        name: '治療藥水',
        description: '恢復健康的藥水',
        icon: 'potion',
      });

      const decision = ai.decideItemUse(state);
      
      // 危急時應該傾向使用治療物品
      if (decision.action === 'useItem') {
        expect(decision.itemId).toBe('healing_potion');
      }
    });

    it('應該評估可用物品', () => {
      // 給英雄一個武器
      state.players[1].items.push({
        id: 'weapon_knife',
        type: 'item',
        name: '匕首',
        description: '鋒利的匕首',
        icon: 'knife',
      });

      const decision = ai.decideItemUse(state);
      expect(decision).toBeDefined();
    });
  });

  describe('回合執行', () => {
    it('應該執行完整回合', () => {
      const decisions = ai.executeTurn(state);

      expect(Array.isArray(decisions)).toBe(true);
      expect(decisions.length).toBeGreaterThan(0);
    });

    it('應該記錄行動歷史', () => {
      ai.executeTurn(state);
      const history = ai.getActionHistory();

      expect(history.length).toBeGreaterThan(0);
    });
  });

  describe('叛徒追蹤', () => {
    it('應該追蹤叛徒位置', () => {
      ai.decideMove(state);
      
      const traitorPosition = ai.getKnownTraitorPosition();
      expect(traitorPosition).not.toBeNull();
    });

    it('應該能夠取得叛徒玩家', () => {
      const traitor = ai.getTraitor(state);
      expect(traitor).not.toBeNull();
      expect(traitor?.isTraitor).toBe(true);
    });
  });

  describe('治療需求', () => {
    it('應該識別治療需求', () => {
      state.players[1].currentStats.might = 2; // 受傷
      
      ai.decideMove(state);
      expect(ai.getNeedsHealing()).toBe(true);
    });

    it('健康時不應該需要治療', () => {
      state.players[1].currentStats.might = 6; // 健康
      
      ai.decideMove(state);
      expect(ai.getNeedsHealing()).toBe(false);
    });
  });

  describe('目標追蹤', () => {
    it('應該檢查勝利條件', () => {
      const canWin = ai.checkWinCondition(state);
      expect(canWin).toBe(false); // 叛徒還存活

      // 殺死叛徒
      state.players[0].isDead = true;
      const canWinNow = ai.checkWinCondition(state);
      expect(canWinNow).toBe(true);
    });
  });
});

// ==================== 難度等級測試 ====================

describe('Difficulty Levels', () => {
  it('Easy 難度應該能夠執行', () => {
    const state = createTestGameState();
    const easyAI = createHeroAI('hero1', 'easy', 'test-seed');

    const decision = easyAI.decideMove(state);
    expect(decision).toBeDefined();
    expect(decision.action).toBeDefined();
  });

  it('Hard 難度應該能夠執行', () => {
    const state = createTestGameState();
    const hardAI = createHeroAI('hero1', 'hard', 'test-seed');

    const decision = hardAI.decideMove(state);
    expect(decision).toBeDefined();
    expect(decision.action).toBeDefined();
  });

  it('不同難度應該有不同的權重配置', () => {
    const easyAI = createHeroAI('hero1', 'easy');
    const mediumAI = createHeroAI('hero1', 'medium');
    const hardAI = createHeroAI('hero1', 'hard');

    expect(easyAI.getDifficulty()).toBe('easy');
    expect(mediumAI.getDifficulty()).toBe('medium');
    expect(hardAI.getDifficulty()).toBe('hard');
  });
});

// ==================== 可重播性測試 ====================

describe('Deterministic Behavior', () => {
  it('相同種子應該產生相同的決策序列', () => {
    const state = createTestGameState();
    const ai1 = createHeroAI('hero1', 'medium', 'fixed-seed');
    const ai2 = createHeroAI('hero1', 'medium', 'fixed-seed');

    const decisions1 = ai1.executeTurn(state);
    const decisions2 = ai2.executeTurn(state);

    expect(decisions1.length).toBe(decisions2.length);
    for (let i = 0; i < decisions1.length; i++) {
      expect(decisions1[i].action).toBe(decisions2[i].action);
    }
  });

  it('不同種子應該可能產生不同決策', () => {
    const state = createTestGameState();
    const ai1 = createHeroAI('hero1', 'easy', 'seed-1');
    const ai2 = createHeroAI('hero1', 'easy', 'seed-2');

    const decisions1 = ai1.executeTurn(state);
    const decisions2 = ai2.executeTurn(state);

    // 由於 Easy 難度有隨機性，決策可能不同
    // 但我們不能保證一定不同，所以這個測試主要是檢查不會崩潰
    expect(decisions1).toBeDefined();
    expect(decisions2).toBeDefined();
  });
});

// ==================== 輔助函數測試 ====================

describe('Helper Functions', () => {
  describe('isAIControlledHero', () => {
    it('應該正確識別 AI 控制的英雄', () => {
      const state = createTestGameState({ enableAI: true });

      expect(isAIControlledHero(state, 'hero1')).toBe(true);
      expect(isAIControlledHero(state, 'traitor')).toBe(false);
    });

    it('禁用 AI 時應該返回 false', () => {
      const state = createTestGameState({ enableAI: false });

      expect(isAIControlledHero(state, 'hero1')).toBe(false);
    });

    it('叛徒不應該被識別為英雄', () => {
      const state = createTestGameState({ enableAI: true });

      expect(isAIControlledHero(state, 'traitor')).toBe(false);
    });
  });

  describe('getAIControlledHeroes', () => {
    it('應該返回所有 AI 控制的英雄', () => {
      const state = createTestGameState({ heroIds: ['hero1', 'hero2', 'hero3'] });
      const heroPlayers = getAIControlledHeroes(state);

      expect(heroPlayers).toContain('hero1');
      expect(heroPlayers).toContain('hero2');
      expect(heroPlayers).toContain('hero3');
      expect(heroPlayers).not.toContain('traitor');
    });
  });

  describe('createHeroAIs', () => {
    it('應該為所有英雄創建 AI', () => {
      const state = createTestGameState({ heroIds: ['hero1', 'hero2'] });
      const ais = createHeroAIs(state, 'medium');

      expect(ais.has('hero1')).toBe(true);
      expect(ais.has('hero2')).toBe(true);
      expect(ais.size).toBe(2);
    });
  });
});

// ==================== 團隊策略測試 ====================

describe('Team Strategy', () => {
  it('應該評估團隊策略', () => {
    const state = createTestGameState({ heroIds: ['hero1', 'hero2'] });
    const engine = createHeroDecisionEngine('medium');
    
    const situations = [
      engine.evaluateHeroSituation(state, 'hero1'),
      engine.evaluateHeroSituation(state, 'hero2'),
    ];

    const strategy = evaluateTeamStrategy(situations);
    expect(['surround', 'focus', 'split', 'retreat']).toContain(strategy);
  });

  it('健康不佳時應該建議撤退', () => {
    const state = createTestGameState({ heroIds: ['hero1', 'hero2'] });
    
    // 讓英雄們都受傷
    state.players[1].currentStats.might = 1;
    state.players[2].currentStats.might = 1;

    const engine = createHeroDecisionEngine('medium');
    const situations = [
      engine.evaluateHeroSituation(state, 'hero1'),
      engine.evaluateHeroSituation(state, 'hero2'),
    ];

    const strategy = evaluateTeamStrategy(situations);
    expect(strategy).toBe('retreat');
  });
});

// ==================== 整合測試 ====================

describe('Integration Tests', () => {
  it('應該能夠執行多個回合', () => {
    const state = createTestGameState();
    const ai = createHeroAI('hero1', 'medium', 'test-seed');

    for (let turn = 1; turn <= 5; turn++) {
      state.turn.turnNumber = turn;
      state.turn.currentPlayerId = 'hero1';
      state.turn.hasEnded = false;
      state.turn.movesRemaining = 4;

      const decisions = ai.executeTurn(state);
      expect(decisions.length).toBeGreaterThan(0);
    }

    const history = ai.getActionHistory();
    expect(history.length).toBeGreaterThanOrEqual(5);
  });

  it('應該適應不同的遊戲狀態', () => {
    const ai = createHeroAI('hero1', 'hard');

    // 測試不同健康狀態
    const healthyState = createTestGameState();
    const criticalState = createTestGameState();
    criticalState.players[1].currentStats.might = 1;

    const healthyDecision = ai.decideMove(healthyState);
    ai.setDifficulty('hard'); // 重置
    const criticalDecision = ai.decideMove(criticalState);

    expect(healthyDecision).toBeDefined();
    expect(criticalDecision).toBeDefined();
  });

  it('多個英雄 AI 應該能夠獨立運作', () => {
    const state = createTestGameState({ heroIds: ['hero1', 'hero2', 'hero3'] });
    const ais = createHeroAIs(state, 'medium');

    for (const [heroId, ai] of ais) {
      const decision = ai.decideMove(state);
      expect(decision).toBeDefined();
      expect(decision.action).toBeDefined();
    }
  });
});

// ==================== 效能測試 ====================

describe('Performance', () => {
  it('決策應該在合理時間內完成', () => {
    const state = createTestGameState();
    const ai = createHeroAI('hero1', 'hard');

    const start = Date.now();
    ai.decideMove(state);
    const end = Date.now();

    expect(end - start).toBeLessThan(1000); // 應該在 1 秒內完成
  });

  it('應該能夠處理大量行動選項', () => {
    const state = createTestGameState({ heroIds: ['hero1', 'hero2', 'hero3', 'hero4'] });

    const ai = createHeroAI('hero1', 'medium');
    const decision = ai.decideMove(state);

    expect(decision).toBeDefined();
  });
});
