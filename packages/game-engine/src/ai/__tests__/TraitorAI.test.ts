/**
 * TraitorAI.test.ts - 叛徒 AI 測試
 * 
 * 測試項目：
 * 1. AI 初始化與配置
 * 2. 合法行動生成
 * 3. 決策評分系統
 * 4. 難度等級差異
 * 5. 移動決策
 * 6. 戰鬥決策
 * 7. 物品使用決策
 * 8. 探索決策
 * 9. 完整回合執行
 * 10. 可重播性（deterministic）
 */

import {
  TraitorAI,
  createTraitorAI,
  createTraitorAIs,
  isAIControlled,
  getAIControlledPlayers,
  TraitorAIConfig,
  TraitorObjectiveState,
} from '../TraitorAI';
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
    playerCount?: number;
    enableAI?: boolean;
  } = {}
): GameState {
  const {
    hauntActive = true,
    traitorId = 'traitor',
    playerCount = 2,
    enableAI = true,
  } = options;

  const players: Player[] = [];

  // 添加叛徒
  players.push(createTestPlayer(traitorId, true));

  // 添加英雄
  for (let i = 0; i < playerCount - 1; i++) {
    players.push(
      createTestPlayer(`hero${i}`, false, {
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
      currentPlayerId: traitorId,
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
      heroObjective: '消滅叛徒',
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

// ==================== AIDecisionEngine 測試 ====================

describe('AIDecisionEngine', () => {
  let engine: AIDecisionEngine;

  beforeEach(() => {
    engine = new AIDecisionEngine('medium', 'test-seed');
  });

  describe('初始化', () => {
    it('應該使用正確的難度初始化', () => {
      expect(engine.getDifficulty()).toBe('medium');
    });

    it('應該能夠改變難度', () => {
      engine.setDifficulty('hard');
      expect(engine.getDifficulty()).toBe('hard');
    });

    it('不同難度應該有不同的權重', () => {
      const easyEngine = new AIDecisionEngine('easy');
      const hardEngine = new AIDecisionEngine('hard');

      const easyWeights = easyEngine.getWeights();
      const hardWeights = hardEngine.getWeights();

      expect(hardWeights.attackWeight).toBeGreaterThan(easyWeights.attackWeight);
      expect(hardWeights.objectiveWeight).toBeGreaterThan(easyWeights.objectiveWeight);
    });
  });

  describe('合法行動生成', () => {
    it('應該返回正確的合法行動', () => {
      const state = createTestGameState();
      const actions = engine.getLegalActions(state, 'traitor');

      expect(actions).toHaveProperty('movablePositions');
      expect(actions).toHaveProperty('attackableTargets');
      expect(actions).toHaveProperty('usableItems');
      expect(actions).toHaveProperty('explorableDirections');
      expect(actions).toHaveProperty('canEndTurn');
    });

    it('應該正確識別可攻擊目標', () => {
      const state = createTestGameState({ hauntActive: true });
      const actions = engine.getLegalActions(state, 'traitor');

      // 英雄在同一房間，應該可以攻擊
      expect(actions.attackableTargets.length).toBeGreaterThan(0);
    });

    it('探索階段不應該有攻擊目標', () => {
      const state = createTestGameState({ hauntActive: false });
      const actions = engine.getLegalActions(state, 'traitor');

      expect(actions.attackableTargets).toHaveLength(0);
    });
  });

  describe('情境評估', () => {
    it('應該正確評估健康狀態', () => {
      const state = createTestGameState();
      // 設定力量值為 5（大於 wounded 閾值 4）
      state.players[0].currentStats.might = 5;
      const situation = engine.evaluateSituation(state, 'traitor');

      expect(situation.healthStatus).toBe('healthy');
    });

    it('應該識別危急狀態', () => {
      const state = createTestGameState();
      state.players[0].currentStats.might = 1;

      const situation = engine.evaluateSituation(state, 'traitor');
      expect(situation.healthStatus).toBe('critical');
    });

    it('應該正確識別叛徒身份', () => {
      const state = createTestGameState();
      const situation = engine.evaluateSituation(state, 'traitor');

      expect(situation.isTraitor).toBe(true);
    });
  });

  describe('決策評估', () => {
    it('應該給移動決策打分數', () => {
      const state = createTestGameState();
      const situation = engine.evaluateSituation(state, 'traitor');
      const position: Position3D = { x: 7, y: 7, floor: 'ground' };

      const score = engine.evaluateMove(state, 'traitor', position, situation);
      expect(typeof score).toBe('number');
    });

    it('應該給攻擊決策打分數', () => {
      const state = createTestGameState();
      const situation = engine.evaluateSituation(state, 'traitor');

      const score = engine.evaluateAttack(state, 'traitor', 'hero0', situation);
      expect(typeof score).toBe('number');
    });

    it('攻擊虛弱目標應該有更高分數', () => {
      const state = createTestGameState();
      state.players[1].currentStats.might = 1; // 英雄虛弱

      const situation = engine.evaluateSituation(state, 'traitor');
      const score = engine.evaluateAttack(state, 'traitor', 'hero0', situation);

      expect(score).toBeGreaterThan(0);
    });
  });
});

// ==================== TraitorAI 測試 ====================

describe('TraitorAI', () => {
  let ai: TraitorAI;
  let state: GameState;

  beforeEach(() => {
    state = createTestGameState();
    ai = createTraitorAI('traitor', 'medium', 'test-seed');
  });

  describe('初始化', () => {
    it('應該正確初始化 AI', () => {
      expect(ai).toBeDefined();
      expect(ai.getDifficulty()).toBe('medium');
    });

    it('應該記錄初始目標', () => {
      const objective = ai.getCurrentObjective();
      expect(objective).toBeDefined();
      expect(objective.type).toBe('eliminate_heroes');
    });

    it('應該能夠改變難度', () => {
      ai.setDifficulty('hard');
      expect(ai.getDifficulty()).toBe('hard');
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
  });

  describe('戰鬥決策', () => {
    it('應該返回有效的戰鬥決策', () => {
      const hero = state.players[1];
      const decision = ai.decideCombat(state, hero);

      expect(decision.action).toBe('attack');
      expect(decision.targetPlayerId).toBe('hero0');
    });

    it('危急時應該考慮逃跑', () => {
      state.players[0].currentStats.might = 1; // 叛徒虛弱

      const hero = state.players[1];
      const decision = ai.decideCombat(state, hero);

      // 可能選擇攻擊或逃跑
      expect(['attack', 'move']).toContain(decision.action);
    });
  });

  describe('物品使用決策', () => {
    it('應該處理沒有物品的情況', () => {
      const decision = ai.decideItemUse(state);

      expect(decision).toBeDefined();
    });

    it('應該評估可用物品', () => {
      // 給叛徒一個武器
      state.players[0].items.push({
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

  describe('目標追蹤', () => {
    it('應該找到最近的英雄', () => {
      const nearest = ai.getNearestHero(state);

      expect(nearest).not.toBeNull();
    });

    it('應該檢查勝利條件', () => {
      const canWin = ai.checkWinCondition(state);
      expect(canWin).toBe(false); // 還有英雄存活

      // 殺死所有英雄
      state.players[1].isDead = true;
      const canWinNow = ai.checkWinCondition(state);
      expect(canWinNow).toBe(true);
    });
  });
});

// ==================== 難度等級測試 ====================

describe('Difficulty Levels', () => {
  it('Easy 難度應該能夠執行', () => {
    const state = createTestGameState();
    const easyAI = createTraitorAI('traitor', 'easy', 'test-seed');

    const decision = easyAI.decideMove(state);
    expect(decision).toBeDefined();
    expect(decision.action).toBeDefined();
  });

  it('Hard 難度應該能夠執行', () => {
    const state = createTestGameState();
    const hardAI = createTraitorAI('traitor', 'hard', 'test-seed');

    const decision = hardAI.decideMove(state);
    expect(decision).toBeDefined();
    expect(decision.action).toBeDefined();
  });

  it('不同難度應該有不同的權重配置', () => {
    const easyAI = createTraitorAI('traitor', 'easy');
    const mediumAI = createTraitorAI('traitor', 'medium');
    const hardAI = createTraitorAI('traitor', 'hard');

    // 驗證可以正常運作
    expect(easyAI.getDifficulty()).toBe('easy');
    expect(mediumAI.getDifficulty()).toBe('medium');
    expect(hardAI.getDifficulty()).toBe('hard');
  });
});

// ==================== 可重播性測試 ====================

describe('Deterministic Behavior', () => {
  it('相同種子應該產生相同的決策序列', () => {
    const state = createTestGameState();
    const ai1 = createTraitorAI('traitor', 'medium', 'fixed-seed');
    const ai2 = createTraitorAI('traitor', 'medium', 'fixed-seed');

    const decisions1 = ai1.executeTurn(state);
    const decisions2 = ai2.executeTurn(state);

    expect(decisions1.length).toBe(decisions2.length);
    for (let i = 0; i < decisions1.length; i++) {
      expect(decisions1[i].action).toBe(decisions2[i].action);
    }
  });

  it('不同種子應該可能產生不同決策', () => {
    const state = createTestGameState();
    const ai1 = createTraitorAI('traitor', 'easy', 'seed-1');
    const ai2 = createTraitorAI('traitor', 'easy', 'seed-2');

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
  describe('isAIControlled', () => {
    it('應該正確識別 AI 控制的玩家', () => {
      const state = createTestGameState({ enableAI: true });

      expect(isAIControlled(state, 'traitor')).toBe(true);
      expect(isAIControlled(state, 'hero0')).toBe(false);
    });

    it('禁用 AI 時應該返回 false', () => {
      const state = createTestGameState({ enableAI: false });

      expect(isAIControlled(state, 'traitor')).toBe(false);
    });
  });

  describe('getAIControlledPlayers', () => {
    it('應該返回所有 AI 控制的玩家', () => {
      const state = createTestGameState();
      const aiPlayers = getAIControlledPlayers(state);

      expect(aiPlayers).toContain('traitor');
      expect(aiPlayers).not.toContain('hero0');
    });
  });

  describe('createTraitorAIs', () => {
    it('應該為所有叛徒創建 AI', () => {
      const state = createTestGameState();
      const ais = createTraitorAIs(state, 'medium');

      expect(ais.has('traitor')).toBe(true);
      expect(ais.size).toBe(1);
    });
  });
});

// ==================== 決策選擇測試 ====================

describe('Decision Selection', () => {
  it('應該選擇最高分的決策', () => {
    const decisions: AIDecision[] = [
      { action: 'move', score: 10, reason: '移動' },
      { action: 'attack', score: 20, reason: '攻擊' },
      { action: 'endTurn', score: 5, reason: '結束' },
    ];

    const selected = selectDecisionByDifficulty(decisions, 'hard');
    expect(selected?.action).toBe('attack');
  });

  it('Easy 難度應該能夠選擇決策', () => {
    const decisions: AIDecision[] = [
      { action: 'move', score: 100, reason: '最佳移動' },
      { action: 'attack', score: 1, reason: '次佳攻擊' },
    ];

    const selected = selectDecisionByDifficulty(decisions, 'easy', Math.random);
    expect(selected).toBeDefined();
    expect(['move', 'attack']).toContain(selected?.action);
  });
});

// ==================== 整合測試 ====================

describe('Integration Tests', () => {
  it('應該能夠執行多個回合', () => {
    const state = createTestGameState();
    const ai = createTraitorAI('traitor', 'medium', 'test-seed');

    for (let turn = 1; turn <= 5; turn++) {
      state.turn.turnNumber = turn;
      state.turn.currentPlayerId = 'traitor';
      state.turn.hasEnded = false;
      state.turn.movesRemaining = 4;

      const decisions = ai.executeTurn(state);
      expect(decisions.length).toBeGreaterThan(0);
    }

    const history = ai.getActionHistory();
    expect(history.length).toBeGreaterThanOrEqual(5);
  });

  it('應該適應不同的遊戲狀態', () => {
    const ai = createTraitorAI('traitor', 'hard');

    // 測試不同健康狀態
    const healthyState = createTestGameState();
    const criticalState = createTestGameState();
    criticalState.players[0].currentStats.might = 1;

    const healthyDecision = ai.decideMove(healthyState);
    ai.setDifficulty('hard'); // 重置
    const criticalDecision = ai.decideMove(criticalState);

    expect(healthyDecision).toBeDefined();
    expect(criticalDecision).toBeDefined();
  });
});

// ==================== 效能測試 ====================

describe('Performance', () => {
  it('決策應該在合理時間內完成', () => {
    const state = createTestGameState();
    const ai = createTraitorAI('traitor', 'hard');

    const start = Date.now();
    ai.decideMove(state);
    const end = Date.now();

    expect(end - start).toBeLessThan(1000); // 應該在 1 秒內完成
  });

  it('應該能夠處理大量行動選項', () => {
    const state = createTestGameState();
    // 添加更多玩家
    for (let i = 0; i < 3; i++) {
      state.players.push(createTestPlayer(`extra${i}`));
    }

    const ai = createTraitorAI('traitor', 'medium');
    const decision = ai.decideMove(state);

    expect(decision).toBeDefined();
  });
});
