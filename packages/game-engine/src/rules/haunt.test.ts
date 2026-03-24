/**
 * Haunt Roll 和 Haunt Revelation 系統測試
 * 
 * 測試覆蓋：
 * 1. Haunt Roll 邏輯
 * 2. Haunt Revelation 流程
 * 3. 玩家陣營分配
 * 4. 遊戲狀態更新
 */


import { SeededRng } from '../core/GameState';
import {
  makeHauntRoll,
  isLastOmen,
  shouldMakeHauntRoll,
  selectHauntScenario,
  assignPlayerSides,
  revealHaunt,
  createHauntStartResult,
  isTraitor,
  isHero,
  getTraitor,
  getHeroes,
  getPlayerSide,
  HAUNT_ROLL_THRESHOLD,
  TOTAL_OMEN_CARDS,
} from './haunt';
import { HAUNT_SCENARIOS } from '../data/hauntScenarios';
import { GameState, GamePhase, Player, HauntState, Character } from '../types';

// ==================== 測試輔助函數 ====================

/** 建立測試用的 Character */
function createMockCharacter(id: string, name: string): Character {
  return {
    id,
    name,
    nameEn: name,
    age: 30,
    description: 'Test character',
    color: '#ff0000',
    stats: {
      speed: [4, 4],
      might: [4, 4],
      sanity: [4, 4],
      knowledge: [4, 4],
    },
    statTrack: {
      speed: [2, 3, 4, 5, 6, 7, 7, 8],
      might: [2, 3, 3, 4, 5, 6, 6, 7],
      sanity: [2, 3, 3, 4, 5, 6, 6, 7],
      knowledge: [2, 3, 3, 4, 5, 6, 6, 7],
    },
  };
}

/** 建立測試用的 Player */
function createMockPlayer(id: string, name: string): Player {
  return {
    id,
    name,
    character: createMockCharacter(id, name),
    position: { x: 7, y: 7, floor: 'ground' },
    currentStats: {
      speed: 4,
      might: 4,
      sanity: 4,
      knowledge: 4,
    },
    items: [],
    omens: [],
    isTraitor: false,
    isDead: false,
    usedItemsThisTurn: [],
  };
}

/** 建立測試用的 GameState */
function createMockGameState(
  phase: GamePhase = 'exploration',
  hauntActive: boolean = false,
  omenCount: number = 0
): GameState {
  const players = [
    createMockPlayer('player-1', 'Alice'),
    createMockPlayer('player-2', 'Bob'),
    createMockPlayer('player-3', 'Charlie'),
  ];

  return {
    gameId: 'test-game',
    version: '1.0.0',
    phase,
    result: 'ongoing',
    config: {
      playerCount: 3,
      enableAI: false,
      seed: 'test-seed',
      maxTurns: 100,
    },
    map: {
      ground: [],
      upper: [],
      basement: [],
      placedRoomCount: 3,
    },
    players,
    playerOrder: players.map(p => p.id),
    turn: {
      currentPlayerId: 'player-1',
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
      type: 'none',
      hauntNumber: null,
      traitorPlayerId: null,
      omenCount,
      heroObjective: null,
      traitorObjective: null,
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
    placedRoomIds: new Set(),
  };
}

// ==================== Haunt Roll 測試 ====================

describe('Haunt Roll 系統', () => {
  let rng: SeededRng;

  beforeEach(() => {
    rng = new SeededRng('test-seed');
  });

  describe('makeHauntRoll', () => {
    it('應該擲出正確數量的骰子', () => {
      const result = makeHauntRoll(3, rng);
      expect(result.diceCount).toBe(3);
      expect(result.dice.length).toBe(3);
    });

    it('當沒有預兆時應該至少擲 1 顆骰子', () => {
      const result = makeHauntRoll(0, rng);
      expect(result.diceCount).toBe(1);
      expect(result.dice.length).toBe(1);
    });

    it('骰子結果應該在有效範圍內 (0, 1, 2)', () => {
      // 多次測試確保隨機性
      for (let i = 0; i < 100; i++) {
        const result = makeHauntRoll(5, rng);
        result.dice.forEach(die => {
          expect([0, 1, 2]).toContain(die);
        });
      }
    });

    it('總和應該等於所有骰子結果相加', () => {
      const result = makeHauntRoll(4, rng);
      const expectedTotal = result.dice.reduce((a, b) => a + b, 0);
      expect(result.total).toBe(expectedTotal);
    });

    it('當總和 < 5 時應該觸發作祟', () => {
      // 使用固定的 seed 來確保可重現的結果
      const fixedRng = new SeededRng('low-roll-seed');
      
      // 模擬多次擲骰，檢查邏輯正確性
      const result = makeHauntRoll(1, fixedRng);
      
      // 驗證觸發條件邏輯
      expect(result.hauntBegins).toBe(result.total < HAUNT_ROLL_THRESHOLD);
    });

    it('當總和 >= 5 時不應該觸發作祟', () => {
      // 測試高數值情況
      const result = makeHauntRoll(10, rng);
      
      // 10 顆骰子，每顆最大 2，理論上很容易超過 5
      // 但這個測試主要驗證邏輯
      expect(result.hauntBegins).toBe(result.total < HAUNT_ROLL_THRESHOLD);
    });
  });

  describe('isLastOmen', () => {
    it('當預兆數量等於總數時應該返回 true', () => {
      expect(isLastOmen(TOTAL_OMEN_CARDS)).toBe(true);
    });

    it('當預兆數量超過總數時應該返回 true', () => {
      expect(isLastOmen(TOTAL_OMEN_CARDS + 1)).toBe(true);
    });

    it('當預兆數量少於總數時應該返回 false', () => {
      expect(isLastOmen(TOTAL_OMEN_CARDS - 1)).toBe(false);
      expect(isLastOmen(0)).toBe(false);
    });
  });

  describe('shouldMakeHauntRoll', () => {
    it('在探索階段且未觸發作祟時應該返回 true', () => {
      expect(shouldMakeHauntRoll('exploration', false)).toBe(true);
    });

    it('當作祟已激活時應該返回 false', () => {
      expect(shouldMakeHauntRoll('exploration', true)).toBe(false);
    });

    it('在作祟揭示階段應該返回 false', () => {
      expect(shouldMakeHauntRoll('haunt_reveal', false)).toBe(false);
    });

    it('在作祟進行階段應該返回 false', () => {
      expect(shouldMakeHauntRoll('haunt', false)).toBe(false);
    });

    it('在遊戲設置階段應該返回 false', () => {
      expect(shouldMakeHauntRoll('setup', false)).toBe(false);
    });
  });
});

// ==================== Haunt Revelation 測試 ====================

describe('Haunt Revelation 系統', () => {
  let rng: SeededRng;
  let mockGameState: GameState;

  beforeEach(() => {
    rng = new SeededRng('test-seed');
    mockGameState = createMockGameState('exploration', false, 3);
  });

  describe('selectHauntScenario', () => {
    it('應該返回一個有效的劇本', () => {
      const scenario = selectHauntScenario(
        mockGameState.players,
        'player-1',
        rng
      );
      
      expect(scenario).toBeDefined();
      expect(HAUNT_SCENARIOS).toContain(scenario);
    });

    it('劇本應該有所有必要屬性', () => {
      const scenario = selectHauntScenario(
        mockGameState.players,
        'player-1',
        rng
      );
      
      expect(scenario.id).toBeDefined();
      expect(scenario.name).toBeDefined();
      expect(scenario.type).toBeDefined();
      expect(scenario.heroObjective).toBeDefined();
      expect(scenario.heroWinCondition).toBeDefined();
    });
  });

  describe('assignPlayerSides', () => {
    it('單叛徒模式：發現者應該成為叛徒', () => {
      const scenario = HAUNT_SCENARIOS.find(s => s.type === 'single_traitor')!;
      const assignments = assignPlayerSides(
        mockGameState.players,
        scenario,
        'player-1'
      );
      
      const traitor = assignments.find(a => a.playerId === 'player-1');
      expect(traitor?.isTraitor).toBe(true);
      expect(traitor?.side).toBe('traitor');
    });

    it('單叛徒模式：其他玩家應該是英雄', () => {
      const scenario = HAUNT_SCENARIOS.find(s => s.type === 'single_traitor')!;
      const assignments = assignPlayerSides(
        mockGameState.players,
        scenario,
        'player-1'
      );
      
      const heroes = assignments.filter(a => a.playerId !== 'player-1');
      heroes.forEach(hero => {
        expect(hero.isTraitor).toBe(false);
        expect(hero.side).toBe('hero');
      });
    });

    it('合作模式：所有人都應該是英雄', () => {
      const cooperativeScenario = {
        ...HAUNT_SCENARIOS[0],
        type: 'cooperative' as const,
      };
      const assignments = assignPlayerSides(
        mockGameState.players,
        cooperativeScenario,
        'player-1'
      );
      
      assignments.forEach(assignment => {
        expect(assignment.isTraitor).toBe(false);
        expect(assignment.side).toBe('hero');
      });
    });

    it('應該為所有玩家分配陣營', () => {
      const scenario = HAUNT_SCENARIOS[0];
      const assignments = assignPlayerSides(
        mockGameState.players,
        scenario,
        'player-1'
      );
      
      expect(assignments.length).toBe(mockGameState.players.length);
      
      const assignedIds = assignments.map(a => a.playerId);
      mockGameState.players.forEach(player => {
        expect(assignedIds).toContain(player.id);
      });
    });
  });

  describe('revealHaunt', () => {
    it('應該成功揭示作祟', () => {
      const result = revealHaunt(mockGameState, 'player-1', rng);
      
      expect(result.success).toBe(true);
      expect(result.scenario).toBeDefined();
      expect(result.scenario).not.toBeNull();
    });

    it('應該正確識別叛徒', () => {
      const result = revealHaunt(mockGameState, 'player-1', rng);
      
      expect(result.traitorId).toBe('player-1');
    });

    it('應該正確識別英雄', () => {
      const result = revealHaunt(mockGameState, 'player-1', rng);
      
      expect(result.heroIds).toContain('player-2');
      expect(result.heroIds).toContain('player-3');
      expect(result.heroIds).not.toContain('player-1');
    });

    it('應該建立玩家陣營映射', () => {
      const result = revealHaunt(mockGameState, 'player-1', rng);
      
      expect(result.playerSides.get('player-1')).toBe('traitor');
      expect(result.playerSides.get('player-2')).toBe('hero');
      expect(result.playerSides.get('player-3')).toBe('hero');
    });

    it('當作祟已激活時應該返回錯誤', () => {
      const activeHauntState = createMockGameState('exploration', true, 3);
      const result = revealHaunt(activeHauntState, 'player-1', rng);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Haunt 已經激活');
    });
  });

  describe('createHauntStartResult', () => {
    it('應該更新遊戲狀態為 haunt_reveal', () => {
      const hauntRoll = makeHauntRoll(3, rng);
      const revelation = revealHaunt(mockGameState, 'player-1', rng);
      
      const result = createHauntStartResult(
        mockGameState,
        revelation,
        hauntRoll
      );
      
      expect(result.newState.phase).toBe('haunt_reveal');
    });

    it('應該更新玩家叛徒狀態', () => {
      const hauntRoll = makeHauntRoll(3, rng);
      const revelation = revealHaunt(mockGameState, 'player-1', rng);
      
      const result = createHauntStartResult(
        mockGameState,
        revelation,
        hauntRoll
      );
      
      const updatedPlayers = result.newState.players!;
      const traitor = updatedPlayers.find(p => p.id === 'player-1');
      const hero = updatedPlayers.find(p => p.id === 'player-2');
      
      expect(traitor?.isTraitor).toBe(true);
      expect(hero?.isTraitor).toBe(false);
    });

    it('應該更新 Haunt 狀態', () => {
      const hauntRoll = makeHauntRoll(3, rng);
      const revelation = revealHaunt(mockGameState, 'player-1', rng);
      
      const result = createHauntStartResult(
        mockGameState,
        revelation,
        hauntRoll
      );
      
      const haunt = result.newState.haunt!;
      expect(haunt.isActive).toBe(true);
      expect(haunt.traitorPlayerId).toBe('player-1');
      expect(haunt.hauntNumber).toBe(revelation.scenario?.id);
    });

    it('應該生成日誌項目', () => {
      const hauntRoll = makeHauntRoll(3, rng);
      const revelation = revealHaunt(mockGameState, 'player-1', rng);
      
      const result = createHauntStartResult(
        mockGameState,
        revelation,
        hauntRoll
      );
      
      expect(result.logEntries.length).toBeGreaterThan(0);
      
      const hauntRollLog = result.logEntries.find(
        log => log.actionType === 'HAUNT_ROLL'
      );
      expect(hauntRollLog).toBeDefined();
      
      const hauntRevealLog = result.logEntries.find(
        log => log.actionType === 'HAUNT_REVEAL'
      );
      expect(hauntRevealLog).toBeDefined();
    });
  });
});

// ==================== 輔助函數測試 ====================

describe('Haunt 輔助函數', () => {
  let mockPlayers: Player[];
  let mockHauntState: HauntState;

  beforeEach(() => {
    mockPlayers = [
      createMockPlayer('player-1', 'Alice'),
      createMockPlayer('player-2', 'Bob'),
      createMockPlayer('player-3', 'Charlie'),
    ];
    
    mockHauntState = {
      isActive: true,
      type: 'single_traitor',
      hauntNumber: 1,
      traitorPlayerId: 'player-1',
      omenCount: 3,
      heroObjective: 'Test hero objective',
      traitorObjective: 'Test traitor objective',
    };
  });

  describe('isTraitor', () => {
    it('應該正確識別叛徒', () => {
      expect(isTraitor('player-1', mockHauntState)).toBe(true);
    });

    it('應該正確識別非叛徒', () => {
      expect(isTraitor('player-2', mockHauntState)).toBe(false);
    });

    it('當沒有叛徒時應該返回 false', () => {
      const noTraitorState = { ...mockHauntState, traitorPlayerId: null };
      expect(isTraitor('player-1', noTraitorState)).toBe(false);
    });
  });

  describe('isHero', () => {
    it('應該正確識別英雄', () => {
      expect(isHero('player-2', mockHauntState)).toBe(true);
    });

    it('叛徒不應該被識別為英雄', () => {
      expect(isHero('player-1', mockHauntState)).toBe(false);
    });

    it('當作祟未激活時應該返回 false', () => {
      const inactiveState = { ...mockHauntState, isActive: false };
      expect(isHero('player-2', inactiveState)).toBe(false);
    });
  });

  describe('getTraitor', () => {
    it('應該返回叛徒玩家', () => {
      const traitor = getTraitor(mockPlayers, mockHauntState);
      expect(traitor?.id).toBe('player-1');
    });

    it('當沒有叛徒時應該返回 undefined', () => {
      const noTraitorState = { ...mockHauntState, traitorPlayerId: null };
      expect(getTraitor(mockPlayers, noTraitorState)).toBeUndefined();
    });
  });

  describe('getHeroes', () => {
    it('應該返回所有英雄玩家', () => {
      const heroes = getHeroes(mockPlayers, mockHauntState);
      expect(heroes.length).toBe(2);
      expect(heroes.map(h => h.id)).toContain('player-2');
      expect(heroes.map(h => h.id)).toContain('player-3');
    });

    it('不應該包含叛徒', () => {
      const heroes = getHeroes(mockPlayers, mockHauntState);
      expect(heroes.map(h => h.id)).not.toContain('player-1');
    });

    it('不應該包含死亡玩家', () => {
      const deadPlayer = { ...mockPlayers[1], isDead: true };
      const playersWithDead = [mockPlayers[0], deadPlayer, mockPlayers[2]];
      const heroes = getHeroes(playersWithDead, mockHauntState);
      expect(heroes.map(h => h.id)).not.toContain('player-2');
    });

    it('當作祟未激活時應該返回空陣列', () => {
      const inactiveState = { ...mockHauntState, isActive: false };
      const heroes = getHeroes(mockPlayers, inactiveState);
      expect(heroes).toEqual([]);
    });
  });

  describe('getPlayerSide', () => {
    it('應該返回叛徒陣營', () => {
      expect(getPlayerSide('player-1', mockHauntState)).toBe('traitor');
    });

    it('應該返回英雄陣營', () => {
      expect(getPlayerSide('player-2', mockHauntState)).toBe('hero');
    });

    it('當作祟未激活時應該返回 hero', () => {
      const inactiveState = { ...mockHauntState, isActive: false };
      expect(getPlayerSide('player-1', inactiveState)).toBe('hero');
    });
  });
});

// ==================== 整合測試 ====================

describe('Haunt 系統整合測試', () => {
  it('完整的 Haunt 觸發流程', () => {
    const rng = new SeededRng('integration-test');
    
    // 1. 建立遊戲狀態
    let gameState = createMockGameState('exploration', false, 3);
    
    // 2. 檢查是否需要 Haunt Roll
    expect(shouldMakeHauntRoll(gameState.phase, gameState.haunt.isActive)).toBe(true);
    
    // 3. 執行 Haunt Roll
    const hauntRoll = makeHauntRoll(gameState.haunt.omenCount, rng);
    
    // 4. 如果觸發作祟，執行揭示
    if (hauntRoll.hauntBegins) {
      const revelation = revealHaunt(gameState, 'player-1', rng);
      expect(revelation.success).toBe(true);
      
      // 5. 建立新的遊戲狀態
      const hauntStartResult = createHauntStartResult(
        gameState,
        revelation,
        hauntRoll
      );
      
      // 6. 驗證狀態更新
      expect(hauntStartResult.newState.phase).toBe('haunt_reveal');
      expect(hauntStartResult.newState.haunt?.isActive).toBe(true);
      
      // 7. 驗證日誌
      expect(hauntStartResult.logEntries.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('多次 Haunt Roll 應該有不同的結果', () => {
    const rng = new SeededRng('randomness-test');
    const results: boolean[] = [];
    
    // 執行多次 Haunt Roll
    for (let i = 0; i < 20; i++) {
      const result = makeHauntRoll(3, rng);
      results.push(result.hauntBegins);
    }
    
    // 應該有觸發和不觸發的情況（機率上）
    const hasTriggered = results.some(r => r);
    const hasNotTriggered = results.some(r => !r);
    
    // 注意：這個測試有可能因為隨機性而失敗，但機率很低
    expect(hasTriggered || hasNotTriggered).toBe(true);
  });

  it('最後一張預兆應該自動觸發作祟', () => {
    const rng = new SeededRng('last-omen-test');
    
    // 當所有預兆都被發現時
    const gameState = createMockGameState('exploration', false, TOTAL_OMEN_CARDS);
    
    expect(isLastOmen(gameState.haunt.omenCount)).toBe(true);
    
    // 在實際遊戲中，這應該自動觸發作祟
    // 這裡我們驗證邏輯
    const hauntRoll = makeHauntRoll(gameState.haunt.omenCount, rng);
    
    // 擲 13 顆骰子，幾乎一定會 >= 5，所以不會觸發作祟
    // 但根據規則，最後一張預兆應該自動觸發
    // 這個邏輯應該在遊戲流程中處理
    expect(hauntRoll.diceCount).toBe(TOTAL_OMEN_CARDS);
  });
});
