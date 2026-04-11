/**
 * Issue #318 Debug Test - Room Rotation Bug
 * 
 * Problem: System selects 90° rotation when 180° or 270° should be selected.
 * Specific Case: Entrance Hall east door → Dining Room
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

// ==================== Issue #318 測試 ====================

describe('Issue #318 - Room Rotation Bug', () => {
  it('應該正確旋轉 Dining Room 以連接 Entrance Hall 的東門', () => {
    // Dining Room 原始門：north, east
    // 從 Entrance Hall 的東門進入，需要 west 門
    // 有效旋轉：180° (south, west) 或 270° (west, north)
    
    const diningRoom = createMockRoom('dining_room', ['north', 'east'], 'ground', 'O');
    
    // 驗證原始門
    expect(diningRoom.doors).toEqual(['north', 'east']);
    
    // 測試旋轉
    const rotated0 = RoomDiscoveryManager.rotateDoors(diningRoom.doors, 0);
    const rotated90 = RoomDiscoveryManager.rotateDoors(diningRoom.doors, 90);
    const rotated180 = RoomDiscoveryManager.rotateDoors(diningRoom.doors, 180);
    const rotated270 = RoomDiscoveryManager.rotateDoors(diningRoom.doors, 270);
    
    console.log('Dining Room rotation test:');
    console.log('  0°:', rotated0);
    console.log('  90°:', rotated90);
    console.log('  180°:', rotated180);
    console.log('  270°:', rotated270);
    
    // 驗證旋轉結果
    expect(rotated0).toEqual(['north', 'east']);
    expect(rotated90).toEqual(['east', 'south']);
    expect(rotated180).toEqual(['south', 'west']);
    expect(rotated270).toEqual(['west', 'north']);
    
    // 驗證哪些旋轉有 west 門
    expect(rotated0.includes('west')).toBe(false);
    expect(rotated90.includes('west')).toBe(false);
    expect(rotated180.includes('west')).toBe(true);
    expect(rotated270.includes('west')).toBe(true);
  });

  it('findValidRotation 應該選擇正確的旋轉角度', () => {
    // 創建遊戲狀態，Entrance Hall 在 (7, 7)
    const map = createMockMap();
    map.ground[7][7] = {
      x: 7,
      y: 7,
      floor: 'ground',
      room: createMockRoom('entrance_hall', ['north', 'south', 'east', 'west'], 'ground'),
      discovered: true,
      rotation: 0,
      placementOrder: 0,
    };
    
    const state = createMockGameState({
      map,
      players: [createMockPlayer('player-1', { x: 7, y: 7, floor: 'ground' })],
      playerOrder: ['player-1'],
    });
    
    // Dining Room 在 Entrance Hall 東邊 (8, 7)
    const diningRoom = createMockRoom('dining_room', ['north', 'east'], 'ground', 'O');
    const position = { x: 8, y: 7 };
    const entryDirection: Direction = 'east';
    const floor: Floor = 'ground';
    
    // 調用 findValidRotation
    const result = findValidRotation(diningRoom, state, position, entryDirection, floor);
    
    // 驗證結果
    expect(result).not.toBeNull();
    if (result) {
      console.log('Selected rotation:', result.rotation);
      // 應該選擇 180° 或 270°，而不是 90°
      expect(result.rotation).not.toBe(90);
      expect([180, 270]).toContain(result.rotation);
    }
  });

  it('應該正確處理所有三個測試案例', () => {
    // 創建遊戲狀態
    const map = createMockMap();
    map.ground[7][7] = {
      x: 7,
      y: 7,
      floor: 'ground',
      room: createMockRoom('entrance_hall', ['north', 'south', 'east', 'west'], 'ground'),
      discovered: true,
      rotation: 0,
      placementOrder: 0,
    };
    
    const state = createMockGameState({
      map,
      players: [createMockPlayer('player-1', { x: 7, y: 7, floor: 'ground' })],
      playerOrder: ['player-1'],
    });
    
    // 測試案例 1: Game Room east → Graveyard (south→west)
    // Graveyard 原始門: south
    // 需要 west 門
    const graveyard = createMockRoom('graveyard', ['south'], 'ground', 'E');
    const result1 = findValidRotation(graveyard, state, { x: 8, y: 7 }, 'east', 'ground');
    console.log('Test 1 - Graveyard:', result1?.rotation);
    if (result1) {
      const rotatedDoors = RoomDiscoveryManager.rotateDoors(graveyard.doors, result1.rotation);
      expect(rotatedDoors.includes('west')).toBe(true);
    }
    
    // 測試案例 2: Game Room east → Conservatory (north→west)
    // Conservatory 原始門: north
    // 需要 west 門
    const conservatory = createMockRoom('conservatory', ['north'], 'ground', 'E');
    const result2 = findValidRotation(conservatory, state, { x: 8, y: 7 }, 'east', 'ground');
    console.log('Test 2 - Conservatory:', result2?.rotation);
    if (result2) {
      const rotatedDoors = RoomDiscoveryManager.rotateDoors(conservatory.doors, result2.rotation);
      expect(rotatedDoors.includes('west')).toBe(true);
    }
    
    // 測試案例 3: Entrance Hall east → Dining Room (north/east→west/north or west/south)
    // Dining Room 原始門: north, east
    // 需要 west 門
    const diningRoom = createMockRoom('dining_room', ['north', 'east'], 'ground', 'O');
    const result3 = findValidRotation(diningRoom, state, { x: 8, y: 7 }, 'east', 'ground');
    console.log('Test 3 - Dining Room:', result3?.rotation);
    if (result3) {
      const rotatedDoors = RoomDiscoveryManager.rotateDoors(diningRoom.doors, result3.rotation);
      expect(rotatedDoors.includes('west')).toBe(true);
      expect(result3.rotation).not.toBe(90); // 90° 沒有 west 門
    }
  });
});

// ==================== 手動驗證 ====================

console.log('\n🔍 Issue #318 Manual Verification\n');

// Dining Room 旋轉測試
const diningRoom = createMockRoom('dining_room', ['north', 'east'], 'ground', 'O');
console.log('Dining Room original doors:', diningRoom.doors);

for (const rotation of [0, 90, 180, 270]) {
  const rotated = RoomDiscoveryManager.rotateDoors(diningRoom.doors, rotation as 0 | 90 | 180 | 270);
  console.log(`  ${rotation}°: ${rotated.join(', ')} (has west? ${rotated.includes('west')})`);
}