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
    createMockRoom('ground-3', ['north'], 'ground', 'O'),
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
  placedRoomIds: new Set(['entrance_hall', 'stairs_from_upper', 'stairs_from_basement']),
  ...overrides,
});

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
    it('should successfully discover a room on ground floor', () => {
      // Arrange
      const currentRoom = createMockRoom('current-room', ['north'], 'ground');
      const state = createMockGameState({
        map: {
          ...createMockMap(),
          ground: createMockMap().ground.map((row, y) =>
            row.map((tile, x) =>
              x === 7 && y === 7
                ? { ...tile, room: currentRoom, discovered: true }
                : tile
            )
          ),
        },
        players: [createMockPlayer('player-1', { x: 7, y: 7, floor: 'ground' })],
        playerOrder: ['player-1'],
      });

      // Act
      const result = RoomDiscoveryManager.discoverRoom(state, 'player-1', 'north');

      // Assert
      expect(result.success).toBe(true);
      expect(result.room).toBeDefined();
      expect(result.position).toEqual({ x: 7, y: 6, floor: 'ground' });
      expect(result.rotation).toBeDefined();
    });

    it('should successfully discover a room on upper floor', () => {
      // Arrange
      const currentRoom = createMockRoom('current-room', ['south'], 'upper');
      const state = createMockGameState({
        map: {
          ...createMockMap(),
          upper: createMockMap().upper.map((row, y) =>
            row.map((tile, x) =>
              x === 7 && y === 7
                ? { ...tile, room: currentRoom, discovered: true }
                : tile
            )
          ),
        },
        players: [createMockPlayer('player-1', { x: 7, y: 7, floor: 'upper' })],
        playerOrder: ['player-1'],
      });

      // Act
      const result = RoomDiscoveryManager.discoverRoom(state, 'player-1', 'south');

      // Assert
      expect(result.success).toBe(true);
      expect(result.room).toBeDefined();
      expect(result.room?.floor).toBe('upper');
      expect(result.position).toEqual({ x: 7, y: 8, floor: 'upper' });
    });

    it('should successfully discover a room on basement floor', () => {
      // Arrange
      const currentRoom = createMockRoom('current-room', ['east'], 'basement');
      const state = createMockGameState({
        map: {
          ...createMockMap(),
          basement: createMockMap().basement.map((row, y) =>
            row.map((tile, x) =>
              x === 7 && y === 7
                ? { ...tile, room: currentRoom, discovered: true }
                : tile
            )
          ),
        },
        players: [createMockPlayer('player-1', { x: 7, y: 7, floor: 'basement' })],
        playerOrder: ['player-1'],
      });

      // Act
      const result = RoomDiscoveryManager.discoverRoom(state, 'player-1', 'east');

      // Assert
      expect(result.success).toBe(true);
      expect(result.room).toBeDefined();
      expect(result.room?.floor).toBe('basement');
      expect(result.position).toEqual({ x: 8, y: 7, floor: 'basement' });
    });

    it('should fail when it is not the player\'s turn', () => {
      // Arrange
      const state = createMockGameState({
        turn: {
          ...createMockGameState().turn,
          currentPlayerId: 'player-2',
        },
        players: [
          createMockPlayer('player-1'),
          createMockPlayer('player-2'),
        ],
        playerOrder: ['player-1', 'player-2'],
      });

      // Act
      const result = RoomDiscoveryManager.discoverRoom(state, 'player-1', 'north');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Not your turn');
    });

    it('should fail when turn has already ended', () => {
      // Arrange
      const currentRoom = createMockRoom('current-room', ['north'], 'ground');
      const state = createMockGameState({
        map: {
          ...createMockMap(),
          ground: createMockMap().ground.map((row, y) =>
            row.map((tile, x) =>
              x === 7 && y === 7
                ? { ...tile, room: currentRoom, discovered: true }
                : tile
            )
          ),
        },
        players: [createMockPlayer('player-1')],
        playerOrder: ['player-1'],
        turn: {
          ...createMockGameState().turn,
          hasEnded: true,
        },
      });

      // Act
      const result = RoomDiscoveryManager.discoverRoom(state, 'player-1', 'north');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Turn has already ended');
    });

    it('should fail when player has already discovered a room this turn', () => {
      // Arrange
      const currentRoom = createMockRoom('current-room', ['north'], 'ground');
      const state = createMockGameState({
        map: {
          ...createMockMap(),
          ground: createMockMap().ground.map((row, y) =>
            row.map((tile, x) =>
              x === 7 && y === 7
                ? { ...tile, room: currentRoom, discovered: true }
                : tile
            )
          ),
        },
        players: [createMockPlayer('player-1')],
        playerOrder: ['player-1'],
        turn: {
          ...createMockGameState().turn,
          hasDiscoveredRoom: true,
        },
      });

      // Act
      const result = RoomDiscoveryManager.discoverRoom(state, 'player-1', 'north');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Already discovered a room this turn');
    });

    it('should fail when there is no door in the specified direction', () => {
      // Arrange
      const currentRoom = createMockRoom('current-room', ['south'], 'ground'); // Only south door
      const state = createMockGameState({
        map: {
          ...createMockMap(),
          ground: createMockMap().ground.map((row, y) =>
            row.map((tile, x) =>
              x === 7 && y === 7
                ? { ...tile, room: currentRoom, discovered: true }
                : tile
            )
          ),
        },
        players: [createMockPlayer('player-1')],
        playerOrder: ['player-1'],
      });

      // Act
      const result = RoomDiscoveryManager.discoverRoom(state, 'player-1', 'north');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('No door in that direction');
    });

    it('should fail when position is already occupied', () => {
      // Arrange
      const currentRoom = createMockRoom('current-room', ['north'], 'ground');
      const existingRoom = createMockRoom('existing-room', ['south'], 'ground');
      const state = createMockGameState({
        map: {
          ...createMockMap(),
          ground: createMockMap().ground.map((row, y) =>
            row.map((tile, x) => {
              if (x === 7 && y === 7) {
                return { ...tile, room: currentRoom, discovered: true };
              }
              if (x === 7 && y === 6) {
                return { ...tile, room: existingRoom, discovered: true };
              }
              return tile;
            })
          ),
        },
        players: [createMockPlayer('player-1')],
        playerOrder: ['player-1'],
      });

      // Act
      const result = RoomDiscoveryManager.discoverRoom(state, 'player-1', 'north');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Position already has a room');
    });

    it('should fail when no movement points remaining', () => {
      // Arrange
      const currentRoom = createMockRoom('current-room', ['north'], 'ground');
      const state = createMockGameState({
        map: {
          ...createMockMap(),
          ground: createMockMap().ground.map((row, y) =>
            row.map((tile, x) =>
              x === 7 && y === 7
                ? { ...tile, room: currentRoom, discovered: true }
                : tile
            )
          ),
        },
        players: [createMockPlayer('player-1')],
        playerOrder: ['player-1'],
        turn: {
          ...createMockGameState().turn,
          movesRemaining: 0,
        },
      });

      // Act
      const result = RoomDiscoveryManager.discoverRoom(state, 'player-1', 'north');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Not enough movement points');
    });
  });

  describe('calculateRotation', () => {
    it('should return 0 rotation when room already has door in required direction', () => {
      // Arrange
      const room = createMockRoom('test-room', ['north', 'south'], 'ground');
      
      // Act - entering from south, need north door
      const rotation = RoomDiscoveryManager.calculateRotation(room, 'south');
      
      // Assert
      expect(rotation).toBe(0);
    });

    it('should return 90 rotation when room needs to be rotated clockwise', () => {
      // Arrange
      // Room has a west door, entering from south (need north door)
      // West door rotated 90° becomes north
      const room = createMockRoom('test-room', ['west'], 'ground');
      
      // Act - entering from south, need north door
      const rotation = RoomDiscoveryManager.calculateRotation(room, 'south');
      
      // Assert - west door at 90° becomes north
      expect(rotation).toBe(90);
    });

    it('should return 180 rotation when room needs to be rotated 180 degrees', () => {
      // Arrange
      // Room has a south door, entering from north (need south door)
      // South door at 0° is already south, but we need to check the logic
      // Actually: entering from north means we need a south door
      // If room has north door, we need 180° to make it face south
      const room = createMockRoom('test-room', ['north'], 'ground');
      
      // Act - entering from north, need south door
      const rotation = RoomDiscoveryManager.calculateRotation(room, 'north');
      
      // Assert - north door at 180° becomes south
      expect(rotation).toBe(180);
    });

    it('should return 270 rotation when room needs to be rotated counter-clockwise', () => {
      // Arrange
      // Room has an east door, entering from south (need north door)
      // East door rotated 270° becomes north
      const room = createMockRoom('test-room', ['east'], 'ground');
      
      // Act - entering from south, need north door
      const rotation = RoomDiscoveryManager.calculateRotation(room, 'south');
      
      // Assert - east door at 270° becomes north
      expect(rotation).toBe(270);
    });
  });

  describe('rotateDoors', () => {
    it('should correctly rotate doors 0 degrees', () => {
      const doors: Direction[] = ['north', 'south'];
      const rotated = RoomDiscoveryManager.rotateDoors(doors, 0);
      expect(rotated).toEqual(['north', 'south']);
    });

    it('should correctly rotate doors 90 degrees clockwise', () => {
      const doors: Direction[] = ['north', 'south'];
      const rotated = RoomDiscoveryManager.rotateDoors(doors, 90);
      expect(rotated).toEqual(['east', 'west']);
    });

    it('should correctly rotate doors 180 degrees', () => {
      const doors: Direction[] = ['north', 'east'];
      const rotated = RoomDiscoveryManager.rotateDoors(doors, 180);
      expect(rotated).toEqual(['south', 'west']);
    });

    it('should correctly rotate doors 270 degrees clockwise', () => {
      const doors: Direction[] = ['north', 'west'];
      const rotated = RoomDiscoveryManager.rotateDoors(doors, 270);
      expect(rotated).toEqual(['west', 'south']);
    });
  });

  describe('getCardDrawRequirement', () => {
    it('should return event card requirement for E symbol', () => {
      const room = createMockRoom('test-room', ['north'], 'ground', 'E');
      const requirement = RoomDiscoveryManager.getCardDrawRequirement(room);
      
      expect(requirement).toEqual({
        type: 'event',
        requiresHauntCheck: false,
      });
    });

    it('should return item card requirement for I symbol', () => {
      const room = createMockRoom('test-room', ['north'], 'ground', 'I');
      const requirement = RoomDiscoveryManager.getCardDrawRequirement(room);
      
      expect(requirement).toEqual({
        type: 'item',
        requiresHauntCheck: false,
      });
    });

    it('should return omen card requirement with haunt check for O symbol', () => {
      const room = createMockRoom('test-room', ['north'], 'ground', 'O');
      const requirement = RoomDiscoveryManager.getCardDrawRequirement(room);
      
      expect(requirement).toEqual({
        type: 'omen',
        requiresHauntCheck: true,
      });
    });

    it('should return null for rooms with no symbol', () => {
      const room = createMockRoom('test-room', ['north'], 'ground', null);
      const requirement = RoomDiscoveryManager.getCardDrawRequirement(room);
      
      expect(requirement).toBeNull();
    });
  });

  describe('getDiscoverableDirections', () => {
    it('should return all directions with open doors to undiscovered spaces', () => {
      // Arrange
      const currentRoom = createMockRoom('current-room', ['north', 'south', 'east'], 'ground');
      const state = createMockGameState({
        map: {
          ...createMockMap(),
          ground: createMockMap().ground.map((row, y) =>
            row.map((tile, x) =>
              x === 7 && y === 7
                ? { ...tile, room: currentRoom, discovered: true }
                : tile
            )
          ),
        },
        players: [createMockPlayer('player-1')],
        playerOrder: ['player-1'],
      });

      // Act
      const directions = RoomDiscoveryManager.getDiscoverableDirections(state, 'player-1');

      // Assert
      expect(directions).toContain('north');
      expect(directions).toContain('south');
      expect(directions).toContain('east');
      expect(directions).not.toContain('west');
    });

    it('should return empty array when player has already discovered a room', () => {
      // Arrange
      const currentRoom = createMockRoom('current-room', ['north'], 'ground');
      const state = createMockGameState({
        map: {
          ...createMockMap(),
          ground: createMockMap().ground.map((row, y) =>
            row.map((tile, x) =>
              x === 7 && y === 7
                ? { ...tile, room: currentRoom, discovered: true }
                : tile
            )
          ),
        },
        players: [createMockPlayer('player-1')],
        playerOrder: ['player-1'],
        turn: {
          ...createMockGameState().turn,
          hasDiscoveredRoom: true,
        },
      });

      // Act
      const directions = RoomDiscoveryManager.getDiscoverableDirections(state, 'player-1');

      // Assert
      expect(directions).toEqual([]);
    });

    it('should not include directions where position is already occupied', () => {
      // Arrange
      const currentRoom = createMockRoom('current-room', ['north'], 'ground');
      const existingRoom = createMockRoom('existing-room', ['south'], 'ground');
      const state = createMockGameState({
        map: {
          ...createMockMap(),
          ground: createMockMap().ground.map((row, y) => {
            if (y === 7 && row[7]) {
              return row.map((tile, x) =>
                x === 7
                  ? { ...tile, room: currentRoom, discovered: true }
                  : tile
              );
            }
            if (y === 6 && row[7]) {
              return row.map((tile, x) =>
                x === 7
                  ? { ...tile, room: existingRoom, discovered: true }
                  : tile
              );
            }
            return row;
          }),
        },
        players: [createMockPlayer('player-1')],
        playerOrder: ['player-1'],
      });

      // Act
      const directions = RoomDiscoveryManager.getDiscoverableDirections(state, 'player-1');

      // Assert
      expect(directions).not.toContain('north');
    });
  });

  describe('getRoomDeckStats', () => {
    it('should return correct counts for each floor', () => {
      const state = createMockGameState();
      const stats = RoomDiscoveryManager.getRoomDeckStats(state);
      
      expect(stats.ground).toBe(3);
      expect(stats.upper).toBe(2);
      expect(stats.basement).toBe(2);
      expect(stats.total).toBe(7);
    });

    it('should correctly count remaining rooms after some are drawn', () => {
      const state = createMockGameState({
        roomDeck: {
          ...createMockRoomDeck(),
          drawn: new Set(['ground-1', 'ground-2']),
        },
      });
      const stats = RoomDiscoveryManager.getRoomDeckStats(state);
      
      expect(stats.ground).toBe(1);
      expect(stats.total).toBe(5);
    });
  });

  describe('drawRoomFromDeck', () => {
    it('should draw a room from the correct floor deck', () => {
      const state = createMockGameState();
      const room = RoomDiscoveryManager.drawRoomFromDeck(state, 'ground');
      
      expect(room).toBeDefined();
      expect(room?.floor).toBe('ground');
    });

    it('should return null when deck is empty', () => {
      const state = createMockGameState({
        roomDeck: {
          ...createMockRoomDeck(),
          ground: [],
        },
      });
      const room = RoomDiscoveryManager.drawRoomFromDeck(state, 'ground');
      
      expect(room).toBeNull();
    });

    it('should return null when all rooms are drawn', () => {
      const state = createMockGameState({
        roomDeck: {
          ...createMockRoomDeck(),
          drawn: new Set(['ground-1', 'ground-2', 'ground-3']),
        },
      });
      const room = RoomDiscoveryManager.drawRoomFromDeck(state, 'ground');
      
      expect(room).toBeNull();
    });
  });

  describe('rotateRoomToMatchDoors', () => {
    it('should return room with correct rotation', () => {
      // Room has west door, entering from south (need north door)
      // West door at 90° becomes north
      const room = createMockRoom('test-room', ['west'], 'ground');
      const rotatedRoom = RoomDiscoveryManager.rotateRoomToMatchDoors(room, 'south');
      
      expect(rotatedRoom.rotation).toBe(90);
      expect(rotatedRoom.doors).toContain('north');
    });
  });

  describe('rotateRoomForConnection (standalone function)', () => {
    it('should rotate room to match entry from north (need south door)', () => {
      const room = createMockRoom('test-room', ['north'], 'ground');
      const result = rotateRoomForConnection(room, 'south');
      
      // Entering from south, need north door -> no rotation needed
      expect(result.rotation).toBe(0);
      expect(result.room.rotation).toBe(0);
      expect(result.room.doors).toContain('north');
    });

    it('should rotate room to match entry from south (need north door)', () => {
      const room = createMockRoom('test-room', ['south'], 'ground');
      const result = rotateRoomForConnection(room, 'south');
      
      // Entering from south, need north door -> rotate 180°
      expect(result.rotation).toBe(180);
      expect(result.room.rotation).toBe(180);
      expect(result.room.doors).toContain('north');
    });

    it('should rotate room to match entry from east (need west door)', () => {
      const room = createMockRoom('test-room', ['north'], 'ground');
      const result = rotateRoomForConnection(room, 'west');
      
      // Entering from west, need east door -> rotate 90°
      expect(result.rotation).toBe(90);
      expect(result.room.rotation).toBe(90);
      expect(result.room.doors).toContain('east');
    });

    it('should rotate room to match entry from west (need east door)', () => {
      const room = createMockRoom('test-room', ['north'], 'ground');
      const result = rotateRoomForConnection(room, 'east');
      
      // Entering from east, need west door -> rotate 270°
      expect(result.rotation).toBe(270);
      expect(result.room.rotation).toBe(270);
      expect(result.room.doors).toContain('west');
    });

    it('should handle room with multiple doors', () => {
      const room = createMockRoom('test-room', ['north', 'east'], 'ground');
      const result = rotateRoomForConnection(room, 'west');
      
      // Entering from west, need east door -> no rotation needed (already has east)
      expect(result.rotation).toBe(0);
      expect(result.room.doors).toContain('east');
    });

    it('should return first valid rotation when multiple options exist', () => {
      // Room with doors on all sides - any rotation works
      const room = createMockRoom('test-room', ['north', 'south', 'east', 'west'], 'ground');
      const result = rotateRoomForConnection(room, 'north');
      
      // Should return 0 (first valid)
      expect(result.rotation).toBe(0);
      expect(result.room.doors).toContain('south'); // Must have door back to source
    });
  });

  describe('rotateDoors (standalone function)', () => {
    it('should correctly rotate doors 0 degrees', () => {
      const doors: Direction[] = ['north', 'south', 'east', 'west'];
      const rotated = rotateDoors(doors, 0);
      expect(rotated).toEqual(['north', 'south', 'east', 'west']);
    });

    it('should correctly rotate doors 90 degrees clockwise', () => {
      const doors: Direction[] = ['north'];
      const rotated = rotateDoors(doors, 90);
      expect(rotated).toEqual(['east']);
    });

    it('should correctly rotate doors 90 degrees - all directions', () => {
      const doors: Direction[] = ['north', 'east', 'south', 'west'];
      const rotated = rotateDoors(doors, 90);
      expect(rotated).toEqual(['east', 'south', 'west', 'north']);
    });

    it('should correctly rotate doors 180 degrees', () => {
      const doors: Direction[] = ['north', 'east'];
      const rotated = rotateDoors(doors, 180);
      expect(rotated).toEqual(['south', 'west']);
    });

    it('should correctly rotate doors 270 degrees clockwise', () => {
      const doors: Direction[] = ['north', 'east'];
      const rotated = rotateDoors(doors, 270);
      expect(rotated).toEqual(['west', 'north']);
    });

    it('should handle empty door array', () => {
      const doors: Direction[] = [];
      const rotated = rotateDoors(doors, 90);
      expect(rotated).toEqual([]);
    });

    it('should handle single door', () => {
      const doors: Direction[] = ['south'];
      const rotated = rotateDoors(doors, 90);
      expect(rotated).toEqual(['west']);
    });

    it('should throw error for invalid rotation', () => {
      const doors: Direction[] = ['north'];
      expect(() => rotateDoors(doors, 45)).toThrow('Invalid rotation');
      expect(() => rotateDoors(doors, 360)).toThrow('Invalid rotation');
      expect(() => rotateDoors(doors, -90)).toThrow('Invalid rotation');
    });
  });

  describe('rotation algorithm - all angles', () => {
    it('0° rotation: north→north, east→east, south→south, west→west', () => {
      const room = createMockRoom('test-room', ['north', 'east', 'south', 'west'], 'ground');
      const rotated = RoomDiscoveryManager.rotateDoors(room.doors, 0);
      expect(rotated).toEqual(['north', 'east', 'south', 'west']);
    });

    it('90° rotation: north→east, east→south, south→west, west→north', () => {
      const room = createMockRoom('test-room', ['north', 'east', 'south', 'west'], 'ground');
      const rotated = RoomDiscoveryManager.rotateDoors(room.doors, 90);
      expect(rotated).toEqual(['east', 'south', 'west', 'north']);
    });

    it('180° rotation: north→south, east→west, south→north, west→east', () => {
      const room = createMockRoom('test-room', ['north', 'east', 'south', 'west'], 'ground');
      const rotated = RoomDiscoveryManager.rotateDoors(room.doors, 180);
      expect(rotated).toEqual(['south', 'west', 'north', 'east']);
    });

    it('270° rotation: north→west, east→north, south→east, west→south', () => {
      const room = createMockRoom('test-room', ['north', 'east', 'south', 'west'], 'ground');
      const rotated = RoomDiscoveryManager.rotateDoors(room.doors, 270);
      expect(rotated).toEqual(['west', 'north', 'east', 'south']);
    });
  });
});

// ==================== 整合測試 ====================

describe('Room Discovery Integration', () => {
  it('should complete full room discovery flow', () => {
    // Arrange
    const currentRoom = createMockRoom('entrance', ['north', 'south', 'east', 'west'], 'ground');
    const state = createMockGameState({
      map: {
        ...createMockMap(),
        ground: createMockMap().ground.map((row, y) =>
          row.map((tile, x) =>
            x === 7 && y === 7
              ? { ...tile, room: currentRoom, discovered: true, placementOrder: 0 }
              : tile
          )
        ),
        placedRoomCount: 1,
      },
      players: [createMockPlayer('player-1')],
      playerOrder: ['player-1'],
    });

    // Act
    const result = RoomDiscoveryManager.discoverRoom(state, 'player-1', 'north');

    // Assert
    expect(result.success).toBe(true);
    expect(result.room).toBeDefined();
    expect(result.position).toBeDefined();
    expect(result.rotation).toBeDefined();
    expect(result.cardDrawRequired).toBeDefined();
    
    // Verify room has matching door
    if (result.room && result.rotation !== undefined) {
      const rotatedDoors = RoomDiscoveryManager.rotateDoors(result.room.doors, result.rotation);
      expect(rotatedDoors).toContain('south'); // Must have door back to entrance
    }
  });

  it('should handle room with Event symbol correctly', () => {
    const currentRoom = createMockRoom('entrance', ['north'], 'ground');
    const eventRoom = createMockRoom('event-room', ['south'], 'ground', 'E');
    
    const state = createMockGameState({
      map: {
        ...createMockMap(),
        ground: createMockMap().ground.map((row, y) =>
          row.map((tile, x) =>
            x === 7 && y === 7
              ? { ...tile, room: currentRoom, discovered: true }
              : tile
          )
        ),
      },
      players: [createMockPlayer('player-1')],
      playerOrder: ['player-1'],
      roomDeck: {
        ...createMockRoomDeck(),
        ground: [eventRoom],
      },
    });

    const result = RoomDiscoveryManager.discoverRoom(state, 'player-1', 'north');

    expect(result.success).toBe(true);
    expect(result.cardDrawRequired?.type).toBe('event');
    expect(result.cardDrawRequired?.requiresHauntCheck).toBe(false);
  });

  it('should handle room with Omen symbol correctly', () => {
    const currentRoom = createMockRoom('entrance', ['north'], 'ground');
    const omenRoom = createMockRoom('omen-room', ['south'], 'ground', 'O');
    
    const state = createMockGameState({
      map: {
        ...createMockMap(),
        ground: createMockMap().ground.map((row, y) =>
          row.map((tile, x) =>
            x === 7 && y === 7
              ? { ...tile, room: currentRoom, discovered: true }
              : tile
          )
        ),
      },
      players: [createMockPlayer('player-1')],
      playerOrder: ['player-1'],
      roomDeck: {
        ...createMockRoomDeck(),
        ground: [omenRoom],
      },
    });

    const result = RoomDiscoveryManager.discoverRoom(state, 'player-1', 'north');

    expect(result.success).toBe(true);
    expect(result.cardDrawRequired?.type).toBe('omen');
    expect(result.cardDrawRequired?.requiresHauntCheck).toBe(true);
  });
});

// ==================== 門連接驗證測試 ====================

import {
  getValidExploreDirections,
  validateDoorConnection,
  calculateConnectionRotation,
  OPPOSITE_DOOR,
} from './roomDiscovery';

describe('Door Connection Validation', () => {
  describe('getValidExploreDirections', () => {
    it('應該返回房間所有門的方向', () => {
      const room = createMockRoom('test-room', ['north', 'east'], 'ground');
      const directions = getValidExploreDirections(room);
      
      expect(directions).toEqual(['north', 'east']);
    });

    it('應該返回空陣列當房間沒有門', () => {
      const room = createMockRoom('test-room', [], 'ground');
      const directions = getValidExploreDirections(room);
      
      expect(directions).toEqual([]);
    });

    it('應該正確處理只有一個門的房間', () => {
      const room = createMockRoom('test-room', ['south'], 'ground');
      const directions = getValidExploreDirections(room);
      
      expect(directions).toEqual(['south']);
    });

    it('應該正確處理四個門的房間', () => {
      const room = createMockRoom('test-room', ['north', 'south', 'east', 'west'], 'ground');
      const directions = getValidExploreDirections(room);
      
      expect(directions).toContain('north');
      expect(directions).toContain('south');
      expect(directions).toContain('east');
      expect(directions).toContain('west');
      expect(directions).toHaveLength(4);
    });
  });

  describe('validateDoorConnection', () => {
    it('應該在來源房間有門且目標房間可以旋轉匹配時返回 true', () => {
      const source = createMockRoom('source', ['north'], 'ground');
      const target = createMockRoom('target', ['south'], 'ground');
      
      expect(validateDoorConnection(source, target, 'north')).toBe(true);
    });

    it('應該在來源房間沒有門時返回 false', () => {
      const source = createMockRoom('source', ['east', 'west'], 'ground');
      const target = createMockRoom('target', ['south'], 'ground');
      
      expect(validateDoorConnection(source, target, 'north')).toBe(false);
    });

    it('應該在目標房間沒有門時返回 false', () => {
      const source = createMockRoom('source', ['north'], 'ground');
      const target = createMockRoom('target', [], 'ground');
      
      expect(validateDoorConnection(source, target, 'north')).toBe(false);
    });

    it('應該在目標房間可以旋轉匹配時返回 true', () => {
      // 來源房間向北探索
      const source = createMockRoom('source', ['north'], 'ground');
      // 目標房間只有東門，但可以旋轉 90° 使東門變成南門
      const target = createMockRoom('target', ['east'], 'ground');
      
      expect(validateDoorConnection(source, target, 'north')).toBe(true);
    });

    it('應該正確驗證東西方向的連接', () => {
      const source = createMockRoom('source', ['east'], 'ground');
      const target = createMockRoom('target', ['west'], 'ground');
      
      expect(validateDoorConnection(source, target, 'east')).toBe(true);
    });

    it('應該正確驗證南北方向的連接', () => {
      const source = createMockRoom('source', ['south'], 'ground');
      const target = createMockRoom('target', ['north'], 'ground');
      
      expect(validateDoorConnection(source, target, 'south')).toBe(true);
    });

    it('應該在目標房間無法旋轉匹配時返回 false', () => {
      // 這個測試理論上不應該發生，因為所有房間至少有一個門
      // 但我們還是測試這個邊界情況
      const source = createMockRoom('source', ['north'], 'ground');
      const target = createMockRoom('target', [], 'ground');
      
      expect(validateDoorConnection(source, target, 'north')).toBe(false);
    });
  });

  describe('calculateConnectionRotation', () => {
    it('應該在不需要旋轉時返回 0', () => {
      const target = createMockRoom('target', ['south'], 'ground');
      
      // 從南邊進入，需要南門
      expect(calculateConnectionRotation(target, 'north')).toBe(0);
    });

    it('應該在需要 90° 旋轉時返回 90', () => {
      const target = createMockRoom('target', ['west'], 'ground');
      
      // 從南邊進入 (entryDirection='south')，需要南門 (oppositeDirection='south')
      // 西門旋轉 90° 變成南門
      expect(calculateConnectionRotation(target, 'south')).toBe(90);
    });

    it('應該在需要 180° 旋轉時返回 180', () => {
      const target = createMockRoom('target', ['north'], 'ground');
      
      // 從南邊進入，需要南門
      // 北門旋轉 180° 變成南門
      expect(calculateConnectionRotation(target, 'north')).toBe(180);
    });

    it('應該在需要 270° 旋轉時返回 270', () => {
      const target = createMockRoom('target', ['east'], 'ground');
      
      // 從南邊進入 (entryDirection='south')，需要南門 (oppositeDirection='south')
      // 東門旋轉 270° 變成南門
      expect(calculateConnectionRotation(target, 'south')).toBe(270);
    });

    it('應該在無法連接時返回 null', () => {
      const target = createMockRoom('target', [], 'ground');
      
      expect(calculateConnectionRotation(target, 'north')).toBeNull();
    });
  });

  describe('OPPOSITE_DOOR', () => {
    it('應該正確映射相反方向', () => {
      expect(OPPOSITE_DOOR.north).toBe('south');
      expect(OPPOSITE_DOOR.south).toBe('north');
      expect(OPPOSITE_DOOR.east).toBe('west');
      expect(OPPOSITE_DOOR.west).toBe('east');
    });
  });
});

// ==================== 門連接整合測試 ====================

describe('Door Connection Integration', () => {
  it('應該完成完整的門連接驗證流程', () => {
    // 建立一個有北門的房間
    const currentRoom = createMockRoom('current', ['north', 'east'], 'ground');
    
    // 取得有效的探索方向
    const validDirections = getValidExploreDirections(currentRoom);
    expect(validDirections).toContain('north');
    expect(validDirections).toContain('east');
    expect(validDirections).not.toContain('south');
    expect(validDirections).not.toContain('west');
    
    // 建立一個可以連接的新房間（有南門）
    const newRoom = createMockRoom('new-room', ['south', 'west'], 'ground');
    
    // 驗證門連接
    expect(validateDoorConnection(currentRoom, newRoom, 'north')).toBe(true);
    
    // 計算旋轉角度
    const rotation = calculateConnectionRotation(newRoom, 'north');
    expect(rotation).toBe(0); // 不需要旋轉，因為已經有南門
  });

  it('應該處理需要旋轉的門連接', () => {
    // 建立一個有北門的房間
    const currentRoom = createMockRoom('current', ['north'], 'ground');

    // 建立一個只有東門的新房間（需要旋轉）
    const newRoom = createMockRoom('new-room', ['east'], 'ground');

    // 驗證門連接（應該可以通過旋轉匹配）
    expect(validateDoorConnection(currentRoom, newRoom, 'north')).toBe(true);

    // 計算旋轉角度
    // entryDirection='north' (從北邊進入), oppositeDirection='south' (需要南門)
    // 東門旋轉 90° 變成南門
    const rotation = calculateConnectionRotation(newRoom, 'north');
    expect(rotation).toBe(90);

    // 驗證旋轉後的門位置
    const rotatedDoors = RoomDiscoveryManager.rotateDoors(newRoom.doors, rotation!);
    expect(rotatedDoors).toContain('south');
  });

  it('應該阻止無效的門連接嘗試', () => {
    // 建立一個只有東門的房間
    const currentRoom = createMockRoom('current', ['east'], 'ground');
    
    // 嘗試向北探索（應該失敗，因為沒有北門）
    const validDirections = getValidExploreDirections(currentRoom);
    expect(validDirections).not.toContain('north');
    
    // 建立一個新房間
    const newRoom = createMockRoom('new-room', ['south'], 'ground');
    
    // 驗證門連接（應該失敗）
    expect(validateDoorConnection(currentRoom, newRoom, 'north')).toBe(false);
  });
});

// ==================== 房間唯一性測試 ====================

describe('Room Uniqueness - Issue #60', () => {
  it('should not draw a room that is already in placedRoomIds', () => {
    // Arrange
    const currentRoom = createMockRoom('entrance', ['north'], 'ground');
    const alreadyPlacedRoom = createMockRoom('ground-1', ['south'], 'ground');
    const availableRoom = createMockRoom('ground-2', ['south'], 'ground');
    
    const state = createMockGameState({
      map: {
        ...createMockMap(),
        ground: createMockMap().ground.map((row, y) =>
          row.map((tile, x) =>
            x === 7 && y === 7
              ? { ...tile, room: currentRoom, discovered: true }
              : tile
          )
        ),
      },
      players: [createMockPlayer('player-1')],
      playerOrder: ['player-1'],
      roomDeck: {
        ground: [alreadyPlacedRoom, availableRoom],
        upper: [],
        basement: [],
        drawn: new Set(),
      },
      placedRoomIds: new Set(['entrance_hall', 'stairs_from_upper', 'stairs_from_basement', 'ground-1']),
    });

    // Act
    const room = RoomDiscoveryManager.drawRoomFromDeck(state, 'ground');

    // Assert
    expect(room).toBeDefined();
    expect(room?.id).toBe('ground-2'); // Should skip ground-1 since it's in placedRoomIds
    expect(room?.id).not.toBe('ground-1');
  });

  it('should not draw a room that is already in roomDeck.drawn', () => {
    // Arrange
    const currentRoom = createMockRoom('entrance', ['north'], 'ground');
    const drawnRoom = createMockRoom('ground-1', ['south'], 'ground');
    const availableRoom = createMockRoom('ground-2', ['south'], 'ground');
    
    const state = createMockGameState({
      map: {
        ...createMockMap(),
        ground: createMockMap().ground.map((row, y) =>
          row.map((tile, x) =>
            x === 7 && y === 7
              ? { ...tile, room: currentRoom, discovered: true }
              : tile
          )
        ),
      },
      players: [createMockPlayer('player-1')],
      playerOrder: ['player-1'],
      roomDeck: {
        ground: [drawnRoom, availableRoom],
        upper: [],
        basement: [],
        drawn: new Set(['ground-1']), // ground-1 is marked as drawn
      },
      placedRoomIds: new Set(['entrance_hall', 'stairs_from_upper', 'stairs_from_basement']),
    });

    // Act
    const room = RoomDiscoveryManager.drawRoomFromDeck(state, 'ground');

    // Assert
    expect(room).toBeDefined();
    expect(room?.id).toBe('ground-2'); // Should skip ground-1 since it's in drawn
    expect(room?.id).not.toBe('ground-1');
  });

  it('should return null when all rooms are already placed', () => {
    // Arrange
    const currentRoom = createMockRoom('entrance', ['north'], 'ground');
    const room1 = createMockRoom('ground-1', ['south'], 'ground');
    const room2 = createMockRoom('ground-2', ['south'], 'ground');
    
    const state = createMockGameState({
      map: {
        ...createMockMap(),
        ground: createMockMap().ground.map((row, y) =>
          row.map((tile, x) =>
            x === 7 && y === 7
              ? { ...tile, room: currentRoom, discovered: true }
              : tile
          )
        ),
      },
      players: [createMockPlayer('player-1')],
      playerOrder: ['player-1'],
      roomDeck: {
        ground: [room1, room2],
        upper: [],
        basement: [],
        drawn: new Set(),
      },
      placedRoomIds: new Set([
        'entrance_hall', 
        'stairs_from_upper', 
        'stairs_from_basement',
        'ground-1',
        'ground-2'
      ]),
    });

    // Act
    const room = RoomDiscoveryManager.drawRoomFromDeck(state, 'ground');

    // Assert
    expect(room).toBeNull();
  });

  it('should return correct count excluding placed rooms in getRoomDeckStats', () => {
    // Arrange
    const state = createMockGameState({
      roomDeck: {
        ground: [
          createMockRoom('ground-1', ['north'], 'ground'),
          createMockRoom('ground-2', ['north'], 'ground'),
          createMockRoom('ground-3', ['north'], 'ground'),
        ],
        upper: [],
        basement: [],
        drawn: new Set(),
      },
      placedRoomIds: new Set([
        'entrance_hall', 
        'stairs_from_upper', 
        'stairs_from_basement',
        'ground-1' // This room is already placed
      ]),
    });

    // Act
    const stats = RoomDiscoveryManager.getRoomDeckStats(state);

    // Assert
    expect(stats.ground).toBe(2); // 3 total - 1 placed = 2 remaining
    expect(stats.total).toBe(2);
  });

  it('should return correct count excluding both drawn and placed rooms', () => {
    // Arrange
    const state = createMockGameState({
      roomDeck: {
        ground: [
          createMockRoom('ground-1', ['north'], 'ground'),
          createMockRoom('ground-2', ['north'], 'ground'),
          createMockRoom('ground-3', ['north'], 'ground'),
        ],
        upper: [],
        basement: [],
        drawn: new Set(['ground-2']), // This room is drawn but not placed yet
      },
      placedRoomIds: new Set([
        'entrance_hall', 
        'stairs_from_upper', 
        'stairs_from_basement',
        'ground-1' // This room is placed
      ]),
    });

    // Act
    const stats = RoomDiscoveryManager.getRoomDeckStats(state);

    // Assert
    expect(stats.ground).toBe(1); // 3 total - 1 placed - 1 drawn = 1 remaining
    expect(stats.total).toBe(1);
  });
});

// ==================== 整合測試：房間唯一性 ====================

describe('Room Uniqueness Integration', () => {
  it('should never draw the same room twice in a full game simulation', () => {
    // Arrange - Create a small deck for testing
    const currentRoom = createMockRoom('entrance', ['north', 'south', 'east', 'west'], 'ground');
    const deckRooms = [
      createMockRoom('room-1', ['south'], 'ground'),
      createMockRoom('room-2', ['south'], 'ground'),
      createMockRoom('room-3', ['south'], 'ground'),
      createMockRoom('room-4', ['south'], 'ground'),
    ];
    
    let state = createMockGameState({
      map: {
        ...createMockMap(),
        ground: createMockMap().ground.map((row, y) =>
          row.map((tile, x) =>
            x === 7 && y === 7
              ? { ...tile, room: currentRoom, discovered: true, placementOrder: 0 }
              : tile
          )
        ),
        placedRoomCount: 1,
      },
      players: [createMockPlayer('player-1')],
      playerOrder: ['player-1'],
      roomDeck: {
        ground: deckRooms,
        upper: [],
        basement: [],
        drawn: new Set(),
      },
    });

    const drawnRoomIds: string[] = [];

    // Act - Draw all rooms from the deck
    for (let i = 0; i < deckRooms.length; i++) {
      const room = RoomDiscoveryManager.drawRoomFromDeck(state, 'ground');
      if (room) {
        drawnRoomIds.push(room.id);
        // Simulate placing the room by adding to placedRoomIds
        state = {
          ...state,
          placedRoomIds: new Set([...state.placedRoomIds, room.id]),
          roomDeck: {
            ...state.roomDeck,
            drawn: new Set([...state.roomDeck.drawn, room.id]),
          },
        };
      }
    }

    // Assert
    // Check that all drawn room IDs are unique
    const uniqueIds = new Set(drawnRoomIds);
    expect(uniqueIds.size).toBe(drawnRoomIds.length);
    expect(drawnRoomIds.length).toBe(4);
    
    // Verify no duplicates
    expect(drawnRoomIds).toEqual(['room-1', 'room-2', 'room-3', 'room-4']);
    
    // Try to draw one more - should return null
    const extraRoom = RoomDiscoveryManager.drawRoomFromDeck(state, 'ground');
    expect(extraRoom).toBeNull();
  });

  it('should maintain uniqueness across multiple floors', () => {
    // Arrange
    const groundEntrance = createMockRoom('entrance', ['north'], 'ground');
    const upperEntrance = createMockRoom('upper-entrance', ['south'], 'upper');
    
    let state = createMockGameState({
      map: {
        ...createMockMap(),
        ground: createMockMap().ground.map((row, y) =>
          row.map((tile, x) =>
            x === 7 && y === 7
              ? { ...tile, room: groundEntrance, discovered: true, placementOrder: 0 }
              : tile
          )
        ),
        upper: createMockMap().upper.map((row, y) =>
          row.map((tile, x) =>
            x === 7 && y === 7
              ? { ...tile, room: upperEntrance, discovered: true, placementOrder: 0 }
              : tile
          )
        ),
        placedRoomCount: 2,
      },
      players: [createMockPlayer('player-1')],
      playerOrder: ['player-1'],
      roomDeck: {
        ground: [
          createMockRoom('ground-1', ['south'], 'ground'),
          createMockRoom('ground-2', ['south'], 'ground'),
        ],
        upper: [
          createMockRoom('upper-1', ['north'], 'upper'),
          createMockRoom('upper-2', ['north'], 'upper'),
        ],
        basement: [
          createMockRoom('basement-1', ['east'], 'basement'),
        ],
        drawn: new Set(),
      },
    });

    // Act - Draw rooms from different floors
    const groundRoom1 = RoomDiscoveryManager.drawRoomFromDeck(state, 'ground');
    const upperRoom1 = RoomDiscoveryManager.drawRoomFromDeck(state, 'upper');
    const basementRoom1 = RoomDiscoveryManager.drawRoomFromDeck(state, 'basement');

    // Assert
    expect(groundRoom1?.floor).toBe('ground');
    expect(upperRoom1?.floor).toBe('upper');
    expect(basementRoom1?.floor).toBe('basement');
    
    // All IDs should be unique
    const allIds = [groundRoom1?.id, upperRoom1?.id, basementRoom1?.id];
    const uniqueIds = new Set(allIds);
    expect(uniqueIds.size).toBe(3);
  });
});
