/**
 * Secret Passage Integration Tests - 秘密通道整合測試
 * Issue #235
 * 
 * 測試秘密通道與移動系統的整合：
 * - 通過秘密通道移動
 * - getReachablePositions 包含秘密通道
 * - validateMove 接受秘密通道移動
 */

import {
  GameState,
  Player,
  Position3D,
  TurnState,
  CardDecks,
  RoomDeckState,
  HauntState,
  CombatState,
  GameConfig,
  GameMap,
  Tile,
  MoveAction,
} from '../types';
import { Room } from '@betrayal/shared';
import {
  MovementValidator,
  MovementExecutor,
  PathFinder,
  STANDARD_MOVE_COST,
} from './movement';
import {
  createSecretPassage,
  TokenManager,
} from '../state/mapTokens';

// ==================== 測試輔助函數 ====================

const createMockCharacter = (): any => ({
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
  doors: string[] = ['north', 'south', 'east', 'west'],
  floor: string = 'ground'
): any => ({
  id,
  name: 'Test Room',
  nameEn: 'Test Room',
  floor: floor as any,
  symbol: null,
  doors: doors as any,
  description: 'A test room',
  color: '#FFFFFF',
  icon: '',
  isOfficial: true,
});

const createEmptyTile = (x: number, y: number, floor: string): any => ({
  x,
  y,
  floor: floor as any,
  room: null,
  discovered: false,
  rotation: 0,
  placementOrder: -1,
});

const createMockMap = (): any => {
  const createFloor = (floor: string): Tile[][] => {
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

  const ground = createFloor('ground');

  // 入口大廳在 (7, 7)
  ground[7][7] = {
    x: 7,
    y: 7,
    floor: 'ground',
    room: createMockRoom('entrance_hall', ['north', 'south', 'east', 'west']),
    discovered: true,
    rotation: 0,
    placementOrder: 0,
  };

  // 東邊房間在 (8, 7)
  ground[7][8] = {
    x: 8,
    y: 7,
    floor: 'ground',
    room: createMockRoom('room_east', ['west', 'east']),
    discovered: true,
    rotation: 0,
    placementOrder: 1,
  };

  // 遠東房間在 (10, 7) - 不相鄰，需要秘密通道
  ground[7][10] = {
    x: 10,
    y: 7,
    floor: 'ground',
    room: createMockRoom('room_far_east', ['west']),
    discovered: true,
    rotation: 0,
    placementOrder: 2,
  };

  // 北邊房間在 (7, 5)
  ground[5][7] = {
    x: 7,
    y: 5,
    floor: 'ground',
    room: createMockRoom('room_north', ['south']),
    discovered: true,
    rotation: 0,
    placementOrder: 3,
  };

  return {
    ground,
    upper: createFloor('upper'),
    basement: createFloor('basement'),
    roof: createFloor('roof'),
    placedRoomCount: 4,
  };
};

const createMockGameState = (
  overrides?: any,
  mapTokens?: any[]
): any => {
  const character = createMockCharacter();
  const mockMap = createMockMap();

  const player1: Player = {
    id: 'player-1',
    name: 'Player 1',
    character,
    position: { x: 7, y: 7, floor: 'ground' },
    currentStats: { speed: 4, might: 3, sanity: 3, knowledge: 3 },
    items: [],
    omens: [],
    isTraitor: false,
    isDead: false,
    usedItemsThisTurn: [],
  };

  const config: GameConfig = {
    playerCount: 1,
    enableAI: false,
    seed: 'test-seed',
    maxTurns: 100,
  };

  const cardDecks: CardDecks = {
    event: { remaining: [], drawn: [], discarded: [] },
    item: { remaining: [], drawn: [], discarded: [] },
    omen: { remaining: [], drawn: [], discarded: [] },
  };

  const roomDeck: RoomDeckState = {
    ground: [],
    upper: [],
    basement: [],
    roof: [],
    drawn: new Set(),
  };

  const haunt: HauntState = {
    isActive: false,
    type: 'none',
    hauntNumber: null,
    traitorPlayerId: null,
    omenCount: 0,
    heroObjective: null,
    traitorObjective: null,
  };

  const combat: CombatState = {
    isActive: false,
    attackerId: null,
    defenderId: null,
    usedStat: null,
    attackerRoll: null,
    defenderRoll: null,
    damage: null,
  };

  const baseState: GameState = {
    gameId: 'test-game',
    version: '1.0.0',
    phase: 'exploration',
    result: 'ongoing',
    config,
    map: mockMap,
    players: [player1],
    playerOrder: ['player-1'],
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
    cardDecks,
    roomDeck,
    haunt,
    combat,
    log: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    rngState: { seed: 'test', count: 0, internalState: [0] },
    placedRoomIds: new Set(['entrance_hall', 'room_east', 'room_far_east', 'room_north']),
    mapTokens: mapTokens || [],
  };

  return { ...baseState, ...overrides };
};

// ==================== Secret Passage Movement Tests ====================

describe('Secret Passage Movement Integration', () => {
  describe('validateMove', () => {
    it('應該允許通過秘密通道移動到不相鄰的房間', () => {
      // 創建秘密通道：入口大廳 (7,7) <-> 遠東房間 (10,7)
      const secretPassageTokens = createSecretPassage(
        { x: 7, y: 7, floor: 'ground' },
        { x: 10, y: 7, floor: 'ground' },
        'player-1'
      );

      const state = createMockGameState({}, secretPassageTokens);

      // 嘗試從入口大廳移動到遠東房間（通過秘密通道）
      const result = MovementValidator.validateMove(
        state,
        'player-1',
        { x: 10, y: 7, floor: 'ground' }
      );

      expect(result.valid).toBe(true);
      expect(result.cost).toBe(STANDARD_MOVE_COST);
    });

    it('應該拒絕沒有秘密通道時移動到不相鄰的房間', () => {
      const state = createMockGameState({}); // 沒有秘密通道

      // 嘗試從入口大廳移動到遠東房間（沒有秘密通道）
      const result = MovementValidator.validateMove(
        state,
        'player-1',
        { x: 10, y: 7, floor: 'ground' }
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('adjacent');
    });

    it('應該仍然允許正常的相鄰房間移動', () => {
      const state = createMockGameState({});

      // 從入口大廳移動到東邊房間（正常移動）
      const result = MovementValidator.validateMove(
        state,
        'player-1',
        { x: 8, y: 7, floor: 'ground' }
      );

      expect(result.valid).toBe(true);
    });

    it('秘密通道移動應該檢查移動點數', () => {
      const secretPassageTokens = createSecretPassage(
        { x: 7, y: 7, floor: 'ground' },
        { x: 10, y: 7, floor: 'ground' },
        'player-1'
      );

      const state = createMockGameState(
        {
          turn: {
            ...createMockGameState().turn,
            movesRemaining: 0, // 沒有移動點數
          },
        },
        secretPassageTokens
      );

      const result = MovementValidator.validateMove(
        state,
        'player-1',
        { x: 10, y: 7, floor: 'ground' }
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('movement points');
    });
  });

  describe('getReachablePositions', () => {
    it('應該包含秘密通道可以到達的位置', () => {
      // 創建秘密通道：入口大廳 (7,7) <-> 遠東房間 (10,7)
      const secretPassageTokens = createSecretPassage(
        { x: 7, y: 7, floor: 'ground' },
        { x: 10, y: 7, floor: 'ground' },
        'player-1'
      );

      const state = createMockGameState({}, secretPassageTokens);

      const reachable = PathFinder.getReachablePositions(state, 'player-1');

      // 應該包含遠東房間（通過秘密通道）
      const hasFarEastRoom = reachable.some(
        pos => pos.x === 10 && pos.y === 7 && pos.floor === 'ground'
      );
      expect(hasFarEastRoom).toBe(true);
    });

    it('應該包含正常移動可以到達的位置', () => {
      const state = createMockGameState({});

      const reachable = PathFinder.getReachablePositions(state, 'player-1');

      // 應該包含東邊房間（正常移動）
      const hasEastRoom = reachable.some(
        pos => pos.x === 8 && pos.y === 7 && pos.floor === 'ground'
      );
      expect(hasEastRoom).toBe(true);
    });

    it('不應該包含沒有秘密通道的遠處房間', () => {
      const state = createMockGameState({}); // 沒有秘密通道

      const reachable = PathFinder.getReachablePositions(state, 'player-1');

      // 不應該包含遠東房間（沒有秘密通道）
      const hasFarEastRoom = reachable.some(
        pos => pos.x === 10 && pos.y === 7 && pos.floor === 'ground'
      );
      expect(hasFarEastRoom).toBe(false);
    });

    it('秘密通道應該只消耗 1 點移動', () => {
      const secretPassageTokens = createSecretPassage(
        { x: 7, y: 7, floor: 'ground' },
        { x: 10, y: 7, floor: 'ground' },
        'player-1'
      );

      const state = createMockGameState(
        {
          turn: {
            ...createMockGameState().turn,
            movesRemaining: 1, // 只有 1 點移動
          },
        },
        secretPassageTokens
      );

      const reachable = PathFinder.getReachablePositions(state, 'player-1');

      // 應該仍然可以到達遠東房間
      const hasFarEastRoom = reachable.some(
        pos => pos.x === 10 && pos.y === 7 && pos.floor === 'ground'
      );
      expect(hasFarEastRoom).toBe(true);
    });
  });

  describe('executeMove', () => {
    it('應該成功執行秘密通道移動', () => {
      const secretPassageTokens = createSecretPassage(
        { x: 7, y: 7, floor: 'ground' },
        { x: 10, y: 7, floor: 'ground' },
        'player-1'
      );

      const state = createMockGameState({}, secretPassageTokens);

      const action: MoveAction = {
        type: 'MOVE',
        playerId: 'player-1',
        to: { x: 10, y: 7, floor: 'ground' },
        path: [{ x: 7, y: 7, floor: 'ground' }, { x: 10, y: 7, floor: 'ground' }],
        timestamp: Date.now(),
        actionId: 'test-action',
      };

      const result = MovementExecutor.executeMove(state, action);

      expect(result.success).toBe(true);
      expect(result.newState!.players[0].position).toEqual({
        x: 10,
        y: 7,
        floor: 'ground',
      });
      expect(result.newState!.turn.movesRemaining).toBe(3); // 消耗 1 點
    });
  });
});

// ==================== TokenManager Integration Tests ====================

describe('TokenManager with GameState', () => {
  it('應該能夠從 GameState 載入標記', () => {
    const secretPassageTokens = createSecretPassage(
      { x: 7, y: 7, floor: 'ground' },
      { x: 10, y: 7, floor: 'ground' },
      'player-1'
    );

    const state = createMockGameState({}, secretPassageTokens);
    const tokenManager = new TokenManager(state.mapTokens);

    expect(tokenManager.hasSecretPassage({ x: 7, y: 7, floor: 'ground' })).toBe(true);
    expect(tokenManager.hasSecretPassage({ x: 10, y: 7, floor: 'ground' })).toBe(true);
  });

  it('應該處理沒有標記的情況', () => {
    const state = createMockGameState({}); // 沒有 mapTokens
    const tokenManager = new TokenManager(state.mapTokens || []);

    expect(tokenManager.getAllTokens()).toHaveLength(0);
  });
});

// ==================== Complex Scenarios ====================

describe('Complex Secret Passage Scenarios', () => {
  it('應該支援多個秘密通道', () => {
    // 創建兩個秘密通道
    const passage1 = createSecretPassage(
      { x: 7, y: 7, floor: 'ground' },
      { x: 10, y: 7, floor: 'ground' },
      'player-1'
    );
    const passage2 = createSecretPassage(
      { x: 8, y: 7, floor: 'ground' },
      { x: 7, y: 5, floor: 'ground' },
      'player-1'
    );

    const allTokens = [...passage1, ...passage2];
    const state = createMockGameState({}, allTokens);

    const reachable = PathFinder.getReachablePositions(state, 'player-1');

    // 應該可以到達兩個秘密通道的終點
    const hasFarEastRoom = reachable.some(
      pos => pos.x === 10 && pos.y === 7 && pos.floor === 'ground'
    );
    const hasNorthRoom = reachable.some(
      pos => pos.x === 7 && pos.y === 5 && pos.floor === 'ground'
    );

    expect(hasFarEastRoom).toBe(true);
    expect(hasNorthRoom).toBe(true);
  });

  it('應該支援跨樓層的秘密通道（如果實現）', () => {
    // 注意：這個測試假設秘密通道可以跨樓層
    // 實際遊戲規則可能需要限制
    const crossFloorPassage = createSecretPassage(
      { x: 7, y: 7, floor: 'ground' },
      { x: 7, y: 7, floor: 'upper' },
      'player-1'
    );

    const state = createMockGameState({}, crossFloorPassage);

    const tokenManager = new TokenManager(state.mapTokens || []);
    const dest = tokenManager.getSecretPassageDestination({
      x: 7,
      y: 7,
      floor: 'ground',
    });

    expect(dest).toEqual({ x: 7, y: 7, floor: 'upper' });
  });
});
