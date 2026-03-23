/**
 * Tile Placement System - 板塊放置系統
 * 
 * Rulebook References:
 * - Page 12: Tile Placement
 * 
 * 這個模組實作 Betrayal 桌遊的板塊放置規則：
 * 1. 驗證板塊放置的合法性
 * 2. 確保門位置匹配
 * 3. 追蹤已放置的板塊
 * 4. 支援板塊旋轉
 */

import {
  GameState,
  Position3D,
  Direction,
  Tile,
  Floor,
  DIRECTION_DELTAS,
  OPPOSITE_DIRECTION,
  DiscoverAction,
} from '../types';
import { Room } from '@betrayal/shared';
import { RoomDiscoveryManager, VALID_ROTATIONS } from './roomDiscovery';

// Re-export from roomDiscovery for convenience
export { getUnconnectedDoors, addRandomDoor, drawRoomForExploration, findValidRotation, wouldCloseBoardWithRotation } from './roomDiscovery';

// ==================== 類型定義 ====================

/** 板塊放置驗證結果 */
export interface TilePlacementValidation {
  valid: boolean;
  error?: string;
  conflicts?: TileConflict[];
}

/** 板塊衝突 */
export interface TileConflict {
  direction: Direction;
  neighborPosition: Position3D;
  issue: 'missing_door' | 'extra_door' | 'blocked';
  description: string;
}

/** 板塊放置結果 */
export interface TilePlacementResult {
  success: boolean;
  error?: string;
  newState?: GameState;
  placedTile?: Tile;
}

/** 有效放置位置 */
export interface ValidPlacement {
  position: Position3D;
  validRotations: (0 | 90 | 180 | 270)[];
  hasConnectingDoor: boolean;
}

/** 門匹配結果 */
export interface DoorMatchResult {
  direction: Direction;
  hasDoor: boolean;
  neighborHasDoor: boolean;
  matches: boolean;
}

// ==================== 板塊放置驗證器 ====================

/**
 * 板塊放置驗證器
 * 負責驗證板塊放置的合法性
 */
export class TilePlacementValidator {
  /**
   * 驗證板塊是否可以放置在指定位置
   * Rulebook Page 12: Tile placement rules
   * 
   * @param state 當前遊戲狀態
   * @param x X 座標
   * @param y Y 座標
   * @param tile 要放置的板塊
   * @returns 驗證結果
   */
  static canPlaceTile(
    state: GameState,
    x: number,
    y: number,
    tile: Tile
  ): TilePlacementValidation {
    const position: Position3D = { x, y, floor: tile.floor };
    
    // 檢查位置是否有效
    if (!this.isValidPosition(state, position)) {
      return { valid: false, error: 'Invalid position' };
    }

    // 檢查位置是否已被佔用
    const existingTile = this.getTileAt(state, position);
    if (existingTile && existingTile.room) {
      return { valid: false, error: 'Position already occupied' };
    }

    // 檢查房間是否為 null
    if (!tile.room) {
      return { valid: false, error: 'Cannot place empty tile' };
    }

    // 檢查門位置匹配
    const doorMatches = this.checkDoorMatches(state, position, tile.room);
    const conflicts: TileConflict[] = [];

    for (const match of doorMatches) {
      if (!match.matches) {
        const neighborPos = this.getNeighborPosition(position, match.direction);
        const issue: TileConflict['issue'] = match.hasDoor && !match.neighborHasDoor
          ? 'extra_door'
          : !match.hasDoor && match.neighborHasDoor
          ? 'missing_door'
          : 'blocked';

        conflicts.push({
          direction: match.direction,
          neighborPosition: neighborPos,
          issue,
          description: this.getConflictDescription(match),
        });
      }
    }

    if (conflicts.length > 0) {
      return {
        valid: false,
        error: 'Door mismatch with adjacent rooms',
        conflicts,
      };
    }

    return { valid: true };
  }

  /**
   * 檢查門位置匹配
   * 
   * @param state 當前遊戲狀態
   * @param position 位置
   * @param room 房間
   * @returns 每個方向的門匹配結果
   */
  static checkDoorMatches(
    state: GameState,
    position: Position3D,
    room: Room
  ): DoorMatchResult[] {
    const directions: Direction[] = ['north', 'south', 'east', 'west'];
    const results: DoorMatchResult[] = [];

    for (const dir of directions) {
      const hasDoor = room.doors.includes(dir);
      const neighborPos = this.getNeighborPosition(position, dir);
      const neighborTile = this.getTileAt(state, neighborPos);
      
      let neighborHasDoor = false;
      if (neighborTile && neighborTile.room && neighborTile.discovered) {
        const oppositeDir = OPPOSITE_DIRECTION[dir];
        neighborHasDoor = neighborTile.room.doors.includes(oppositeDir);
      }

      // 門匹配規則：
      // 1. 如果兩邊都有房間，門必須對稱（都有或都沒有）
      // 2. 如果只有一邊有房間，沒有限制
      const matches = !neighborTile || !neighborTile.discovered || !neighborTile.room
        ? true  // 鄰居未發現或不存在，無限制
        : hasDoor === neighborHasDoor;  // 兩邊都有房間，必須對稱

      results.push({
        direction: dir,
        hasDoor,
        neighborHasDoor,
        matches,
      });
    }

    return results;
  }

  /**
   * 檢查是否有任何鄰居房間
   * 用於確保新房間與現有地圖連接
   * 
   * @param state 當前遊戲狀態
   * @param position 位置
   * @returns 是否有鄰居房間
   */
  static hasAdjacentRoom(state: GameState, position: Position3D): boolean {
    const directions: Direction[] = ['north', 'south', 'east', 'west'];

    for (const dir of directions) {
      const neighborPos = this.getNeighborPosition(position, dir);
      const neighborTile = this.getTileAt(state, neighborPos);
      if (neighborTile && neighborTile.room && neighborTile.discovered) {
        return true;
      }
    }

    return false;
  }

  /**
   * 獲取指定位置的所有有效旋轉角度
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
    return RoomDiscoveryManager.getValidRotations(state, position, room);
  }

  /**
   * 獲取所有有效放置位置
   * 返回所有與現有房間相鄰且門位置匹配的空位置
   * 
   * @param state 當前遊戲狀態
   * @param room 要放置的房間
   * @returns 有效放置位置列表
   */
  static getValidPlacements(
    state: GameState,
    room: Room
  ): ValidPlacement[] {
    const placements: ValidPlacement[] = [];
    const floorMap = state.map[room.floor as 'ground' | 'upper' | 'basement'];
    
    if (!floorMap) return placements;

    // 遍歷所有已發現的房間
    for (let y = 0; y < floorMap.length; y++) {
      for (let x = 0; x < floorMap[y].length; x++) {
        const tile = floorMap[y][x];
        if (!tile.discovered || !tile.room) continue;

        // 檢查四個方向
        const directions: Direction[] = ['north', 'south', 'east', 'west'];
        for (const dir of directions) {
          // 檢查房間是否有門通往該方向
          if (!tile.room.doors.includes(dir)) continue;

          const delta = DIRECTION_DELTAS[dir];
          const neighborPos: Position3D = {
            x: x + delta.x,
            y: y + delta.y,
            floor: tile.floor,
          };

          // 檢查位置是否有效且未被佔用
          if (!this.isValidPosition(state, neighborPos)) continue;
          
          const neighborTile = this.getTileAt(state, neighborPos);
          if (neighborTile && neighborTile.room) continue;

          // 檢查該位置是否已經在列表中
          const existingIndex = placements.findIndex(
            p => p.position.x === neighborPos.x && 
                 p.position.y === neighborPos.y && 
                 p.position.floor === neighborPos.floor
          );

          // 計算有效旋轉角度
          const validRotations = this.getValidRotations(state, neighborPos, room);

          if (validRotations.length > 0) {
            if (existingIndex >= 0) {
              // 更新現有條目，添加新的旋轉角度
              const existing = placements[existingIndex];
              const combinedRotations = Array.from(new Set([...existing.validRotations, ...validRotations]));
              placements[existingIndex] = {
                ...existing,
                validRotations: combinedRotations as (0 | 90 | 180 | 270)[],
                hasConnectingDoor: true,
              };
            } else {
              placements.push({
                position: neighborPos,
                validRotations,
                hasConnectingDoor: true,
              });
            }
          }
        }
      }
    }

    return placements;
  }

  /**
   * 獲取衝突描述
   */
  private static getConflictDescription(match: DoorMatchResult): string {
    if (match.hasDoor && !match.neighborHasDoor) {
      return `Room has a ${match.direction} door but neighbor doesn't have matching door`;
    }
    if (!match.hasDoor && match.neighborHasDoor) {
      return `Neighbor has a ${OPPOSITE_DIRECTION[match.direction]} door but room doesn't have matching door`;
    }
    return `Door mismatch in ${match.direction} direction`;
  }

  /**
   * 獲取鄰居位置
   */
  private static getNeighborPosition(position: Position3D, direction: Direction): Position3D {
    const delta = DIRECTION_DELTAS[direction];
    return {
      x: position.x + delta.x,
      y: position.y + delta.y,
      floor: position.floor,
    };
  }

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
  static isValidPosition(state: GameState, position: Position3D): boolean {
    const floorMap = state.map[position.floor];
    if (!floorMap) return false;
    return position.y >= 0 && position.y < floorMap.length &&
           position.x >= 0 && position.x < floorMap[0].length;
  }
}

// ==================== 板塊放置執行器 ====================

/**
 * 板塊放置執行器
 * 負責執行板塊放置並更新遊戲狀態
 */
export class TilePlacementExecutor {
  /**
   * 放置板塊
   * Rulebook Page 12: Place tile and update game state
   * 
   * @param state 當前遊戲狀態
   * @param x X 座標
   * @param y Y 座標
   * @param tile 要放置的板塊
   * @returns 放置結果
   */
  static placeTile(
    state: GameState,
    x: number,
    y: number,
    tile: Tile
  ): TilePlacementResult {
    // 驗證放置
    const validation = TilePlacementValidator.canPlaceTile(state, x, y, tile);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // 更新地圖
    const floorMap = state.map[tile.floor];
    const newFloorMap = floorMap.map((row, rowY) =>
      row.map((t, colX) =>
        colX === x && rowY === y ? tile : t
      )
    );

    const newMap = {
      ...state.map,
      [tile.floor]: newFloorMap,
      placedRoomCount: state.map.placedRoomCount + 1,
    };

    const newState: GameState = {
      ...state,
      map: newMap,
    };

    return {
      success: true,
      newState,
      placedTile: tile,
    };
  }

  /**
   * 從發現動作放置板塊
   * 這是發現房間後的完整放置流程
   * 
   * @param state 當前遊戲狀態
   * @param action 發現動作
   * @returns 放置結果
   */
  static placeTileFromDiscovery(
    state: GameState,
    action: DiscoverAction
  ): TilePlacementResult {
    const { position, room, rotation } = action;

    // 創建新房間板塊
    const newTile: Tile = {
      x: position.x,
      y: position.y,
      floor: position.floor,
      room,
      discovered: true,
      rotation,
      placementOrder: state.map.placedRoomCount + 1,
    };

    return this.placeTile(state, position.x, position.y, newTile);
  }

  /**
   * 更新已發現房間列表
   * 
   * @param state 當前遊戲狀態
   * @param tile 新放置的板塊
   * @returns 更新後的遊戲狀態
   */
  static updateDiscoveredRooms(
    state: GameState,
    tile: Tile
  ): GameState {
    // 這個方法可以用於追蹤已發現的房間
    // 目前 GameState.map 已經包含所有信息
    // 這裡可以添加額外的邏輯，例如統計、成就等
    return state;
  }
}

// ==================== 板塊放置管理器 ====================

/**
 * 板塊放置管理器
 * 高級接口，整合驗證和執行
 */
export class TilePlacementManager {
  /**
   * 執行完整的房間發現和放置流程
   * 
   * @param state 當前遊戲狀態
   * @param playerId 玩家 ID
   * @param direction 發現方向
   * @returns 放置結果和更新後的狀態
   */
  static discoverAndPlaceRoom(
    state: GameState,
    playerId: string,
    direction: Direction
  ): {
    success: boolean;
    error?: string;
    newState?: GameState;
    discovery?: {
      room: Room;
      position: Position3D;
      rotation: 0 | 90 | 180 | 270;
      cardDrawRequired: {
        type: CardType;
        requiresHauntCheck: boolean;
      } | null;
    };
  } {
    // 步驟 1: 發現房間
    const discoveryResult = RoomDiscoveryManager.discoverRoom(
      state,
      playerId,
      direction
    );

    if (!discoveryResult.success) {
      return {
        success: false,
        error: discoveryResult.error,
      };
    }

    const { room, position, rotation, cardDrawRequired } = discoveryResult;

    if (!room || !position || rotation === undefined) {
      return {
        success: false,
        error: 'Invalid discovery result',
      };
    }

    // 步驟 2: 創建發現動作
    const discoverAction: DiscoverAction = {
      type: 'DISCOVER',
      playerId,
      direction,
      room,
      position,
      rotation,
      timestamp: Date.now(),
      actionId: `discover-${Date.now()}`,
    };

    // 步驟 3: 放置板塊
    const placementResult = TilePlacementExecutor.placeTileFromDiscovery(
      state,
      discoverAction
    );

    if (!placementResult.success || !placementResult.newState) {
      return {
        success: false,
        error: placementResult.error || 'Failed to place tile',
      };
    }

    // 步驟 4: 更新玩家位置到新發現的房間
    const updatedPlayers = placementResult.newState.players.map(p =>
      p.id === playerId ? { ...p, position } : p
    );

    // 步驟 5: 更新回合狀態（發現後自動結束回合）
    // Rulebook Page 12: "After you discover a new room, your turn ends."
    let newState: GameState = {
      ...placementResult.newState,
      players: updatedPlayers,
      turn: {
        ...placementResult.newState.turn,
        movesRemaining: Math.max(0, placementResult.newState.turn.movesRemaining - 1),
        hasDiscoveredRoom: true,
        hasEnded: true, // 發現後自動結束回合
      },
    };

    // 步驟 6: 標記房間為已抽取
    const newDrawn = new Set(state.roomDeck.drawn);
    newDrawn.add(room.id);
    newState = {
      ...newState,
      roomDeck: {
        ...newState.roomDeck,
        drawn: newDrawn,
      },
    };

    return {
      success: true,
      newState,
      discovery: {
        room,
        position,
        rotation,
        cardDrawRequired: cardDrawRequired ?? null,
      },
    };
  }
}

// 導入 CardType
import { CardType } from '../types';

// ==================== 相鄰板塊檢查輔助函數 ====================

/**
 * 獲取指定位置周圍已發現的相鄰板塊
 * Issue #66: 用於檢查房間周圍的環境
 * 
 * @param state 當前遊戲狀態
 * @param position 中心位置
 * @returns 相鄰板塊信息列表
 */
export function getAdjacentTiles(
  state: GameState,
  position: Position3D
): Array<{
  direction: Direction;
  position: Position3D;
  tile: Tile | undefined;
  hasRoom: boolean;
  hasConnectingDoor: boolean;
}> {
  const directions: Direction[] = ['north', 'south', 'east', 'west'];
  
  return directions.map(dir => {
    const delta = DIRECTION_DELTAS[dir];
    const neighborPos: Position3D = {
      x: position.x + delta.x,
      y: position.y + delta.y,
      floor: position.floor,
    };
    
    const tile = TilePlacementValidator.getTileAt(state, neighborPos);
    const hasRoom = tile !== undefined && tile.room !== null && tile.discovered;
    
    // 檢查相鄰房間是否有門連接到這個方向
    let hasConnectingDoor = false;
    if (tile && tile.room) {
      const oppositeDir = OPPOSITE_DIRECTION[dir];
      hasConnectingDoor = tile.room.doors.includes(oppositeDir);
    }
    
    return {
      direction: dir,
      position: neighborPos,
      tile,
      hasRoom,
      hasConnectingDoor,
    };
  });
}

/**
 * 獲取指定位置周圍的空位置（未放置房間的位置）
 * Issue #66: 用於檢查房間周圍還有多少空間可以探索
 * 
 * @param state 當前遊戲狀態
 * @param position 中心位置
 * @returns 空位置的方向列表
 */
export function getEmptyAdjacentDirections(
  state: GameState,
  position: Position3D
): Direction[] {
  const adjacentTiles = getAdjacentTiles(state, position);
  
  return adjacentTiles
    .filter(adj => !adj.hasRoom)
    .map(adj => adj.direction);
}

/**
 * 檢查位置是否會封閉棋盤
 * Issue #66: 檢查如果在此位置放置房間，是否會導致無法繼續探索
 * 
 * @param state 當前遊戲狀態
 * @param position 位置
 * @param room 房間
 * @param rotation 旋轉角度
 * @returns 是否會封閉棋盤
 */
export function wouldCloseBoard(
  state: GameState,
  position: Position3D,
  room: Room,
  rotation: 0 | 90 | 180 | 270
): boolean {
  // 獲取旋轉後的門
  const rotatedDoors = RoomDiscoveryManager.rotateDoors(room.doors, rotation);
  
  // 檢查每個門方向
  for (const door of rotatedDoors) {
    const delta = DIRECTION_DELTAS[door];
    const neighborPos: Position3D = {
      x: position.x + delta.x,
      y: position.y + delta.y,
      floor: position.floor,
    };
    
    // 檢查鄰居位置
    const floorMap = state.map[neighborPos.floor];
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
 * 計算房間的開放程度
 * Issue #66: 計算房間有多少門可以通往未探索區域
 * 
 * @param state 當前遊戲狀態
 * @param position 位置
 * @param room 房間
 * @param rotation 旋轉角度
 * @returns 開放程度（0-4，表示未連接的門數量）
 */
export function calculateOpenness(
  state: GameState,
  position: Position3D,
  room: Room,
  rotation: 0 | 90 | 180 | 270
): number {
  // 獲取旋轉後的門
  const rotatedDoors = RoomDiscoveryManager.rotateDoors(room.doors, rotation);
  let openDoors = 0;
  
  for (const door of rotatedDoors) {
    const delta = DIRECTION_DELTAS[door];
    const neighborPos: Position3D = {
      x: position.x + delta.x,
      y: position.y + delta.y,
      floor: position.floor,
    };
    
    // 檢查鄰居位置
    const floorMap = state.map[neighborPos.floor];
    if (!floorMap) {
      // 位置超出邊界，不算開放
      continue;
    }
    
    const neighborTile = floorMap[neighborPos.y]?.[neighborPos.x];
    
    // 如果鄰居位置沒有房間，這個門是開放的
    if (!neighborTile || !neighborTile.room || !neighborTile.discovered) {
      openDoors++;
    }
  }
  
  return openDoors;
}

// ==================== 旋轉驗證 ====================

/**
 * 驗證旋轉後的板塊放置
 * 確保旋轉後的門位置與周圍房間匹配
 * 
 * @param state 當前遊戲狀態
 * @param position 位置
 * @param room 房間
 * @param rotation 旋轉角度
 * @returns 驗證結果
 */
export function validateRotatedPlacement(
  state: GameState,
  position: Position3D,
  room: Room,
  rotation: 0 | 90 | 180 | 270
): TilePlacementValidation {
  // 旋轉房間的門
  const rotatedDoors = RoomDiscoveryManager.rotateDoors(room.doors, rotation);
  
  // 創建旋轉後的房間副本
  const rotatedRoom = {
    ...room,
    doors: rotatedDoors,
  };

  // 檢查位置是否有效
  if (!TilePlacementValidator.isValidPosition(state, position)) {
    return { valid: false, error: 'Invalid position' };
  }

  // 檢查位置是否已被佔用
  const existingTile = TilePlacementValidator.getTileAt(state, position);
  if (existingTile && existingTile.room) {
    return { valid: false, error: 'Position already occupied' };
  }

  // 檢查門位置匹配
  const doorMatches = TilePlacementValidator.checkDoorMatches(state, position, rotatedRoom);
  const conflicts: TileConflict[] = [];

  for (const match of doorMatches) {
    if (!match.matches) {
      const neighborPos = {
        x: position.x + DIRECTION_DELTAS[match.direction].x,
        y: position.y + DIRECTION_DELTAS[match.direction].y,
        floor: position.floor,
      };
      
      const issue: TileConflict['issue'] = match.hasDoor && !match.neighborHasDoor
        ? 'extra_door'
        : !match.hasDoor && match.neighborHasDoor
        ? 'missing_door'
        : 'blocked';

      conflicts.push({
        direction: match.direction,
        neighborPosition: neighborPos,
        issue,
        description: `Door mismatch in ${match.direction} direction after rotation`,
      });
    }
  }

  if (conflicts.length > 0) {
    return {
      valid: false,
      error: 'Door mismatch with adjacent rooms after rotation',
      conflicts,
    };
  }

  return { valid: true };
}

/**
 * 獲取房間在指定位置的所有有效旋轉角度
 * 
 * @param state 當前遊戲狀態
 * @param position 位置
 * @param room 房間
 * @returns 有效的旋轉角度列表
 */
export function getValidRotationsForPlacement(
  state: GameState,
  position: Position3D,
  room: Room
): (0 | 90 | 180 | 270)[] {
  return RoomDiscoveryManager.getValidRotations(state, position, room);
}

// ==================== 預設匯出 ====================

export default TilePlacementValidator;
