/**
 * Turn System Tests - 回合系統測試
 * 
 * 測試項目：
 * - Movement within Speed limit
 * - Turn order rotation
 * - Auto-end turn after room discovery
 * - Manual end turn
 */

import {
  GameState,
  GamePhase,
  Player,
  TurnState,
  Position3D,
  Direction,
  Character,
  GameConfig,
  GameMap,
  Tile,
  CardDecks,
  RoomDeckState,
  HauntState,
  CombatState,
  GameLogEntry,
  RngState,
  EndTurnAction,
} from '../types';
import { Room } from '@betrayal/shared';
import { TurnManager, TurnOrderManager, TurnPhaseManager } from './turn';

// ==================== 測試輔助函數 ====================

const createMockCharacter = (): Character => ({
  id: 'test-character',
  name: 'Test Character',
  nameEn: 'Test Character',
  age: 25,
  description: 'A test character',
  color: '#FF0000',
  stats: {
    speed: [3, 3],
    might: [3, 3],
    sanity: [3, 3],
    knowledge: [3, 3],
  },
  statTrack: {
    speed: [0, 1, 2, 3, 4, 5, 6, 7],
    might: [0, 1, 2, 3, 4, 5, 6, 7],
    sanity: [0, 1, 2, 3, 4, 5, 6, 7],
    knowledge: [0, 1, 2, 3, 4, 5, 6, 7],
  },
});

const createMockRoom = (id: string, doors: Direction[] = ['north', 'south', 'east', 'west']): Room => ({
  id,
  name: 'Test Room',
  nameEn: 'Test Room',
  floor: 'ground',
  symbol: null,
  doors,
  description: 'A test room',
  color: '#FFFFFF',
  icon: '',
  isOfficial: true,
});

const createEmptyTile = (x: number, y: number, floor: 'ground' | 'upper' | 'basement'): Tile => ({
  x,
  y,
  floor,
  room: null,
  discovered: false,
  rotation: 0,
  placementOrder: -1,
});

const createMockMap = (): GameMap => {
  const createFloor = (floor: 'ground' | 'upper' | 'basement'): Tile[][] => {
    const map: Tile[][] = [];
    for (let y = 0; y < 15; y++) {
      const row: Tile[] = [];
      for (let x = 0; x < 15; x++) {
        row.push(createEmptyTile(x, y, floor));
      }
      map.push(row);
    }
    return map;
  };

  // 放置入口大廳在中心
  const ground = createFloor('ground');
  ground[7][7] = {
    x: 7,
    y: 7,
    floor: 'ground',
    room: createMockRoom('entrance_hall'),
    discovered: true,
    rotation: 0,
    placementOrder: 0,
  };

  // 在右邊放置一個已發現的房間
  ground[7][8] = {
    x: 8,
    y: 7,
    floor: 'ground',
    room: createMockRoom('room_east', ['west', 'east']),
    discovered: true,
    rotation: 0,
    placementOrder: 1,
  };

  // 在上邊放置一個已發現的房間
  ground[6][7] = {
    x: 7,
    y: 6,
    floor: 'ground',
    room: createMockRoom('room_north', ['south', 'north']),
    discovered: true,
    rotation: 0,
    placementOrder: 2,
  };

  return {
    ground,
    upper: createFloor('upper'),
    basement: createFloor('basement'),
    placedRoomCount: 3,
  };
};

const createMockGameState = (overrides?: Partial<GameState>): GameState => {
  const character = createMockCharacter();
  const mockMap = createMockMap();

  const player1: Player = {
    id: 'player-1',
    name: 'Player 1',
    character,
    position: { x: 7, y: 7, floor: 'ground' },
    currentStats: { speed: 4, might: 3, sanity: 3, knowledge: 3 },
    items: [],
    omens: [],
    isTraitor: false,
    isDead: false,
    usedItemsThisTurn: [],
  };

  const player2: Player = {
    id: 'player-2',
    name: 'Player 2',
    character,
    position: { x: 7, y: 7, floor: 'ground' },
    currentStats: { speed: 3, might: 3, sanity: 3, knowledge: 3 },
    items: [],
    omens: [],
    isTraitor: false,
    isDead: false,
    usedItemsThisTurn: [],
  };

  const player3: Player = {
    id: 'player-3',
    name: 'Player 3',
    character,
    position: { x: 7, y: 7, floor: 'ground' },
    currentStats: { speed: 5, might: 3, sanity: 3, knowledge: 3 },
    items: [],
    omens: [],
    isTraitor: false,
    isDead: false,
    usedItemsThisTurn: [],
  };

  const config: GameConfig = {
    playerCount: 3,
    enableAI: false,
    seed: 'test-seed',
    maxTurns: 100,
  };

  const cardDecks: CardDecks = {
    event: { remaining: [], drawn: [], discarded: [] },
    item: { remaining: [], drawn: [], discarded: [] },
    omen: { remaining: [], drawn: [], discarded: [] },
  };

  const roomDeck: RoomDeckState = {
    ground: [],
    upper: [],
    basement: [],
    drawn: new Set(),
  };

  const haunt: HauntState = {
    isActive: false,
    type: 'none',
    hauntNumber: null,
    traitorPlayerId: null,
    omenCount: 0,
    heroObjective: null,
    traitorObjective: null,
  };

  const combat: CombatState = {
    isActive: false,
    attackerId: null,
    defenderId: null,
    usedStat: null,
    attackerRoll: null,
    defenderRoll: null,
    damage: null,
  };

  const baseState: GameState = {
    gameId: 'test-game',
    version: '1.0.0',
    phase: 'exploration' as GamePhase,
    result: 'ongoing',
    config,
    map: mockMap,
    players: [player1, player2, player3],
    playerOrder: ['player-1', 'player-2', 'player-3'],
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
    cardDecks,
    roomDeck,
    haunt,
    combat,
    log: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    rngState: { seed: 'test', count: 0, internalState: [0] },
    placedRoomIds: new Set(['entrance_hall', 'stairs_from_upper', 'stairs_from_basement']),
  };

  return { ...baseState, ...overrides };
};

// ==================== TurnManager 測試 ====================

describe('TurnManager', () => {
  describe('startTurn', () => {
    it('應該根據玩家的 Speed 設定移動點數', () => {
      const state = createMockGameState();
      const player = state.players[0];
      
      const newState = TurnManager.startTurn(state, player.id);
      
      expect(newState.turn.movesRemaining).toBe(player.currentStats.speed);
      expect(newState.turn.currentPlayerId).toBe(player.id);
    });

    it('應該重置回合狀態', () => {
      const state = createMockGameState({
        turn: {
          ...createMockGameState().turn,
          hasDiscoveredRoom: true,
          hasDrawnCard: true,
          hasEnded: true,
        },
      });

      const newState = TurnManager.startTurn(state, 'player-1');

      expect(newState.turn.hasDiscoveredRoom).toBe(false);
      expect(newState.turn.hasDrawnCard).toBe(false);
      expect(newState.turn.hasEnded).toBe(false);
    });

    it('應該在玩家不存在時拋出錯誤', () => {
      const state = createMockGameState();
      
      expect(() => TurnManager.startTurn(state, 'non-existent')).toThrow('Player not found');
    });
  });

  describe('endTurn', () => {
    it('應該輪轉到下一個玩家', () => {
      const state = createMockGameState();
      const action: EndTurnAction = {
        type: 'END_TURN',
        playerId: 'player-1',
        timestamp: Date.now(),
        actionId: 'test-action',
      };

      const newState = TurnManager.endTurn(state, action);

      expect(newState.turn.currentPlayerId).toBe('player-2');
    });

    it('應該在最後一個玩家後回到第一個玩家並增加回合數', () => {
      const state = createMockGameState({
        turn: {
          ...createMockGameState().turn,
          currentPlayerId: 'player-3',
        },
      });
      const action: EndTurnAction = {
        type: 'END_TURN',
        playerId: 'player-3',
        timestamp: Date.now(),
        actionId: 'test-action',
      };

      const newState = TurnManager.endTurn(state, action);

      expect(newState.turn.currentPlayerId).toBe('player-1');
      expect(newState.turn.turnNumber).toBe(2);
    });

    it('應該根據新玩家的 Speed 設定移動點數', () => {
      const state = createMockGameState();
      const action: EndTurnAction = {
        type: 'END_TURN',
        playerId: 'player-1',
        timestamp: Date.now(),
        actionId: 'test-action',
      };

      const newState = TurnManager.endTurn(state, action);
      const nextPlayer = state.players.find(p => p.id === 'player-2')!;

      expect(newState.turn.movesRemaining).toBe(nextPlayer.currentStats.speed);
    });

    it('應該在不是當前玩家時拋出錯誤', () => {
      const state = createMockGameState();
      const action: EndTurnAction = {
        type: 'END_TURN',
        playerId: 'player-2', // Not current player
        timestamp: Date.now(),
        actionId: 'test-action',
      };

      expect(() => TurnManager.endTurn(state, action)).toThrow('Not your turn');
    });

    it('應該在達到最大回合數時結束遊戲', () => {
      const state = createMockGameState({
        turn: {
          ...createMockGameState().turn,
          currentPlayerId: 'player-3',
          turnNumber: 100,
        },
        config: {
          ...createMockGameState().config,
          maxTurns: 100,
        },
      });
      const action: EndTurnAction = {
        type: 'END_TURN',
        playerId: 'player-3',
        timestamp: Date.now(),
        actionId: 'test-action',
      };

      const newState = TurnManager.endTurn(state, action);

      expect(newState.phase).toBe('game_over');
      expect(newState.result).toBe('draw');
    });
  });

  describe('isCurrentPlayer', () => {
    it('應該正確識別當前玩家', () => {
      const state = createMockGameState();

      expect(TurnManager.isCurrentPlayer(state, 'player-1')).toBe(true);
      expect(TurnManager.isCurrentPlayer(state, 'player-2')).toBe(false);
    });
  });

  describe('getCurrentPlayer', () => {
    it('應該返回當前玩家', () => {
      const state = createMockGameState();
      const player = TurnManager.getCurrentPlayer(state);

      expect(player).toBeDefined();
      expect(player?.id).toBe('player-1');
    });
  });

  describe('getNextPlayerId', () => {
    it('應該返回下一個玩家 ID', () => {
      const state = createMockGameState();

      expect(TurnManager.getNextPlayerId(state)).toBe('player-2');
    });

    it('應該在最後一個玩家後返回第一個玩家', () => {
      const state = createMockGameState({
        turn: {
          ...createMockGameState().turn,
          currentPlayerId: 'player-3',
        },
      });

      expect(TurnManager.getNextPlayerId(state)).toBe('player-1');
    });
  });

  describe('shouldAutoEndTurn', () => {
    it('應該在發現新房間後返回 true', () => {
      const state = createMockGameState({
        turn: {
          ...createMockGameState().turn,
          hasDiscoveredRoom: true,
        },
      });

      expect(TurnManager.shouldAutoEndTurn(state)).toBe(true);
    });

    it('應該在未發現新房間時返回 false', () => {
      const state = createMockGameState();

      expect(TurnManager.shouldAutoEndTurn(state)).toBe(false);
    });
  });

  describe('markRoomDiscovered', () => {
    it('應該標記已發現新房間並結束回合', () => {
      const state = createMockGameState();
      const newState = TurnManager.markRoomDiscovered(state);

      expect(newState.turn.hasDiscoveredRoom).toBe(true);
      expect(newState.turn.hasEnded).toBe(true);
    });
  });

  describe('consumeMovement', () => {
    it('應該正確消耗移動點數', () => {
      const state = createMockGameState({
        turn: {
          ...createMockGameState().turn,
          movesRemaining: 4,
        },
      });

      const newState = TurnManager.consumeMovement(state, 2);

      expect(newState.turn.movesRemaining).toBe(2);
    });

    it('應該不會讓移動點數低於 0', () => {
      const state = createMockGameState({
        turn: {
          ...createMockGameState().turn,
          movesRemaining: 2,
        },
      });

      const newState = TurnManager.consumeMovement(state, 5);

      expect(newState.turn.movesRemaining).toBe(0);
    });
  });

  describe('hasMovementRemaining', () => {
    it('應該在有剩餘移動點數時返回 true', () => {
      const state = createMockGameState({
        turn: {
          ...createMockGameState().turn,
          movesRemaining: 2,
        },
      });

      expect(TurnManager.hasMovementRemaining(state)).toBe(true);
    });

    it('應該在沒有剩餘移動點數時返回 false', () => {
      const state = createMockGameState({
        turn: {
          ...createMockGameState().turn,
          movesRemaining: 0,
        },
      });

      expect(TurnManager.hasMovementRemaining(state)).toBe(false);
    });
  });

  describe('canUseItem', () => {
    it('應該允許使用未使用的物品', () => {
      const state = createMockGameState({
        players: [
          {
            ...createMockGameState().players[0],
            items: [{ id: 'item-1', type: 'item', name: 'Test Item', description: 'Test', icon: '' }],
          },
        ],
      });
      const result = TurnManager.canUseItem(state, 'player-1', 'item-1');

      expect(result.valid).toBe(true);
    });

    it('應該拒絕非當前玩家使用物品', () => {
      const state = createMockGameState();
      const result = TurnManager.canUseItem(state, 'player-2', 'item-1');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Not your turn');
    });

    it('應該拒絕使用已使用的物品', () => {
      const state = createMockGameState({
        turn: {
          ...createMockGameState().turn,
          usedItems: ['item-1'],
        },
      });
      const result = TurnManager.canUseItem(state, 'player-1', 'item-1');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Item already used this turn');
    });
  });

  describe('canEndTurn', () => {
    it('應該允許當前玩家結束回合', () => {
      const state = createMockGameState();
      const result = TurnManager.canEndTurn(state, 'player-1');

      expect(result.valid).toBe(true);
    });

    it('應該拒絕非當前玩家結束回合', () => {
      const state = createMockGameState();
      const result = TurnManager.canEndTurn(state, 'player-2');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Not your turn');
    });
  });
});

// ==================== TurnOrderManager 測試 ====================

describe('TurnOrderManager', () => {
  describe('createTurnOrder', () => {
    it('應該建立回合順序', () => {
      const playerIds = ['p1', 'p2', 'p3'];
      const order = TurnOrderManager.createTurnOrder(playerIds);

      expect(order).toEqual(['p1', 'p2', 'p3']);
    });
  });

  describe('getNextPlayer', () => {
    it('應該返回下一個玩家', () => {
      const order = ['p1', 'p2', 'p3'];
      const next = TurnOrderManager.getNextPlayer('p1', order);

      expect(next).toBe('p2');
    });

    it('應該在最後一個玩家後返回第一個玩家', () => {
      const order = ['p1', 'p2', 'p3'];
      const next = TurnOrderManager.getNextPlayer('p3', order);

      expect(next).toBe('p1');
    });
  });

  describe('getPreviousPlayer', () => {
    it('應該返回上一個玩家', () => {
      const order = ['p1', 'p2', 'p3'];
      const prev = TurnOrderManager.getPreviousPlayer('p2', order);

      expect(prev).toBe('p1');
    });

    it('應該在第一個玩家前返回最後一個玩家', () => {
      const order = ['p1', 'p2', 'p3'];
      const prev = TurnOrderManager.getPreviousPlayer('p1', order);

      expect(prev).toBe('p3');
    });
  });

  describe('isRoundComplete', () => {
    it('應該在最後一個玩家時返回 true', () => {
      const order = ['p1', 'p2', 'p3'];
      const complete = TurnOrderManager.isRoundComplete('p3', order);

      expect(complete).toBe(true);
    });

    it('應該在非最後一個玩家時返回 false', () => {
      const order = ['p1', 'p2', 'p3'];
      const complete = TurnOrderManager.isRoundComplete('p2', order);

      expect(complete).toBe(false);
    });
  });

  describe('removePlayer', () => {
    it('應該從回合順序中移除玩家', () => {
      const order = ['p1', 'p2', 'p3'];
      const newOrder = TurnOrderManager.removePlayer('p2', order);

      expect(newOrder).toEqual(['p1', 'p3']);
    });
  });

  describe('insertPlayer', () => {
    it('應該在指定玩家後插入新玩家', () => {
      const order = ['p1', 'p2', 'p3'];
      const newOrder = TurnOrderManager.insertPlayer('p4', order, 'p2');

      expect(newOrder).toEqual(['p1', 'p2', 'p4', 'p3']);
    });

    it('應該在沒有指定玩家時添加到末尾', () => {
      const order = ['p1', 'p2', 'p3'];
      const newOrder = TurnOrderManager.insertPlayer('p4', order);

      expect(newOrder).toEqual(['p1', 'p2', 'p3', 'p4']);
    });
  });
});

// ==================== TurnPhaseManager 測試 ====================

describe('TurnPhaseManager', () => {
  describe('getCurrentPhase', () => {
    it('應該在回合結束時返回 end', () => {
      const state = createMockGameState({
        turn: {
          ...createMockGameState().turn,
          hasEnded: true,
        },
      });

      expect(TurnPhaseManager.getCurrentPhase(state)).toBe('end');
    });

    it('應該在發現新房間後返回 resolution', () => {
      const state = createMockGameState({
        turn: {
          ...createMockGameState().turn,
          hasDiscoveredRoom: true,
        },
      });

      expect(TurnPhaseManager.getCurrentPhase(state)).toBe('resolution');
    });

    it('應該在抽卡後返回 use_items', () => {
      const state = createMockGameState({
        turn: {
          ...createMockGameState().turn,
          hasDrawnCard: true,
        },
      });

      expect(TurnPhaseManager.getCurrentPhase(state)).toBe('use_items');
    });

    it('應該預設返回 movement', () => {
      const state = createMockGameState();

      expect(TurnPhaseManager.getCurrentPhase(state)).toBe('movement');
    });
  });

  describe('canPerformAction', () => {
    it('應該允許在 movement 階段移動', () => {
      const state = createMockGameState();

      expect(TurnPhaseManager.canPerformAction(state, 'move')).toBe(true);
    });

    it('應該在發現新房間後禁止移動', () => {
      const state = createMockGameState({
        turn: {
          ...createMockGameState().turn,
          hasDiscoveredRoom: true,
        },
      });

      expect(TurnPhaseManager.canPerformAction(state, 'move')).toBe(false);
    });

    it('應該允許結束回合', () => {
      const state = createMockGameState();

      expect(TurnPhaseManager.canPerformAction(state, 'end_turn')).toBe(true);
    });

    it('應該在回合結束後禁止結束回合', () => {
      const state = createMockGameState({
        turn: {
          ...createMockGameState().turn,
          hasEnded: true,
        },
      });

      expect(TurnPhaseManager.canPerformAction(state, 'end_turn')).toBe(false);
    });
  });
});
