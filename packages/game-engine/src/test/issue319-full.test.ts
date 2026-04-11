/**
 * Issue #319 Debug Test - Library Rotation Bug
 * 
 * Problem: Library (書房) has west and south doors.
 * When placed east of Game Room, it should use 0° rotation (already has west door).
 * But system selects 180°, giving east and north doors (NO west door!).
 */

import { RoomDiscoveryManager, findValidRotation, wouldCloseBoardWithRotation } from '../rules/roomDiscovery';
import { GameState, Direction, Floor, Tile, GameMap, Character, Player, Position3D } from '../types';
import { Room, SymbolType } from '@betrayal/shared';

// ==================== 測試輔助函數 ====================

const createMockCharacter = (): Character => ({
  id: 'test-character',
  name: 'Test Character',
  nameEn: 'Test Character',
  age: 25,
  description: 'A test character',
  color: '#FF0000',
  stats: {
    speed: { currentIndex: 3, values: [0, 1, 2, 3, 4, 5, 6, 7] },
    might: { currentIndex: 3, values: [0, 1, 2, 3, 4, 5, 6, 7] },
    sanity: { currentIndex: 3, values: [0, 1, 2, 3, 4, 5, 6, 7] },
    knowledge: { currentIndex: 3, values: [0, 1, 2, 3, 4, 5, 6, 7] },
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
    roof: createFloor('roof'),
    placedRoomCount: 0,
  };
};

const createMockGameState = (): GameState => {
  return {
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
      roof: [],
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
  it('Case 5: Library (圖書室) - should select 0° rotation', () => {
    // Create game state with Game Room at (7, 7)
    const state = createMockGameState();
    state.map.ground[7][7] = {
      x: 7,
      y: 7,
      floor: 'ground',
      room: createMockRoom('game_room', ['east', 'west'], 'ground'),
      discovered: true,
      rotation: 0,
      placementOrder: 0,
    };

    // Library: west, south doors (from rooms.ts)
    const library: Room = {
      id: 'library',
      name: '圖書室',
      nameEn: 'Library',
      floor: 'ground',
      symbol: 'E',
      doors: ['south', 'west'] as Direction[],  // Note: order is south, west
      description: '滿是書的圖書室',
      color: '#5D4E37',
      icon: '',
      isOfficial: true,
    };

    const position = { x: 8, y: 7 };
    const entryDirection: Direction = 'east';
    const floor: Floor = 'ground';

    console.log('\n========== Case 5: Library (圖書室) - CRITICAL ==========');
    console.log('Library original doors:', library.doors);
    console.log('Entry direction:', entryDirection);
    console.log('Required door: west');

    // Test each rotation manually
    for (const rotation of [0, 90, 180, 270] as const) {
      const rotatedDoors = RoomDiscoveryManager.rotateDoors(library.doors, rotation);
      const hasWest = rotatedDoors.includes('west');
      const wouldClose = wouldCloseBoardWithRotation(state, position, library, rotation, floor, entryDirection);
      console.log(`${rotation}°: doors=${rotatedDoors}, hasWest=${hasWest}, wouldClose=${wouldClose}`);
    }

    // Find valid rotation
    const result = findValidRotation(library, state, position, entryDirection, floor);
    console.log('\nResult:', result);

    // EXPECTED: 0° rotation (south, west doors at 0° = south, west)
    // Note: Library doors are ['south', 'west'], so at 0° they are ['south', 'west']
    // At 90°: south->west, west->north = ['west', 'north'] - has west!
    // At 180°: south->north, west->east = ['north', 'east'] - no west
    // At 270°: south->east, west->south = ['east', 'south'] - no west

    // Actually, let me recalculate:
    // DIRECTION_ROTATION_MAP:
    // south: { 0: 'south', 90: 'west', 180: 'north', 270: 'east' }
    // west: { 0: 'west', 90: 'north', 180: 'east', 270: 'south' }
    //
    // So for ['south', 'west']:
    // 0°: ['south', 'west'] - has west ✓
    // 90°: ['west', 'north'] - has west ✓
    // 180°: ['north', 'east'] - no west ✗
    // 270°: ['east', 'south'] - no west ✗

    expect(result).not.toBeNull();
    expect(result!.rotation).toBe(0);
  });
});
