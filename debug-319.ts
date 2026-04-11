/**
 * Issue #319 Debug Script - Library Rotation Bug
 * 
 * Run with: npx ts-node debug-319.ts
 */

import {
  findValidRotation,
  wouldCloseBoardWithRotation,
  RoomDiscoveryManager,
} from './packages/game-engine/src/rules/roomDiscovery';

import {
  GameState,
  Direction,
  Floor,
  Tile,
  GameMap,
} from './packages/game-engine/src/types';

import { Room, SymbolType } from '@betrayal/shared';

// ==================== 測試輔助函數 ====================

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

// ==================== Issue #319 測試 ====================

console.log('\n🔍 Issue #319 - Library Rotation Bug\n');

// 創建遊戲狀態
const state = createMockGameState();

// 放置 Game Room 在 (7, 7)，有東門
state.map.ground[7][7] = {
  x: 7,
  y: 7,
  floor: 'ground',
  room: createMockRoom('game_room', ['east', 'west'], 'ground'),
  discovered: true,
  rotation: 0,
  placementOrder: 0,
};

// ========== Case 5: Library (書房) - CRITICAL ==========
console.log('========== Case 5: Library (書房) - CRITICAL ==========');

const library: Room = {
  id: 'library',
  name: '書房',
  nameEn: 'Library',
  floor: 'ground',
  symbol: 'I',
  doors: ['west', 'south'] as Direction[],
  description: 'A quiet library',
  color: '#8B4513',
  icon: '📚',
  isOfficial: true,
};

const position = { x: 8, y: 7 };
const entryDirection: Direction = 'east';
const floor: Floor = 'ground';

console.log('Library original doors:', library.doors);
console.log('Entry direction:', entryDirection);
console.log('Required door: west');
console.log('Position:', position);

// 測試每個旋轉角度
for (const rotation of [0, 90, 180, 270] as const) {
  const rotatedDoors = RoomDiscoveryManager.rotateDoors(library.doors, rotation);
  const hasWest = rotatedDoors.includes('west');
  const wouldClose = wouldCloseBoardWithRotation(state, position, library, rotation, floor, entryDirection);
  console.log(`${rotation}°: doors=${rotatedDoors}, hasWest=${hasWest}, wouldClose=${wouldClose}`);
}

const result = findValidRotation(library, state, position, entryDirection, floor);
console.log('\nResult:', result);

if (result) {
  if (result.rotation === 0) {
    console.log('✅ PASS: Library correctly uses 0° rotation');
  } else {
    console.log('❌ FAIL: Library should use 0° rotation, but got', result.rotation);
  }
} else {
  console.log('❌ FAIL: No valid rotation found!');
}

// ========== Case 4: Tree House (樹屋) ==========
console.log('\n========== Case 4: Tree House (樹屋) ==========');

const treeHouse: Room = {
  id: 'tree_house',
  name: '樹屋',
  nameEn: 'Tree House',
  floor: 'ground',
  symbol: 'E',
  doors: ['east', 'south'] as Direction[],
  description: 'A tree house',
  color: '#228B22',
  icon: '🌳',
  isOfficial: true,
};

console.log('Tree House original doors:', treeHouse.doors);

for (const rotation of [0, 90, 180, 270] as const) {
  const rotatedDoors = RoomDiscoveryManager.rotateDoors(treeHouse.doors, rotation);
  const hasWest = rotatedDoors.includes('west');
  const wouldClose = wouldCloseBoardWithRotation(state, position, treeHouse, rotation, floor, entryDirection);
  console.log(`${rotation}°: doors=${rotatedDoors}, hasWest=${hasWest}, wouldClose=${wouldClose}`);
}

const result2 = findValidRotation(treeHouse, state, position, entryDirection, floor);
console.log('\nResult:', result2);

if (result2) {
  if ([90, 180].includes(result2.rotation)) {
    console.log('✅ PASS: Tree House correctly uses', result2.rotation, '° rotation');
  } else {
    console.log('❌ FAIL: Tree House should use 90° or 180° rotation, but got', result2.rotation);
  }
} else {
  console.log('❌ FAIL: No valid rotation found!');
}

// ========== Case 1: Dining Room ==========
console.log('\n========== Case 1: Dining Room ==========');

const diningRoom: Room = {
  id: 'dining_room',
  name: '餐廳',
  nameEn: 'Dining Room',
  floor: 'ground',
  symbol: null,
  doors: ['north', 'east'] as Direction[],
  description: 'A dining room',
  color: '#FFD700',
  icon: '🍽️',
  isOfficial: true,
};

console.log('Dining Room original doors:', diningRoom.doors);

for (const rotation of [0, 90, 180, 270] as const) {
  const rotatedDoors = RoomDiscoveryManager.rotateDoors(diningRoom.doors, rotation);
  const hasWest = rotatedDoors.includes('west');
  const wouldClose = wouldCloseBoardWithRotation(state, position, diningRoom, rotation, floor, entryDirection);
  console.log(`${rotation}°: doors=${rotatedDoors}, hasWest=${hasWest}, wouldClose=${wouldClose}`);
}

const result3 = findValidRotation(diningRoom, state, position, entryDirection, floor);
console.log('\nResult:', result3);

if (result3) {
  if ([180, 270].includes(result3.rotation)) {
    console.log('✅ PASS: Dining Room correctly uses', result3.rotation, '° rotation');
  } else {
    console.log('❌ FAIL: Dining Room should use 180° or 270° rotation, but got', result3.rotation);
  }
} else {
  console.log('❌ FAIL: No valid rotation found!');
}

// ========== Case 2: Graveyard ==========
console.log('\n========== Case 2: Graveyard ==========');

const graveyard: Room = {
  id: 'graveyard',
  name: '墓地',
  nameEn: 'Graveyard',
  floor: 'ground',
  symbol: 'O',
  doors: ['south'] as Direction[],
  description: 'A graveyard',
  color: '#696969',
  icon: '⚰️',
  isOfficial: true,
};

console.log('Graveyard original doors:', graveyard.doors);

for (const rotation of [0, 90, 180, 270] as const) {
  const rotatedDoors = RoomDiscoveryManager.rotateDoors(graveyard.doors, rotation);
  const hasWest = rotatedDoors.includes('west');
  const wouldClose = wouldCloseBoardWithRotation(state, position, graveyard, rotation, floor, entryDirection);
  console.log(`${rotation}°: doors=${rotatedDoors}, hasWest=${hasWest}, wouldClose=${wouldClose}`);
}

const result4 = findValidRotation(graveyard, state, position, entryDirection, floor);
console.log('\nResult:', result4);

if (result4) {
  if (result4.rotation === 90) {
    console.log('✅ PASS: Graveyard correctly uses 90° rotation');
  } else {
    console.log('❌ FAIL: Graveyard should use 90° rotation, but got', result4.rotation);
  }
} else {
  console.log('❌ FAIL: No valid rotation found!');
}

// ========== Case 3: Conservatory ==========
console.log('\n========== Case 3: Conservatory ==========');

const conservatory: Room = {
  id: 'conservatory',
  name: '溫室',
  nameEn: 'Conservatory',
  floor: 'ground',
  symbol: 'O',
  doors: ['north'] as Direction[],
  description: 'A conservatory',
  color: '#90EE90',
  icon: '🌿',
  isOfficial: true,
};

console.log('Conservatory original doors:', conservatory.doors);

for (const rotation of [0, 90, 180, 270] as const) {
  const rotatedDoors = RoomDiscoveryManager.rotateDoors(conservatory.doors, rotation);
  const hasWest = rotatedDoors.includes('west');
  const wouldClose = wouldCloseBoardWithRotation(state, position, conservatory, rotation, floor, entryDirection);
  console.log(`${rotation}°: doors=${rotatedDoors}, hasWest=${hasWest}, wouldClose=${wouldClose}`);
}

const result5 = findValidRotation(conservatory, state, position, entryDirection, floor);
console.log('\nResult:', result5);

if (result5) {
  if (result5.rotation === 270) {
    console.log('✅ PASS: Conservatory correctly uses 270° rotation');
  } else {
    console.log('❌ FAIL: Conservatory should use 270° rotation, but got', result5.rotation);
  }
} else {
  console.log('❌ FAIL: No valid rotation found!');
}

console.log('\n========================================');
console.log('Issue #319 Debug Complete');
console.log('========================================\n');
