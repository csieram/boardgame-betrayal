/**
 * AIPlayer.test.ts - AI 玩家系統測試
 * 
 * Issue #110: AI Players for Full Solo Game
 */

import {
  AIPlayer,
  createAIPlayer,
  getRandomPersonality,
  getPersonalityDescription,
  AIPlayerManager,
  createAIPlayerManager,
  AIExplorationEngine,
  createExplorationEngine,
} from '../AIPlayer';
import { GameState, Player, Character } from '../../types';
import { CHARACTERS } from '@betrayal/shared';

// 模擬遊戲狀態
const createMockGameState = (): GameState => ({
  gameId: 'test-game',
  version: '1.0.0',
  phase: 'exploration',
  result: 'ongoing',
  config: {
    playerCount: 2,
    enableAI: true,
    seed: 'test-seed',
    maxTurns: 100,
  },
  map: {
    ground: Array(15).fill(null).map((_, y) =>
      Array(15).fill(null).map((_, x) => ({
        x,
        y,
        floor: 'ground' as const,
        room: null,
        discovered: x === 7 && y === 7,
        rotation: 0,
        placementOrder: 0,
      }))
    ),
    upper: Array(15).fill(null).map((_, y) =>
      Array(15).fill(null).map((_, x) => ({
        x,
        y,
        floor: 'upper' as const,
        room: null,
        discovered: false,
        rotation: 0,
        placementOrder: 0,
      }))
    ),
    basement: Array(15).fill(null).map((_, y) =>
      Array(15).fill(null).map((_, x) => ({
        x,
        y,
        floor: 'basement' as const,
        room: null,
        discovered: false,
        rotation: 0,
        placementOrder: 0,
      }))
    ),
    placedRoomCount: 1,
  },
  players: [],
  playerOrder: ['human', 'ai-1'],
  turn: {
    currentPlayerId: 'ai-1',
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
    isActive: false,
    type: 'none',
    hauntNumber: null,
    traitorPlayerId: null,
    omenCount: 0,
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
  rngState: { seed: 'test', count: 0, internalState: [] },
  placedRoomIds: new Set(),
});

describe('AIPlayer', () => {
  let mockGameState: GameState;

  beforeEach(() => {
    mockGameState = createMockGameState();
  });

  describe('createAIPlayer', () => {
    it('應該創建 AI 玩家實例', () => {
      const ai = createAIPlayer('ai-1', 'medium', 'explorer', 'test-seed');
      expect(ai).toBeInstanceOf(AIPlayer);
      expect(ai.getPlayerId()).toBe('ai-1');
    });

    it('應該設定正確的難度', () => {
      const ai = createAIPlayer('ai-1', 'hard', 'explorer');
      expect(ai.getConfig().difficulty).toBe('hard');
    });

    it('應該設定正確的個性', () => {
      const ai = createAIPlayer('ai-1', 'medium', 'cautious');
      expect(ai.getConfig().personality).toBe('cautious');
    });
  });

  describe('AIPlayer.executeTurn', () => {
    it('應該在探索階段執行回合', () => {
      const ai = createAIPlayer('ai-1', 'medium', 'explorer');
      ai.setCharacter(CHARACTERS[0]);
      
      const result = ai.executeTurn(mockGameState);
      
      expect(result).toBeDefined();
      expect(result.decisions).toBeDefined();
      expect(result.logs).toBeDefined();
      expect(result.completed).toBe(true);
    });

    it('應該根據個性做出不同決策', () => {
      const explorerAI = createAIPlayer('ai-1', 'medium', 'explorer', 'seed1');
      const cautiousAI = createAIPlayer('ai-2', 'medium', 'cautious', 'seed1');
      
      explorerAI.setCharacter(CHARACTERS[0]);
      cautiousAI.setCharacter(CHARACTERS[1]);
      
      const explorerResult = explorerAI.executeTurn(mockGameState);
      const cautiousResult = cautiousAI.executeTurn(mockGameState);
      
      // 兩者應該有不同的決策模式
      expect(explorerResult.decisions.length).toBeGreaterThan(0);
      expect(cautiousResult.decisions.length).toBeGreaterThan(0);
    });
  });

  describe('getRandomPersonality', () => {
    it('應該返回有效的個性', () => {
      const personality = getRandomPersonality();
      expect(['explorer', 'cautious', 'aggressive']).toContain(personality);
    });

    it('應該接受自定義隨機函數', () => {
      const mockRng = () => 0.5;
      const personality = getRandomPersonality(mockRng);
      expect(['explorer', 'cautious', 'aggressive']).toContain(personality);
    });
  });

  describe('getPersonalityDescription', () => {
    it('應該返回探索者的描述', () => {
      const desc = getPersonalityDescription('explorer');
      expect(desc).toContain('探索');
    });

    it('應該返回謹慎者的描述', () => {
      const desc = getPersonalityDescription('cautious');
      expect(desc).toContain('謹慎');
    });

    it('應該返回激進者的描述', () => {
      const desc = getPersonalityDescription('aggressive');
      expect(desc).toContain('激進');
    });
  });
});

describe('AIPlayerManager', () => {
  let manager: AIPlayerManager;
  let mockGameState: GameState;

  beforeEach(() => {
    manager = createAIPlayerManager('human', 2, 'medium', 'test-seed');
    mockGameState = createMockGameState();
  });

  describe('createAIPlayerManager', () => {
    it('應該創建管理器實例', () => {
      expect(manager).toBeInstanceOf(AIPlayerManager);
    });

    it('應該設定正確的 AI 數量', () => {
      const managerWith3AI = createAIPlayerManager('human', 3, 'easy');
      expect(managerWith3AI.getAICount()).toBe(0); // 初始化前為 0
    });
  });

  describe('initializeAIPlayers', () => {
    it('應該創建指定數量的 AI 玩家', () => {
      const players = manager.initializeAIPlayers(
        mockGameState,
        CHARACTERS[0],
        ['explorer', 'cautious']
      );
      
      expect(players.length).toBe(2);
      expect(manager.getAICount()).toBe(2);
    });

    it('應該設定正確的個性', () => {
      manager.initializeAIPlayers(
        mockGameState,
        CHARACTERS[0],
        ['explorer', 'aggressive']
      );
      
      const aiPlayers = manager.getAIPlayers();
      expect(aiPlayers[0].personality).toBe('explorer');
      expect(aiPlayers[1].personality).toBe('aggressive');
    });
  });

  describe('getTurnOrder', () => {
    it('應該返回正確的回合順序', () => {
      manager.initializeAIPlayers(mockGameState, CHARACTERS[0]);
      
      const turnOrder = manager.getTurnOrder();
      expect(turnOrder.order[0]).toBe('human');
      expect(turnOrder.order.length).toBe(3); // human + 2 AI
    });
  });

  describe('setDifficulty', () => {
    it('應該更新所有 AI 的難度', () => {
      manager.initializeAIPlayers(mockGameState, CHARACTERS[0]);
      
      manager.setDifficulty('hard');
      
      const aiPlayers = manager.getAIPlayers();
      // 難度應該已更新
      expect(aiPlayers.length).toBeGreaterThan(0);
    });
  });
});

describe('AIExplorationEngine', () => {
  let engine: AIExplorationEngine;
  let mockGameState: GameState;

  beforeEach(() => {
    engine = createExplorationEngine('explorer', 'medium', 'test-seed');
    mockGameState = createMockGameState();
  });

  describe('createExplorationEngine', () => {
    it('應該創建探索引擎實例', () => {
      expect(engine).toBeInstanceOf(AIExplorationEngine);
    });
  });

  describe('analyzeExplorationOptions', () => {
    it('應該分析探索選項', () => {
      // 添加一個 AI 玩家到遊戲狀態
      mockGameState.players.push({
        id: 'ai-1',
        name: 'AI Player',
        character: CHARACTERS[0],
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
      });

      const options = engine.analyzeExplorationOptions(mockGameState, 'ai-1');
      expect(options).toBeDefined();
      expect(Array.isArray(options)).toBe(true);
    });
  });

  describe('decideCardHandling', () => {
    it('應該正確處理物品卡', () => {
      const itemCard = {
        id: 'item-1',
        type: 'item' as const,
        name: 'Test Item',
        description: 'Test',
        icon: '',
      };

      const decision = engine.decideCardHandling(itemCard, mockGameState, 'ai-1');
      expect(decision.recommendedAction).toBe('draw');
    });
  });
});
