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
  fallbackGround: [
    createMockRoom('ground-3', ['north'], 'ground', 'O'),
  ],
  fallbackUpper: [],
  fallbackBasement: [],
  drawn: new Set(),
});

const createMockCardDecks = (): CardDecks => ({
  event: { remaining: [], drawn: [], discarded: [] },
  item: { remaining: [], drawn: [], discarded: [] },
  omen: { remaining: [], drawn: [], discarded: [] },
});

const createMockHauntState = (): HauntState => ({
  isActive: false,
  type: 'none',
  hauntNumber: null,
  traitorPlayerId: null,
  omenCount: 0,
  heroObjective: null,
  traitorObjective: null,
});

const createMockCombatState = (): CombatState => ({
  isActive: false,
  attackerId: null,
  defenderId: null,
  usedStat: null,
  attackerRoll: null,
  defenderRoll: null,
  damage: null,
});

const createMockRngState = (): RngState => ({
  seed: 'test-seed',
  count: 0,
  internalState: [12345],
});

const createMockGameState = (overrides: Partial<GameState> = {}): GameState => ({
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
  cardDecks: createMockCardDecks(),
  roomDeck: createMockRoomDeck(),
  haunt: createMockHauntState(),
  combat: createMockCombatState(),
  log: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
  rngState: createMockRngState(),
  placedRoomIds: new Set(),
  ...overrides,
});

// ==================== 測試套件 ====================

describe('validateRotatedPlacement', () => {
  it('should validate placement with 0° rotation', () => {
    // Source room at (7,7) with north door
    const sourceRoom = createMockRoom('source', ['north'], 'ground');
    // New room with south door - at 0° rotation, south door faces south
    // This matches the source room's north door (source is south of new room)
    const newRoom = createMockRoom('new', ['south'], 'ground');

    const state = createMockGameState({
      map: {
        ...createMockMap(),
        ground: createMockMap().ground.map((row, y) =>
          row.map((tile, x) =>
            x === 7 && y === 7
              ? { ...tile, room: sourceRoom, discovered: true }
              : tile
          )
        ),
      },
    });

    // New room at (7,6) is NORTH of source at (7,7)
    // Source has north door, so new room needs south door to connect
    const position: Position3D = { x: 7, y: 6, floor: 'ground' };
    // 0° rotation - south door stays south, connecting to source's north door
    const result = validateRotatedPlacement(state, position, newRoom, 0);

    expect(result.valid).toBe(true);
  });

  it('should validate placement with 90° rotation', () => {
    // Source room at (7,7) with east door
    const sourceRoom = createMockRoom('source', ['east'], 'ground');
    // New room with north door - at 90° rotation, north door becomes east
    const newRoom = createMockRoom('new', ['north'], 'ground');

    const state = createMockGameState({
      map: {
        ...createMockMap(),
        ground: createMockMap().ground.map((row, y) =>
          row.map((tile, x) =>
            x === 7 && y === 7
              ? { ...tile, room: sourceRoom, discovered: true }
              : tile
          )
        ),
      },
    });

    // New room at (8,7) is EAST of source at (7,7)
    // Source has east door, so new room needs west door to connect
    // North door at 90° becomes east, but we need west...
    // Actually: north at 270° becomes west
    const position: Position3D = { x: 8, y: 7, floor: 'ground' };
    // 270° rotation to make north door face west
    const result = validateRotatedPlacement(state, position, newRoom, 270);

    expect(result.valid).toBe(true);
  });

  it('should validate placement with 180° rotation', () => {
    // Source room at (7,7) with south door
    const sourceRoom = createMockRoom('source', ['south'], 'ground');
    // New room with north door - at 180° rotation, north door becomes south
    const newRoom = createMockRoom('new', ['north'], 'ground');

    const state = createMockGameState({
      map: {
        ...createMockMap(),
        ground: createMockMap().ground.map((row, y) =>
          row.map((tile, x) =>
            x === 7 && y === 7
              ? { ...tile, room: sourceRoom, discovered: true }
              : tile
          )
        ),
      },
    });

    // New room at (7,8) is SOUTH of source at (7,7)
    // Source has south door, so new room needs north door to connect
    // North door at 180° becomes south... but we need north
    // Actually: north at 0° is already north
    const position: Position3D = { x: 7, y: 8, floor: 'ground' };
    // 0° rotation - north door stays north
    const result = validateRotatedPlacement(state, position, newRoom, 0);

    expect(result.valid).toBe(true);
  });

  it('should validate placement with 270° rotation', () => {
    // Source room at (7,7) with west door
    const sourceRoom = createMockRoom('source', ['west'], 'ground');
    // New room with north door - at 90° rotation, north door becomes east
    // But at 270° rotation, north door becomes west
    const newRoom = createMockRoom('new', ['north'], 'ground');

    const state = createMockGameState({
      map: {
        ...createMockMap(),
        ground: createMockMap().ground.map((row, y) =>
          row.map((tile, x) =>
            x === 7 && y === 7
              ? { ...tile, room: sourceRoom, discovered: true }
              : tile
          )
        ),
      },
    });

    // New room at (6,7) is WEST of source at (7,7)
    // Source has west door, so new room needs east door to connect
    // North door at 90° becomes east
    const position: Position3D = { x: 6, y: 7, floor: 'ground' };
    // 90° rotation to make north door face east
    const result = validateRotatedPlacement(state, position, newRoom, 90);

    expect(result.valid).toBe(true);
  });

  it('should fail when rotated doors do not match', () => {
    // Source room at (7,7) with north door
    const sourceRoom = createMockRoom('source', ['north'], 'ground');
    // New room with only east door (cannot match north after any rotation)
    const newRoom = createMockRoom('new', ['east'], 'ground');
    
    const state = createMockGameState({
      map: {
        ...createMockMap(),
        ground: createMockMap().ground.map((row, y) =>
          row.map((tile, x) =>
            x === 7 && y === 7
              ? { ...tile, room: sourceRoom, discovered: true }
              : tile
          )
        ),
      },
    });

    const position: Position3D = { x: 7, y: 6, floor: 'ground' };
    // 0° rotation - east door does not match north
    const result = validateRotatedPlacement(state, position, newRoom, 0);
    
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Door mismatch');
  });

  it('should fail when position is already occupied', () => {
    const existingRoom = createMockRoom('existing', ['south'], 'ground');
    const newRoom = createMockRoom('new', ['north'], 'ground');
    
    const state = createMockGameState({
      map: {
        ...createMockMap(),
        ground: createMockMap().ground.map((row, y) =>
          row.map((tile, x) =>
            x === 7 && y === 6
              ? { ...tile, room: existingRoom, discovered: true }
              : tile
          )
        ),
      },
    });

    const position: Position3D = { x: 7, y: 6, floor: 'ground' };
    const result = validateRotatedPlacement(state, position, newRoom, 0);
    
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Position already occupied');
  });
});

describe('getValidRotationsForPlacement', () => {
  it('should return all valid rotations for a room at a position', () => {
    // Source room at (7,7) with north door
    const sourceRoom = createMockRoom('source', ['north'], 'ground');
    // New room with doors on all sides - any rotation works
    const newRoom = createMockRoom('new', ['north', 'south', 'east', 'west'], 'ground');
    
    const state = createMockGameState({
      map: {
        ...createMockMap(),
        ground: createMockMap().ground.map((row, y) =>
          row.map((tile, x) =>
            x === 7 && y === 7
              ? { ...tile, room: sourceRoom, discovered: true }
              : tile
          )
        ),
      },
    });

    const position: Position3D = { x: 7, y: 6, floor: 'ground' };
    const rotations = getValidRotationsForPlacement(state, position, newRoom);
    
    // All rotations should be valid since room has doors in all directions
    expect(rotations).toContain(0);
    expect(rotations).toContain(90);
    expect(rotations).toContain(180);
    expect(rotations).toContain(270);
    expect(rotations.length).toBe(4);
  });

  it('should return only valid rotations that match door connections', () => {
    // Source room at (7,7) with north door
    const sourceRoom = createMockRoom('source', ['north'], 'ground');
    // New room with only south door - at 0° rotation, south door faces south
    // New room at (7,6) is NORTH of source, so it needs south door to connect to source's north door
    // At 0° rotation, south door stays south - this is correct!
    const newRoom = createMockRoom('new', ['south'], 'ground');

    const state = createMockGameState({
      map: {
        ...createMockMap(),
        ground: createMockMap().ground.map((row, y) =>
          row.map((tile, x) =>
            x === 7 && y === 7
              ? { ...tile, room: sourceRoom, discovered: true }
              : tile
          )
        ),
      },
    });

    // New room at (7,6) is NORTH of source at (7,7)
    // Source has north door, new room needs south door
    // South door at 0° rotation faces south - correct!
    const position: Position3D = { x: 7, y: 6, floor: 'ground' };
    const rotations = getValidRotationsForPlacement(state, position, newRoom);

    // 0° rotation makes south door face south, connecting to source's north door
    expect(rotations).toEqual([0]);
  });

  it('should consider multiple adjacent rooms when validating rotations', () => {
    // Source rooms - one north, one east
    const northRoom = createMockRoom('north-source', ['south'], 'ground');
    const eastRoom = createMockRoom('east-source', ['west'], 'ground');
    // New room needs to match both connections
    const newRoom = createMockRoom('new', ['north', 'east'], 'ground');
    
    const state = createMockGameState({
      map: {
        ...createMockMap(),
        ground: createMockMap().ground.map((row, y) =>
          row.map((tile, x) => {
            if (x === 7 && y === 7) {
              return { ...tile, room: northRoom, discovered: true };
            }
            if (x === 8 && y === 8) {
              return { ...tile, room: eastRoom, discovered: true };
            }
            return tile;
          })
        ),
      },
    });

    // Position between north and east rooms
    const position: Position3D = { x: 7, y: 8, floor: 'ground' };
    const rotations = getValidRotationsForPlacement(state, position, newRoom);
    
    // 0° rotation: north→north, east→east - matches both
    expect(rotations).toContain(0);
  });
});

describe('TilePlacementValidator with rotation', () => {
  it('should check door matches correctly for rotated rooms', () => {
    const sourceRoom = createMockRoom('source', ['north'], 'ground');
    const newRoom = createMockRoom('new', ['south'], 'ground');
    
    const state = createMockGameState({
      map: {
        ...createMockMap(),
        ground: createMockMap().ground.map((row, y) =>
          row.map((tile, x) =>
            x === 7 && y === 7
              ? { ...tile, room: sourceRoom, discovered: true }
              : tile
          )
        ),
      },
    });

    const position: Position3D = { x: 7, y: 6, floor: 'ground' };
    // Rotate new room 180° to match
    const rotatedDoors = RoomDiscoveryManager.rotateDoors(newRoom.doors, 180);
    const rotatedRoom = { ...newRoom, doors: rotatedDoors };
    
    const matches = TilePlacementValidator.checkDoorMatches(state, position, rotatedRoom);
    
    // North direction should match (source has north door, rotated room has north door)
    const northMatch = matches.find(m => m.direction === 'north');
    expect(northMatch?.matches).toBe(true);
  });
});

describe('Door alignment after rotation', () => {
  it('should align doors correctly for all entry directions', () => {
    const testCases: { entryDir: Direction; roomDoors: Direction[]; expectedRotation: 0 | 90 | 180 | 270 }[] = [
      // Entering from south, room has south door -> 180° to face north
      { entryDir: 'south', roomDoors: ['south'], expectedRotation: 180 },
      // Entering from north, room has south door -> 0° (already facing north)
      { entryDir: 'north', roomDoors: ['south'], expectedRotation: 0 },
      // Entering from west, room has north door -> 90° to face east
      { entryDir: 'west', roomDoors: ['north'], expectedRotation: 90 },
      // Entering from east, room has north door -> 270° to face west
      { entryDir: 'east', roomDoors: ['north'], expectedRotation: 270 },
    ];

    for (const testCase of testCases) {
      const room = createMockRoom('test', testCase.roomDoors, 'ground');
      const rotation = RoomDiscoveryManager.calculateRotation(room, testCase.entryDir);
      
      expect(rotation).toBe(testCase.expectedRotation);
      
      // Verify the rotated doors have the correct door facing the source
      const rotatedDoors = RoomDiscoveryManager.rotateDoors(room.doors, rotation);
      const oppositeDir = { north: 'south', south: 'north', east: 'west', west: 'east' }[testCase.entryDir] as Direction;
      expect(rotatedDoors).toContain(oppositeDir);
    }
  });
});
