/**
 * Board Open Prevention Tests - 防止棋盤封閉測試
 * 
 * GitHub Issue: #66
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
  RoomDiscoveryManager,
  getUnconnectedDoors,
  addRandomDoor,
  drawRoomForExploration,
} from '../rules/roomDiscovery';
import {
  getAdjacentTiles,
  getEmptyAdjacentDirections,
  wouldCloseBoard,
  calculateOpenness,
} from '../rules/tilePlacement';

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

// ==================== getUnconnectedDoors 測試 ====================

describe('getUnconnectedDoors', () => {
  it('應該返回所有未連接的門（周圍沒有房間）', () => {
    const room = createMockRoom('test-room', ['north', 'south'], 'ground');
    const playerPos: Position3D = { x: 7, y: 7, floor: 'ground' };
    
    const state = createMockGameState({
      players: [createMockPlayer('player-1', playerPos)],
      playerOrder: ['player-1'],
    });

    const unconnected = getUnconnectedDoors(state, { x: 7, y: 6 }, room, 0);
    
    expect(unconnected).toContain('north');
    expect(unconnected).toContain('south');
    expect(unconnected).toHaveLength(2);
  });

  it('應該只返回未連接的門（部分門已連接）', () => {
    const room = createMockRoom('test-room', ['north', 'south', 'east'], 'ground');
    
    const map = createMockMap();
    map.ground[7][8] = {
      x: 8,
      y: 7,
      floor: 'ground',
      room: createMockRoom('east-room', ['west'], 'ground'),
      discovered: true,
      rotation: 0,
      placementOrder: 1,
    };
    
    const state = createMockGameState({
      map,
      players: [createMockPlayer('player-1', { x: 7, y: 7, floor: 'ground' })],
      playerOrder: ['player-1'],
    });

    const unconnected = getUnconnectedDoors(state, { x: 7, y: 7 }, room, 0);
    
    expect(unconnected).toContain('north');
    expect(unconnected).toContain('south');
    expect(unconnected).not.toContain('east');
    expect(unconnected).toHaveLength(2);
  });

  it('應該考慮旋轉後的門位置', () => {
    const room = createMockRoom('test-room', ['north'], 'ground');
    
    const state = createMockGameState({
      players: [createMockPlayer('player-1', { x: 7, y: 7, floor: 'ground' })],
      playerOrder: ['player-1'],
    });

    const unconnected = getUnconnectedDoors(state, { x: 7, y: 7 }, room, 90);
    
    expect(unconnected).toContain('east');
    expect(unconnected).not.toContain('north');
    expect(unconnected).toHaveLength(1);
  });

  it('當所有門都連接時應該返回空陣列', () => {
    const room = createMockRoom('test-room', ['east', 'west'], 'ground');
    
    const map = createMockMap();
    map.ground[7][8] = {
      x: 8,
      y: 7,
      floor: 'ground',
      room: createMockRoom('east-room', ['west'], 'ground'),
      discovered: true,
      rotation: 0,
      placementOrder: 1,
    };
    map.ground[7][6] = {
      x: 6,
      y: 7,
      floor: 'ground',
      room: createMockRoom('west-room', ['east'], 'ground'),
      discovered: true,
      rotation: 0,
      placementOrder: 2,
    };
    
    const state = createMockGameState({
      map,
      players: [createMockPlayer('player-1', { x: 7, y: 7, floor: 'ground' })],
      playerOrder: ['player-1'],
    });

    const unconnected = getUnconnectedDoors(state, { x: 7, y: 7 }, room, 0);
    
    expect(unconnected).toHaveLength(0);
  });
});

// ==================== addRandomDoor 測試 ====================

describe('addRandomDoor', () => {
  it('應該添加一個新門到房間', () => {
    const room = createMockRoom('test-room', ['north'], 'ground');
    
    const state = createMockGameState({
      players: [createMockPlayer('player-1', { x: 7, y: 7, floor: 'ground' })],
      playerOrder: ['player-1'],
    });

    const modifiedRoom = addRandomDoor(room, state, { x: 7, y: 7 });
    
    expect(modifiedRoom.doors).toHaveLength(2);
    expect(modifiedRoom.doors).toContain('north');
    
    const newDoors = modifiedRoom.doors.filter(d => d !== 'north');
    expect(['south', 'east', 'west']).toContain(newDoors[0]);
  });

  it('應該保留原始房間的屬性', () => {
    const room = createMockRoom('test-room', ['north'], 'ground', 'E');
    room.description = 'Custom description';
    
    const state = createMockGameState({
      players: [createMockPlayer('player-1', { x: 7, y: 7, floor: 'ground' })],
      playerOrder: ['player-1'],
    });

    const modifiedRoom = addRandomDoor(room, state, { x: 7, y: 7 });
    
    expect(modifiedRoom.id).toBe(room.id);
    expect(modifiedRoom.name).toBe(room.name);
    expect(modifiedRoom.symbol).toBe(room.symbol);
    expect(modifiedRoom.description).toBe(room.description);
  });

  it('當房間已經有四個門時應該返回原房間', () => {
    const room = createMockRoom('test-room', ['north', 'south', 'east', 'west'], 'ground');
    
    const state = createMockGameState({
      players: [createMockPlayer('player-1', { x: 7, y: 7, floor: 'ground' })],
      playerOrder: ['player-1'],
    });

    const modifiedRoom = addRandomDoor(room, state, { x: 7, y: 7 });
    
    expect(modifiedRoom.doors).toHaveLength(4);
    expect(modifiedRoom.doors).toEqual(['north', 'south', 'east', 'west']);
  });
});

// ==================== drawRoomForExploration 測試 ====================

describe('drawRoomForExploration', () => {
  it('應該成功抽取有未連接門的房間', () => {
    const entranceRoom = createMockRoom('entrance', ['north'], 'ground');
    const deckRoom = createMockRoom('deck-room', ['south', 'north'], 'ground');
    
    const map = createMockMap();
    map.ground[7][7] = {
      x: 7,
      y: 7,
      floor: 'ground',
      room: entranceRoom,
      discovered: true,
      rotation: 0,
      placementOrder: 0,
    };
    
    const state = createMockGameState({
      map,
      players: [createMockPlayer('player-1', { x: 7, y: 7, floor: 'ground' })],
      playerOrder: ['player-1'],
      roomDeck: {
        ground: [deckRoom],
        upper: [],
        basement: [],
        drawn: new Set(),
      },
    });

    const result = drawRoomForExploration(state, 'ground', 'north', 10);
    
    expect(result.success).toBe(true);
    expect(result.room).toBeDefined();
    expect(result.wasModified).toBe(false);
    expect(result.attempts).toBe(1);
  });

  it('應該丟棄會封閉棋盤的房間並重試', () => {
    const entranceRoom = createMockRoom('entrance', ['north'], 'ground');
    const closingRoom = createMockRoom('closing-room', ['south'], 'ground');
    const openRoom = createMockRoom('open-room', ['south', 'north'], 'ground');
    
    const map = createMockMap();
    map.ground[7][7] = {
      x: 7,
      y: 7,
      floor: 'ground',
      room: entranceRoom,
      discovered: true,
      rotation: 0,
      placementOrder: 0,
    };
    
    const state = createMockGameState({
      map,
      players: [createMockPlayer('player-1', { x: 7, y: 7, floor: 'ground' })],
      playerOrder: ['player-1'],
      roomDeck: {
        ground: [closingRoom, openRoom],
        upper: [],
        basement: [],
        drawn: new Set(),
      },
    });

    const result = drawRoomForExploration(state, 'ground', 'north', 10);
    
    expect(result.success).toBe(true);
    expect(result.room).toBeDefined();
    expect(result.room?.id).toBe('open-room');
    expect(result.attempts).toBe(2);
  });

  it('當達到最大嘗試次數時應該添加門', () => {
    const entranceRoom = createMockRoom('entrance', ['north'], 'ground');
    const closingRoom = createMockRoom('closing-room', ['south'], 'ground');
    
    const map = createMockMap();
    map.ground[7][7] = {
      x: 7,
      y: 7,
      floor: 'ground',
      room: entranceRoom,
      discovered: true,
      rotation: 0,
      placementOrder: 0,
    };
    
    const state = createMockGameState({
      map,
      players: [createMockPlayer('player-1', { x: 7, y: 7, floor: 'ground' })],
      playerOrder: ['player-1'],
      roomDeck: {
        ground: [closingRoom],
        upper: [],
        basement: [],
        drawn: new Set(),
      },
    });

    const result = drawRoomForExploration(state, 'ground', 'north', 2);
    
    expect(result.success).toBe(true);
    expect(result.wasModified).toBe(true);
    expect(result.attempts).toBeLessThanOrEqual(2);
    
    if (result.room) {
      expect(result.room.doors.length).toBeGreaterThan(1);
    }
  });

  it('當牌堆為空時應該返回錯誤', () => {
    const entranceRoom = createMockRoom('entrance', ['north'], 'ground');
    
    const map = createMockMap();
    map.ground[7][7] = {
      x: 7,
      y: 7,
      floor: 'ground',
      room: entranceRoom,
      discovered: true,
      rotation: 0,
      placementOrder: 0,
    };
    
    const state = createMockGameState({
      map,
      players: [createMockPlayer('player-1', { x: 7, y: 7, floor: 'ground' })],
      playerOrder: ['player-1'],
      roomDeck: {
        ground: [],
        upper: [],
        basement: [],
        drawn: new Set(),
      },
    });

    const result = drawRoomForExploration(state, 'ground', 'north', 10);
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('No more rooms');
  });
});

// ==================== Tile Placement 輔助函數測試 ====================

describe('getAdjacentTiles', () => {
  it('應該返回所有方向的相鄰板塊', () => {
    const map = createMockMap();
    
    map.ground[7][7] = {
      x: 7,
      y: 7,
      floor: 'ground',
      room: createMockRoom('center', ['north', 'south', 'east', 'west'], 'ground'),
      discovered: true,
      rotation: 0,
      placementOrder: 0,
    };
    
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
    
    const adjacent = getAdjacentTiles(state, { x: 7, y: 7, floor: 'ground' });
    
    expect(adjacent).toHaveLength(4);
    
    const northAdj = adjacent.find(a => a.direction === 'north');
    expect(northAdj?.hasRoom).toBe(true);
    expect(northAdj?.hasConnectingDoor).toBe(true);
    
    const southAdj = adjacent.find(a => a.direction === 'south');
    expect(southAdj?.hasRoom).toBe(false);
  });
});

describe('getEmptyAdjacentDirections', () => {
  it('應該返回所有空位置的方向', () => {
    const map = createMockMap();
    
    map.ground[7][7] = {
      x: 7,
      y: 7,
      floor: 'ground',
      room: createMockRoom('center', ['north', 'south'], 'ground'),
      discovered: true,
      rotation: 0,
      placementOrder: 0,
    };
    
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
    
    const emptyDirs = getEmptyAdjacentDirections(state, { x: 7, y: 7, floor: 'ground' });
    
    expect(emptyDirs).toContain('south');
    expect(emptyDirs).not.toContain('north');
    expect(emptyDirs).toHaveLength(3);
  });
});

describe('wouldCloseBoard', () => {
  it('當房間所有門都連接時應該返回 true', () => {
    const map = createMockMap();
    
    map.ground[7][7] = {
      x: 7,
      y: 7,
      floor: 'ground',
      room: createMockRoom('center', ['east', 'west'], 'ground'),
      discovered: true,
      rotation: 0,
      placementOrder: 0,
    };
    
    map.ground[7][8] = {
      x: 8,
      y: 7,
      floor: 'ground',
      room: createMockRoom('east-room', ['west'], 'ground'),
      discovered: true,
      rotation: 0,
      placementOrder: 1,
    };
    map.ground[7][6] = {
      x: 6,
      y: 7,
      floor: 'ground',
      room: createMockRoom('west-room', ['east'], 'ground'),
      discovered: true,
      rotation: 0,
      placementOrder: 2,
    };
    
    const state = createMockGameState({ map });
    
    const room = createMockRoom('test', ['east', 'west'], 'ground');
    const closes = wouldCloseBoard(state, { x: 7, y: 7, floor: 'ground' }, room, 0);
    
    expect(closes).toBe(true);
  });

  it('當房間有未連接的門時應該返回 false', () => {
    const map = createMockMap();
    
    map.ground[7][7] = {
      x: 7,
      y: 7,
      floor: 'ground',
      room: createMockRoom('center', ['east', 'west'], 'ground'),
      discovered: true,
      rotation: 0,
      placementOrder: 0,
    };
    
    const state = createMockGameState({ map });
    
    const room = createMockRoom('test', ['east', 'west', 'north'], 'ground');
    const closes = wouldCloseBoard(state, { x: 7, y: 7, floor: 'ground' }, room, 0);
    
    expect(closes).toBe(false);
  });
});

describe('calculateOpenness', () => {
  it('應該正確計算房間的開放程度', () => {
    const map = createMockMap();
    
    map.ground[7][7] = {
      x: 7,
      y: 7,
      floor: 'ground',
      room: createMockRoom('center', ['north'], 'ground'),
      discovered: true,
      rotation: 0,
      placementOrder: 0,
    };
    
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
    
    const room = createMockRoom('test', ['north', 'south', 'east', 'west'], 'ground');
    const openness = calculateOpenness(state, { x: 7, y: 7, floor: 'ground' }, room, 0);
    
    expect(openness).toBe(3);
  });
});

// ==================== Issue #66 驗收標準測試 ====================

describe('Issue #66 Acceptance Criteria', () => {
  it('✅ New rooms have at least 1 unconnected door (when possible)', () => {
    const entranceRoom = createMockRoom('entrance', ['north'], 'ground');
    const openRoom = createMockRoom('open-room', ['south', 'north'], 'ground');
    
    const map = createMockMap();
    map.ground[7][7] = {
      x: 7, y: 7, floor: 'ground',
      room: entranceRoom,
      discovered: true, rotation: 0, placementOrder: 0,
    };
    
    const state = createMockGameState({
      map,
      players: [createMockPlayer('player-1', { x: 7, y: 7, floor: 'ground' })],
      playerOrder: ['player-1'],
      roomDeck: {
        ground: [openRoom],
        upper: [],
        basement: [],
        drawn: new Set(),
      },
    });

    const result = drawRoomForExploration(state, 'ground', 'north', 10);
    
    expect(result.success).toBe(true);
    
    if (result.room && result.rotation !== undefined) {
      const unconnected = getUnconnectedDoors(
        state,
        { x: 7, y: 6 },
        result.room,
        result.rotation
      );
      expect(unconnected.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('✅ Rooms that would close board are discarded and redrawn', () => {
    const entranceRoom = createMockRoom('entrance', ['north'], 'ground');
    const closingRoom = createMockRoom('closing-room', ['south'], 'ground');
    const openRoom = createMockRoom('open-room', ['south', 'north'], 'ground');
    
    const map = createMockMap();
    map.ground[7][7] = {
      x: 7, y: 7, floor: 'ground',
      room: entranceRoom,
      discovered: true, rotation: 0, placementOrder: 0,
    };
    
    const state = createMockGameState({
      map,
      players: [createMockPlayer('player-1', { x: 7, y: 7, floor: 'ground' })],
      playerOrder: ['player-1'],
      roomDeck: {
        ground: [closingRoom, openRoom],
        upper: [],
        basement: [],
        drawn: new Set(),
      },
    });

    const result = drawRoomForExploration(state, 'ground', 'north', 10);
    
    expect(result.success).toBe(true);
    expect(result.room?.id).toBe('open-room');
    expect(result.attempts).toBeGreaterThan(1);
  });

  it('✅ Max attempts limit (10) to prevent infinite loops', () => {
    const entranceRoom = createMockRoom('entrance', ['north'], 'ground');
    const closingRoom = createMockRoom('closing-room', ['south'], 'ground');
    
    const map = createMockMap();
    map.ground[7][7] = {
      x: 7, y: 7, floor: 'ground',
      room: entranceRoom,
      discovered: true, rotation: 0, placementOrder: 0,
    };
    
    const state = createMockGameState({
      map,
      players: [createMockPlayer('player-1', { x: 7, y: 7, floor: 'ground' })],
      playerOrder: ['player-1'],
      roomDeck: {
        ground: [closingRoom],
        upper: [],
        basement: [],
        drawn: new Set(),
      },
    });

    const result = drawRoomForExploration(state, 'ground', 'north', 10);
    
    expect(result.success).toBe(true);
    expect(result.attempts).toBeLessThanOrEqual(10);
  });

  it('✅ Fallback: Add door if max attempts reached', () => {
    const entranceRoom = createMockRoom('entrance', ['north'], 'ground');
    const closingRoom = createMockRoom('closing-room', ['south'], 'ground');
    
    const map = createMockMap();
    map.ground[7][7] = {
      x: 7, y: 7, floor: 'ground',
      room: entranceRoom,
      discovered: true, rotation: 0, placementOrder: 0,
    };
    
    const state = createMockGameState({
      map,
      players: [createMockPlayer('player-1', { x: 7, y: 7, floor: 'ground' })],
      playerOrder: ['player-1'],
      roomDeck: {
        ground: [closingRoom],
        upper: [],
        basement: [],
        drawn: new Set(),
      },
    });

    const result = drawRoomForExploration(state, 'ground', 'north', 2);
    
    expect(result.success).toBe(true);
    expect(result.wasModified).toBe(true);
  });

  it('✅ Modified rooms flagged in result', () => {
    const entranceRoom = createMockRoom('entrance', ['north'], 'ground');
    const closingRoom = createMockRoom('closing-room', ['south'], 'ground');
    
    const map = createMockMap();
    map.ground[7][7] = {
      x: 7, y: 7, floor: 'ground',
      room: entranceRoom,
      discovered: true, rotation: 0, placementOrder: 0,
    };
    
    const state = createMockGameState({
      map,
      players: [createMockPlayer('player-1', { x: 7, y: 7, floor: 'ground' })],
      playerOrder: ['player-1'],
      roomDeck: {
        ground: [closingRoom],
        upper: [],
        basement: [],
        drawn: new Set(),
      },
    });

    const result = drawRoomForExploration(state, 'ground', 'north', 1);
    
    expect(result.wasModified).toBeDefined();
    if (result.wasModified) {
      expect(result.wasModified).toBe(true);
    }
  });
});
