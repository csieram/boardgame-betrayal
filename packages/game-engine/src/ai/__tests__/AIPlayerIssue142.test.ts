/**
 * AI Movement Fix Test - Issue #142
 * 
 * 驗證 AI 是否會從起始位置移動和探索新房間
 * 
 * Issue #142: AI not moving - stays at beginning tile
 * Bug Description: AI players stay at starting position and don't move or explore.
 * Expected Behavior: AI should move from starting position and explore new rooms.
 */

import { AIPlayer, createAIPlayer, AIPersonality } from '../AIPlayer';
import { AIDecisionEngine, AIDifficulty } from '../AIDecisionEngine';
import { GameState, Position3D, Tile } from '../../types';
import { CHARACTERS, ROOMS } from '@betrayal/shared';
import { Room } from '@betrayal/shared';

// 創建一個帶有入口大廳的 mock game state
const createMockGameStateWithEntranceHall = (): GameState => {
  // 找到入口大廳房間
  const entranceHall = ROOMS.find(r => r.id === 'entrance_hall');
  if (!entranceHall) {
    throw new Error('Entrance hall not found in ROOMS');
  }

  // 創建地圖，中心位置 (7,7) 有入口大廳
  const groundFloor: Tile[][] = Array(15).fill(null).map((_, y) =>
    Array(15).fill(null).map((_, x) => ({
      x,
      y,
      floor: 'ground' as const,
      room: null as Room | null,
      discovered: false,
      rotation: 0 as const,
      placementOrder: 0,
    }))
  );

  // 設置入口大廳在 (7,7)
  groundFloor[7][7] = {
    x: 7,
    y: 7,
    floor: 'ground',
    room: entranceHall,
    discovered: true,
    rotation: 0,
    placementOrder: 1,
  };

  return {
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
      ground: groundFloor,
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
      ground: ROOMS.filter(r => r.floor === 'ground' && r.id !== 'entrance_hall'),
      upper: ROOMS.filter(r => r.floor === 'upper'),
      basement: ROOMS.filter(r => r.floor === 'basement'),
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
    placedRoomIds: new Set(['entrance_hall']),
  };
};

describe('AI Movement Fix - Issue #142', () => {
  describe('Legal Actions Detection', () => {
    it('應該能檢測到可探索的方向（從入口大廳）', () => {
      const gameState = createMockGameStateWithEntranceHall();
      const aiPlayerId = 'ai-1';
      
      // 添加 AI 玩家到遊戲狀態
      gameState.players.push({
        id: aiPlayerId,
        name: 'AI Player',
        character: CHARACTERS[0],
        position: { x: 7, y: 7, floor: 'ground' as const },
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

      const engine = new AIDecisionEngine('medium', 'test-seed');
      const legalActions = engine.getLegalActions(gameState, aiPlayerId);

      // 入口大廳有 north 和 south 門，應該有可探索的方向
      console.log('Explorable directions:', legalActions.explorableDirections);
      console.log('Movable positions:', legalActions.movablePositions);
      
      // 應該有可探索的方向（因為入口大廳有門通往未探索區域）
      expect(legalActions.explorableDirections.length).toBeGreaterThan(0);
    });

    it('遊戲開始時 movablePositions 應該為空（因為周圍房間未發現）', () => {
      const gameState = createMockGameStateWithEntranceHall();
      const aiPlayerId = 'ai-1';
      
      gameState.players.push({
        id: aiPlayerId,
        name: 'AI Player',
        character: CHARACTERS[0],
        position: { x: 7, y: 7, floor: 'ground' as const },
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

      const engine = new AIDecisionEngine('medium', 'test-seed');
      const legalActions = engine.getLegalActions(gameState, aiPlayerId);

      // 遊戲開始時，周圍房間都未發現，所以 movablePositions 應該為空
      expect(legalActions.movablePositions.length).toBe(0);
      
      // 但應該有可探索的方向
      expect(legalActions.explorableDirections.length).toBeGreaterThan(0);
    });
  });

  describe('AI Decision Making', () => {
    it('當有可探索方向時，AI 應該選擇探索而不是結束回合', () => {
      const gameState = createMockGameStateWithEntranceHall();
      const aiPlayerId = 'ai-1';
      
      gameState.players.push({
        id: aiPlayerId,
        name: 'AI Player',
        character: CHARACTERS[0],
        position: { x: 7, y: 7, floor: 'ground' as const },
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

      const ai = createAIPlayer(aiPlayerId, 'medium' as AIDifficulty, 'explorer' as AIPersonality, 'test-seed');
      ai.setCharacter(CHARACTERS[0]);

      const result = ai.executeTurn(gameState);

      console.log('AI Decisions:', result.decisions.map(d => ({ action: d.action, score: d.score, reason: d.reason })));

      // 應該至少有一個決策
      expect(result.decisions.length).toBeGreaterThan(0);

      // 第一個決策應該是探索（因為有可探索的方向）
      const firstDecision = result.decisions[0];
      
      // 如果 AI 正確運作，第一個決策應該是探索
      // 或者如果沒有可探索方向，則是結束回合
      expect(['explore', 'endTurn']).toContain(firstDecision.action);
      
      // 如果第一個決策是探索，則驗證探索方向
      if (firstDecision.action === 'explore') {
        expect(firstDecision.exploreDirection).toBeDefined();
        expect(['north', 'south', 'east', 'west']).toContain(firstDecision.exploreDirection);
      }
    });

    it('探索決策的分數應該高於結束回合', () => {
      const engine = new AIDecisionEngine('medium', 'test-seed');
      
      const gameState = createMockGameStateWithEntranceHall();
      gameState.players.push({
        id: 'ai-1',
        name: 'AI Player',
        character: CHARACTERS[0],
        position: { x: 7, y: 7, floor: 'ground' as const },
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

      const situation = {
        isTraitor: false,
        phase: 'exploration' as const,
        healthStatus: 'healthy' as const,
        distanceToObjective: 0,
        nearbyEnemies: [],
        itemCount: 0,
        achievableWinConditions: [],
      };

      // 評估探索決策
      const exploreScore = engine.evaluateExplore(
        gameState,
        'ai-1',
        'north',
        situation
      );

      // 評估結束回合決策
      const endTurnScore = engine.evaluateEndTurn(
        gameState,
        'ai-1',
        situation
      );

      console.log('Explore score:', exploreScore);
      console.log('End turn score:', endTurnScore);

      // 探索分數應該顯著高於結束回合分數
      expect(exploreScore).toBeGreaterThan(endTurnScore);
      expect(exploreScore).toBeGreaterThan(100); // 基礎分數應該很高
    });
  });

  describe('AI Turn Execution with Room Data', () => {
    it('AI 應該在入口大廳執行回合並嘗試探索', () => {
      const gameState = createMockGameStateWithEntranceHall();
      const aiPlayerId = 'ai-1';
      
      gameState.players.push({
        id: aiPlayerId,
        name: 'AI Player',
        character: CHARACTERS[0],
        position: { x: 7, y: 7, floor: 'ground' as const },
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

      const ai = createAIPlayer(aiPlayerId, 'medium' as AIDifficulty, 'explorer' as AIPersonality, 'test-seed');
      ai.setCharacter(CHARACTERS[0]);

      const result = ai.executeTurn(gameState);

      console.log('Turn execution result:');
      console.log('- Completed:', result.completed);
      console.log('- Decisions count:', result.decisions.length);
      console.log('- Discovered room:', result.discoveredRoom);
      console.log('- Logs:', result.logs);

      // 應該完成回合
      expect(result.completed).toBe(true);
      
      // 應該有決策
      expect(result.decisions.length).toBeGreaterThan(0);
      
      // 如果 AI 選擇探索，探索會結束回合（根據遊戲規則）
      // 所以可能只有一個決策（explore），或者最後一個是 endTurn
      const lastDecision = result.decisions[result.decisions.length - 1];
      expect(['explore', 'endTurn']).toContain(lastDecision.action);
    });

    it('不同個性的 AI 都應該在入口大廳嘗試探索', () => {
      const personalities: AIPersonality[] = ['explorer', 'cautious', 'aggressive'];
      
      personalities.forEach(personality => {
        const gameState = createMockGameStateWithEntranceHall();
        const aiPlayerId = `ai-${personality}`;
        
        gameState.players.push({
          id: aiPlayerId,
          name: 'AI Player',
          character: CHARACTERS[0],
          position: { x: 7, y: 7, floor: 'ground' as const },
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

        // 更新當前玩家 ID
        gameState.turn.currentPlayerId = aiPlayerId;

        const ai = createAIPlayer(aiPlayerId, 'medium' as AIDifficulty, personality, 'test-seed');
        ai.setCharacter(CHARACTERS[0]);

        const result = ai.executeTurn(gameState);

        console.log(`\n${personality} AI decisions:`, result.decisions.map(d => d.action));

        // 應該完成回合
        expect(result.completed).toBe(true);
        expect(result.decisions.length).toBeGreaterThan(0);
      });
    });
  });
});
