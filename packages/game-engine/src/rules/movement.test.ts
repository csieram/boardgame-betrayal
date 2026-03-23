/**
 * Movement System Tests - 移動系統測試
 * 
 * 測試項目：
 * - Movement within Speed limit
 * - Cannot exceed Speed
 * - Stop at new room discovery
 * - Blocked passage handling
 * - Cannot move to undiscovered room
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
  MoveAction,
} from '../types';
import { Room } from '@betrayal/shared';
import {
  MovementValidator,
  MovementExecutor,
  PathFinder,
  ObstacleManager,
  STANDARD_MOVE_COST,
  OBSTACLE_MOVE_COST,
  INFINITE_COST,
} from './movement';

// ==================== 測試輔助函數 ====================

const createMockCharacter = (): Character => ({
  id: 'test-character',
  name: 'Test Character',
  nameEn: 'Test Character',
  age: 25,
  description: 'A test character',
  color: '#FF0000',
  stats: {
    speed: [4, 4],
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

const createMockRoom = (
  id: string,
  doors: Direction[] = ['north', 'south', 'east', 'west'],
  floor: 'ground' | 'upper' | 'basement' = 'ground'
): Room => ({
  id,
  name: 'Test Room',
  nameEn: 'Test Room',
  floor,
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

  const ground = createFloor('ground');

  // 入口大廳在 (7, 7)
  ground[7][7] = {
    x: 7,
    y: 7,
    floor: 'ground',
    room: createMockRoom('entrance_hall', ['north', 'south', 'east', 'west']), // 包含西門
    discovered: true,
    rotation: 0,
    placementOrder: 0,
  };

  // 東邊房間在 (8, 7)
  ground[7][8] = {
    x: 8,
    y: 7,
    floor: 'ground',
    room: createMockRoom('room_east', ['west', 'east']),
    discovered: true,
    rotation: 0,
    placementOrder: 1,
  };

  // 北邊房間在 (7, 6)
  ground[6][7] = {
    x: 7,
    y: 6,
    floor: 'ground',
    room: createMockRoom('room_north', ['south', 'north']),
    discovered: true,
    rotation: 0,
    placementOrder: 2,
  };

  // 西邊空位置在 (6, 7) - 用於發現新房間測試
  ground[7][6] = {
    x: 6,
    y: 7,
    floor: 'ground',
    room: null, // 空位置，等待發現
    discovered: false,
    rotation: 0,
    placementOrder: -1,
  };

  // 更東邊的房間在 (9, 7)
  ground[7][9] = {
    x: 9,
    y: 7,
    floor: 'ground',
    room: createMockRoom('room_far_east', ['west']),
    discovered: true,
    rotation: 0,
    placementOrder: 4,
  };

  return {
    ground,
    upper: createFloor('upper'),
    basement: createFloor('basement'),
    placedRoomCount: 5,
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

  const config: GameConfig = {
    playerCount: 1,
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
    players: [player1],
    playerOrder: ['player-1'],
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
  };

  return { ...baseState, ...overrides };
};

// ==================== MovementValidator 測試 ====================

describe('MovementValidator', () => {
  describe('validateMove', () => {
    it('應該允許有效的移動', () => {
      const state = createMockGameState();
      const result = MovementValidator.validateMove(state, 'player-1', { x: 8, y: 7, floor: 'ground' });
      expect(result.valid).toBe(true);
      expect(result.cost).toBe(STANDARD_MOVE_COST);
    });

    it('應該拒絕非當前玩家的移動', () => {
      const state = createMockGameState();
      const result = MovementValidator.validateMove(state, 'player-2', { x: 8, y: 7, floor: 'ground' });
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Not your turn');
    });

    it('應該拒絕回合結束後的移動', () => {
      const state = createMockGameState({
        turn: { ...createMockGameState().turn, hasEnded: true },
      });
      const result = MovementValidator.validateMove(state, 'player-1', { x: 8, y: 7, floor: 'ground' });
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Turn has ended');
    });

    it('應該拒絕發現新房間後的移動', () => {
      const state = createMockGameState({
        turn: { ...createMockGameState().turn, hasDiscoveredRoom: true },
      });
      const result = MovementValidator.validateMove(state, 'player-1', { x: 8, y: 7, floor: 'ground' });
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Cannot move after discovering a room');
    });

    it('應該拒絕移動到未發現的房間', () => {
      const state = createMockGameState();
      const result = MovementValidator.validateMove(state, 'player-1', { x: 6, y: 7, floor: 'ground' });
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Cannot move to undiscovered room');
    });

    it('應該拒絕移動到沒有房間的位置', () => {
      const state = createMockGameState();
      // 創建一個相鄰但沒有房間的位置
      const customState = {
        ...state,
        map: {
          ...state.map,
          ground: state.map.ground.map((row, y) =>
            row.map((tile, x) =>
              x === 8 && y === 7
                ? { ...tile, room: null, discovered: true } // 東邊位置沒有房間
                : tile
            )
          ),
        },
      };
      const result = MovementValidator.validateMove(customState, 'player-1', { x: 8, y: 7, floor: 'ground' });
      expect(result.valid).toBe(false);
      expect(result.error).toBe('No room at target position');
    });

    it('應該拒絕非相鄰房間的移動', () => {
      const state = createMockGameState();
      const result = MovementValidator.validateMove(state, 'player-1', { x: 9, y: 7, floor: 'ground' });
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Can only move to adjacent rooms');
    });

    it('應該拒絕超過 Speed 限制的移動', () => {
      const state = createMockGameState({
        turn: { ...createMockGameState().turn, movesRemaining: 0 },
      });
      const result = MovementValidator.validateMove(state, 'player-1', { x: 8, y: 7, floor: 'ground' });
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Not enough movement points');
    });
  });

  describe('isAdjacent', () => {
    it('應該正確識別相鄰位置', () => {
      const from: Position3D = { x: 7, y: 7, floor: 'ground' };
      expect(MovementValidator.isAdjacent(from, { x: 8, y: 7, floor: 'ground' })).toBe(true);
      expect(MovementValidator.isAdjacent(from, { x: 6, y: 7, floor: 'ground' })).toBe(true);
      expect(MovementValidator.isAdjacent(from, { x: 7, y: 6, floor: 'ground' })).toBe(true);
      expect(MovementValidator.isAdjacent(from, { x: 7, y: 8, floor: 'ground' })).toBe(true);
    });

    it('應該拒絕非相鄰位置', () => {
      const from: Position3D = { x: 7, y: 7, floor: 'ground' };
      expect(MovementValidator.isAdjacent(from, { x: 9, y: 7, floor: 'ground' })).toBe(false);
      expect(MovementValidator.isAdjacent(from, { x: 8, y: 8, floor: 'ground' })).toBe(false);
      expect(MovementValidator.isAdjacent(from, { x: 7, y: 7, floor: 'upper' })).toBe(false);
    });
  });

  describe('hasConnectingDoor', () => {
    it('應該在有連接門時返回 true', () => {
      const room1 = createMockRoom('room1', ['east']);
      const room2 = createMockRoom('room2', ['west']);
      expect(MovementValidator.hasConnectingDoor(room1, room2, 'east')).toBe(true);
    });

    it('應該在缺少門時返回 false', () => {
      const room1 = createMockRoom('room1', ['east']);
      const room2 = createMockRoom('room2', ['north']);
      expect(MovementValidator.hasConnectingDoor(room1, room2, 'east')).toBe(false);
    });
  });
});

// ==================== MovementExecutor 測試 ====================

describe('MovementExecutor', () => {
  describe('executeMove', () => {
    it('應該成功執行移動', () => {
      const state = createMockGameState();
      const action: MoveAction = {
        type: 'MOVE',
        playerId: 'player-1',
        to: { x: 8, y: 7, floor: 'ground' },
        path: [{ x: 7, y: 7, floor: 'ground' }, { x: 8, y: 7, floor: 'ground' }],
        timestamp: Date.now(),
        actionId: 'test-action',
      };

      const result = MovementExecutor.executeMove(state, action);
      expect(result.success).toBe(true);
      expect(result.newState!.players[0].position).toEqual({ x: 8, y: 7, floor: 'ground' });
      expect(result.newState!.turn.movesRemaining).toBe(3);
    });

    it('應該在無效移動時返回錯誤', () => {
      const state = createMockGameState();
      const action: MoveAction = {
        type: 'MOVE',
        playerId: 'player-1',
        to: { x: 6, y: 7, floor: 'ground' },
        path: [{ x: 7, y: 7, floor: 'ground' }, { x: 6, y: 7, floor: 'ground' }],
        timestamp: Date.now(),
        actionId: 'test-action',
      };

      const result = MovementExecutor.executeMove(state, action);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot move to undiscovered room');
    });
  });

  describe('discoverRoom', () => {
    it('應該成功發現新房間', () => {
      const state = createMockGameState();
      const newRoom = createMockRoom('new_room', ['west']);
      const result = MovementExecutor.discoverRoom(state, 'player-1', 'west', newRoom);

      expect(result.success).toBe(true);
      expect(result.newState!.map.ground[7][6].room).toEqual(newRoom);
      expect(result.newState!.map.ground[7][6].discovered).toBe(true);
      expect(result.newState!.players[0].position).toEqual({ x: 6, y: 7, floor: 'ground' });
    });

    it('應該在發現新房間後結束回合', () => {
      const state = createMockGameState();
      const newRoom = createMockRoom('new_room', ['west']);
      const result = MovementExecutor.discoverRoom(state, 'player-1', 'west', newRoom);

      expect(result.success).toBe(true);
      expect(result.newState!.turn.hasDiscoveredRoom).toBe(true);
      expect(result.newState!.turn.hasEnded).toBe(true);
    });

    it('應該拒絕在一回合中發現多個房間', () => {
      const state = createMockGameState({
        turn: { ...createMockGameState().turn, hasDiscoveredRoom: true },
      });
      const newRoom = createMockRoom('new_room', ['west']);
      const result = MovementExecutor.discoverRoom(state, 'player-1', 'west', newRoom);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Already discovered a room this turn');
    });
  });
});

// ==================== PathFinder 測試 ====================

describe('PathFinder', () => {
  describe('getReachablePositions', () => {
    it('應該返回所有可達位置', () => {
      const state = createMockGameState({
        turn: { ...createMockGameState().turn, movesRemaining: 2 },
      });

      const reachable = PathFinder.getReachablePositions(state, 'player-1');
      expect(reachable.length).toBeGreaterThan(0);
    });

    it('應該在沒有移動點數時返回空陣列', () => {
      const state = createMockGameState({
        turn: { ...createMockGameState().turn, movesRemaining: 0 },
      });

      const reachable = PathFinder.getReachablePositions(state, 'player-1');
      expect(reachable).toHaveLength(0);
    });
  });

  describe('getDiscoverableDirections', () => {
    it('應該返回可發現的方向', () => {
      const state = createMockGameState();
      const directions = PathFinder.getDiscoverableDirections(state, 'player-1');
      expect(directions).toContain('west');
    });

    it('應該在已發現房間後返回空陣列', () => {
      const state = createMockGameState({
        turn: { ...createMockGameState().turn, hasDiscoveredRoom: true },
      });

      const directions = PathFinder.getDiscoverableDirections(state, 'player-1');
      expect(directions).toHaveLength(0);
    });
  });
});

// ==================== ObstacleManager 測試 ====================

describe('ObstacleManager', () => {
  it('應該建立鎖定的門', () => {
    const obstacle = ObstacleManager.createLockedDoor({ x: 7, y: 7, floor: 'ground' }, 'east');
    expect(obstacle.type).toBe('locked_door');
    expect(obstacle.canPass).toBe(false);
  });

  it('應該建立坍塌的通道', () => {
    const obstacle = ObstacleManager.createCollapsedPassage({ x: 7, y: 7, floor: 'ground' }, 'east');
    expect(obstacle.type).toBe('collapsed_passage');
    expect(obstacle.canPass).toBe(false);
  });
});

// ==================== 整合測試 ====================

describe('Movement Integration', () => {
  it('應該支援完整的移動流程', () => {
    const state = createMockGameState();
    
    // 檢查可達位置
    const reachable = PathFinder.getReachablePositions(state, 'player-1');
    expect(reachable.length).toBeGreaterThan(0);

    // 移動到東邊房間
    const moveAction: MoveAction = {
      type: 'MOVE',
      playerId: 'player-1',
      to: { x: 8, y: 7, floor: 'ground' },
      path: [{ x: 7, y: 7, floor: 'ground' }, { x: 8, y: 7, floor: 'ground' }],
      timestamp: Date.now(),
      actionId: 'action-1',
    };

    const moveResult = MovementExecutor.executeMove(state, moveAction);
    expect(moveResult.success).toBe(true);
    expect(moveResult.newState!.turn.movesRemaining).toBe(3);
  });

  it('應該在發現新房間後停止移動', () => {
    const state = createMockGameState();
    const newRoom = createMockRoom('new_room', ['west']);

    const result = MovementExecutor.discoverRoom(state, 'player-1', 'west', newRoom);
    expect(result.success).toBe(true);
    expect(result.newState!.turn.hasEnded).toBe(true);

    // 嘗試在發現房間後移動應該失敗
    const moveAction: MoveAction = {
      type: 'MOVE',
      playerId: 'player-1',
      to: { x: 7, y: 7, floor: 'ground' },
      path: [{ x: 6, y: 7, floor: 'ground' }, { x: 7, y: 7, floor: 'ground' }],
      timestamp: Date.now(),
      actionId: 'action-2',
    };

    const moveResult = MovementExecutor.executeMove(result.newState!, moveAction);
    expect(moveResult.success).toBe(false);
  });
});
