/**
 * Room Discovery System Tests - 房間發現系統測試
 * 
 * Rulebook References:
 * - Page 12: Room Discovery
 * - Page 12: "When you move through an open door without a room, discover a new room"
 * - Page 12: "Draw a room tile from the corresponding floor deck"
 * - Page 12: "Rotate the room to match door positions"
 * - Page 12: "After you discover a new room, your turn ends"
 * 
 * Test Coverage:
 * - Room discovery on different floors
 * - Room rotation matching doors
 * - Turn ends after discovery
 * - Card draw based on room symbol (E/I/O)
 * - Integration with Movement system
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
  Floor,
} from '../types';
import { Room, SymbolType, GROUND_ROOMS, UPPER_ROOMS, BASEMENT_ROOMS } from '@betrayal/shared';
import {
  RoomDiscoveryManager,
  VALID_ROTATIONS,
  rotateRoomForConnection,
  rotateDoors,
} from './roomDiscovery';

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
  roof: [
    createMockRoom('roof-1', ['north', 'south'], 'roof', 'E'),
    createMockRoom('roof-2', ['north', 'east'], 'roof', null),
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

// ==================== 測試套件 ====================

describe('RoomDiscoveryManager', () => {
  describe('discoverRoom', () => {
    it('應該成功發現新房間', () => {
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
          roof: [],
          drawn: new Set(),
        },
      });

      const result = RoomDiscoveryManager.discoverRoom(state, 'player-1', 'north');
      
      expect(result.success).toBe(true);
      expect(result.room).toBeDefined();
      expect(result.position).toEqual({ x: 7, y: 6, floor: 'ground' });
    });

    it('當不是當前玩家時應該失敗', () => {
      const state = createMockGameState({
        players: [createMockPlayer('player-1'), createMockPlayer('player-2')],
        playerOrder: ['player-1', 'player-2'],
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
      });

      const result = RoomDiscoveryManager.discoverRoom(state, 'player-2', 'north');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Not your turn');
    });

    it('當回合已結束時應該失敗', () => {
      const state = createMockGameState({
        players: [createMockPlayer('player-1')],
        playerOrder: ['player-1'],
        turn: {
          currentPlayerId: 'player-1',
          turnNumber: 1,
          movesRemaining: 4,
          hasDiscoveredRoom: false,
          hasDrawnCard: false,
          hasEnded: true,
          usedSpecialActions: [],
          usedItems: [],
        },
      });

      const result = RoomDiscoveryManager.discoverRoom(state, 'player-1', 'north');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Turn has already ended');
    });

    it('當本回合已發現過房間時應該失敗', () => {
      const state = createMockGameState({
        players: [createMockPlayer('player-1')],
        playerOrder: ['player-1'],
        turn: {
          currentPlayerId: 'player-1',
          turnNumber: 1,
          movesRemaining: 4,
          hasDiscoveredRoom: true,
          hasDrawnCard: false,
          hasEnded: false,
          usedSpecialActions: [],
          usedItems: [],
        },
      });

      const result = RoomDiscoveryManager.discoverRoom(state, 'player-1', 'north');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Already discovered a room this turn');
    });

    it('當沒有足夠移動點數時應該失敗', () => {
      const state = createMockGameState({
        players: [createMockPlayer('player-1')],
        playerOrder: ['player-1'],
        turn: {
          currentPlayerId: 'player-1',
          turnNumber: 1,
          movesRemaining: 0,
          hasDiscoveredRoom: false,
          hasDrawnCard: false,
          hasEnded: false,
          usedSpecialActions: [],
          usedItems: [],
        },
      });

      const result = RoomDiscoveryManager.discoverRoom(state, 'player-1', 'north');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Not enough movement points');
    });

    it('當方向沒有門時應該失敗', () => {
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
      });

      const result = RoomDiscoveryManager.discoverRoom(state, 'player-1', 'east');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('No door in that direction');
    });
  });

  describe('drawRoomFromDeck', () => {
    it('應該從對應樓層牌堆抽取房間', () => {
      const state = createMockGameState();

      const room = RoomDiscoveryManager.drawRoomFromDeck(state, 'ground');
      
      expect(room).toBeDefined();
      expect(room?.floor).toBe('ground');
    });

    it('當牌堆為空時應該返回 null', () => {
      const state = createMockGameState({
        roomDeck: {
          ground: [],
          upper: [],
          basement: [],
          drawn: new Set(),
        },
      });

      const room = RoomDiscoveryManager.drawRoomFromDeck(state, 'ground');
      
      expect(room).toBeNull();
    });
  });

  describe('calculateRotation', () => {
    it('應該計算正確的旋轉角度', () => {
      // 房間只有北門，從北方進入時需要南門
      // 旋轉 180° 後北門變成南門
      const room = createMockRoom('test', ['north'], 'ground');
      
      const rotation = RoomDiscoveryManager.calculateRotation(room, 'north');
      
      // 從北方進入，需要南門連接
      // 房間只有北門，旋轉 180° 後北門變成南門
      expect(rotation).toBe(180);
    });

    it('當房間已經有正確方向的門時應該返回 0', () => {
      const room = createMockRoom('test', ['south'], 'ground');
      
      const rotation = RoomDiscoveryManager.calculateRotation(room, 'north');
      
      // 從北方進入，需要南門連接
      // 房間已經有南門，不需要旋轉
      expect(rotation).toBe(0);
    });
  });

  describe('rotateDoors', () => {
    it('應該正確旋轉門方向', () => {
      const doors: Direction[] = ['north', 'south'];
      
      const rotated90 = RoomDiscoveryManager.rotateDoors(doors, 90);
      expect(rotated90).toEqual(['east', 'west']);
      
      const rotated180 = RoomDiscoveryManager.rotateDoors(doors, 180);
      expect(rotated180).toEqual(['south', 'north']);
      
      const rotated270 = RoomDiscoveryManager.rotateDoors(doors, 270);
      expect(rotated270).toEqual(['west', 'east']);
    });

    it('旋轉 0° 應該返回原始方向', () => {
      const doors: Direction[] = ['north', 'south', 'east'];
      
      const rotated = RoomDiscoveryManager.rotateDoors(doors, 0);
      expect(rotated).toEqual(['north', 'south', 'east']);
    });
  });

  describe('getCardDrawRequirement', () => {
    it('應該返回正確的卡牌類型', () => {
      const eventRoom = createMockRoom('event-room', ['north'], 'ground', 'E');
      const itemRoom = createMockRoom('item-room', ['north'], 'ground', 'I');
      const omenRoom = createMockRoom('omen-room', ['north'], 'ground', 'O');
      const normalRoom = createMockRoom('normal-room', ['north'], 'ground', null);

      expect(RoomDiscoveryManager.getCardDrawRequirement(eventRoom)?.type).toBe('event');
      expect(RoomDiscoveryManager.getCardDrawRequirement(itemRoom)?.type).toBe('item');
      expect(RoomDiscoveryManager.getCardDrawRequirement(omenRoom)?.type).toBe('omen');
      expect(RoomDiscoveryManager.getCardDrawRequirement(normalRoom)).toBeNull();
    });

    it('預兆卡應該需要作祟檢定', () => {
      const omenRoom = createMockRoom('omen-room', ['north'], 'ground', 'O');

      const requirement = RoomDiscoveryManager.getCardDrawRequirement(omenRoom);
      
      expect(requirement?.requiresHauntCheck).toBe(true);
    });
  });

  describe('getDiscoverableDirections', () => {
    it('應該返回可發現的方向', () => {
      const entranceRoom = createMockRoom('entrance', ['north', 'south'], 'ground');
      
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
      });

      const directions = RoomDiscoveryManager.getDiscoverableDirections(state, 'player-1');
      
      expect(directions).toContain('north');
      expect(directions).toContain('south');
    });

    it('當已經發現過房間時應該返回空陣列', () => {
      const state = createMockGameState({
        players: [createMockPlayer('player-1')],
        playerOrder: ['player-1'],
        turn: {
          currentPlayerId: 'player-1',
          turnNumber: 1,
          movesRemaining: 4,
          hasDiscoveredRoom: true,
          hasDrawnCard: false,
          hasEnded: false,
          usedSpecialActions: [],
          usedItems: [],
        },
      });

      const directions = RoomDiscoveryManager.getDiscoverableDirections(state, 'player-1');
      
      expect(directions).toHaveLength(0);
    });
  });
});

// ==================== 獨立函數測試 ====================

describe('rotateRoomForConnection', () => {
  it('應該旋轉房間以匹配門連接', () => {
    // 房間只有北門，從北方進入時需要南門
    const room = createMockRoom('test', ['north'], 'ground');
    
    const result = rotateRoomForConnection(room, 'north');
    
    // 旋轉 180° 後北門變成南門
    expect(result.rotation).toBe(180);
    expect(result.room.doors).toContain('south');
  });
});

describe('rotateDoors', () => {
  it('應該正確旋轉門方向', () => {
    const doors: Direction[] = ['north', 'east'];
    
    const result = rotateDoors(doors, 90);
    
    expect(result).toEqual(['east', 'south']);
  });

  it('應該處理無效的旋轉角度', () => {
    const doors: Direction[] = ['north'];
    
    expect(() => rotateDoors(doors, 45)).toThrow('Invalid rotation');
  });
});
