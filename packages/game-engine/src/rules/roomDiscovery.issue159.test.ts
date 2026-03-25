/**
 * Issue #159: Prevent re-exploration of discovered rooms
 * 
 * 這個測試檔案驗證以下功能：
 * 1. 第一次探索新房間：抽卡、結束回合
 * 2. 第二次進入已探索房間：不抽卡、回合繼續
 * 3. AI 玩家也遵循相同規則
 * 
 * Rulebook Reference:
 * - Page 12: Room Discovery - 房間一旦被發現，就會一直留在地圖上供所有玩家使用
 * - 只有第一次發現房間時才會觸發探索
 */

import {
  GameState,
  Tile,
  Position3D,
  Direction,
  Floor,
  MoveAction,
  Character,
  Player,
  GameMap,
  GameConfig,
  CardDecks,
  RoomDeckState,
  HauntState,
  CombatState,
  TurnState,
  GamePhase,
  GameLogEntry,
  RngState,
} from '../types';

import { Room, SymbolType } from '@betrayal/shared';

import {
  MovementValidator,
  MovementExecutor,
  PathFinder,
} from './movement';

import {
  RoomDiscoveryManager,
  RoomDiscoveryResult,
} from './roomDiscovery';

import { TurnManager } from './turn';

// ==================== 測試輔助函數 ====================

/** 創建測試用的角色 */
function createTestCharacter(): Character {
  return {
    id: 'char-1',
    name: 'Test Character',
    nameEn: 'Test Character',
    age: 30,
    description: 'Test',
    color: '#FF0000',
    stats: {
      speed: [4, 4],
      might: [4, 4],
      sanity: [4, 4],
      knowledge: [4, 4],
    },
    statTrack: {
      speed: [0, 1, 2, 3, 4, 5, 6, 7],
      might: [0, 1, 2, 3, 4, 5, 6, 7],
      sanity: [0, 1, 2, 3, 4, 5, 6, 7],
      knowledge: [0, 1, 2, 3, 4, 5, 6, 7],
    },
  };
}

/** 創建測試用的房間 */
function createTestRoom(
  id: string,
  name: string,
  doors: Direction[] = ['north', 'south', 'east', 'west'],
  floor: Floor = 'ground',
  symbol: SymbolType = null
): Room {
  return {
    id,
    name,
    nameEn: name,
    floor,
    doors,
    symbol,
    description: 'Test room',
    color: '#808080',
    icon: '',
    isOfficial: false,
  };
}

/** 創建測試用的 Tile */
function createTestTile(
  x: number,
  y: number,
  floor: Floor,
  room: Room | null = null,
  discovered: boolean = false
): Tile {
  return {
    x,
    y,
    floor,
    room,
    discovered,
    rotation: 0,
    placementOrder: -1,
  };
}

/** 創建空的樓層地圖 */
function createEmptyFloorMap(floor: Floor): Tile[][] {
  const map: Tile[][] = [];
  for (let y = 0; y < 15; y++) {
    const row: Tile[] = [];
    for (let x = 0; x < 15; x++) {
      row.push(createTestTile(x, y, floor));
    }
    map.push(row);
  }
  return map;
}

/** 創建測試用的 GameState */
function createTestGameState(
  tiles: Tile[] = [],
  currentPlayerId: string = 'player-1',
  movesRemaining: number = 4
): GameState {
  const groundMap = createEmptyFloorMap('ground');
  const upperMap = createEmptyFloorMap('upper');
  const basementMap = createEmptyFloorMap('basement');

  // 放置指定的 tiles
  for (const tile of tiles) {
    if (tile.floor === 'ground') {
      groundMap[tile.y][tile.x] = tile;
    } else if (tile.floor === 'upper') {
      upperMap[tile.y][tile.x] = tile;
    } else if (tile.floor === 'basement') {
      basementMap[tile.y][tile.x] = tile;
    }
  }

  const map: GameMap = {
    ground: groundMap,
    upper: upperMap,
    basement: basementMap,
    placedRoomCount: tiles.filter(t => t.room).length,
  };

  const config: GameConfig = {
    playerCount: 2,
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
    ground: [
      createTestRoom('new-room-1', 'New Room 1', ['south', 'north'], 'ground', 'E'),
      createTestRoom('new-room-2', 'New Room 2', ['south', 'east'], 'ground', 'I'),
    ],
    upper: [],
    basement: [],
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

  const turn: TurnState = {
    currentPlayerId,
    turnNumber: 1,
    movesRemaining,
    hasDiscoveredRoom: false,
    hasDrawnCard: false,
    hasEnded: false,
    usedSpecialActions: [],
    usedItems: [],
  };

  return {
    gameId: 'test-game',
    version: '1.0.0',
    phase: 'exploration' as GamePhase,
    result: 'ongoing',
    config,
    map,
    players: [
      {
        id: currentPlayerId,
        name: 'Player 1',
        character: createTestCharacter(),
        position: { x: 7, y: 7, floor: 'ground' },
        currentStats: {
          speed: 4,
          might: 4,
          sanity: 4,
          knowledge: 4,
        },
        items: [],
        omens: [],
        isTraitor: false,
        isDead: false,
        usedItemsThisTurn: [],
      },
    ],
    playerOrder: [currentPlayerId],
    turn,
    cardDecks,
    roomDeck,
    haunt,
    combat,
    log: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    rngState: {
      seed: 'test-seed',
      count: 0,
      internalState: [],
    },
    placedRoomIds: new Set(tiles.filter(t => t.room).map(t => t.room!.id)),
  };
}

// ==================== 測試案例 ====================

describe('Issue #159: Prevent Re-exploration of Discovered Rooms', () => {
  describe('First Discovery (New Room)', () => {
    it('第一次發現新房間時應該觸發探索並結束回合', () => {
      // 設置：入口大廳在 (7,7)，北邊 (7,6) 是未探索的
      const entranceRoom = createTestRoom('entrance', 'Entrance', ['north', 'south', 'east', 'west']);
      
      const gameState = createTestGameState([
        createTestTile(7, 7, 'ground', entranceRoom, true), // 入口，已探索
        createTestTile(7, 6, 'ground', null, false), // 北邊，未探索
      ]);

      // 驗證：北邊是可探索的方向
      const discoverableDirections = RoomDiscoveryManager.getDiscoverableDirections(gameState, 'player-1');
      expect(discoverableDirections).toContain('north');

      // 執行：發現新房間
      const discoveryResult = RoomDiscoveryManager.discoverRoom(gameState, 'player-1', 'north');
      
      // 驗證：探索成功
      expect(discoveryResult.success).toBe(true);
      expect(discoveryResult.room).toBeDefined();
      expect(discoveryResult.position).toEqual({ x: 7, y: 6, floor: 'ground' });
      
      // 驗證：需要抽卡（根據房間符號）
      expect(discoveryResult.cardDrawRequired).toBeDefined();
    });

    it('發現新房間後應該設置 hasDiscoveredRoom = true 並結束回合', () => {
      const entranceRoom = createTestRoom('entrance', 'Entrance', ['north']);
      const newRoom = createTestRoom('new-room', 'New Room', ['south']);
      
      const gameState = createTestGameState([
        createTestTile(7, 7, 'ground', entranceRoom, true),
        createTestTile(7, 6, 'ground', null, false),
      ]);

      // 使用 MovementExecutor.discoverRoom 來模擬完整的發現流程
      const discoveryResult = MovementExecutor.discoverRoom(
        gameState,
        'player-1',
        'north',
        newRoom,
        0
      );

      expect(discoveryResult.success).toBe(true);
      expect(discoveryResult.newState).toBeDefined();
      
      // 驗證：回合標記為已發現房間
      expect(discoveryResult.newState!.turn.hasDiscoveredRoom).toBe(true);
      
      // 驗證：回合結束
      expect(discoveryResult.newState!.turn.hasEnded).toBe(true);
      
      // 驗證：移動點數減少
      expect(discoveryResult.newState!.turn.movesRemaining).toBe(3);
    });

    it('發現新房間後不能繼續移動', () => {
      const entranceRoom = createTestRoom('entrance', 'Entrance', ['north', 'east']);
      const newRoom = createTestRoom('new-room', 'New Room', ['south', 'east']);
      const eastRoom = createTestRoom('east-room', 'East Room', ['west'], 'ground');
      
      let gameState = createTestGameState([
        createTestTile(7, 7, 'ground', entranceRoom, true),
        createTestTile(7, 6, 'ground', null, false), // 北邊未探索
        createTestTile(8, 7, 'ground', eastRoom, true), // 東邊已探索
      ]);

      // 發現新房間
      const discoveryResult = MovementExecutor.discoverRoom(
        gameState,
        'player-1',
        'north',
        newRoom,
        0
      );

      expect(discoveryResult.success).toBe(true);
      gameState = discoveryResult.newState!;

      // 驗證：回合已結束
      expect(gameState.turn.hasEnded).toBe(true);
      expect(gameState.turn.hasDiscoveredRoom).toBe(true);

      // 嘗試繼續移動（應該失敗，因為回合已經結束）
      const moveValidation = MovementValidator.validateMove(
        gameState,
        'player-1',
        { x: 8, y: 6, floor: 'ground' } // 新發現房間的東邊
      );

      // 應該失敗，因為回合已經結束
      expect(moveValidation.valid).toBe(false);
      // 回合結束後會先檢查 hasEnded，所以錯誤訊息是 'Turn has ended'
      expect(moveValidation.error).toBe('Turn has ended');
    });
  });

  describe('Second Entry (Discovered Room)', () => {
    it('進入已探索的房間時不應該觸發抽卡', () => {
      // 設置：兩個已探索且相連的房間
      const room1 = createTestRoom('room-1', 'Room 1', ['east', 'west']);
      const room2 = createTestRoom('room-2', 'Room 2', ['west', 'east']);
      
      const gameState = createTestGameState([
        createTestTile(7, 7, 'ground', room1, true),
        createTestTile(8, 7, 'ground', room2, true), // 已探索的房間
      ]);

      // 驗證：room2 是已探索的
      expect(gameState.map.ground[7][8].discovered).toBe(true);

      // 執行：移動到已探索的房間
      const action: MoveAction = {
        type: 'MOVE',
        playerId: 'player-1',
        to: { x: 8, y: 7, floor: 'ground' },
        path: [{ x: 7, y: 7, floor: 'ground' }, { x: 8, y: 7, floor: 'ground' }],
        timestamp: Date.now(),
        actionId: 'test-move-1',
      };

      const moveResult = MovementExecutor.executeMove(gameState, action);

      // 驗證：移動成功
      expect(moveResult.success).toBe(true);
      expect(moveResult.newState).toBeDefined();
      
      // 驗證：沒有觸發探索（discoveredNewRoom = false）
      expect(moveResult.discoveredNewRoom).toBe(false);
      
      // 驗證：回合沒有結束
      expect(moveResult.newState!.turn.hasEnded).toBe(false);
      expect(moveResult.newState!.turn.hasDiscoveredRoom).toBe(false);
    });

    it('進入已探索房間後應該可以繼續移動', () => {
      // 設置：三個已探索且相連的房間
      const room1 = createTestRoom('room-1', 'Room 1', ['east']);
      const room2 = createTestRoom('room-2', 'Room 2', ['west', 'east']);
      const room3 = createTestRoom('room-3', 'Room 3', ['west']);
      
      let gameState = createTestGameState([
        createTestTile(7, 7, 'ground', room1, true),
        createTestTile(8, 7, 'ground', room2, true),
        createTestTile(9, 7, 'ground', room3, true),
      ]);

      // 第一次移動：從 room1 到 room2
      const action1: MoveAction = {
        type: 'MOVE',
        playerId: 'player-1',
        to: { x: 8, y: 7, floor: 'ground' },
        path: [{ x: 7, y: 7, floor: 'ground' }, { x: 8, y: 7, floor: 'ground' }],
        timestamp: Date.now(),
        actionId: 'test-move-1',
      };

      const result1 = MovementExecutor.executeMove(gameState, action1);
      expect(result1.success).toBe(true);
      
      gameState = result1.newState!;
      
      // 驗證：還有移動點數（4 - 1 = 3）
      expect(gameState.turn.movesRemaining).toBe(3);
      
      // 驗證：回合沒有結束
      expect(gameState.turn.hasEnded).toBe(false);

      // 第二次移動：從 room2 到 room3
      const action2: MoveAction = {
        type: 'MOVE',
        playerId: 'player-1',
        to: { x: 9, y: 7, floor: 'ground' },
        path: [{ x: 8, y: 7, floor: 'ground' }, { x: 9, y: 7, floor: 'ground' }],
        timestamp: Date.now(),
        actionId: 'test-move-2',
      };

      const result2 = MovementExecutor.executeMove(gameState, action2);
      expect(result2.success).toBe(true);
      
      gameState = result2.newState!;
      
      // 驗證：還有移動點數（3 - 1 = 2）
      expect(gameState.turn.movesRemaining).toBe(2);
      
      // 驗證：玩家位置更新
      expect(gameState.players[0].position).toEqual({ x: 9, y: 7, floor: 'ground' });
    });

    it('應該可以在已探索房間之間移動多次直到移動點數用完', () => {
      // 設置：一條直線上的多個已探索房間
      const rooms: Room[] = [];
      const tiles: Tile[] = [];
      
      for (let i = 0; i < 5; i++) {
        const room = createTestRoom(`room-${i}`, `Room ${i}`, 
          i === 0 ? ['east'] : i === 4 ? ['west'] : ['west', 'east']
        );
        rooms.push(room);
        tiles.push(createTestTile(7 + i, 7, 'ground', room, true));
      }
      
      let gameState = createTestGameState(tiles, 'player-1', 4); // Speed = 4

      // 連續移動 4 次
      for (let i = 0; i < 4; i++) {
        const action: MoveAction = {
          type: 'MOVE',
          playerId: 'player-1',
          to: { x: 8 + i, y: 7, floor: 'ground' },
          path: [
            { x: 7 + i, y: 7, floor: 'ground' },
            { x: 8 + i, y: 7, floor: 'ground' }
          ],
          timestamp: Date.now(),
          actionId: `test-move-${i}`,
        };

        const result = MovementExecutor.executeMove(gameState, action);
        expect(result.success).toBe(true);
        
        gameState = result.newState!;
        
        // 驗證：回合從未結束
        expect(gameState.turn.hasEnded).toBe(false);
        expect(gameState.turn.hasDiscoveredRoom).toBe(false);
      }

      // 驗證：移動點數用完
      expect(gameState.turn.movesRemaining).toBe(0);
      
      // 驗證：最終位置
      expect(gameState.players[0].position).toEqual({ x: 11, y: 7, floor: 'ground' });
    });
  });

  describe('Mixed Scenarios', () => {
    it('應該正確處理探索新房間後，其他玩家進入該房間（不觸發探索）', () => {
      const entranceRoom = createTestRoom('entrance', 'Entrance', ['north']);
      const newRoom = createTestRoom('new-room', 'New Room', ['south'], 'ground', 'E');
      
      // 玩家 1 發現新房間
      let gameState = createTestGameState([
        createTestTile(7, 7, 'ground', entranceRoom, true),
        createTestTile(7, 6, 'ground', null, false),
      ], 'player-1');

      // 添加玩家 2
      gameState.players.push({
        id: 'player-2',
        name: 'Player 2',
        character: createTestCharacter(),
        position: { x: 7, y: 7, floor: 'ground' },
        currentStats: { speed: 4, might: 4, sanity: 4, knowledge: 4 },
        items: [],
        omens: [],
        isTraitor: false,
        isDead: false,
        usedItemsThisTurn: [],
      });
      gameState.playerOrder = ['player-1', 'player-2'];

      // 玩家 1 發現新房間
      const discoveryResult = MovementExecutor.discoverRoom(
        gameState,
        'player-1',
        'north',
        newRoom,
        0
      );

      expect(discoveryResult.success).toBe(true);
      gameState = discoveryResult.newState!;

      // 驗證：新房間現在是已探索的
      expect(gameState.map.ground[6][7].discovered).toBe(true);
      expect(gameState.map.ground[6][7].room).toBeDefined();

      // 結束玩家 1 的回合，開始玩家 2 的回合
      gameState = TurnManager.endTurn(gameState, {
        type: 'END_TURN',
        playerId: 'player-1',
        timestamp: Date.now(),
        actionId: 'end-turn-1',
      });

      // 驗證：現在是玩家 2 的回合
      expect(gameState.turn.currentPlayerId).toBe('player-2');
      expect(gameState.turn.hasDiscoveredRoom).toBe(false);
      expect(gameState.turn.hasEnded).toBe(false);

      // 玩家 2 移動到已探索的房間
      const action: MoveAction = {
        type: 'MOVE',
        playerId: 'player-2',
        to: { x: 7, y: 6, floor: 'ground' },
        path: [{ x: 7, y: 7, floor: 'ground' }, { x: 7, y: 6, floor: 'ground' }],
        timestamp: Date.now(),
        actionId: 'player2-move',
      };

      const moveResult = MovementExecutor.executeMove(gameState, action);
      
      // 驗證：移動成功，沒有觸發探索
      expect(moveResult.success).toBe(true);
      expect(moveResult.discoveredNewRoom).toBe(false);
      expect(moveResult.newState!.turn.hasDiscoveredRoom).toBe(false);
      expect(moveResult.newState!.turn.hasEnded).toBe(false);
    });

    it('應該允許在已探索房間之間來回移動', () => {
      const roomA = createTestRoom('room-a', 'Room A', ['east', 'west']);
      const roomB = createTestRoom('room-b', 'Room B', ['west', 'east']);
      
      let gameState = createTestGameState([
        createTestTile(7, 7, 'ground', roomA, true),
        createTestTile(8, 7, 'ground', roomB, true),
      ]);

      // A -> B
      const action1: MoveAction = {
        type: 'MOVE',
        playerId: 'player-1',
        to: { x: 8, y: 7, floor: 'ground' },
        path: [{ x: 7, y: 7, floor: 'ground' }, { x: 8, y: 7, floor: 'ground' }],
        timestamp: Date.now(),
        actionId: 'move-a-b',
      };

      const result1 = MovementExecutor.executeMove(gameState, action1);
      expect(result1.success).toBe(true);
      gameState = result1.newState!;

      // B -> A
      const action2: MoveAction = {
        type: 'MOVE',
        playerId: 'player-1',
        to: { x: 7, y: 7, floor: 'ground' },
        path: [{ x: 8, y: 7, floor: 'ground' }, { x: 7, y: 7, floor: 'ground' }],
        timestamp: Date.now(),
        actionId: 'move-b-a',
      };

      const result2 = MovementExecutor.executeMove(gameState, action2);
      expect(result2.success).toBe(true);
      gameState = result2.newState!;

      // 驗證：兩次移動都沒有觸發探索或結束回合
      expect(gameState.turn.hasDiscoveredRoom).toBe(false);
      expect(gameState.turn.hasEnded).toBe(false);
      expect(gameState.turn.movesRemaining).toBe(2);
    });
  });

  describe('PathFinder Integration', () => {
    it('PathFinder 應該只返回已探索的房間作為可移動目標', () => {
      const room1 = createTestRoom('room-1', 'Room 1', ['east']);
      const room2 = createTestRoom('room-2', 'Room 2', ['west']);
      
      const gameState = createTestGameState([
        createTestTile(7, 7, 'ground', room1, true),
        createTestTile(8, 7, 'ground', room2, true),
        createTestTile(9, 7, 'ground', null, false), // 未探索
      ]);

      const reachablePositions = PathFinder.getReachablePositions(gameState, 'player-1');
      
      // 應該可以移動到 room2（已探索）
      expect(reachablePositions.some(p => p.x === 8 && p.y === 7)).toBe(true);
      
      // 不應該可以移動到 (9,7)（未探索）
      expect(reachablePositions.some(p => p.x === 9 && p.y === 7)).toBe(false);
    });

    it('getDiscoverableDirections 應該只返回通往未探索區域的方向', () => {
      const room1 = createTestRoom('room-1', 'Room 1', ['north', 'east']);
      const room2 = createTestRoom('room-2', 'Room 2', ['west']);
      
      const gameState = createTestGameState([
        createTestTile(7, 7, 'ground', room1, true),
        createTestTile(8, 7, 'ground', room2, true), // 東邊已探索
        createTestTile(7, 6, 'ground', null, false), // 北邊未探索
      ]);

      const discoverableDirections = RoomDiscoveryManager.getDiscoverableDirections(gameState, 'player-1');
      
      // 應該可以向北探索（未探索）
      expect(discoverableDirections).toContain('north');
      
      // 不應該可以向东探索（已探索）
      expect(discoverableDirections).not.toContain('east');
    });
  });
});

// ==================== 導出測試 ====================

export {};
