/**
 * Issue #319 Test - All 5 Test Cases
 * 
 * Test Cases:
 * 1. Dining Room → 180° or 270°
 * 2. Graveyard → 90°
 * 3. Conservatory → 270°
 * 4. Tree House → 90° or 180°
 * 5. Library (圖書室) → 0° (CRITICAL)
 */

import { findValidRotation, RoomDiscoveryManager } from '../rules/roomDiscovery';
import { GameState, Direction, Floor, Tile, GameMap } from '../types';
import { Room, SymbolType } from '@betrayal/shared';

const createMockRoom = (
  id: string,
  doors: Direction[],
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

const createMockGameState = (): Partial<GameState> => ({
  map: createMockMap(),
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
  players: [{
    id: 'player-1',
    name: 'Player 1',
    character: {
      id: 'test',
      name: 'Test',
      nameEn: 'Test',
      age: 25,
      description: 'Test',
      color: '#FF0000',
      emoji: '🧪',
      portraitSvg: '',
      stats: {
        speed: { currentIndex: 3, values: [0, 1, 2, 3, 4, 5, 6, 7] },
        might: { currentIndex: 3, values: [0, 1, 2, 3, 4, 5, 6, 7] },
        sanity: { currentIndex: 3, values: [0, 1, 2, 3, 4, 5, 6, 7] },
        knowledge: { currentIndex: 3, values: [0, 1, 2, 3, 4, 5, 6, 7] },
      },
    },
    position: { x: 7, y: 7, floor: 'ground' },
    currentStats: { speed: 4, might: 3, sanity: 3, knowledge: 3 },
    items: [],
    omens: [],
    isTraitor: false,
    isDead: false,
    usedItemsThisTurn: [],
  }],
});

describe('Issue #319 - All Test Cases', () => {
  let state: Partial<GameState>;

  beforeEach(() => {
    state = createMockGameState();
    // Place Game Room at (7, 7) with east door
    state.map!.ground[7][7] = {
      x: 7,
      y: 7,
      floor: 'ground',
      room: createMockRoom('game_room', ['east', 'west'], 'ground'),
      discovered: true,
      rotation: 0,
      placementOrder: 0,
    };
  });

  // Case 1: Dining Room → 180° or 270°
  it('Case 1: Dining Room should select 180° or 270°', () => {
    const diningRoom = createMockRoom('dining_room', ['north', 'east'], 'ground');
    const result = findValidRotation(
      diningRoom,
      state as GameState,
      { x: 8, y: 7 },
      'east',
      'ground'
    );

    expect(result).not.toBeNull();
    expect([180, 270]).toContain(result!.rotation);
    
    const rotatedDoors = RoomDiscoveryManager.rotateDoors(diningRoom.doors, result!.rotation);
    expect(rotatedDoors).toContain('west');
  });

  // Case 2: Graveyard → 90°
  it('Case 2: Graveyard should select 90°', () => {
    const graveyard = createMockRoom('graveyard', ['south'], 'ground', 'O');
    const result = findValidRotation(
      graveyard,
      state as GameState,
      { x: 8, y: 7 },
      'east',
      'ground'
    );

    expect(result).not.toBeNull();
    expect(result!.rotation).toBe(90);
    
    const rotatedDoors = RoomDiscoveryManager.rotateDoors(graveyard.doors, result!.rotation);
    expect(rotatedDoors).toContain('west');
  });

  // Case 3: Conservatory → 270°
  it('Case 3: Conservatory should select 270°', () => {
    const conservatory = createMockRoom('conservatory', ['north'], 'ground', 'O');
    const result = findValidRotation(
      conservatory,
      state as GameState,
      { x: 8, y: 7 },
      'east',
      'ground'
    );

    expect(result).not.toBeNull();
    expect(result!.rotation).toBe(270);
    
    const rotatedDoors = RoomDiscoveryManager.rotateDoors(conservatory.doors, result!.rotation);
    expect(rotatedDoors).toContain('west');
  });

  // Case 4: Tree House → 90° or 180°
  it('Case 4: Tree House should select 90° or 180°', () => {
    const treeHouse = createMockRoom('tree_house', ['east', 'south'], 'ground', 'E');
    const result = findValidRotation(
      treeHouse,
      state as GameState,
      { x: 8, y: 7 },
      'east',
      'ground'
    );

    expect(result).not.toBeNull();
    expect([90, 180]).toContain(result!.rotation);
    
    const rotatedDoors = RoomDiscoveryManager.rotateDoors(treeHouse.doors, result!.rotation);
    expect(rotatedDoors).toContain('west');
  });

  // Case 5: Library (圖書室) → 0° (CRITICAL)
  it('Case 5: Library should select 0°', () => {
    const library: Room = {
      id: 'library',
      name: '圖書室',
      nameEn: 'Library',
      floor: 'ground',
      symbol: 'E',
      doors: ['south', 'west'] as Direction[],
      description: '滿是書的圖書室',
      color: '#5D4E37',
      icon: '',
      isOfficial: true,
    };

    const result = findValidRotation(
      library,
      state as GameState,
      { x: 8, y: 7 },
      'east',
      'ground'
    );

    expect(result).not.toBeNull();
    expect(result!.rotation).toBe(0);
    
    const rotatedDoors = RoomDiscoveryManager.rotateDoors(library.doors, result!.rotation);
    expect(rotatedDoors).toContain('west');
  });
});
