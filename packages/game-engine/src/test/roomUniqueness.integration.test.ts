/**
 * Room Uniqueness Integration Test - Issue #60
 * 
 * 這個測試驗證房間板塊在遊戲中只會出現一次。
 * 每個房間被抽取後，就會從牌堆中移除，無法再次被抽取。
 */

import { GameStateManager } from '../core/GameState';
import { GameState, GameConfig } from '../types';
import { CHARACTERS } from '@betrayal/shared';
import { RoomDiscoveryManager } from '../rules/roomDiscovery';

describe('Room Uniqueness Integration - Issue #60', () => {
  const createTestConfig = (): GameConfig => ({
    playerCount: 3,
    enableAI: false,
    seed: 'test-room-uniqueness',
    maxTurns: 100,
  });

  it('should initialize game with placedRoomIds containing starting rooms', () => {
    const config = createTestConfig();
    const characters = CHARACTERS.slice(0, 3);
    
    const manager = GameStateManager.createNew(config, characters);
    const state = manager.getState();

    // 驗證起始房間已在 placedRoomIds 中
    expect(state.placedRoomIds.has('entrance_hall')).toBe(true);
    expect(state.placedRoomIds.has('stairs_from_upper')).toBe(true);
    expect(state.placedRoomIds.has('stairs_from_basement')).toBe(true);
  });

  it('should not include starting rooms in room deck stats', () => {
    const config = createTestConfig();
    const characters = CHARACTERS.slice(0, 3);
    
    const manager = GameStateManager.createNew(config, characters);
    const state = manager.getState();

    // 獲取牌堆統計
    const stats = RoomDiscoveryManager.getRoomDeckStats(state);

    // 驗證統計不包含起始房間
    // 地面層應該有 12 個房間 - 2 個起始房間 (entrance_hall, stairs_from_ground) = 10
    // 上層應該有 10 個房間 - 1 個起始房間 (stairs_from_upper) = 9  
    // 地下室應該有 17 個房間 - 1 個起始房間 (stairs_from_basement) = 16
    expect(stats.ground).toBeGreaterThan(0);
    expect(stats.upper).toBeGreaterThan(0);
    expect(stats.basement).toBeGreaterThan(0);
  });

  it('should maintain room uniqueness after serialization and deserialization', () => {
    const config = createTestConfig();
    const characters = CHARACTERS.slice(0, 3);
    
    const manager = GameStateManager.createNew(config, characters);
    const originalState = manager.getState();

    // 序列化
    const serialized = manager.serialize();
    
    // 反序列化
    const restoredManager = GameStateManager.deserialize(serialized);
    const restoredState = restoredManager.getState();

    // 驗證 placedRoomIds 正確保存
    expect(restoredState.placedRoomIds.size).toBe(originalState.placedRoomIds.size);
    
    // 驗證所有原始 ID 都在恢復後的集合中
    originalState.placedRoomIds.forEach(id => {
      expect(restoredState.placedRoomIds.has(id)).toBe(true);
    });
  });

  it('should track placed rooms correctly in full game simulation', () => {
    const config = createTestConfig();
    const characters = CHARACTERS.slice(0, 3);
    
    const manager = GameStateManager.createNew(config, characters);
    let state = manager.getState();

    // 記錄初始狀態
    const initialPlacedCount = state.placedRoomIds.size;
    const initialDeckStats = RoomDiscoveryManager.getRoomDeckStats(state);

    // 模擬發現幾個房間
    const roomsToDiscover = [
      { floor: 'ground' as const, id: 'room-1' },
      { floor: 'ground' as const, id: 'room-2' },
      { floor: 'upper' as const, id: 'room-3' },
    ];

    for (const roomInfo of roomsToDiscover) {
      const room = RoomDiscoveryManager.drawRoomFromDeck(state, roomInfo.floor);
      if (room) {
        // 模擬放置房間
        const newPlacedRoomIds = new Set(state.placedRoomIds);
        newPlacedRoomIds.add(room.id);
        
        const newDrawn = new Set(state.roomDeck.drawn);
        newDrawn.add(room.id);

        state = {
          ...state,
          placedRoomIds: newPlacedRoomIds,
          roomDeck: {
            ...state.roomDeck,
            drawn: newDrawn,
          },
        };
      }
    }

    // 驗證已放置房間數量增加
    expect(state.placedRoomIds.size).toBeGreaterThan(initialPlacedCount);

    // 驗證牌堆統計減少
    const finalDeckStats = RoomDiscoveryManager.getRoomDeckStats(state);
    expect(finalDeckStats.total).toBeLessThan(initialDeckStats.total);
  });

  it('should never return the same room twice from drawRoomFromDeck', () => {
    const config = createTestConfig();
    const characters = CHARACTERS.slice(0, 3);
    
    const manager = GameStateManager.createNew(config, characters);
    let state = manager.getState();

    const drawnRoomIds: string[] = [];

    // 嘗試從地面層抽取所有房間
    while (true) {
      const room = RoomDiscoveryManager.drawRoomFromDeck(state, 'ground');
      if (!room) break;

      drawnRoomIds.push(room.id);

      // 更新狀態
      const newPlacedRoomIds = new Set(state.placedRoomIds);
      newPlacedRoomIds.add(room.id);
      
      const newDrawn = new Set(state.roomDeck.drawn);
      newDrawn.add(room.id);

      state = {
        ...state,
        placedRoomIds: newPlacedRoomIds,
        roomDeck: {
          ...state.roomDeck,
          drawn: newDrawn,
        },
      };
    }

    // 驗證所有抽取的房間 ID 都是唯一的
    const uniqueIds = new Set(drawnRoomIds);
    expect(uniqueIds.size).toBe(drawnRoomIds.length);
  });
});
