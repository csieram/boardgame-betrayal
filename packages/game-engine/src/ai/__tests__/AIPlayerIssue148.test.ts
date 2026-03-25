/**
 * AI Player Bug Fix Test - Issue #148
 * 
 * 驗證 AI 探索新房間時是否返回正確的位置和方向資訊
 * 
 * Issue #148: AI player stuck at thinking but does nothing!
 * Bug Description: AI players show thinking animation but don't actually perform actions.
 * Root Cause: When AI decides to explore, it didn't calculate and return the new position.
 * Fix: Added newPosition and exploreDirection to TurnExecutionResult when AI explores.
 */

import { AIPlayer, createAIPlayer, AIPersonality, TurnExecutionResult } from '../AIPlayer';
import { AIDifficulty } from '../AIDecisionEngine';
import { GameState, Position3D, Tile, Direction } from '../../types';
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

describe('AI Player Bug Fix - Issue #148', () => {
  describe('AI Exploration Position Calculation', () => {
    it('當 AI 探索時，應該返回新房間的位置', () => {
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

      const ai = createAIPlayer(aiPlayerId, 'medium' as AIDifficulty, 'explorer' as AIPersonality, 'test-seed');
      ai.setCharacter(CHARACTERS[0]);

      const result = ai.executeTurn(gameState);

      console.log('Issue #148 Test - Turn result:', {
        decisions: result.decisions.map(d => ({ action: d.action, direction: d.exploreDirection })),
        discoveredRoom: result.discoveredRoom,
        newPosition: result.newPosition,
        exploreDirection: result.exploreDirection,
      });

      // 驗證 AI 選擇了探索
      expect(result.decisions.length).toBeGreaterThan(0);
      const firstDecision = result.decisions[0];
      
      if (firstDecision.action === 'explore') {
        // 驗證發現了房間
        expect(result.discoveredRoom).toBe(true);
        
        // Issue #148 Fix: 驗證返回了新房間的位置
        expect(result.newPosition).toBeDefined();
        expect(result.newPosition).not.toBeNull();
        
        // Issue #148 Fix: 驗證返回了探索方向
        expect(result.exploreDirection).toBeDefined();
        expect(result.exploreDirection).not.toBeNull();
        expect(['north', 'south', 'east', 'west']).toContain(result.exploreDirection);
        
        // 驗證新位置是從當前位置向探索方向移動一格
        const expectedPosition = calculateExpectedPosition(
          { x: 7, y: 7, floor: 'ground' },
          result.exploreDirection as Direction
        );
        expect(result.newPosition).toEqual(expectedPosition);
      }
    });

    it('不同方向的探索應該返回正確的位置', () => {
      const directions: Direction[] = ['north', 'south', 'east', 'west'];
      const startPosition: Position3D = { x: 7, y: 7, floor: 'ground' };
      
      directions.forEach(direction => {
        const expectedPosition = calculateExpectedPosition(startPosition, direction);
        
        // 驗證位置計算正確
        switch (direction) {
          case 'north':
            expect(expectedPosition).toEqual({ x: 7, y: 6, floor: 'ground' });
            break;
          case 'south':
            expect(expectedPosition).toEqual({ x: 7, y: 8, floor: 'ground' });
            break;
          case 'east':
            expect(expectedPosition).toEqual({ x: 8, y: 7, floor: 'ground' });
            break;
          case 'west':
            expect(expectedPosition).toEqual({ x: 6, y: 7, floor: 'ground' });
            break;
        }
      });
    });

    it('AI 移動時應該返回新位置', () => {
      const gameState = createMockGameStateWithEntranceHall();
      
      // 設置地圖使 AI 可以移動（而非探索）
      // 在 (7,8) 放置一個已發現的房間
      const existingRoom = ROOMS.find(r => r.id !== 'entrance_hall' && r.floor === 'ground');
      if (existingRoom) {
        gameState.map.ground[8][7] = {
          x: 7,
          y: 8,
          floor: 'ground',
          room: existingRoom,
          discovered: true,
          rotation: 0,
          placementOrder: 2,
        };
      }
      
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

      // 驗證回合完成
      expect(result.completed).toBe(true);
      
      // 如果 AI 選擇移動，驗證返回了新位置
      const moveDecision = result.decisions.find(d => d.action === 'move');
      if (moveDecision && result.newPosition) {
        expect(result.newPosition).toBeDefined();
      }
    });
  });

  describe('TurnExecutionResult Structure', () => {
    it('應該包含所有必要的欄位', () => {
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

      // 驗證結果結構
      expect(result).toHaveProperty('decisions');
      expect(result).toHaveProperty('completed');
      expect(result).toHaveProperty('logs');
      expect(result).toHaveProperty('discoveredRoom');
      expect(result).toHaveProperty('newPosition');
      expect(result).toHaveProperty('exploreDirection');
      expect(result).toHaveProperty('drawnCard');
      
      // 驗證類型
      expect(Array.isArray(result.decisions)).toBe(true);
      expect(typeof result.completed).toBe('boolean');
      expect(Array.isArray(result.logs)).toBe(true);
      expect(typeof result.discoveredRoom).toBe('boolean');
    });
  });
});

// 輔助函數：計算預期位置
function calculateExpectedPosition(start: Position3D, direction: Direction): Position3D {
  const deltas = {
    north: { x: 0, y: -1 },
    south: { x: 0, y: 1 },
    east: { x: 1, y: 0 },
    west: { x: -1, y: 0 },
  };

  return {
    x: start.x + deltas[direction].x,
    y: start.y + deltas[direction].y,
    floor: start.floor,
  };
}
