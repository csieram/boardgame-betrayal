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
  StatType,
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

/** 房間旋轉嘗試結果 */
export interface RotationAttemptResult {
  rotation: 0 | 90 | 180 | 270;
  wouldCloseBoard: boolean;
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

// ==================== 旋轉驗證函數（Issue #72） ====================

/**
 * 檢查特定旋轉是否會封閉棋盤
 * Issue #72: 嘗試所有 4 個旋轉角度，檢查每個角度是否會封閉棋盤
 * Issue #87: 添加 floor 參數以支援多樓層探索
 * 
 * @param gameState 當前遊戲狀態
 * @param position 位置
 * @param room 房間
 * @param rotation 旋轉角度
 * @param floor 樓層（預設使用玩家當前樓層）
 * @returns 是否會封閉棋盤
 */
export function wouldCloseBoardWithRotation(
  gameState: GameState,
  position: { x: number; y: number },
  room: Room,
  rotation: 0 | 90 | 180 | 270,
  floor?: Floor
): boolean {
  // 旋轉房間的門
  const rotatedDoors = RoomDiscoveryManager.rotateDoors(room.doors, rotation);
  
  // 確定樓層：優先使用傳入的 floor 參數，否則使用玩家當前樓層
  const targetFloor: Floor = floor ?? (gameState.turn.currentPlayerId 
    ? gameState.players.find(p => p.id === gameState.turn.currentPlayerId)?.position.floor || 'ground'
    : 'ground');
  
  // 檢查每個門方向
  for (const door of rotatedDoors) {
    const delta = DIRECTION_DELTAS[door];
    const neighborPos: Position3D = {
      x: position.x + delta.x,
      y: position.y + delta.y,
      floor: targetFloor,
    };
    
    // 檢查鄰居位置
    const floorMap = gameState.map[neighborPos.floor];
    if (!floorMap) {
      // 位置超出邊界，這個門無法連接
      continue;
    }
    
    const neighborTile = floorMap[neighborPos.y]?.[neighborPos.x];
    
    // 如果鄰居位置沒有房間，這個門提供了探索路徑
    if (!neighborTile || !neighborTile.room || !neighborTile.discovered) {
      return false; // 至少有一個未連接的門，不會封閉
    }
  }
  
  // 所有門都連接到現有房間，這會封閉棋盤
  return true;
}

/**
 * 尋找第一個不會封閉棋盤的有效旋轉角度
 * Issue #72: 嘗試所有 4 個旋轉角度
 * Issue #87: 添加 floor 參數以支援多樓層探索
 * 
 * @param room 房間
 * @param gameState 當前遊戲狀態
 * @param position 位置
 * @param entryDirection 進入方向（用於驗證門連接）
 * @param floor 樓層（預設使用玩家當前樓層）
 * @returns 有效的旋轉角度和房間，如果所有旋轉都會封閉則返回 null
 */
export function findValidRotation(
  room: Room,
  gameState: GameState,
  position: { x: number; y: number },
  entryDirection: Direction,
  floor?: Floor
): { room: Room; rotation: 0 | 90 | 180 | 270 } | null {
  const requiredDoor = OPPOSITE_DOOR[entryDirection];
  
  console.log(`[findValidRotation] Room: ${room.name}, doors: ${room.doors}, entry: ${entryDirection}, required: ${requiredDoor}, floor: ${floor}`);
  
  for (const rotation of VALID_ROTATIONS) {
    // 旋轉房間的門
    const rotatedDoors = RoomDiscoveryManager.rotateDoors(room.doors, rotation);
    console.log(`[findValidRotation] Trying rotation ${rotation}, rotated doors: ${rotatedDoors}`);
    
    // 檢查旋轉後是否有門可以連接到進入方向
    if (!rotatedDoors.includes(requiredDoor)) {
      console.log(`[findValidRotation] Rotation ${rotation} rejected: no door matching entry direction`);
      continue;
    }
    
    // 檢查此旋轉是否會封閉棋盤
    const wouldClose = wouldCloseBoardWithRotation(gameState, position, room, rotation, floor);
    console.log(`[findValidRotation] Rotation ${rotation} would close board: ${wouldClose}`);
    
    if (!wouldClose) {
      console.log(`[findValidRotation] Found valid rotation: ${rotation}`);
      return { room, rotation };
    }
  }
  
  console.log(`[findValidRotation] All rotations would close board for room: ${room.name}`);
  return null;
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

/** 方向旋轉映射（順時針） - Issue #317: Fixed rotation direction */
const DIRECTION_ROTATION_MAP: Record<Direction, Record<0 | 90 | 180 | 270, Direction>> = {
  north: { 0: 'north', 90: 'west', 180: 'south', 270: 'east' },
  east: { 0: 'east', 90: 'north', 180: 'west', 270: 'south' },
  south: { 0: 'south', 90: 'east', 180: 'north', 270: 'west' },
  west: { 0: 'west', 90: 'south', 180: 'east', 270: 'north' },
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
   * Issue #72: 所有房間都在主牌堆，包含單門房間
   * 
   * 重要：每個房間在遊戲中只能出現一次。
   * 此方法會檢查已放置的房間 ID，確保不會抽到重複的房間。
   * 
   * @param state 當前遊戲狀態
   * @param floor 樓層
   * @returns 抽取的房間，如果牌堆為空或所有房間都已放置則返回 null
   */
  static drawRoomFromDeck(state: GameState, floor: Floor): Room | null {
    const deck = state.roomDeck[floor];
    if (!deck) {
      console.error(`[drawRoomFromDeck] Invalid floor: ${floor}`);
      return null;
    }

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
    if (!player) {
      console.log(`[RoomDiscovery] Player not found: ${playerId}`);
      return [];
    }

    // 檢查是否已發現房間
    if (state.turn.hasDiscoveredRoom) {
      console.log(`[RoomDiscovery] Already discovered room this turn`);
      return [];
    }

    // 檢查是否有足夠的移動點數
    if (state.turn.movesRemaining < 1) {
      console.log(`[RoomDiscovery] No moves remaining`);
      return [];
    }

    // 檢查是否為當前玩家
    if (!TurnManager.isCurrentPlayer(state, playerId)) {
      console.log(`[RoomDiscovery] Not current player. Expected: ${playerId}, Got: ${state.turn.currentPlayerId}`);
      return [];
    }

    const currentTile = this.getTileAt(state, player.position);
    if (!currentTile || !currentTile.room) {
      console.log(`[RoomDiscovery] No room at current position`, player.position);
      return [];
    }

    console.log(`[RoomDiscovery] Current room: ${currentTile.room.name}, doors: ${currentTile.room.doors}`);

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
      if (!this.isValidPosition(state, newPos)) {
        console.log(`[RoomDiscovery] Invalid position for ${dir}:`, newPos);
        continue;
      }

      // 檢查位置是否已被佔用
      const existingTile = this.getTileAt(state, newPos);
      if (existingTile && existingTile.room) {
        console.log(`[RoomDiscovery] Position already occupied for ${dir}:`, newPos);
        continue;
      }

      discoverable.push(dir);
    }

    console.log(`[RoomDiscovery] Discoverable directions:`, discoverable);

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
  static getTileAt(state: GameState, position: Position3D): Tile | undefined {
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
 * Issue #87: 添加 floor 參數以支援多樓層探索
 * 
 * @param gameState 當前遊戲狀態
 * @param position 房間位置
 * @param room 房間
 * @param rotation 旋轉角度
 * @param floor 樓層（預設使用玩家當前樓層）
 * @returns 未連接的門方向列表
 */
export function getUnconnectedDoors(
  gameState: GameState,
  position: { x: number; y: number },
  room: Room,
  rotation: number,
  floor?: Floor
): Direction[] {
  // 旋轉房間的門
  const normalizedRotation = ((rotation % 360) + 360) % 360 as 0 | 90 | 180 | 270;
  const rotatedDoors = RoomDiscoveryManager.rotateDoors(room.doors, normalizedRotation);
  
  const unconnected: Direction[] = [];
  
  // 確定樓層：優先使用傳入的 floor 參數，否則使用玩家當前樓層
  const targetFloor: Floor = floor ?? (gameState.turn.currentPlayerId 
    ? gameState.players.find(p => p.id === gameState.turn.currentPlayerId)?.position.floor || 'ground'
    : 'ground');
  
  for (const door of rotatedDoors) {
    const delta = DIRECTION_DELTAS[door];
    const neighborPos: Position3D = {
      x: position.x + delta.x,
      y: position.y + delta.y,
      floor: targetFloor,
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
 * Issue #87: 添加 floor 參數以支援多樓層探索
 * 
 * 重要：這個函數會優先選擇可以通向未探索區域的方向，確保棋盤保持開放
 * 
 * @param room 原始房間
 * @param gameState 當前遊戲狀態
 * @param position 房間位置
 * @param rotation 房間旋轉角度（預設 0）
 * @param floor 樓層（預設使用玩家當前樓層）
 * @returns 添加門後的新房間
 */
export function addRandomDoor(
  room: Room,
  gameState: GameState,
  position: { x: number; y: number },
  rotation: 0 | 90 | 180 | 270 = 0,
  floor?: Floor
): Room {
  const allDirections: Direction[] = ['north', 'south', 'east', 'west'];
  
  console.log('[addRandomDoor] Input room:', room.name, 'doors:', room.doors, 'rotation:', rotation, 'floor:', floor);
  
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
  
  // 確定樓層：優先使用傳入的 floor 參數，否則使用玩家當前樓層
  const targetFloor: Floor = floor ?? (gameState.turn.currentPlayerId 
    ? gameState.players.find(p => p.id === gameState.turn.currentPlayerId)?.position.floor || 'ground'
    : 'ground');
  
  // 優先選擇可以通向未探索區域的方向
  const candidateDirections = missingDirections.filter(dir => {
    const delta = DIRECTION_DELTAS[dir];
    const neighborPos: Position3D = {
      x: position.x + delta.x,
      y: position.y + delta.y,
      floor: targetFloor,
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
 * Issue #72: 正確的房間抽取邏輯
 * 
 * 邏輯流程：
 * 1. 從牌堆抽取房間
 * 2. 嘗試所有 4 個旋轉角度（0°, 90°, 180°, 270°）
 * 3. 對每個旋轉角度：
 *    - 檢查是否會封閉棋盤
 *    - 不會封閉 → 放置房間 ✓
 *    - 會封閉 → 嘗試下一個旋轉
 * 4. 所有旋轉都會封閉 → 將房間放回牌堆，抽取下一個
 * 5. 重複最多 10 次
 * 6. 10 次都失敗 → 添加一個門，放置房間
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
  
  console.log('[RoomDiscovery] Starting drawRoomForExploration, floor:', floor, 'entryDirection:', entryDirection);
  
  // 獲取當前玩家位置
  const currentPlayer = gameState.players.find(p => p.id === gameState.turn.currentPlayerId);
  const playerPosition = currentPlayer?.position;
  
  if (!playerPosition) {
    console.log('[RoomDiscovery] Error: Current player not found');
    return { success: false, error: 'Current player not found' };
  }
  
  // 計算新房間位置
  // Issue #87: 使用傳入的 floor 參數，而不是 playerPosition.floor
  // 這確保了當玩家在不同樓層時，能正確地從對應樓層的牌堆抽取房間
  const delta = DIRECTION_DELTAS[entryDirection];
  const newPosition: Position3D = {
    x: playerPosition.x + delta.x,
    y: playerPosition.y + delta.y,
    floor: floor, // 使用傳入的 floor 參數，而不是 playerPosition.floor
  };
  
  console.log('[RoomDiscovery] New position:', newPosition);
  
  while (attempts < maxAttempts) {
    attempts++;
    
    // 1. 從牌堆抽取房間
    const room = RoomDiscoveryManager.drawRoomFromDeck(gameState, floor);
    
    if (!room) {
      console.log('[RoomDiscovery] Deck empty, trying to recycle discarded rooms...');
      
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
    
    console.log(`[RoomDiscovery] Attempt ${attempts} - Room drawn: ${room.name}, doors: ${room.doors}`);
    
    // 2. 嘗試所有 4 個旋轉角度
    // Issue #87: 傳入 floor 參數以確保正確檢查目標樓層的棋盤狀態
    const validRotation = findValidRotation(room, gameState, newPosition, entryDirection, floor);
    
    if (validRotation) {
      // 找到不會封閉棋盤的旋轉角度
      const { rotation } = validRotation;
      const cardDrawRequired = RoomDiscoveryManager.getCardDrawRequirement(room);
      
      console.log(`[RoomDiscovery] Success! Found valid rotation ${rotation} for room: ${room.name}`);
      
      // Issue #191-fix: 標記房間為已放置，防止重複
      // 直接修改傳入的 gameState.placedRoomIds，確保更新被保留
      gameState.placedRoomIds.add(room.id);
      console.log(`[Issue #191] Added room ${room.id} to placedRoomIds in drawRoomForExploration`);
      
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
    
    // 3. 所有旋轉都會封閉棋盤，將房間放回牌堆（標記為已抽取但不放置）
    console.log(`[RoomDiscovery] All rotations would close board for room: ${room.name}, returning to deck`);
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
  
  // 4. 達到最大嘗試次數，添加隨機門
  console.log('[RoomDiscovery] Max attempts reached, adding random door to prevent closure');
  
  // 先嘗試使用最後一個丟棄的房間
  let finalRoom: Room | null = discardedRooms[discardedRooms.length - 1] || null;
  
  if (!finalRoom) {
    // 如果沒有丟棄的房間，嘗試再抽一個
    finalRoom = RoomDiscoveryManager.drawRoomFromDeck(gameState, floor);
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
  
  // 添加隨機門（傳入旋轉角度和樓層，確保門添加在正確的位置）
  // Issue #87: 傳入 floor 參數以確保在正確的樓層添加門
  const modifiedRoom = addRandomDoor(finalRoom, gameState, newPosition, rotation, floor);
  console.log('[RoomDiscovery] Modified room doors:', modifiedRoom.doors);
  
  // 驗證修改後的房間確實有未連接的門
  // Issue #87: 傳入 floor 參數以確保在正確的樓層檢查
  const unconnectedAfterModification = getUnconnectedDoors(gameState, newPosition, modifiedRoom, rotation, floor);
  console.log('[RoomDiscovery] Unconnected doors after modification:', unconnectedAfterModification);
  
  if (unconnectedAfterModification.length === 0) {
    console.warn('[RoomDiscovery] WARNING: Modified room still has no unconnected doors!');
  }
  
  const cardDrawRequired = RoomDiscoveryManager.getCardDrawRequirement(modifiedRoom);
  
  // Issue #191-fix: 標記房間為已放置，防止重複
  // 直接修改傳入的 gameState.placedRoomIds，確保更新被保留
  gameState.placedRoomIds.add(modifiedRoom.id);
  console.log(`[Issue #191] Added modified room ${modifiedRoom.id} to placedRoomIds in drawRoomForExploration`);
  
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

// ==================== 樓梯連接系統 (Issue #80) ====================

/**
 * 樓梯房間 ID 定義
 * 這些房間允許玩家在不同樓層之間移動
 */
export const STAIR_ROOM_IDS = {
  /** 大樓梯：連接一樓和二樓 (Ground ↔ Upper) */
  GRAND_STAIRCASE: 'grand_staircase',
  /** 地下室樓梯：從地下室到一樓 (Basement → Ground) */
  STAIRS_FROM_BASEMENT: 'stairs_from_basement',
  /** 一樓樓梯(下)：從一樓到地下室 (Ground → Basement) */
  STAIRS_FROM_GROUND: 'stairs_from_ground',
  /** 二樓樓梯：從二樓到一樓 (Upper → Ground) */
  STAIRS_FROM_UPPER: 'stairs_from_upper',
  /** 神秘電梯：可移動到任何樓層 */
  MYSTIC_ELEVATOR: 'mystic_elevator',
  /** 坍塌房間：會掉到地下室 */
  COLLAPSED_ROOM: 'collapsed_room',
} as const;

/**
 * 樓梯連接配置
 * 定義每個樓梯房間允許的樓層轉換
 */
export interface StairConnection {
  /** 來源樓層 */
  from: Floor;
  /** 目標樓層 */
  to: Floor;
  /** 是否需要檢定 */
  requiresCheck?: boolean;
  /** 檢定屬性（如需要） */
  checkStat?: StatType;
  /** 檢定目標值（如需要） */
  checkTarget?: number;
  /** 描述 */
  description: string;
}

/**
 * 樓梯連接映射表
 * 定義每個樓梯房間的連接規則
 */
export const STAIR_CONNECTIONS: Record<string, StairConnection[]> = {
  [STAIR_ROOM_IDS.GRAND_STAIRCASE]: [
    { from: 'ground', to: 'upper', description: '大樓梯通往二樓' },
    { from: 'upper', to: 'ground', description: '大樓梯通往一樓' },
  ],
  [STAIR_ROOM_IDS.STAIRS_FROM_BASEMENT]: [
    { from: 'basement', to: 'ground', description: '樓梯通往一樓' },
  ],
  [STAIR_ROOM_IDS.STAIRS_FROM_GROUND]: [
    { from: 'ground', to: 'basement', description: '樓梯通往地下室' },
  ],
  [STAIR_ROOM_IDS.STAIRS_FROM_UPPER]: [
    { from: 'upper', to: 'ground', description: '樓梯通往一樓' },
  ],
  [STAIR_ROOM_IDS.MYSTIC_ELEVATOR]: [
    { from: 'ground', to: 'upper', description: '電梯通往二樓' },
    { from: 'ground', to: 'basement', description: '電梯通往地下室' },
    { from: 'upper', to: 'ground', description: '電梯通往一樓' },
    { from: 'upper', to: 'basement', description: '電梯通往地下室' },
    { from: 'basement', to: 'ground', description: '電梯通往一樓' },
    { from: 'basement', to: 'upper', description: '電梯通往二樓' },
  ],
  [STAIR_ROOM_IDS.COLLAPSED_ROOM]: [
    { from: 'upper', to: 'basement', description: '地板坍塌，你掉到了地下室', requiresCheck: true, checkStat: 'speed', checkTarget: 4 },
  ],
};

/**
 * 檢查房間是否為樓梯房間
 * 
 * @param roomId 房間 ID
 * @returns 是否為樓梯房間
 */
export function isStairRoom(roomId: string): boolean {
  return Object.values(STAIR_ROOM_IDS).includes(roomId as any);
}

/**
 * 獲取樓梯房間的可用連接
 * 
 * @param roomId 房間 ID
 * @param currentFloor 當前樓層
 * @returns 可用的樓層連接列表
 */
export function getStairConnections(roomId: string, currentFloor: Floor): StairConnection[] {
  const connections = STAIR_CONNECTIONS[roomId];
  if (!connections) return [];
  
  return connections.filter(conn => conn.from === currentFloor);
}

/**
 * 檢查玩家是否可以使用樓梯
 * 
 * @param roomId 房間 ID
 * @param currentFloor 當前樓層
 * @returns 是否可以使用樓梯
 */
export function canUseStairs(roomId: string, currentFloor: Floor): boolean {
  const connections = getStairConnections(roomId, currentFloor);
  return connections.length > 0;
}

/**
 * 獲取樓梯轉換後的目標位置
 * 
 * 當玩家使用樓梯時，需要知道在目標樓層的哪個位置出現。
 * 根據規則書，樓梯房間應該在相對應的位置。
 * 
 * @param roomId 樓梯房間 ID
 * @param currentPosition 當前位置
 * @param targetFloor 目標樓層
 * @returns 目標位置，如果無法轉換則返回 null
 */
export function getStairTargetPosition(
  roomId: string,
  currentPosition: Position3D,
  targetFloor: Floor
): Position3D | null {
  // 檢查是否可以使用樓梯
  if (!canUseStairs(roomId, currentPosition.floor)) {
    return null;
  }
  
  const connections = getStairConnections(roomId, currentPosition.floor);
  const connection = connections.find(conn => conn.to === targetFloor);
  
  if (!connection) {
    return null;
  }
  
  // 根據樓梯類型決定目標位置
  switch (roomId) {
    case STAIR_ROOM_IDS.GRAND_STAIRCASE:
      // 大樓梯在一樓和二樓的位置是對應的
      // 一樓的 Grand Staircase 在 (7,7) 附近，二樓的 Stairs from Upper 在 (7,5)
      if (targetFloor === 'upper') {
        return { x: 7, y: 5, floor: 'upper' };
      } else {
        return { x: 7, y: 7, floor: 'ground' };
      }
      
    case STAIR_ROOM_IDS.STAIRS_FROM_UPPER:
      // 從二樓到一樓，前往大樓梯
      return { x: 7, y: 7, floor: 'ground' };
      
    case STAIR_ROOM_IDS.STAIRS_FROM_BASEMENT:
      // 從地下室到一樓
      // 地下室樓梯在 (7,7)，一樓對應位置應該是 stairs_from_ground
      return { x: 7, y: 7, floor: 'ground' };
      
    case STAIR_ROOM_IDS.STAIRS_FROM_GROUND:
      // 從一樓到地下室
      return { x: 7, y: 7, floor: 'basement' };
      
    case STAIR_ROOM_IDS.MYSTIC_ELEVATOR:
      // 神秘電梯：保持在相同 X,Y 位置，只改變樓層
      return { ...currentPosition, floor: targetFloor };
      
    case STAIR_ROOM_IDS.COLLAPSED_ROOM:
      // 坍塌房間：掉到地下室的隨機位置或特定位置
      return { x: currentPosition.x, y: currentPosition.y, floor: 'basement' };
      
    default:
      // 默認：保持在相同 X,Y 位置
      return { ...currentPosition, floor: targetFloor };
  }
}

/**
 * 樓梯管理器
 * 處理多樓層之間的移動邏輯
 */
export class StairManager {
  /**
   * 檢查玩家當前是否可以使用樓梯
   * 
   * @param gameState 遊戲狀態
   * @param playerId 玩家 ID
   * @returns 是否可以使用樓梯
   */
  static canPlayerUseStairs(gameState: GameState, playerId: string): boolean {
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) return false;
    
    const currentTile = RoomDiscoveryManager.getTileAt(gameState, player.position);
    if (!currentTile || !currentTile.room) return false;
    
    return canUseStairs(currentTile.room.id, player.position.floor);
  }
  
  /**
   * 獲取玩家當前可用的樓梯選項
   * 
   * @param gameState 遊戲狀態
   * @param playerId 玩家 ID
   * @returns 可用的樓梯連接列表
   */
  static getAvailableStairOptions(gameState: GameState, playerId: string): StairConnection[] {
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) return [];
    
    const currentTile = RoomDiscoveryManager.getTileAt(gameState, player.position);
    if (!currentTile || !currentTile.room) return [];
    
    return getStairConnections(currentTile.room.id, player.position.floor);
  }
  
  /**
   * 執行樓梯移動
   * 
   * @param gameState 遊戲狀態
   * @param playerId 玩家 ID
   * @param targetFloor 目標樓層
   * @returns 新的位置，如果無法移動則返回 null
   */
  static useStairs(
    gameState: GameState,
    playerId: string,
    targetFloor: Floor
  ): Position3D | null {
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) return null;
    
    const currentTile = RoomDiscoveryManager.getTileAt(gameState, player.position);
    if (!currentTile || !currentTile.room) return null;
    
    const newPosition = getStairTargetPosition(
      currentTile.room.id,
      player.position,
      targetFloor
    );
    
    return newPosition;
  }
}

// ==================== 預設匯出 ====================

export default RoomDiscoveryManager;
