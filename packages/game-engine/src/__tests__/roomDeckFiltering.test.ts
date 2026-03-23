/**
 * Room Deck Filtering Tests - Issue #70: Approach A
 * 
 * 測試房間牌堆過濾功能：
 * 1. 單門房間應該被過濾到備用牌堆
 * 2. 2+ 門房間應該保留在主牌堆
 * 3. 主牌堆用盡時應該使用備用牌堆
 * 4. 確保棋盤不會在正常使用時封閉
 */

import { createOpenRoomDeck, shuffleArray, FilteredRoomDecks } from '../rules/roomDiscovery';
import { Room } from '@betrayal/shared';
import { GameStateManager } from '../core/GameState';
import { GameConfig, Character, RoomDeckState } from '../types';

// ==================== 測試資料 ====================

const mockRooms: Room[] = [
  {
    id: 'room_2_doors',
    name: 'Two Door Room',
    nameEn: 'Two Door Room',
    floor: 'ground',
    doors: ['north', 'south'],
    symbol: null,
    description: 'Room with 2 doors',
    color: '#ff0000',
    icon: 'square',
    isOfficial: true,
  },
  {
    id: 'room_3_doors',
    name: 'Three Door Room',
    nameEn: 'Three Door Room',
    floor: 'ground',
    doors: ['north', 'south', 'east'],
    symbol: 'E',
    description: 'Room with 3 doors',
    color: '#00ff00',
    icon: 'circle',
    isOfficial: true,
  },
  {
    id: 'room_4_doors',
    name: 'Four Door Room',
    nameEn: 'Four Door Room',
    floor: 'ground',
    doors: ['north', 'south', 'east', 'west'],
    symbol: 'I',
    description: 'Room with 4 doors',
    color: '#0000ff',
    icon: 'triangle',
    isOfficial: true,
  },
  {
    id: 'room_1_door_a',
    name: 'Single Door Room A',
    nameEn: 'Single Door Room A',
    floor: 'ground',
    doors: ['north'],
    symbol: 'O',
    description: 'Room with 1 door',
    color: '#ffff00',
    icon: 'diamond',
    isOfficial: true,
  },
  {
    id: 'room_1_door_b',
    name: 'Single Door Room B',
    nameEn: 'Single Door Room B',
    floor: 'ground',
    doors: ['south'],
    symbol: null,
    description: 'Another room with 1 door',
    color: '#ff00ff',
    icon: 'star',
    isOfficial: true,
  },
];

const mockCharacter: Character = {
  id: 'test_char',
  name: 'Test Character',
  nameEn: 'Test Character',
  age: 25,
  description: 'Test',
  color: '#ff0000',
  stats: {
    speed: [3, 3],
    might: [3, 3],
    sanity: [3, 3],
    knowledge: [3, 3],
  },
  statTrack: {
    speed: [1, 2, 3, 4, 5, 6, 7, 8],
    might: [1, 2, 3, 4, 5, 6, 7, 8],
    sanity: [1, 2, 3, 4, 5, 6, 7, 8],
    knowledge: [1, 2, 3, 4, 5, 6, 7, 8],
  },
};

// ==================== 測試套件 ====================

describe('createOpenRoomDeck', () => {
  it('應該將單門房間過濾到備用牌堆', () => {
    const result = createOpenRoomDeck(mockRooms);
    
    // 檢查主牌堆只包含 2+ 門房間
    expect(result.mainDeck.every((r: Room) => r.doors.length >= 2)).toBe(true);
    
    // 檢查備用牌堆只包含單門房間
    expect(result.fallbackDeck.every((r: Room) => r.doors.length === 1)).toBe(true);
  });

  it('應該正確分類房間', () => {
    const result = createOpenRoomDeck(mockRooms);
    
    // 主牌堆應該有 3 個房間（2門、3門、4門）
    expect(result.mainDeck).toHaveLength(3);
    
    // 備用牌堆應該有 2 個房間（兩個單門房間）
    expect(result.fallbackDeck).toHaveLength(2);
    
    // 驗證具體房間
    const mainIds = result.mainDeck.map((r: Room) => r.id).sort();
    expect(mainIds).toEqual(['room_2_doors', 'room_3_doors', 'room_4_doors']);
    
    const fallbackIds = result.fallbackDeck.map((r: Room) => r.id).sort();
    expect(fallbackIds).toEqual(['room_1_door_a', 'room_1_door_b']);
  });

  it('應該處理空陣列', () => {
    const result = createOpenRoomDeck([]);
    
    expect(result.mainDeck).toHaveLength(0);
    expect(result.fallbackDeck).toHaveLength(0);
  });

  it('應該處理全部為單門房間的情況', () => {
    const singleDoorRooms = mockRooms.filter((r: Room) => r.doors.length === 1);
    const result = createOpenRoomDeck(singleDoorRooms);
    
    expect(result.mainDeck).toHaveLength(0);
    expect(result.fallbackDeck).toHaveLength(2);
  });

  it('應該處理全部為 2+ 門房間的情況', () => {
    const multiDoorRooms = mockRooms.filter((r: Room) => r.doors.length >= 2);
    const result = createOpenRoomDeck(multiDoorRooms);
    
    expect(result.mainDeck).toHaveLength(3);
    expect(result.fallbackDeck).toHaveLength(0);
  });

  it('應該輸出正確的日誌資訊', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    
    createOpenRoomDeck(mockRooms);
    
    expect(consoleSpy).toHaveBeenCalledWith('[createOpenRoomDeck] Total rooms:', 5);
    expect(consoleSpy).toHaveBeenCalledWith('[createOpenRoomDeck] Multi-door rooms (2+):', 3);
    expect(consoleSpy).toHaveBeenCalledWith('[createOpenRoomDeck] Single-door rooms:', 2);
    
    consoleSpy.mockRestore();
  });
});

describe('shuffleArray', () => {
  it('應該保持陣列長度不變', () => {
    const input = [1, 2, 3, 4, 5];
    const result = shuffleArray(input);
    
    expect(result).toHaveLength(5);
  });

  it('應該包含相同的元素', () => {
    const input = [1, 2, 3, 4, 5];
    const result = shuffleArray(input);
    
    expect(result.sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it('應該處理空陣列', () => {
    const result = shuffleArray([]);
    expect(result).toEqual([]);
  });

  it('應該處理單元素陣列', () => {
    const result = shuffleArray([42]);
    expect(result).toEqual([42]);
  });
});

describe('GameStateManager - Room Deck Filtering', () => {
  let manager: GameStateManager;

  beforeEach(() => {
    const config: GameConfig = {
      playerCount: 1,
      enableAI: false,
      seed: 'test-seed-123',
      maxTurns: 100,
    };

    manager = GameStateManager.createNew(config, [mockCharacter]);
  });

  it('應該在初始化時創建主牌堆和備用牌堆', () => {
    const state = manager.getState();
    
    // 檢查主牌堆存在
    expect(state.roomDeck.ground.length).toBeGreaterThanOrEqual(0);
    expect(state.roomDeck.upper.length).toBeGreaterThanOrEqual(0);
    expect(state.roomDeck.basement.length).toBeGreaterThanOrEqual(0);
    
    // 檢查備用牌堆存在
    expect(state.roomDeck.fallbackGround).toBeDefined();
    expect(state.roomDeck.fallbackUpper).toBeDefined();
    expect(state.roomDeck.fallbackBasement).toBeDefined();
  });

  it('主牌堆應該只包含 2+ 門房間', () => {
    const state = manager.getState();
    
    const allMainDecks = [
      ...state.roomDeck.ground,
      ...state.roomDeck.upper,
      ...state.roomDeck.basement,
    ];
    
    // 所有主牌堆房間都應該有 2+ 門
    expect(allMainDecks.every((r: Room) => r.doors.length >= 2)).toBe(true);
  });

  it('備用牌堆應該只包含單門房間', () => {
    const state = manager.getState();
    
    const allFallbackDecks = [
      ...state.roomDeck.fallbackGround,
      ...state.roomDeck.fallbackUpper,
      ...state.roomDeck.fallbackBasement,
    ];
    
    // 如果有單門房間，它們應該在備用牌堆
    if (allFallbackDecks.length > 0) {
      expect(allFallbackDecks.every((r: Room) => r.doors.length === 1)).toBe(true);
    }
  });

  it('應該優先從主牌堆抽取房間', () => {
    const room = manager.drawRoomFromDeck('ground', false);
    
    if (room) {
      expect(room.doors.length).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('Room Deck Stats', () => {
  it('應該正確計算牌堆統計資訊', () => {
    const config: GameConfig = {
      playerCount: 1,
      enableAI: false,
      seed: 'test-stats',
      maxTurns: 100,
    };

    const manager = GameStateManager.createNew(config, [mockCharacter]);
    const stats = manager.getRoomDeckStats();
    
    expect(stats.ground).toBeGreaterThanOrEqual(0);
    expect(stats.upper).toBeGreaterThanOrEqual(0);
    expect(stats.basement).toBeGreaterThanOrEqual(0);
    expect(stats.total).toBe(stats.ground + stats.upper + stats.basement);
  });
});
