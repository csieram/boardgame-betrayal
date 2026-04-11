/**
 * Issue #319 Debug Test - Library Rotation Bug
 * 
 * Problem: Library (書房) has west and south doors.
 * When placed east of Game Room, it should use 0° rotation (already has west door).
 * But system selects 180°, giving east and north doors (NO west door!).
 */

import {
  GameState,
  Player,
  Position3D,
  Direction,
  Character,
  GameMap,
  Tile,
  Floor,
} from '../types';
import { Room, SymbolType } from '@betrayal/shared';
import {
  findValidRotation,
  wouldCloseBoardWithRotation,
  RoomDiscoveryManager,
} from '../rules/roomDiscovery';

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
    rngState: {
      seed: 'test-seed',
      count: 0,
      internalState: [12345],
    },
    placedRoomIds: new Set(),
  };
  return { ...baseState, ...overrides };
};

const createMockPlayer = (
  id: string,
  position: Position3D = { x: 7, y: 7, floor: 'ground' }
): Player => ({
  id,
  name: `Player ${id}`,
  character: createMockCharacter(),
  position,
  currentStats: {
    speed: 4,
    might: 3,
    sanity: 3,
    knowledge: 3,
  },
  items: [],
  omens: [],
  isTraitor: false,
  isDead: false,
  usedItemsThisTurn: [],
});

// ==================== Issue #319 測試 ====================

describe('Issue #319 - Library Rotation Bug', () => {
  it('Case 5: Library (書房) - should select 0° rotation', () => {
    // Library has west, south doors
    // When placed east of Game Room, should use 0° (already has west door)
    
    const map = createMockMap();
    map.ground[7][7] = {
      x: 7,
      y: 7,
      floor: 'ground',
      room: createMockRoom('game_room', ['east', 'west'], 'ground'),
      discovered: true,
      rotation: 0,
      placementOrder: 0,
    };
    
    const state = createMockGameState({
      map,
      players: [createMockPlayer('player-1', { x: 7, y: 7, floor: 'ground' })],
      playerOrder: ['player-1'],
    });
    
    // Library: west, south doors
    const library = createMockRoom('library', ['west', 'south'], 'ground', 'I');
    const position = { x: 8, y: 7 };
    const entryDirection: Direction = 'east';
    const floor: Floor = 'ground';
    
    console.log('\n[TEST #319] ========== LIBRARY TEST ==========');
    console.log('[TEST #319] Library original doors:', library.doors);
    console.log('[TEST #319] Entry direction:', entryDirection);
    console.log('[TEST #319] Required door: west');
    
    // Test each rotation manually
    for (const rotation of [0, 90, 180, 270] as const) {
      const rotatedDoors = RoomDiscoveryManager.rotateDoors(library.doors, rotation);
      const hasWest = rotatedDoors.includes('west');
      const wouldClose = wouldCloseBoardWithRotation(state, position, library, rotation, floor, entryDirection);
      console.log(`[TEST #319] ${rotation}°: doors=${rotatedDoors}, hasWest=${hasWest}, wouldClose=${wouldClose}`);
    }
    
    const result = findValidRotation(library, state, position, entryDirection, floor);
    
    console.log('[TEST #319] Result:', result);
    console.log('[TEST #319] =========================================\n');
    
    // EXPECTED: 0° rotation (west, south doors)
    // BUG: System selects 180° (east, north doors - NO west door!)
    expect(result).not.toBeNull();
    expect(result!.rotation).toBe(0);
    
    // Verify the rotated room has west door
    const rotatedDoors = RoomDiscoveryManager.rotateDoors(library.doors, result!.rotation);
    expect(rotatedDoors).toContain('west');
  });

  it('Case 4: Tree House (樹屋) - should select valid rotation', () => {
    // Tree House has east, south doors
    
    const map = createMockMap();
    map.ground[7][7] = {
      x: 7,
      y: 7,
      floor: 'ground',
      room: createMockRoom('game_room', ['east', 'west'], 'ground'),
      discovered: true,
      rotation: 0,
      placementOrder: 0,
    };
    
    const state = createMockGameState({
      map,
      players: [createMockPlayer('player-1', { x: 7, y: 7, floor: 'ground' })],
      playerOrder: ['player-1'],
    });
    
    const treeHouse = createMockRoom('tree_house', ['east', 'south'], 'ground', 'E');
    const position = { x: 8, y: 7 };
    const entryDirection: Direction = 'east';
    const floor: Floor = 'ground';
    
    console.log('\n[TEST #319] ========== TREE HOUSE TEST ==========');
    console.log('[TEST #319] Tree House original doors:', treeHouse.doors);
    
    for (const rotation of [0, 90, 180, 270] as const) {
      const rotatedDoors = RoomDiscoveryManager.rotateDoors(treeHouse.doors, rotation);
      const hasWest = rotatedDoors.includes('west');
      const wouldClose = wouldCloseBoardWithRotation(state, position, treeHouse, rotation, floor, entryDirection);
      console.log(`[TEST #319] ${rotation}°: doors=${rotatedDoors}, hasWest=${hasWest}, wouldClose=${wouldClose}`);
    }
    
    const result = findValidRotation(treeHouse, state, position, entryDirection, floor);
    
    console.log('[TEST #319] Result:', result);
    console.log('[TEST #319] =========================================\n');
    
    // Should find a valid rotation (90° or 180°)
    expect(result).not.toBeNull();
    expect([90, 180]).toContain(result!.rotation);
  });

  it('Case 1: Dining Room - should select 180° or 270°', () => {
    // Dining Room has north, east doors
    
    const map = createMockMap();
    map.ground[7][7] = {
      x: 7,
      y: 7,
      floor: 'ground',
      room: createMockRoom('game_room', ['east', 'west'], 'ground'),
      discovered: true,
      rotation: 0,
      placementOrder: 0,
    };
    
    const state = createMockGameState({
      map,
      players: [createMockPlayer('player-1', { x: 7, y: 7, floor: 'ground' })],
      playerOrder: ['player-1'],
    });
    
    const diningRoom = createMockRoom('dining_room', ['north', 'east'], 'ground', null);
    const position = { x: 8, y: 7 };
    const entryDirection: Direction = 'east';
    const floor: Floor = 'ground';
    
    console.log('\n[TEST #319] ========== DINING ROOM TEST ==========');
    
    for (const rotation of [0, 90, 180, 270] as const) {
      const rotatedDoors = RoomDiscoveryManager.rotateDoors(diningRoom.doors, rotation);
      const hasWest = rotatedDoors.includes('west');
      const wouldClose = wouldCloseBoardWithRotation(state, position, diningRoom, rotation, floor, entryDirection);
      console.log(`[TEST #319] ${rotation}°: doors=${rotatedDoors}, hasWest=${hasWest}, wouldClose=${wouldClose}`);
    }
    
    const result = findValidRotation(diningRoom, state, position, entryDirection, floor);
    
    console.log('[TEST #319] Result:', result);
    console.log('[TEST #319] =========================================\n');
    
    expect(result).not.toBeNull();
    expect([180, 270]).toContain(result!.rotation);
  });

  it('Case 2: Graveyard - should select 90°', () => {
    // Graveyard has only south door
    
    const map = createMockMap();
    map.ground[7][7] = {
      x: 7,
      y: 7,
      floor: 'ground',
      room: createMockRoom('game_room', ['east', 'west'], 'ground'),
      discovered: true,
      rotation: 0,
      placementOrder: 0,
    };
    
    const state = createMockGameState({
      map,
      players: [createMockPlayer('player-1', { x: 7, y: 7, floor: 'ground' })],
      playerOrder: ['player-1'],
    });
    
    const graveyard = createMockRoom('graveyard', ['south'], 'ground', 'O');
    const position = { x: 8, y: 7 };
    const entryDirection: Direction = 'east';
    const floor: Floor = 'ground';
    
    console.log('\n[TEST #319] ========== GRAVEYARD TEST ==========');
    
    for (const rotation of [0, 90, 180, 270] as const) {
      const rotatedDoors = RoomDiscoveryManager.rotateDoors(graveyard.doors, rotation);
      const hasWest = rotatedDoors.includes('west');
      const wouldClose = wouldCloseBoardWithRotation(state, position, graveyard, rotation, floor, entryDirection);
      console.log(`[TEST #319] ${rotation}°: doors=${rotatedDoors}, hasWest=${hasWest}, wouldClose=${wouldClose}`);
    }
    
    const result = findValidRotation(graveyard, state, position, entryDirection, floor);
    
    console.log('[TEST #319] Result:', result);
    console.log('[TEST #319] =========================================\n');
    
    expect(result).not.toBeNull();
    expect(result!.rotation).toBe(90);
  });

  it('Case 3: Conservatory - should select 270°', () => {
    // Conservatory has only north door
    
    const map = createMockMap();
    map.ground[7][7] = {
      x: 7,
      y: 7,
      floor: 'ground',
      room: createMockRoom('game_room', ['east', 'west'], 'ground'),
      discovered: true,
      rotation: 0,
      placementOrder: 0,
    };
    
    const state = createMockGameState({
      map,
      players: [createMockPlayer('player-1', { x: 7, y: 7, floor: 'ground' })],
      playerOrder: ['player-1'],
    });
    
    const conservatory = createMockRoom('conservatory', ['north'], 'ground', 'O');
    const position = { x: 8, y: 7 };
    const entryDirection: Direction = 'east';
    const floor: Floor = 'ground';
    
    console.log('\n[TEST #319] ========== CONSERVATORY TEST ==========');
    
    for (const rotation of [0, 90, 180, 270] as const) {
      const rotatedDoors = RoomDiscoveryManager.rotateDoors(conservatory.doors, rotation);
      const hasWest = rotatedDoors.includes('west');
      const wouldClose = wouldCloseBoardWithRotation(state, position, conservatory, rotation, floor, entryDirection);
      console.log(`[TEST #319] ${rotation}°: doors=${rotatedDoors}, hasWest=${hasWest}, wouldClose=${wouldClose}`);
    }
    
    const result = findValidRotation(conservatory, state, position, entryDirection, floor);
    
    console.log('[TEST #319] Result:', result);
    console.log('[TEST #319] =========================================\n');
    
    expect(result).not.toBeNull();
    expect(result!.rotation).toBe(270);
  });
});

// ==================== 手動驗證 ====================

console.log('\n🔍 Issue #319 Manual Verification\n');

// Library rotation test
const library = createMockRoom('library', ['west', 'south'], 'ground', 'I');
console.log('Library original doors:', library.doors);

for (const rotation of [0, 90, 180, 270]) {
  const rotated = RoomDiscoveryManager.rotateDoors(library.doors, rotation as 0 | 90 | 180 | 270);
  console.log(`  ${rotation}°: ${rotated.join(', ')} (has west? ${rotated.includes('west')})`);
}
