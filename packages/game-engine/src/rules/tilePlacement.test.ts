/**
 * Tile Placement System Tests - 板塊放置系統測試
 * 
 * Test Coverage:
 * - Rotated placement validation
 * - Door alignment after rotation
 * - Valid rotation calculation for placement
 */

import {
  GameState,
  Position3D,
  Direction,
  Tile,
  Floor,
  Character,
  GameConfig,
  GameMap,
  CardDecks,
  RoomDeckState,
  HauntState,
  CombatState,
  GameLogEntry,
  RngState,
  TurnState,
  Player,
} from '../types';
import { Room, SymbolType } from '@betrayal/shared';
import {
  TilePlacementValidator,
  validateRotatedPlacement,
  getValidRotationsForPlacement,
} from './tilePlacement';
import { RoomDiscoveryManager } from './roomDiscovery';

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
  floor: Floor = 'ground',
  symbol: SymbolType = null
): Room => ({
  id,
  name: 'Test Room',
  nameEn: 'Test Room',
  floor,
  symbol,
  doors,
  description: 'A test room',
  color: '#FFFFFF',
  icon: '',
  isOfficial: true,
});

const createEmptyTile = (x: number, y: number, floor: Floor): Tile => ({
  x,
  y,
  floor,
  room: null,
  discovered: false,
  rotation: 0,
  placementOrder: -1,
});

const createMockMap = (): GameMap => {
  const createFloor = (floor: Floor): Tile[][] => {
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

  return {
    ground: createFloor('ground'),
    upper: createFloor('upper'),
    basement: createFloor('basement'),
    placedRoomCount: 0,
  };
};

const createMockRoomDeck = (): RoomDeckState => ({
  ground: [
    createMockRoom('ground-1', ['north', 'south'], 'ground', 'E'),
    createMockRoom('ground-2', ['north', 'east'], 'ground', 'I'),
  ],
  upper: [
    createMockRoom('upper-1', ['north', 'south'], 'upper', 'E'),
    createMockRoom('upper-2', ['north', 'east'], 'upper', 'I'),
  ],
  basement: [
    createMockRoom('basement-1', ['north', 'south'], 'basement', 'O'),
    createMockRoom('basement-2', ['north', 'east'], 'basement', null),
  ],
  drawn: new Set(),
});

const createMockGameState = (overrides: Partial<GameState> = {}): GameState => {
  const baseState: GameState = {
    gameId: 'test-game',
    version: '1.0.0',
    phase: 'exploration',
    result: 'ongoing',
    config: {
      playerCount: 3,
      enableAI: false,
      seed: 'test-seed',
      maxTurns: 100,
    },
    map: createMockMap(),
    players: [],
    playerOrder: [],
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
    roomDeck: createMockRoomDeck(),
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
    rngState: {
      seed: 'test-seed',
      count: 0,
      internalState: [12345],
    },
    placedRoomIds: new Set(),
  };
  return { ...baseState, ...overrides };
};

// ==================== TilePlacementValidator 測試 ====================

describe('TilePlacementValidator', () => {
  describe('canPlaceTile', () => {
    it('應該允許在空位置放置板塊', () => {
      const state = createMockGameState();
      const room = createMockRoom('test', ['north', 'south'], 'ground');
      const tile: Tile = {
        x: 7,
        y: 7,
        floor: 'ground',
        room,
        discovered: true,
        rotation: 0,
        placementOrder: 1,
      };

      const result = TilePlacementValidator.canPlaceTile(state, 7, 7, tile);
      
      expect(result.valid).toBe(true);
    });

    it('當位置已被佔用時應該拒絕', () => {
      const map = createMockMap();
      map.ground[7][7] = {
        x: 7,
        y: 7,
        floor: 'ground',
        room: createMockRoom('existing', ['north'], 'ground'),
        discovered: true,
        rotation: 0,
        placementOrder: 1,
      };
      
      const state = createMockGameState({ map });
      const room = createMockRoom('test', ['north', 'south'], 'ground');
      const tile: Tile = {
        x: 7,
        y: 7,
        floor: 'ground',
        room,
        discovered: true,
        rotation: 0,
        placementOrder: 2,
      };

      const result = TilePlacementValidator.canPlaceTile(state, 7, 7, tile);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Position already occupied');
    });

    it('當門位置不匹配時應該拒絕', () => {
      const map = createMockMap();
      map.ground[6][7] = {
        x: 7,
        y: 6,
        floor: 'ground',
        room: createMockRoom('north-room', ['south'], 'ground'),
        discovered: true,
        rotation: 0,
        placementOrder: 1,
      };
      
      const state = createMockGameState({ map });
      // 這個房間沒有北門，無法連接到北方的房間
      const room = createMockRoom('test', ['south', 'east', 'west'], 'ground');
      const tile: Tile = {
        x: 7,
        y: 7,
        floor: 'ground',
        room,
        discovered: true,
        rotation: 0,
        placementOrder: 2,
      };

      const result = TilePlacementValidator.canPlaceTile(state, 7, 7, tile);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Door mismatch');
    });
  });

  describe('checkDoorMatches', () => {
    it('應該檢測匹配的門', () => {
      const map = createMockMap();
      map.ground[6][7] = {
        x: 7,
        y: 6,
        floor: 'ground',
        room: createMockRoom('north-room', ['south'], 'ground'),
        discovered: true,
        rotation: 0,
        placementOrder: 1,
      };
      
      const state = createMockGameState({ map });
      const room = createMockRoom('test', ['north', 'south'], 'ground');

      const matches = TilePlacementValidator.checkDoorMatches(
        state,
        { x: 7, y: 7, floor: 'ground' },
        room
      );
      
      const northMatch = matches.find(m => m.direction === 'north');
      expect(northMatch?.matches).toBe(true);
      expect(northMatch?.hasDoor).toBe(true);
      expect(northMatch?.neighborHasDoor).toBe(true);
    });
  });

  describe('getValidRotations', () => {
    it('應該返回所有有效的旋轉角度', () => {
      const map = createMockMap();
      map.ground[6][7] = {
        x: 7,
        y: 6,
        floor: 'ground',
        room: createMockRoom('north-room', ['south'], 'ground'),
        discovered: true,
        rotation: 0,
        placementOrder: 1,
      };
      
      const state = createMockGameState({ map });
      const room = createMockRoom('test', ['north', 'south'], 'ground');

      const rotations = TilePlacementValidator.getValidRotations(
        state,
        { x: 7, y: 7, floor: 'ground' },
        room
      );
      
      // 應該至少有一個有效旋轉（0° 或 180°）
      expect(rotations.length).toBeGreaterThan(0);
    });
  });

  describe('getValidPlacements', () => {
    it('應該返回所有有效放置位置', () => {
      const map = createMockMap();
      map.ground[7][7] = {
        x: 7,
        y: 7,
        floor: 'ground',
        room: createMockRoom('center', ['north', 'south', 'east', 'west'], 'ground'),
        discovered: true,
        rotation: 0,
        placementOrder: 1,
      };
      
      const state = createMockGameState({ map });
      const room = createMockRoom('test', ['north', 'south'], 'ground');

      const placements = TilePlacementValidator.getValidPlacements(state, room);
      
      // 應該有 4 個相鄰位置
      expect(placements.length).toBeGreaterThan(0);
    });
  });
});

// ==================== validateRotatedPlacement 測試 ====================

describe('validateRotatedPlacement', () => {
  it('應該驗證旋轉後的放置', () => {
    const state = createMockGameState();
    const room = createMockRoom('test', ['north', 'south'], 'ground');

    const result = validateRotatedPlacement(
      state,
      { x: 7, y: 7, floor: 'ground' },
      room,
      0
    );
    
    expect(result.valid).toBe(true);
  });

  it('當旋轉後門不匹配時應該拒絕', () => {
    const map = createMockMap();
    map.ground[6][7] = {
      x: 7,
      y: 6,
      floor: 'ground',
      room: createMockRoom('north-room', ['south'], 'ground'),
      discovered: true,
      rotation: 0,
      placementOrder: 1,
    };
    
    const state = createMockGameState({ map });
    // 旋轉 90° 後，北門變成東門，無法連接到北方的房間
    const room = createMockRoom('test', ['north'], 'ground');

    const result = validateRotatedPlacement(
      state,
      { x: 7, y: 7, floor: 'ground' },
      room,
      90
    );
    
    expect(result.valid).toBe(false);
  });
});

// ==================== getValidRotationsForPlacement 測試 ====================

describe('getValidRotationsForPlacement', () => {
  it('應該返回所有有效的旋轉角度', () => {
    const map = createMockMap();
    map.ground[6][7] = {
      x: 7,
      y: 6,
      floor: 'ground',
      room: createMockRoom('north-room', ['south'], 'ground'),
      discovered: true,
      rotation: 0,
      placementOrder: 1,
    };
    
    const state = createMockGameState({ map });
    const room = createMockRoom('test', ['north', 'south'], 'ground');

    const rotations = getValidRotationsForPlacement(
      state,
      { x: 7, y: 7, floor: 'ground' },
      room
    );
    
    expect(rotations.length).toBeGreaterThan(0);
    expect(rotations).toContain(0);
  });
});
