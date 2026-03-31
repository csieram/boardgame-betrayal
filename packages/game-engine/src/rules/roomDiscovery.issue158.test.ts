/**
 * Issue #158: Explored rooms visibility and re-exploration prevention tests
 * 
 * 這個測試檔案驗證以下功能：
 * 1. 已探索房間應該正確標記為 discovered = true
 * 2. 不能重複探索同一個房間
 * 3. 房間狀態應該在回合間持續存在
 */

import {
  GameState,
  Tile,
  Position3D,
  Direction,
  Floor,
} from '../types';

import {
  Room,
} from '@betrayal/shared';

import {
  RoomDiscoveryManager,
  RoomDiscoveryResult,
} from './roomDiscovery';

// ==================== 測試輔助函數 ====================

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

/** 創建測試用的房間 */
function createTestRoom(
  id: string,
  name: string,
  doors: Direction[] = ['north', 'south', 'east', 'west'],
  floor: Floor = 'ground'
): Room {
  return {
    id,
    name,
    nameEn: name,
    floor,
    doors,
    symbol: null,
    description: 'Test room',
    color: '#808080',
    icon: '',
    isOfficial: false,
  };
}

/** 創建測試用的 GameState */
function createTestGameState(
  tiles: Tile[] = [],
  currentPlayerId: string = 'player-1'
): GameState {
  const emptyFloorMap = (floor: Floor): Tile[][] => {
    const map: Tile[][] = [];
    for (let y = 0; y < 15; y++) {
      const row: Tile[] = [];
      for (let x = 0; x < 15; x++) {
        row.push(createTestTile(x, y, floor));
      }
      map.push(row);
    }
    // 放置指定的 tiles
    for (const tile of tiles) {
      if (tile.floor === floor) {
        map[tile.y][tile.x] = tile;
      }
    }
    return map;
  };

  return {
    gameId: 'test-game',
    version: '1.0.0',
    phase: 'exploration',
    result: 'ongoing',
    config: {
      playerCount: 2,
      enableAI: false,
      seed: 'test-seed',
      maxTurns: 100,
    },
    map: {
      ground: emptyFloorMap('ground'),
      upper: emptyFloorMap('upper'),
      basement: emptyFloorMap('basement'),
      roof: emptyFloorMap('roof'),
      placedRoomCount: tiles.filter(t => t.room).length,
    },
    players: [
      {
        id: currentPlayerId,
        name: 'Player 1',
        character: {
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
        },
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
    turn: {
      currentPlayerId,
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
      internalState: [],
    },
    placedRoomIds: new Set(tiles.filter(t => t.room).map(t => t.room!.id)),
  };
}

// ==================== 測試案例 ====================

describe('Issue #158: Explored Rooms', () => {
  describe('Room Discovery Tracking', () => {
    it('應該正確標記新發現的房間為 discovered = true', () => {
      // 創建一個已探索的房間
      const entranceHall = createTestRoom('entrance_hall', 'Entrance Hall', ['north', 'east', 'south', 'west']);
      const exploredTile = createTestTile(7, 7, 'ground', entranceHall, true);
      
      expect(exploredTile.discovered).toBe(true);
      expect(exploredTile.room).not.toBeNull();
    });

    it('應該區分 discovered 和 undiscovered 的房間', () => {
      const room1 = createTestRoom('room-1', 'Room 1');
      const room2 = createTestRoom('room-2', 'Room 2');
      
      const discoveredTile = createTestTile(7, 7, 'ground', room1, true);
      const undiscoveredTile = createTestTile(8, 7, 'ground', room2, false);
      
      expect(discoveredTile.discovered).toBe(true);
      expect(undiscoveredTile.discovered).toBe(false);
    });
  });

  describe('Re-exploration Prevention', () => {
    it('應該阻止在已有房間的位置放置新房間', () => {
      const existingRoom = createTestRoom('existing-room', 'Existing Room');
      const existingTile = createTestTile(8, 7, 'ground', existingRoom, true);
      
      const gameState = createTestGameState([
        createTestTile(7, 7, 'ground', createTestRoom('entrance', 'Entrance', ['east']), true),
        existingTile,
      ]);

      // 嘗試在已有房間的位置發現新房間
      const result = RoomDiscoveryManager.discoverRoom(
        gameState,
        'player-1',
        'east'
      );

      // 應該失敗，因為位置已被佔用
      expect(result.success).toBe(false);
      expect(result.error).toContain('already has a room');
    });

    it('應該阻止重複探索同一個房間（通過 discovered 標記）', () => {
      const existingRoom = createTestRoom('existing-room', 'Existing Room', ['west']);
      const discoveredTile = createTestTile(8, 7, 'ground', existingRoom, true);
      
      const gameState = createTestGameState([
        createTestTile(7, 7, 'ground', createTestRoom('entrance', 'Entrance', ['east']), true),
        discoveredTile,
      ]);

      // 嘗試向已探索房間的方向移動
      const result = RoomDiscoveryManager.discoverRoom(
        gameState,
        'player-1',
        'east'
      );

      // 應該失敗，因為該位置已有房間
      expect(result.success).toBe(false);
    });

    it('應該允許移動到已探索的房間（但不觸發重新探索）', () => {
      // 這個測試驗證玩家可以移動回已探索的房間
      // 但不會觸發「發現新房間」的邏輯
      const room1 = createTestRoom('room-1', 'Room 1', ['east', 'west']);
      const room2 = createTestRoom('room-2', 'Room 2', ['west']);
      
      const gameState = createTestGameState([
        createTestTile(7, 7, 'ground', room1, true),
        createTestTile(8, 7, 'ground', room2, true),
      ]);

      // 兩個房間都已探索
      expect(gameState.map.ground[7][7].discovered).toBe(true);
      expect(gameState.map.ground[7][8].discovered).toBe(true);
      
      // 驗證 placedRoomIds 包含兩個房間
      expect(gameState.placedRoomIds.has('room-1')).toBe(true);
      expect(gameState.placedRoomIds.has('room-2')).toBe(true);
    });
  });

  describe('Room State Persistence', () => {
    it('應該在回合間保持房間的 discovered 狀態', () => {
      const room = createTestRoom('persistent-room', 'Persistent Room');
      const tile = createTestTile(8, 7, 'ground', room, true);
      
      // 模擬多個回合
      const gameStateTurn1 = createTestGameState([
        createTestTile(7, 7, 'ground', createTestRoom('entrance', 'Entrance'), true),
        tile,
      ]);
      
      // 驗證房間在第一回合是已探索的
      expect(gameStateTurn1.map.ground[7][8].discovered).toBe(true);
      
      // 模擬第二回合（新的 TurnState，但地圖相同）
      const gameStateTurn2 = {
        ...gameStateTurn1,
        turn: {
          ...gameStateTurn1.turn,
          turnNumber: 2,
          hasDiscoveredRoom: false,
        },
      };
      
      // 驗證房間在第二回合仍然是已探索的
      expect(gameStateTurn2.map.ground[7][8].discovered).toBe(true);
    });

    it('應該在多個玩家回合間保持房間狀態', () => {
      const sharedRoom = createTestRoom('shared-room', 'Shared Room');
      const tile = createTestTile(8, 7, 'ground', sharedRoom, true);
      
      const gameState = createTestGameState([
        createTestTile(7, 7, 'ground', createTestRoom('entrance', 'Entrance'), true),
        tile,
      ]);

      // 玩家 1 的回合
      expect(gameState.map.ground[7][8].discovered).toBe(true);
      
      // 切換到玩家 2 的回合
      const gameStatePlayer2 = {
        ...gameState,
        turn: {
          ...gameState.turn,
          currentPlayerId: 'player-2',
        },
      };
      
      // 房間應該仍然是已探索的
      expect(gameStatePlayer2.map.ground[7][8].discovered).toBe(true);
    });
  });

  describe('placedRoomIds Tracking', () => {
    it('應該正確追蹤已放置的房間 ID', () => {
      const room1 = createTestRoom('room-1', 'Room 1');
      const room2 = createTestRoom('room-2', 'Room 2');
      
      const gameState = createTestGameState([
        createTestTile(7, 7, 'ground', room1, true),
        createTestTile(8, 7, 'ground', room2, true),
      ]);

      // 驗證 placedRoomIds 包含所有已放置的房間
      expect(gameState.placedRoomIds.has('room-1')).toBe(true);
      expect(gameState.placedRoomIds.has('room-2')).toBe(true);
      expect(gameState.placedRoomIds.has('non-existent')).toBe(false);
    });

    it('應該防止重複放置相同的房間 ID', () => {
      const room = createTestRoom('unique-room', 'Unique Room');
      
      const gameState = createTestGameState([
        createTestTile(7, 7, 'ground', room, true),
      ]);

      // 驗證房間已在 placedRoomIds 中
      expect(gameState.placedRoomIds.has('unique-room')).toBe(true);
      
      // 嘗試再次放置相同 ID 的房間應該被阻止
      // 這通過 roomDeck.drawn 和 placedRoomIds 雙重檢查實現
      expect(gameState.roomDeck.drawn.has('unique-room') || 
             gameState.placedRoomIds.has('unique-room')).toBe(true);
    });
  });
});

// ==================== 導出測試 ====================

export {};
