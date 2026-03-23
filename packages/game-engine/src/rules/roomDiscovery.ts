/**
 * Room Discovery System - 房間發現系統
 * 
 * Rulebook References:
 * - Page 12: Room Discovery
 * - Page 12: "When you move through an open door without a room, discover a new room"
 * - Page 12: "Discovery automatically ends your turn"
 * 
 * 這個模組實作 Betrayal 桌遊的房間發現規則：
 * 1. 當玩家穿過沒有房間的開門時，發現新房間
 * 2. 從對應樓層牌堆抽取房間板塊
 * 3. 自動旋轉房間以匹配門的位置
 * 4. 發現後自動結束回合
 * 5. 根據房間符號抽卡（E/I/O）
 */

import {
  GameState,
  Player,
  Position3D,
  Direction,
  Tile,
  Floor,
  DIRECTION_DELTAS,
  DiscoverAction,
  CardType,
} from '../types';
import { Room, SymbolType, Floor as RoomFloor } from '@betrayal/shared';
import { TurnManager } from './turn';
import { MovementValidator } from './movement';

// ==================== 類型定義 ====================

/** 房間發現結果 */
export interface RoomDiscoveryResult {
  success: boolean;
  error?: string;
  room?: Room;
  position?: Position3D;
  rotation?: 0 | 90 | 180 | 270;
  cardDrawRequired?: {
    type: CardType;
    requiresHauntCheck: boolean;
  } | null;
  /** 是否經過修改（如添加門）以確保棋盤保持開放 */
  wasModified?: boolean;
  /** 嘗試次數（用於調試和日誌） */
  attempts?: number;
}

/** 過濾後的房間牌堆（Issue #70: Approach A） */
export interface FilteredRoomDecks {
  /** 主牌堆：2+ 門房間 */
  mainDeck: Room[];
  /** 備用牌堆：單門房間（最後手段） */
  fallbackDeck: Room[];
}

/** 旋轉後的門位置 */
export interface RotatedDoors {
  original: Direction[];
  rotated: Direction[];
  rotation: 0 | 90 | 180 | 270;
}

/** 房間牌堆統計 */
export interface RoomDeckStats {
  ground: number;
  upper: number;
  basement: number;
  total: number;
}

// ==================== 常數 ====================

/** 有效的旋轉角度 */
export const VALID_ROTATIONS: (0 | 90 | 180 | 270)[] = [0, 90, 180, 270];

// ==================== 牌堆過濾函數（Issue #70: Approach A） ====================

/**
 * 創建開放式房間牌堆
 * Issue #70: Approach A - 在遊戲初始化時過濾單門房間
 * 
 * 邏輯：
 * - 主牌堆：只包含 2+ 門的房間（防止棋盤封閉）
 * - 備用牌堆：單門房間（僅在主牌堆用盡時使用）
 * 
 * @param rooms 原始房間列表
 * @returns 過濾後的牌堆（主牌堆 + 備用牌堆）
 */
export function createOpenRoomDeck(rooms: Room[]): FilteredRoomDecks {
  // 分離單門房間和 2+ 門房間
  const singleDoorRooms: Room[] = [];
  const multiDoorRooms: Room[] = [];
  
  for (const room of rooms) {
    if (room.doors.length === 1) {
      singleDoorRooms.push(room);
    } else {
      multiDoorRooms.push(room);
    }
  }
  
  console.log('[createOpenRoomDeck] Total rooms:', rooms.length);
  console.log('[createOpenRoomDeck] Multi-door rooms (2+):', multiDoorRooms.length);
  console.log('[createOpenRoomDeck] Single-door rooms:', singleDoorRooms.length);
  
  return {
    mainDeck: multiDoorRooms,
    fallbackDeck: singleDoorRooms,
  };
}

/**
 * 洗牌函數（Fisher-Yates）
 * @param array 要洗牌的陣列
 * @returns 洗牌後的新陣列
 */
export function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** 方向旋轉映射（順時針） */
const DIRECTION_ROTATION_MAP: Record<Direction, Record<0 | 90 | 180 | 270, Direction>> = {
  north: { 0: 'north', 90: 'east', 180: 'south', 270: 'west' },
  east: { 0: 'east', 90: 'south', 180: 'west', 270: 'north' },
  south: { 0: 'south', 90: 'west', 180: 'north', 270: 'east' },
  west: { 0: 'west', 90: 'north', 180: 'east', 270: 'south' },
};

// ==================== 房間發現管理器 ====================

/**
 * 房間發現管理器
 * 負責管理房間發現的完整流程
 * 
 * Rulebook Page 12: Room Discovery
 */
export class RoomDiscoveryManager {
  /**
   * 發現新房間
   * Rulebook Page 12: "When you move through an open door without a room, discover a new room"
   * 
   * @param state 當前遊戲狀態
   * @param playerId 玩家 ID
   * @param direction 發現方向（從當前房間出發的方向）
   * @returns 發現結果
   */
  static discoverRoom(
    state: GameState,
    playerId: string,
    direction: Direction
  ): RoomDiscoveryResult {
    // 驗證是否為當前玩家
    if (!TurnManager.isCurrentPlayer(state, playerId)) {
      return { success: false, error: 'Not your turn' };
    }

    // 驗證回合是否已結束
    if (state.turn.hasEnded) {
      return { success: false, error: 'Turn has already ended' };
    }

    // 驗證是否已經發現過房間（每回合只能發現一次）
    if (state.turn.hasDiscoveredRoom) {
      return { success: false, error: 'Already discovered a room this turn' };
    }

    const player = state.players.find(p => p.id === playerId);
    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    // 驗證是否有足夠的移動點數
    if (state.turn.movesRemaining < 1) {
      return { success: false, error: 'Not enough movement points' };
    }

    // 取得當前房間
    const currentTile = this.getTileAt(state, player.position);
    if (!currentTile || !currentTile.room) {
      return { success: false, error: 'Current room not found' };
    }

    // 驗證當前房間是否有門通往該方向
    // 使用 getValidExploreDirections 確保只能通過現有門探索
    const validDirections = getValidExploreDirections(currentTile.room);
    if (!validDirections.includes(direction)) {
      return { success: false, error: 'No door in that direction' };
    }

    // 計算新房間位置
    const delta = DIRECTION_DELTAS[direction];
    const newPosition: Position3D = {
      x: player.position.x + delta.x,
      y: player.position.y + delta.y,
      floor: player.position.floor,
    };

    // 驗證位置是否有效
    if (!this.isValidPosition(state, newPosition)) {
      return { success: false, error: 'Invalid position for new room' };
    }

    // 驗證位置是否已被佔用
    const existingTile = this.getTileAt(state, newPosition);
    if (existingTile && existingTile.room) {
      return { success: false, error: 'Position already has a room' };
    }

    // 使用 drawRoomForExploration 抽取房間（確保棋盤不會封閉）
    const explorationResult = drawRoomForExploration(
      state,
      newPosition.floor,
      direction,
      10 // 最大嘗試次數
    );

    if (!explorationResult.success) {
      return {
        success: false,
        error: explorationResult.error || 'Failed to draw room',
      };
    }

    return {
      success: true,
      room: explorationResult.room,
      position: explorationResult.position,
      rotation: explorationResult.rotation,
      cardDrawRequired: explorationResult.cardDrawRequired,
      wasModified: explorationResult.wasModified,
      attempts: explorationResult.attempts,
    };
  }

  /**
   * 從對應樓層牌堆抽取房間
   * Rulebook Page 12: "Draw a room tile from the corresponding floor deck"
   * 
   * Issue #70: Approach A - 優先從主牌堆（2+ 門）抽取，用盡時使用備用牌堆
   * 
   * 重要：每個房間在遊戲中只能出現一次。
   * 此方法會檢查已放置的房間 ID，確保不會抽到重複的房間。
   * 
   * @param state 當前遊戲狀態
   * @param floor 樓層
   * @param useFallback 是否允許使用備用牌堆（預設 false）
   * @returns 抽取的房間，如果牌堆為空或所有房間都已放置則返回 null
   */
  static drawRoomFromDeck(state: GameState, floor: Floor, useFallback: boolean = false): Room | null {
    const deck = state.roomDeck[floor];
    
    // 找到第一個未被抽取且未被放置的房間
    // 同時檢查 roomDeck.drawn 和 placedRoomIds 以確保唯一性
    const availableRoom = deck.find((r: Room) => {
      const isDrawn = state.roomDeck.drawn.has(r.id);
      const isPlaced = state.placedRoomIds.has(r.id);
      return !isDrawn && !isPlaced;
    });
    
    if (availableRoom) {
      return availableRoom;
    }
    
    // 主牌堆已空，嘗試使用備用牌堆（Issue #70: Approach A）
    if (useFallback) {
      const fallbackKey = `fallback${floor.charAt(0).toUpperCase()}${floor.slice(1)}` as 'fallbackGround' | 'fallbackUpper' | 'fallbackBasement';
      const fallbackDeck = state.roomDeck[fallbackKey];
      
      if (fallbackDeck && fallbackDeck.length > 0) {
        const fallbackRoom = fallbackDeck.find((r: Room) => {
          const isDrawn = state.roomDeck.drawn.has(r.id);
          const isPlaced = state.placedRoomIds.has(r.id);
          return !isDrawn && !isPlaced;
        });
        
        if (fallbackRoom) {
          console.log(`[drawRoomFromDeck] Using fallback deck for ${floor}: ${fallbackRoom.name}`);
          return fallbackRoom;
        }
      }
    }

    return null;
  }

  /**
   * 計算房間旋轉角度以匹配門位置
   * Rulebook Page 12: "Rotate the room to match door positions"
   * 
   * 邏輯：新房間必須有一個門通往當前房間的方向（即相反方向）
   * 我們需要旋轉新房間，使其有一個門朝向 entryDoor 的相反方向
   * 
   * @param room 要放置的房間
   * @param entryDoor 進入方向（從當前房間看）
   * @returns 最佳旋轉角度
   */
  static calculateRotation(
    room: Room,
    entryDoor: Direction
  ): 0 | 90 | 180 | 270 {
    const requiredDoor = OPPOSITE_DOOR[entryDoor];
    
    // 嘗試每個旋轉角度，找到第一個能匹配門位置的
    for (const rotation of VALID_ROTATIONS) {
      const rotatedDoors = this.rotateDoors(room.doors, rotation);
      if (rotatedDoors.includes(requiredDoor)) {
        return rotation;
      }
    }

    // 如果沒有找到匹配的旋轉（理論上不應該發生），返回 0
    // 這可能發生在房間沒有任何門的情況下
    return 0;
  }

  /**
   * 旋轉房間的門位置
   * 
   * @param doors 原始門位置
   * @param rotation 旋轉角度
   * @returns 旋轉後的門位置
   */
  static rotateDoors(
    doors: Direction[],
    rotation: 0 | 90 | 180 | 270
  ): Direction[] {
    return doors.map(door => DIRECTION_ROTATION_MAP[door][rotation]);
  }

  /**
   * 旋轉整個房間
   * 
   * @param room 原始房間
   * @param entryDoor 進入方向
   * @returns 旋轉後的房間（新物件）
   */
  static rotateRoomToMatchDoors(
    room: Room,
    entryDoor: Direction
  ): Room & { rotation: 0 | 90 | 180 | 270 } {
    const rotation = this.calculateRotation(room, entryDoor);
    const rotatedDoors = this.rotateDoors(room.doors, rotation);

    return {
      ...room,
      doors: rotatedDoors,
      rotation,
    };
  }

  /**
   * 獲取房間牌堆
   * Rulebook Page 12: Floor-specific room decks
   * 
   * @param state 當前遊戲狀態
   * @param floor 樓層
   * @returns 該樓層的房間牌堆
   */
  static getRoomDeck(state: GameState, floor: Floor): Room[] {
    return state.roomDeck[floor];
  }

  /**
   * 獲取房間牌堆統計
   * 
   * @param state 當前遊戲狀態
   * @returns 各樓層牌堆剩餘數量
   */
  static getRoomDeckStats(state: GameState): RoomDeckStats {
    const countRemaining = (floor: Floor): number => {
      return state.roomDeck[floor].filter(r => {
        const isDrawn = state.roomDeck.drawn.has(r.id);
        const isPlaced = state.placedRoomIds.has(r.id);
        return !isDrawn && !isPlaced;
      }).length;
    };

    const ground = countRemaining('ground');
    const upper = countRemaining('upper');
    const basement = countRemaining('basement');

    return {
      ground,
      upper,
      basement,
      total: ground + upper + basement,
    };
  }

  /**
   * 獲取卡抽需求
   * Rulebook Page 12: Room symbols (E/I/O)
   * 
   * @param room 房間
   * @returns 卡抽需求，如果房間沒有符號則返回 null
   */
  static getCardDrawRequirement(room: Room): {
    type: CardType;
    requiresHauntCheck: boolean;
  } | null {
    switch (room.symbol) {
      case 'E':
        return { type: 'event', requiresHauntCheck: false };
      case 'I':
        return { type: 'item', requiresHauntCheck: false };
      case 'O':
        return { type: 'omen', requiresHauntCheck: true };
      case null:
      case undefined:
        return null;
      default:
        return null;
    }
  }

  /**
   * 檢查是否可以發現新房間
   * 使用 getValidExploreDirections 確保只能通過現有門探索
   * 
   * @param state 當前遊戲狀態
   * @param playerId 玩家 ID
   * @returns 可發現的方向列表
   */
  static getDiscoverableDirections(
    state: GameState,
    playerId: string
  ): Direction[] {
    const player = state.players.find(p => p.id === playerId);
    if (!player) return [];

    // 檢查是否已發現房間
    if (state.turn.hasDiscoveredRoom) return [];

    // 檢查是否有足夠的移動點數
    if (state.turn.movesRemaining < 1) return [];

    // 檢查是否為當前玩家
    if (!TurnManager.isCurrentPlayer(state, playerId)) return [];

    const currentTile = this.getTileAt(state, player.position);
    if (!currentTile || !currentTile.room) return [];

    // 使用 getValidExploreDirections 取得有效的探索方向
    // 這確保了玩家只能通過當前房間現有的門進行探索
    const validDirections = getValidExploreDirections(currentTile.room);
    const discoverable: Direction[] = [];

    for (const dir of validDirections) {
      // 計算新位置
      const delta = DIRECTION_DELTAS[dir];
      const newPos: Position3D = {
        x: player.position.x + delta.x,
        y: player.position.y + delta.y,
        floor: player.position.floor,
      };

      // 檢查位置是否有效
      if (!this.isValidPosition(state, newPos)) continue;

      // 檢查位置是否已被佔用
      const existingTile = this.getTileAt(state, newPos);
      if (existingTile && existingTile.room) continue;

      discoverable.push(dir);
    }

    return discoverable;
  }

  /**
   * 檢查房間是否適合放置在指定位置
   * 考慮周圍已放置房間的門位置
   * 
   * @param state 當前遊戲狀態
   * @param position 位置
   * @param room 房間
   * @returns 是否適合放置
   */
  static canPlaceRoomAt(
    state: GameState,
    position: Position3D,
    room: Room
  ): boolean {
    // 檢查位置是否已被佔用
    const existingTile = this.getTileAt(state, position);
    if (existingTile && existingTile.room) {
      return false;
    }

    // 檢查周圍房間的門是否匹配
    const directions: Direction[] = ['north', 'south', 'east', 'west'];
    
    for (const dir of directions) {
      const delta = DIRECTION_DELTAS[dir];
      const neighborPos: Position3D = {
        x: position.x + delta.x,
        y: position.y + delta.y,
        floor: position.floor,
      };

      const neighborTile = this.getTileAt(state, neighborPos);
      if (neighborTile && neighborTile.room && neighborTile.discovered) {
        const oppositeDir = OPPOSITE_DOOR[dir];
        
        // 如果鄰居房間有門通往這個方向
        if (neighborTile.room.doors.includes(oppositeDir)) {
          // 這個房間必須有門通往鄰居
          if (!room.doors.includes(dir)) {
            return false;
          }
        }
      }
    }

    return true;
  }

  /**
   * 找出房間可以放置的所有有效旋轉角度
   * 
   * @param state 當前遊戲狀態
   * @param position 位置
   * @param room 房間
   * @returns 有效的旋轉角度列表
   */
  static getValidRotations(
    state: GameState,
    position: Position3D,
    room: Room
  ): (0 | 90 | 180 | 270)[] {
    const validRotations: (0 | 90 | 180 | 270)[] = [];

    for (const rotation of VALID_ROTATIONS) {
      const rotatedRoom = {
        ...room,
        doors: this.rotateDoors(room.doors, rotation),
      };

      if (this.canPlaceRoomAt(state, position, rotatedRoom)) {
        validRotations.push(rotation);
      }
    }

    return validRotations;
  }

  // ==================== 輔助方法 ====================

  /**
   * 取得指定位置的 Tile
   */
  private static getTileAt(state: GameState, position: Position3D): Tile | undefined {
    const floorMap = state.map[position.floor];
    if (!floorMap) return undefined;
    return floorMap[position.y]?.[position.x];
  }

  /**
   * 檢查位置是否有效
   */
  private static isValidPosition(state: GameState, position: Position3D): boolean {
    const floorMap = state.map[position.floor];
    if (!floorMap) return false;
    return position.y >= 0 && position.y < floorMap.length &&
           position.x >= 0 && position.x < floorMap[0].length;
  }
}

// ==================== 獨立匯出函數 ====================

/**
 * 旋轉房間以匹配門連接
 * 獨立函數版本，用於外部調用
 * 
 * @param room 要旋轉的房間板塊
 * @param entryDirection 進入方向（玩家從哪個方向來）
 * @returns 旋轉後的房間和旋轉角度
 */
export function rotateRoomForConnection(
  room: Room,
  entryDirection: Direction
): { room: Room & { rotation: 0 | 90 | 180 | 270 }; rotation: 0 | 90 | 180 | 270 } {
  const rotation = RoomDiscoveryManager.calculateRotation(room, entryDirection);
  const rotatedRoom = RoomDiscoveryManager.rotateRoomToMatchDoors(room, entryDirection);
  
  return {
    room: rotatedRoom,
    rotation,
  };
}

/**
 * 獲取未連接的門
 * Issue #66: 檢查房間在指定位置和旋轉後，還有哪些門未與相鄰房間連接
 * 
 * @param gameState 當前遊戲狀態
 * @param position 房間位置
 * @param room 房間
 * @param rotation 旋轉角度
 * @returns 未連接的門方向列表
 */
export function getUnconnectedDoors(
  gameState: GameState,
  position: { x: number; y: number },
  room: Room,
  rotation: number
): Direction[] {
  // 旋轉房間的門
  const normalizedRotation = ((rotation % 360) + 360) % 360 as 0 | 90 | 180 | 270;
  const rotatedDoors = RoomDiscoveryManager.rotateDoors(room.doors, normalizedRotation);
  
  const unconnected: Direction[] = [];
  
  for (const door of rotatedDoors) {
    const delta = DIRECTION_DELTAS[door];
    const neighborPos: Position3D = {
      x: position.x + delta.x,
      y: position.y + delta.y,
      floor: gameState.turn.currentPlayerId 
        ? gameState.players.find(p => p.id === gameState.turn.currentPlayerId)?.position.floor || 'ground'
        : 'ground',
    };
    
    // 檢查鄰居位置
    const floorMap = gameState.map[neighborPos.floor];
    if (!floorMap) {
      // 如果位置超出邊界，也算未連接
      unconnected.push(door);
      continue;
    }
    
    const neighborTile = floorMap[neighborPos.y]?.[neighborPos.x];
    
    // 如果鄰居位置沒有房間，這個門就是未連接的
    if (!neighborTile || !neighborTile.room || !neighborTile.discovered) {
      unconnected.push(door);
    }
  }
  
  return unconnected;
}

/**
 * 添加隨機門到房間
 * Issue #66: 當房間會封閉棋盤時，添加一個隨機方向的門
 * 
 * 重要：這個函數會優先選擇可以通向未探索區域的方向，確保棋盤保持開放
 * 
 * @param room 原始房間
 * @param gameState 當前遊戲狀態
 * @param position 房間位置
 * @param rotation 房間旋轉角度（預設 0）
 * @returns 添加門後的新房間
 */
export function addRandomDoor(
  room: Room,
  gameState: GameState,
  position: { x: number; y: number },
  rotation: 0 | 90 | 180 | 270 = 0
): Room {
  const allDirections: Direction[] = ['north', 'south', 'east', 'west'];
  
  console.log('[addRandomDoor] Input room:', room.name, 'doors:', room.doors, 'rotation:', rotation);
  
  // 計算旋轉後的門方向（原始房間座標系 -> 地圖座標系）
  const rotatedDoors = RoomDiscoveryManager.rotateDoors(room.doors, rotation);
  console.log('[addRandomDoor] Rotated doors:', rotatedDoors);
  
  // 找出在地圖座標系中，房間還沒有的門方向
  const missingDirections = allDirections.filter(dir => !rotatedDoors.includes(dir));
  console.log('[addRandomDoor] Missing directions:', missingDirections);
  
  if (missingDirections.length === 0) {
    // 房間已經有四個門，無法再添加
    console.log('[addRandomDoor] Room already has 4 doors, cannot add more');
    return room;
  }
  
  // 優先選擇可以通向未探索區域的方向
  const candidateDirections = missingDirections.filter(dir => {
    const delta = DIRECTION_DELTAS[dir];
    const neighborPos: Position3D = {
      x: position.x + delta.x,
      y: position.y + delta.y,
      floor: gameState.turn.currentPlayerId 
        ? gameState.players.find(p => p.id === gameState.turn.currentPlayerId)?.position.floor || 'ground'
        : 'ground',
    };
    
    // 檢查鄰居位置是否在地圖範圍內
    const floorMap = gameState.map[neighborPos.floor];
    if (!floorMap) return false;
    if (neighborPos.y < 0 || neighborPos.y >= floorMap.length) return false;
    if (neighborPos.x < 0 || neighborPos.x >= floorMap[0].length) return false;
    
    // 檢查鄰居位置是否未探索（這是我們想要的）
    const neighborTile = floorMap[neighborPos.y]?.[neighborPos.x];
    return !neighborTile || !neighborTile.room || !neighborTile.discovered;
  });
  
  console.log('[addRandomDoor] Candidate directions (unexplored neighbors):', candidateDirections);
  
  // 選擇方向：優先選擇可以通向未探索區域的方向，否則隨機選擇
  const directionsToChoose = candidateDirections.length > 0 ? candidateDirections : missingDirections;
  const randomIndex = Math.floor(Math.random() * directionsToChoose.length);
  const newDoorInMapCoords = directionsToChoose[randomIndex];
  
  // 將地圖座標系的方向轉換回原始房間座標系
  // 需要反向旋轉
  const reverseRotationMap: Record<0 | 90 | 180 | 270, Record<Direction, Direction>> = {
    0: { north: 'north', south: 'south', east: 'east', west: 'west' },
    90: { north: 'west', south: 'east', east: 'north', west: 'south' },
    180: { north: 'south', south: 'north', east: 'west', west: 'east' },
    270: { north: 'east', south: 'west', east: 'south', west: 'north' },
  };
  
  const newDoorInRoomCoords = reverseRotationMap[rotation][newDoorInMapCoords];
  
  console.log('[addRandomDoor] Adding door:', newDoorInMapCoords, '(map coords) ->', newDoorInRoomCoords, '(room coords)');
  
  // 創建新房間副本，添加新門（在原始房間座標系中）
  const modifiedRoom = {
    ...room,
    doors: [...room.doors, newDoorInRoomCoords],
  };
  
  console.log('[addRandomDoor] Output room doors:', modifiedRoom.doors);
  
  return modifiedRoom;
}

/**
 * 為探索抽取房間
 * Issue #70: Approach A - 使用預過濾的牌堆（主牌堆只包含 2+ 門房間）
 * 
 * 邏輯流程：
 * 1. 從主牌堆抽取房間（2+ 門）
 * 2. 旋轉以匹配門連接
 * 3. 檢查房間是否有未連接的門
 * 4. 如果有 → 放置房間
 * 5. 如果主牌堆已空 → 嘗試備用牌堆（單門房間）
 * 6. 如果達到最大嘗試次數 → 添加隨機門，放置房間
 * 
 * @param gameState 當前遊戲狀態
 * @param floor 樓層
 * @param entryDirection 進入方向
 * @param maxAttempts 最大嘗試次數（預設 10）
 * @returns 房間發現結果
 */
export function drawRoomForExploration(
  gameState: GameState,
  floor: Floor,
  entryDirection: Direction,
  maxAttempts: number = 10
): RoomDiscoveryResult {
  const discardedRooms: Room[] = [];
  let attempts = 0;
  let usedFallback = false;
  
  console.log('[RoomDiscovery] Starting drawRoomForExploration, floor:', floor, 'entryDirection:', entryDirection);
  
  // 獲取當前玩家位置（用於檢查未連接門）
  const currentPlayer = gameState.players.find(p => p.id === gameState.turn.currentPlayerId);
  const playerPosition = currentPlayer?.position;
  
  if (!playerPosition) {
    console.log('[RoomDiscovery] Error: Current player not found');
    return { success: false, error: 'Current player not found' };
  }
  
  // 計算新房間位置
  const delta = DIRECTION_DELTAS[entryDirection];
  const newPosition: Position3D = {
    x: playerPosition.x + delta.x,
    y: playerPosition.y + delta.y,
    floor: playerPosition.floor,
  };
  
  console.log('[RoomDiscovery] New position:', newPosition);
  
  while (attempts < maxAttempts) {
    attempts++;
    
    // 1. 從主牌堆抽取房間（2+ 門）
    // Issue #70: 主牌堆已預過濾，只包含 2+ 門房間
    const room = RoomDiscoveryManager.drawRoomFromDeck(gameState, floor, false);
    
    if (!room) {
      console.log('[RoomDiscovery] Main deck empty, trying fallback deck...');
      // 主牌堆已空，嘗試備用牌堆（單門房間）
      const fallbackRoom = RoomDiscoveryManager.drawRoomFromDeck(gameState, floor, true);
      
      if (fallbackRoom) {
        console.log('[RoomDiscovery] Using fallback room:', fallbackRoom.name);
        usedFallback = true;
        
        // 計算旋轉角度
        const rotation = RoomDiscoveryManager.calculateRotation(fallbackRoom, entryDirection);
        const cardDrawRequired = RoomDiscoveryManager.getCardDrawRequirement(fallbackRoom);
        
        return {
          success: true,
          room: fallbackRoom,
          position: newPosition,
          rotation,
          cardDrawRequired,
          wasModified: false,
          attempts,
        };
      }
      
      // 牌堆已空，將丟棄的房間放回牌堆再試一次
      if (discardedRooms.length > 0) {
        console.log('[RoomDiscovery] Recycling discarded rooms:', discardedRooms.length);
        // 重新建立牌堆狀態（移除 drawn 標記）
        const newDrawn = new Set(gameState.roomDeck.drawn);
        for (const discardedRoom of discardedRooms) {
          newDrawn.delete(discardedRoom.id);
        }
        gameState = {
          ...gameState,
          roomDeck: {
            ...gameState.roomDeck,
            drawn: newDrawn,
          },
        };
        discardedRooms.length = 0; // 清空丟棄列表
        continue;
      }
      
      return { 
        success: false, 
        error: 'No more rooms available for this floor',
        attempts,
      };
    }
    
    console.log('[RoomDiscovery] Attempt', attempts, '- Room drawn:', room.name, 'doors:', room.doors);
    
    // 2. 計算旋轉角度以匹配門連接
    const rotation = RoomDiscoveryManager.calculateRotation(room, entryDirection);
    console.log('[RoomDiscovery] Calculated rotation:', rotation);
    
    // 3. 檢查房間是否有未連接的門
    const unconnectedDoors = getUnconnectedDoors(gameState, newPosition, room, rotation);
    console.log('[RoomDiscovery] Unconnected doors:', unconnectedDoors);
    
    if (unconnectedDoors.length > 0) {
      // 4. 有房間有未連接的門，可以放置
      const cardDrawRequired = RoomDiscoveryManager.getCardDrawRequirement(room);
      console.log('[RoomDiscovery] Success! Room has unconnected doors, placing room');
      
      return {
        success: true,
        room,
        position: newPosition,
        rotation,
        cardDrawRequired,
        wasModified: false,
        attempts,
      };
    }
    
    // 5. 房間會封閉棋盤，丟棄並重試
    console.log('[RoomDiscovery] Room would close board, discarding and retrying');
    discardedRooms.push(room);
    
    // 標記為已抽取（這樣下次不會抽到同一個）
    const newDrawn = new Set(gameState.roomDeck.drawn);
    newDrawn.add(room.id);
    gameState = {
      ...gameState,
      roomDeck: {
        ...gameState.roomDeck,
        drawn: newDrawn,
      },
    };
  }
  
  // 6. 達到最大嘗試次數，添加隨機門
  console.log('[RoomDiscovery] Max attempts reached, adding random door to prevent closure');
  
  // 先嘗試使用最後一個丟棄的房間
  let finalRoom: Room | null = discardedRooms[discardedRooms.length - 1] || null;
  
  if (!finalRoom) {
    // 如果沒有丟棄的房間，嘗試再抽一個（包括備用牌堆）
    finalRoom = RoomDiscoveryManager.drawRoomFromDeck(gameState, floor, true);
  }
  
  if (!finalRoom) {
    return { 
      success: false, 
      error: 'Unable to find a suitable room after maximum attempts',
      attempts,
    };
  }
  
  // 計算旋轉角度（在添加門之前，基於原始房間）
  const rotation = RoomDiscoveryManager.calculateRotation(finalRoom, entryDirection);
  console.log('[RoomDiscovery] Calculated rotation for final room:', rotation);
  
  // 添加隨機門（傳入旋轉角度，確保門添加在正確的位置）
  const modifiedRoom = addRandomDoor(finalRoom, gameState, newPosition, rotation);
  console.log('[RoomDiscovery] Modified room doors:', modifiedRoom.doors);
  
  // 驗證修改後的房間確實有未連接的門
  const unconnectedAfterModification = getUnconnectedDoors(gameState, newPosition, modifiedRoom, rotation);
  console.log('[RoomDiscovery] Unconnected doors after modification:', unconnectedAfterModification);
  
  if (unconnectedAfterModification.length === 0) {
    console.warn('[RoomDiscovery] WARNING: Modified room still has no unconnected doors!');
  }
  
  const cardDrawRequired = RoomDiscoveryManager.getCardDrawRequirement(modifiedRoom);
  
  console.log('[drawRoomForExploration] wasModified: true');
  console.log('[drawRoomForExploration] Final doors:', modifiedRoom.doors);
  
  return {
    success: true,
    room: modifiedRoom,
    position: newPosition,
    rotation,
    cardDrawRequired,
    wasModified: true, // 標記為已修改
    attempts,
  };
}

/**
 * 旋轉門方向陣列
 * 獨立函數版本
 * 
 * @param doors 原始門方向陣列
 * @param rotation 旋轉角度（0, 90, 180, 270）
 * @returns 旋轉後的門方向陣列
 */
export function rotateDoors(
  doors: Direction[],
  rotation: number
): Direction[] {
  // 驗證旋轉角度
  const normalizedRotation = ((rotation % 360) + 360) % 360;
  if (!VALID_ROTATIONS.includes(normalizedRotation as 0 | 90 | 180 | 270)) {
    throw new Error(`Invalid rotation: ${rotation}. Must be 0, 90, 180, or 270.`);
  }
  
  return RoomDiscoveryManager.rotateDoors(doors, normalizedRotation as 0 | 90 | 180 | 270);
}

// ==================== 門連接驗證函數 ====================

/**
 * 取得當前房間有效的探索方向
 * Rulebook Page 12: "When you move through an open door without a room, discover a new room"
 * 
 * 玩家只能通過當前房間現有的門進行探索
 * 例如：房間有北/東門 → 只能向北/東探索
 * 
 * @param currentRoom 當前房間
 * @returns 有效的探索方向列表
 */
export function getValidExploreDirections(currentRoom: Room): Direction[] {
  // 玩家只能通過當前房間現有的門進行探索
  return [...currentRoom.doors];
}

/**
 * 門方向對應表
 * 用於驗證兩個房間之間的門是否匹配
 */
export const OPPOSITE_DOOR: Record<Direction, Direction> = {
  north: 'south',
  south: 'north',
  east: 'west',
  west: 'east',
};

/**
 * 驗證門連接是否有效
 * Rulebook Page 12: "Rotate the room to match door positions"
 * 
 * 探索邏輯：
 * - 從當前房間向某方向探索時，當前房間必須有該方向的門
 * - 新房間必須有相反方向的門（以便連接）
 * - 新房間會自動旋轉以對齊門位置
 * 
 * @param source 來源房間（當前房間）
 * @param target 目標房間（新房間）
 * @param direction 探索方向（從來源房間看）
 * @returns 是否為有效的門連接
 */
export function validateDoorConnection(
  source: Room,
  target: Room,
  direction: Direction
): boolean {
  // 1. 來源房間必須有通往該方向的門
  if (!source.doors.includes(direction)) {
    return false;
  }

  // 2. 目標房間必須有相反方向的門（才能連接）
  const oppositeDirection = OPPOSITE_DOOR[direction];
  
  // 檢查目標房間是否有任何門可以旋轉後變成相反方向
  // 由於房間可以旋轉，只要目標房間有門，就可以旋轉來匹配
  // 但如果目標房間完全沒有門，則無法連接
  if (target.doors.length === 0) {
    return false;
  }

  // 3. 檢查是否可以通過旋轉使目標房間的門對齊
  // 計算需要的旋轉角度
  for (const rotation of VALID_ROTATIONS) {
    const rotatedDoors = RoomDiscoveryManager.rotateDoors(target.doors, rotation);
    if (rotatedDoors.includes(oppositeDirection)) {
      return true;
    }
  }

  // 沒有找到匹配的旋轉角度
  return false;
}

/**
 * 計算連接兩個房間所需的旋轉角度
 * 
 * @param target 目標房間（新房間）
 * @param entryDirection 進入方向（從來源房間看）
 * @returns 所需的旋轉角度，如果無法連接則返回 null
 */
export function calculateConnectionRotation(
  target: Room,
  entryDirection: Direction
): 0 | 90 | 180 | 270 | null {
  const oppositeDirection = OPPOSITE_DOOR[entryDirection];
  
  for (const rotation of VALID_ROTATIONS) {
    const rotatedDoors = RoomDiscoveryManager.rotateDoors(target.doors, rotation);
    if (rotatedDoors.includes(oppositeDirection)) {
      return rotation;
    }
  }
  
  return null;
}

// ==================== 預設匯出 ====================

export default RoomDiscoveryManager;
