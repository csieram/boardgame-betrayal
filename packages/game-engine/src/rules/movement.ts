/**
 * Movement System - 移動系統
 * 
 * Rulebook References:
 * - Page 12: Movement rules
 * - Page 13: Speed-based movement
 * 
 * 這個模組實作 Betrayal 桌遊的移動規則：
 * 1. 基於 Speed 屬性的移動（最多移動 Speed 格）
 * 2. 發現新房間時停止移動
 * 3. 處理阻塞通道（鎖定的門、坍塌的通道）
 * 4. 防止移動到未發現的房間
 */

import {
  GameState,
  Player,
  Position3D,
  Position,
  Direction,
  Tile,
  Floor,
  DIRECTION_DELTAS,
  OPPOSITE_DIRECTION,
  MoveAction,
} from '../types';
import { Room } from '@betrayal/shared';
import { TokenManager } from '../state/mapTokens';

import { TurnManager } from './turn';

// ==================== 類型定義 ====================

/** 移動驗證結果 */
export interface MovementValidation {
  valid: boolean;
  error?: string;
  cost?: number;
}

/** 移動結果 */
export interface MovementResult {
  success: boolean;
  error?: string;
  newState?: GameState;
  discoveredNewRoom?: boolean;
}

/** 路徑結果 */
export interface PathResult {
  valid: boolean;
  path: Position3D[];
  totalCost: number;
  error?: string;
}

/** 障礙物類型 */
export type ObstacleType = 'locked_door' | 'collapsed_passage' | 'blocked';

/** 障礙物 */
export interface Obstacle {
  type: ObstacleType;
  position: Position3D;
  direction: Direction;
  moveCost: number; // 通常為 2（Page 12: "Obstacles require 2 movement points"）
  canPass: boolean;
  description: string;
}

/** 可視房間資訊 */
export interface VisibleRoomInfo {
  position: Position3D;
  room: Room | null;
  discovered: boolean;
  hasDoor: boolean; // 是否有門通往此方向
}

// ==================== 常數 ====================

/** 標準移動消耗 */
export const STANDARD_MOVE_COST = 1;

/** 障礙物移動消耗（Page 12） */
export const OBSTACLE_MOVE_COST = 2;

/** 無限移動成本（無法通過） */
export const INFINITE_COST = Infinity;

// ==================== 移動驗證器 ====================

/**
 * 移動驗證器
 * 負責驗證移動的合法性
 */
export class MovementValidator {
  /**
   * 驗證移動動作
   * Rulebook Page 12-13: Movement rules
   * 支援秘密通道（Issue #235）
   * 
   * @param state 當前遊戲狀態
   * @param playerId 玩家 ID
   * @param to 目標位置
   * @returns 驗證結果
   */
  static validateMove(
    state: GameState,
    playerId: string,
    to: Position3D
  ): MovementValidation {
    // 檢查是否為當前玩家
    if (!TurnManager.isCurrentPlayer(state, playerId)) {
      return { valid: false, error: 'Not your turn' };
    }

    // 檢查回合是否已結束
    if (state.turn.hasEnded) {
      return { valid: false, error: 'Turn has ended' };
    }

    // 檢查是否已發現新房間（發現後不能繼續移動）
    // Rulebook Page 12: "After you discover a new room, your turn ends."
    if (state.turn.hasDiscoveredRoom) {
      return { valid: false, error: 'Cannot move after discovering a room' };
    }

    const player = state.players.find(p => p.id === playerId);
    if (!player) {
      return { valid: false, error: 'Player not found' };
    }

    // 檢查目標位置是否有效
    const targetTile = MovementValidator.getTileAt(state, to);
    if (!targetTile) {
      return { valid: false, error: 'Invalid target position' };
    }

    // 檢查是否移動到未發現的房間
    // Rulebook Page 12: "You can only move to discovered rooms."
    if (!targetTile.discovered) {
      return { valid: false, error: 'Cannot move to undiscovered room' };
    }

    // 檢查目標位置是否有房間
    if (!targetTile.room) {
      return { valid: false, error: 'No room at target position' };
    }

    const from = player.position;

    // 檢查是否為相鄰房間（單步移動）
    const isAdjacent = MovementValidator.isAdjacent(from, to);
    
    // 檢查是否有秘密通道（Issue #235）
    const tokenManager = new TokenManager(state.mapTokens || []);
    const secretPassageDest = tokenManager.getSecretPassageDestination(from);
    const isSecretPassage = secretPassageDest && 
      secretPassageDest.x === to.x && 
      secretPassageDest.y === to.y && 
      secretPassageDest.floor === to.floor;

    // 如果不是相鄰且不是秘密通道，則拒絕
    if (!isAdjacent && !isSecretPassage) {
      return { valid: false, error: 'Can only move to adjacent rooms or through secret passages' };
    }

    // 檢查兩個房間之間是否有門相連（僅對相鄰移動）
    if (isAdjacent) {
      const fromTile = MovementValidator.getTileAt(state, from);
      if (!fromTile || !fromTile.room) {
        return { valid: false, error: 'Invalid current position' };
      }

      const direction = MovementValidator.getDirection(from, to);
      if (!direction) {
        return { valid: false, error: 'Cannot determine direction' };
      }

      // 檢查是否有門通往該方向
      if (!MovementValidator.hasConnectingDoor(fromTile.room, targetTile.room, direction)) {
        return { valid: false, error: 'No connecting door in that direction' };
      }

      // 計算移動成本
      const cost = MovementValidator.calculateMoveCost(state, from, to, direction);
      if (cost === INFINITE_COST) {
        return { valid: false, error: 'Path is blocked' };
      }

      // 檢查是否有足夠的移動點數
      // Rulebook Page 13: "You can move up to a number of spaces equal to your Speed."
      if (cost > state.turn.movesRemaining) {
        return { valid: false, error: 'Not enough movement points' };
      }

      return { valid: true, cost };
    }

    // 秘密通道移動（Issue #235）
    if (isSecretPassage) {
      // 秘密通道消耗 1 點移動
      if (STANDARD_MOVE_COST > state.turn.movesRemaining) {
        return { valid: false, error: 'Not enough movement points' };
      }
      return { valid: true, cost: STANDARD_MOVE_COST };
    }

    return { valid: false, error: 'Invalid move' };
  }

  /**
   * 檢查兩個位置是否相鄰
   */
  static isAdjacent(from: Position3D, to: Position3D): boolean {
    // 必須在同一樓層
    if (from.floor !== to.floor) {
      return false;
    }

    const dx = Math.abs(from.x - to.x);
    const dy = Math.abs(from.y - to.y);

    // 只能水平或垂直移動一格
    return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
  }

  /**
   * 取得移動方向
   */
  static getDirection(from: Position3D, to: Position3D): Direction | null {
    const dx = to.x - from.x;
    const dy = to.y - from.y;

    if (dx === 1 && dy === 0) return 'east';
    if (dx === -1 && dy === 0) return 'west';
    if (dx === 0 && dy === 1) return 'south';
    if (dx === 0 && dy === -1) return 'north';

    return null;
  }

  /**
   * 檢查兩個房間是否有門相連
   */
  static hasConnectingDoor(
    fromRoom: Room,
    toRoom: Room,
    direction: Direction
  ): boolean {
    const oppositeDirection = OPPOSITE_DIRECTION[direction];

    // 檢查 fromRoom 是否有門通往 direction
    const fromHasDoor = fromRoom.doors.includes(direction);

    // 檢查 toRoom 是否有門通往相反方向
    const toHasDoor = toRoom.doors.includes(oppositeDirection);

    return fromHasDoor && toHasDoor;
  }

  /**
   * 計算移動成本
   * Rulebook Page 12: "Obstacles require 2 movement points."
   */
  static calculateMoveCost(
    state: GameState,
    from: Position3D,
    to: Position3D,
    direction: Direction
  ): number {
    // 檢查是否有障礙物
    const obstacle = MovementValidator.getObstacle(state, from, direction);
    if (obstacle) {
      if (!obstacle.canPass) {
        return INFINITE_COST;
      }
      return obstacle.moveCost;
    }

    return STANDARD_MOVE_COST;
  }

  /**
   * 取得障礙物資訊
   * 注意：這是一個擴展點，未來可以從遊戲狀態中讀取障礙物
   */
  static getObstacle(
    state: GameState,
    position: Position3D,
    direction: Direction
  ): Obstacle | null {
    // TODO: 從遊戲狀態中讀取障礙物資訊
    // 目前返回 null 表示沒有障礙物
    return null;
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

// ==================== 移動執行器 ====================

/**
 * 移動執行器
 * 負責執行移動並更新遊戲狀態
 */
export class MovementExecutor {
  /**
   * 執行移動
   * Rulebook Page 12-13: Movement execution
   * 
   * @param state 當前遊戲狀態
   * @param action 移動動作
   * @returns 移動結果
   */
  static executeMove(state: GameState, action: MoveAction): MovementResult {
    const validation = MovementValidator.validateMove(
      state,
      action.playerId,
      action.to
    );

    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const player = state.players.find(p => p.id === action.playerId)!;
    const cost = validation.cost || STANDARD_MOVE_COST;

    // 更新玩家位置
    const updatedPlayers = state.players.map(p =>
      p.id === action.playerId
        ? { ...p, position: action.to }
        : p
    );

    // 消耗移動點數
    const newMovesRemaining = state.turn.movesRemaining - cost;

    let newState: GameState = {
      ...state,
      players: updatedPlayers,
      turn: {
        ...state.turn,
        movesRemaining: newMovesRemaining,
      },
    };

    return {
      success: true,
      newState,
      discoveredNewRoom: false,
    };
  }

  /**
   * 執行發現新房間
   * Rulebook Page 12: "Discovering a New Room"
   * 
   * @param state 當前遊戲狀態
   * @param playerId 玩家 ID
   * @param direction 發現方向
   * @param room 新發現的房間
   * @returns 更新後的遊戲狀態
   */
  static discoverRoom(
    state: GameState,
    playerId: string,
    direction: Direction,
    room: Room,
    rotation: 0 | 90 | 180 | 270 = 0
  ): { success: boolean; error?: string; newState?: GameState } {
    // 檢查是否為當前玩家
    if (!TurnManager.isCurrentPlayer(state, playerId)) {
      return { success: false, error: 'Not your turn' };
    }

    // 檢查是否已發現新房間
    if (state.turn.hasDiscoveredRoom) {
      return { success: false, error: 'Already discovered a room this turn' };
    }

    const player = state.players.find(p => p.id === playerId);
    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    // 計算新房間位置
    const currentPos = player.position;
    const delta = DIRECTION_DELTAS[direction];
    const newPos: Position3D = {
      x: currentPos.x + delta.x,
      y: currentPos.y + delta.y,
      floor: currentPos.floor,
    };

    // 檢查位置是否有效
    if (!MovementValidator.isValidPosition(state, newPos)) {
      return { success: false, error: 'Invalid position for new room' };
    }

    // 檢查位置是否已被佔用
    const existingTile = MovementValidator.getTileAt(state, newPos);
    if (existingTile && existingTile.room) {
      return { success: false, error: 'Position already occupied' };
    }

    // 檢查是否有足夠的移動點數（發現新房間消耗 1 點）
    if (state.turn.movesRemaining < 1) {
      return { success: false, error: 'Not enough movement points' };
    }

    // 建立新房間 Tile
    const newTile: Tile = {
      x: newPos.x,
      y: newPos.y,
      floor: newPos.floor,
      room: room,
      discovered: true,
      rotation,
      placementOrder: state.map.placedRoomCount + 1,
    };

    // 更新地圖
    const floorMap = state.map[newPos.floor];
    const newFloorMap = floorMap.map((row, y) =>
      row.map((tile, x) =>
        x === newPos.x && y === newPos.y ? newTile : tile
      )
    );

    // 更新玩家位置到新發現的房間
    const updatedPlayers = state.players.map(p =>
      p.id === playerId ? { ...p, position: newPos } : p
    );

    // Rulebook Page 12: "After you discover a new room, your turn ends."
    const newState: GameState = {
      ...state,
      map: {
        ...state.map,
        [newPos.floor]: newFloorMap,
        placedRoomCount: state.map.placedRoomCount + 1,
      },
      players: updatedPlayers,
      turn: {
        ...state.turn,
        movesRemaining: state.turn.movesRemaining - 1,
        hasDiscoveredRoom: true,
        hasEnded: true, // 發現新房間後自動結束回合
      },
    };

    return { success: true, newState };
  }
}

// ==================== 路徑查找 ====================

/**
 * 路徑查找器
 * 用於查找有效移動路徑
 */
export class PathFinder {
  /**
   * 查找從當前位置到目標位置的路徑
   * 使用 BFS 算法
   * 
   * @param state 當前遊戲狀態
   * @param from 起始位置
   * @param to 目標位置
   * @param maxCost 最大移動成本（通常為 Speed）
   * @returns 路徑結果
   */
  static findPath(
    state: GameState,
    from: Position3D,
    to: Position3D,
    maxCost: number
  ): PathResult {
    // 如果目標未發現，無法移動
    const targetTile = MovementValidator.getTileAt(state, to);
    if (!targetTile || !targetTile.discovered) {
      return { valid: false, path: [], totalCost: 0, error: 'Target not discovered' };
    }

    // BFS
    const queue: { pos: Position3D; path: Position3D[]; cost: number }[] = [
      { pos: from, path: [from], cost: 0 },
    ];
    const visited = new Set<string>();
    visited.add(`${from.x},${from.y},${from.floor}`);

    while (queue.length > 0) {
      const current = queue.shift()!;

      // 找到目標
      if (current.pos.x === to.x && current.pos.y === to.y && current.pos.floor === to.floor) {
        return {
          valid: true,
          path: current.path,
          totalCost: current.cost,
        };
      }

      // 檢查所有可能的方向
      const directions: Direction[] = ['north', 'south', 'east', 'west'];
      for (const dir of directions) {
        const delta = DIRECTION_DELTAS[dir];
        const nextPos: Position3D = {
          x: current.pos.x + delta.x,
          y: current.pos.y + delta.y,
          floor: current.pos.floor,
        };

        const posKey = `${nextPos.x},${nextPos.y},${nextPos.floor}`;
        if (visited.has(posKey)) continue;

        // 檢查是否可以移動到該位置
        const validation = MovementValidator.validateMove(
          state,
          state.turn.currentPlayerId,
          nextPos
        );

        if (!validation.valid) continue;

        const newCost = current.cost + (validation.cost || 1);
        if (newCost > maxCost) continue;

        visited.add(posKey);
        queue.push({
          pos: nextPos,
          path: [...current.path, nextPos],
          cost: newCost,
        });
      }
    }

    return { valid: false, path: [], totalCost: 0, error: 'No path found' };
  }

  /**
   * 取得所有可移動的位置
   * 尊重門的限制 - 只能通過有門連接的房間移動
   * 支援秘密通道（Issue #235）
   * 
   * @param state 當前遊戲狀態
   * @param playerId 玩家 ID
   * @returns 可移動位置列表
   */
  static getReachablePositions(
    state: GameState,
    playerId: string
  ): Position3D[] {
    const player = state.players.find(p => p.id === playerId);
    if (!player) return [];

    const maxCost = state.turn.movesRemaining;
    const reachable: Position3D[] = [];
    const visited = new Set<string>();

    const queue: { pos: Position3D; cost: number }[] = [
      { pos: player.position, cost: 0 },
    ];
    visited.add(`${player.position.x},${player.position.y},${player.position.floor}`);

    // 取得當前位置的 tile
    const startTile = MovementValidator.getTileAt(state, player.position);
    if (!startTile || !startTile.room) return [];

    // 初始化標記管理器
    const tokenManager = new TokenManager(state.mapTokens || []);

    while (queue.length > 0) {
      const current = queue.shift()!;
      const currentTile = MovementValidator.getTileAt(state, current.pos);
      if (!currentTile || !currentTile.room) continue;

      // 檢查是否有秘密通道（Issue #235）
      const secretPassageDest = tokenManager.getSecretPassageDestination(current.pos);
      if (secretPassageDest) {
        const passageKey = `${secretPassageDest.x},${secretPassageDest.y},${secretPassageDest.floor}`;
        if (!visited.has(passageKey)) {
          const newCost = current.cost + STANDARD_MOVE_COST;
          if (newCost <= maxCost) {
            visited.add(passageKey);
            reachable.push(secretPassageDest);
            queue.push({ pos: secretPassageDest, cost: newCost });
          }
        }
      }

      const directions: Direction[] = ['north', 'south', 'east', 'west'];
      for (const dir of directions) {
        // 檢查當前房間是否有門通往該方向
        if (!currentTile.room.doors.includes(dir)) continue;

        const delta = DIRECTION_DELTAS[dir];
        const nextPos: Position3D = {
          x: current.pos.x + delta.x,
          y: current.pos.y + delta.y,
          floor: current.pos.floor,
        };

        const posKey = `${nextPos.x},${nextPos.y},${nextPos.floor}`;
        if (visited.has(posKey)) continue;

        // 檢查目標位置
        const targetTile = MovementValidator.getTileAt(state, nextPos);
        if (!targetTile || !targetTile.discovered || !targetTile.room) continue;

        // 檢查目標房間是否有相反方向的門
        const oppositeDir = OPPOSITE_DIRECTION[dir];
        if (!targetTile.room.doors.includes(oppositeDir)) continue;

        // 檢查是否有障礙物
        const obstacle = MovementValidator.getObstacle(state, current.pos, dir);
        let moveCost = STANDARD_MOVE_COST;
        if (obstacle) {
          if (!obstacle.canPass) continue;
          moveCost = obstacle.moveCost;
        }

        const newCost = current.cost + moveCost;
        if (newCost > maxCost) continue;

        visited.add(posKey);
        reachable.push(nextPos);
        queue.push({ pos: nextPos, cost: newCost });
      }
    }

    return reachable;
  }

  /**
   * 檢查是否可以發現新房間
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

    // 檢查是否已發現新房間
    if (state.turn.hasDiscoveredRoom) return [];

    // 檢查是否有足夠的移動點數
    if (state.turn.movesRemaining < 1) return [];

    const currentTile = MovementValidator.getTileAt(state, player.position);
    if (!currentTile || !currentTile.room) return [];

    const discoverable: Direction[] = [];
    const directions: Direction[] = ['north', 'south', 'east', 'west'];

    for (const dir of directions) {
      // 檢查當前房間是否有門通往該方向
      if (!currentTile.room.doors.includes(dir)) continue;

      // 計算新位置
      const delta = DIRECTION_DELTAS[dir];
      const newPos: Position3D = {
        x: player.position.x + delta.x,
        y: player.position.y + delta.y,
        floor: player.position.floor,
      };

      // 檢查位置是否有效
      if (!MovementValidator.isValidPosition(state, newPos)) continue;

      // 檢查位置是否已被佔用
      const existingTile = MovementValidator.getTileAt(state, newPos);
      if (existingTile && existingTile.room) continue;

      // 檢查相反方向是否有門（用於連接）
      // 這裡我們假設新房間可以旋轉以匹配門的位置
      discoverable.push(dir);
    }

    return discoverable;
  }
}

// ==================== 障礙物管理 ====================

/**
 * 障礙物管理器
 * 用於管理鎖定的門、坍塌的通道等障礙物
 */
export class ObstacleManager {
  private obstacles: Map<string, Obstacle> = new Map();

  /**
   * 建立障礙物鍵值
   */
  private static makeKey(position: Position3D, direction: Direction): string {
    return `${position.x},${position.y},${position.floor},${direction}`;
  }

  /**
   * 新增障礙物
   */
  addObstacle(obstacle: Obstacle): void {
    const key = ObstacleManager.makeKey(obstacle.position, obstacle.direction);
    this.obstacles.set(key, obstacle);
  }

  /**
   * 移除障礙物
   */
  removeObstacle(position: Position3D, direction: Direction): void {
    const key = ObstacleManager.makeKey(position, direction);
    this.obstacles.delete(key);
  }

  /**
   * 取得障礙物
   */
  getObstacle(position: Position3D, direction: Direction): Obstacle | undefined {
    const key = ObstacleManager.makeKey(position, direction);
    return this.obstacles.get(key);
  }

  /**
   * 檢查是否有障礙物
   */
  hasObstacle(position: Position3D, direction: Direction): boolean {
    return this.obstacles.has(ObstacleManager.makeKey(position, direction));
  }

  /**
   * 建立鎖定的門
   */
  static createLockedDoor(position: Position3D, direction: Direction): Obstacle {
    return {
      type: 'locked_door',
      position,
      direction,
      moveCost: OBSTACLE_MOVE_COST,
      canPass: false, // 鎖定的門無法通過，除非有鑰匙
      description: 'A locked door blocks the way',
    };
  }

  /**
   * 建立坍塌的通道
   */
  static createCollapsedPassage(position: Position3D, direction: Direction): Obstacle {
    return {
      type: 'collapsed_passage',
      position,
      direction,
      moveCost: INFINITE_COST,
      canPass: false, // 坍塌的通道無法通過
      description: 'The passage has collapsed',
    };
  }

  /**
   * 建立可通行的障礙物（例如需要額外移動點數的困難地形）
   */
  static createDifficultTerrain(position: Position3D, direction: Direction): Obstacle {
    return {
      type: 'blocked',
      position,
      direction,
      moveCost: OBSTACLE_MOVE_COST,
      canPass: true,
      description: 'Difficult terrain',
    };
  }
}

// ==================== 預設匯出 ====================

export default MovementValidator;
