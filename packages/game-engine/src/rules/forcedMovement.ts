/**
 * Forced Movement System - 強制移動系統
 * 
 * Rulebook References:
 * - Page 12-13: Movement rules
 * - Various event/omen cards that force movement
 * 
 * 這個模組實作 Betrayal 桌遊的強制移動規則：
 * 1. 被強制移動到任意板塊
 * 2. 被強制移動到相鄰板塊
 * 3. 被強制移動回上一個位置
 * 4. 被強制移動到特定樓層的 Landing 房間
 * 5. 強制移動時可能伴隨傷害
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
  StatType,
} from '../types';
import { Room } from '@betrayal/shared';

// ==================== 類型定義 ====================

/** 強制移動類型 */
export type ForcedMoveType =
  | 'any_tile'      // 移動到任意板塊（通常由事件指定）
  | 'adjacent'      // 移動到相鄰板塊
  | 'previous'      // 移動回上一個位置
  | 'landing_ground' // 移動到地面層 Landing 房間
  | 'landing_basement' // 移動到地下室 Landing 房間
  | 'landing_upper'; // 移動到上層 Landing 房間

/** 傷害類型 */
export type DamageType = 'physical' | 'mental' | 'general';

/** 強制移動選項 */
export interface ForcedMoveOptions {
  /** 移動類型 */
  type: ForcedMoveType;
  /** 指定目標位置（僅用於 'any_tile' 類型） */
  targetPosition?: Position3D;
  /** 指定方向（僅用於 'adjacent' 類型） */
  direction?: Direction;
  /** 移動伴隨的傷害 */
  damage?: {
    type: DamageType;
    amount: number;
  };
  /** 允許的樓層（用於過濾目標位置） */
  allowedFloors?: Floor[];
  /** 是否無視門的限制（某些特殊效果） */
  ignoreDoors?: boolean;
  /** 移動原因描述（用於日誌） */
  reason?: string;
}

/** 強制移動結果 */
export interface ForcedMoveResult {
  /** 是否成功 */
  success: boolean;
  /** 錯誤訊息 */
  error?: string;
  /** 新位置 */
  newPosition?: Position3D;
  /** 是否應用了傷害 */
  damageApplied: boolean;
  /** 傷害數值 */
  damageAmount?: number;
  /** 更新後的遊戲狀態 */
  newState?: GameState;
}

/** 著陸房間資訊 */
interface LandingRoomInfo {
  floor: Floor;
  landingRoomId: string;
}

// ==================== 常數 ====================

/** 各樓層的 Landing 房間 ID */
const LANDING_ROOMS: Record<string, LandingRoomInfo> = {
  landing_ground: { floor: 'ground', landingRoomId: 'entrance_hall' },
  landing_basement: { floor: 'basement', landingRoomId: 'basement_landing' },
  landing_upper: { floor: 'upper', landingRoomId: 'upper_landing' },
};

// ==================== 強制移動執行器 ====================

/**
 * 執行強制移動
 * 
 * @param player 玩家物件
 * @param gameState 當前遊戲狀態
 * @param options 強制移動選項
 * @returns 移動結果
 */
export function executeForcedMove(
  player: Player,
  gameState: GameState,
  options: ForcedMoveOptions
): ForcedMoveResult {
  // 1. 檢查玩家是否有效
  if (!player) {
    return {
      success: false,
      error: 'Player not found',
      damageApplied: false,
    };
  }

  // 2. 檢查玩家是否已死亡（死亡玩家不能被移動）
  if (player.isDead) {
    return {
      success: false,
      error: 'Cannot move dead player',
      damageApplied: false,
    };
  }

  // 3. 確定目標位置
  const targetResult = determineTargetPosition(player, gameState, options);
  if (!targetResult.success || !targetResult.position) {
    return {
      success: false,
      error: targetResult.error || 'Cannot determine target position',
      damageApplied: false,
    };
  }

  const targetPosition = targetResult.position;

  // 4. 驗證目標位置是否有效
  const validation = validateTargetPosition(gameState, targetPosition, options);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error,
      damageApplied: false,
    };
  }

  // 5. 保存當前位置為上一個位置
  const updatedPlayer: Player = {
    ...player,
    previousPosition: { ...player.position },
    position: targetPosition,
  };

  // 6. 更新遊戲狀態
  const newState: GameState = {
    ...gameState,
    players: gameState.players.map(p =>
      p.id === player.id ? updatedPlayer : p
    ),
    updatedAt: Date.now(),
  };

  // 7. 應用傷害（如果有）
  let damageApplied = false;
  let damageAmount = 0;
  if (options.damage && options.damage.amount > 0) {
    const damageResult = applyDamage(updatedPlayer, newState, options.damage);
    damageApplied = damageResult.applied;
    damageAmount = damageResult.amount;
  }

  // 8. 記錄日誌
  const logEntry = {
    timestamp: Date.now(),
    turn: gameState.turn.turnNumber,
    playerId: player.id,
    actionType: 'forced_move',
    description: options.reason || `Forced movement: ${options.type}`,
    data: {
      from: player.position,
      to: targetPosition,
      type: options.type,
      damage: options.damage,
    },
  };
  newState.log.push(logEntry);

  return {
    success: true,
    newPosition: targetPosition,
    damageApplied,
    damageAmount,
    newState,
  };
}

// ==================== 目標位置確定 ====================

/**
 * 確定強制移動的目標位置
 */
function determineTargetPosition(
  player: Player,
  gameState: GameState,
  options: ForcedMoveOptions
): { success: boolean; position?: Position3D; error?: string } {
  switch (options.type) {
    case 'any_tile':
      return handleAnyTileMove(player, gameState, options);
    case 'adjacent':
      return handleAdjacentMove(player, gameState, options);
    case 'previous':
      return handlePreviousMove(player, gameState, options);
    case 'landing_ground':
    case 'landing_basement':
    case 'landing_upper':
      return handleLandingMove(player, gameState, options);
    default:
      return { success: false, error: `Unknown forced move type: ${options.type}` };
  }
}

/**
 * 處理移動到任意板塊
 */
function handleAnyTileMove(
  player: Player,
  gameState: GameState,
  options: ForcedMoveOptions
): { success: boolean; position?: Position3D; error?: string } {
  if (!options.targetPosition) {
    return { success: false, error: 'Target position not specified for any_tile move' };
  }

  // 檢查樓層限制
  if (options.allowedFloors && options.allowedFloors.length > 0) {
    if (!options.allowedFloors.includes(options.targetPosition.floor)) {
      return {
        success: false,
        error: `Target floor ${options.targetPosition.floor} is not allowed`,
      };
    }
  }

  return { success: true, position: options.targetPosition };
}

/**
 * 處理移動到相鄰板塊
 */
function handleAdjacentMove(
  player: Player,
  gameState: GameState,
  options: ForcedMoveOptions
): { success: boolean; position?: Position3D; error?: string } {
  const currentPos = player.position;
  let targetPos: Position3D | null = null;

  if (options.direction) {
    // 使用指定方向
    const delta = DIRECTION_DELTAS[options.direction];
    targetPos = {
      x: currentPos.x + delta.x,
      y: currentPos.y + delta.y,
      floor: currentPos.floor,
    };
  } else {
    // 如果沒有指定方向，尋找第一個有效的相鄰房間
    const directions: Direction[] = ['north', 'south', 'east', 'west'];
    for (const dir of directions) {
      const delta = DIRECTION_DELTAS[dir];
      const candidatePos: Position3D = {
        x: currentPos.x + delta.x,
        y: currentPos.y + delta.y,
        floor: currentPos.floor,
      };

      const tile = getTileAt(gameState, candidatePos);
      if (tile && tile.discovered && tile.room) {
        targetPos = candidatePos;
        break;
      }
    }
  }

  if (!targetPos) {
    return { success: false, error: 'No valid adjacent room found' };
  }

  return { success: true, position: targetPos };
}

/**
 * 處理移動回上一個位置
 */
function handlePreviousMove(
  player: Player,
  gameState: GameState,
  options: ForcedMoveOptions
): { success: boolean; position?: Position3D; error?: string } {
  if (!player.previousPosition) {
    return { success: false, error: 'No previous position recorded for player' };
  }

  return { success: true, position: player.previousPosition };
}

/**
 * 處理移動到 Landing 房間
 */
function handleLandingMove(
  player: Player,
  gameState: GameState,
  options: ForcedMoveOptions
): { success: boolean; position?: Position3D; error?: string } {
  const landingInfo = LANDING_ROOMS[options.type];
  if (!landingInfo) {
    return { success: false, error: `Unknown landing type: ${options.type}` };
  }

  // 在地圖上尋找 Landing 房間
  const landingPosition = findRoomPosition(gameState, landingInfo.floor, landingInfo.landingRoomId);
  if (!landingPosition) {
    return {
      success: false,
      error: `Landing room ${landingInfo.landingRoomId} not found on ${landingInfo.floor} floor`,
    };
  }

  return { success: true, position: landingPosition };
}

// ==================== 驗證與輔助函數 ====================

/**
 * 驗證目標位置是否有效
 */
function validateTargetPosition(
  gameState: GameState,
  position: Position3D,
  options: ForcedMoveOptions
): { valid: boolean; error?: string } {
  const tile = getTileAt(gameState, position);
  if (!tile) {
    return { valid: false, error: 'Target position is outside the map' };
  }

  if (!tile.room) {
    return { valid: false, error: 'No room at target position' };
  }

  // 強制移動通常可以移動到未發現的房間（與正常移動不同）
  // 但某些情況下可能需要限制
  if (!tile.discovered && options.type !== 'any_tile') {
    // 允許強制移動到未發現的房間，但記錄警告
    console.warn(`Forced move to undiscovered room at (${position.x}, ${position.y}, ${position.floor})`);
  }

  return { valid: true };
}

/**
 * 獲取指定位置的 Tile
 */
function getTileAt(gameState: GameState, position: Position3D): Tile | null {
  const floorMap = gameState.map[position.floor];
  if (!floorMap) return null;

  if (position.y < 0 || position.y >= floorMap.length) return null;
  if (position.x < 0 || position.x >= floorMap[position.y].length) return null;

  return floorMap[position.y][position.x];
}

/**
 * 尋找指定房間的位置
 */
function findRoomPosition(
  gameState: GameState,
  floor: Floor,
  roomId: string
): Position3D | null {
  const floorMap = gameState.map[floor];
  if (!floorMap) return null;

  for (let y = 0; y < floorMap.length; y++) {
    for (let x = 0; x < floorMap[y].length; x++) {
      const tile = floorMap[y][x];
      if (tile && tile.room && tile.room.id === roomId) {
        return { x, y, floor };
      }
    }
  }

  return null;
}

// ==================== 傷害應用 ====================

/**
 * 應用傷害
 */
function applyDamage(
  player: Player,
  gameState: GameState,
  damage: { type: DamageType; amount: number }
): { applied: boolean; amount: number } {
  let statToDamage: StatType;

  // 根據傷害類型選擇屬性
  switch (damage.type) {
    case 'physical':
      // 物理傷害優先影響 Might，其次 Speed
      statToDamage = player.currentStats.might > 0 ? 'might' : 'speed';
      break;
    case 'mental':
      // 精神傷害優先影響 Sanity，其次 Knowledge
      statToDamage = player.currentStats.sanity > 0 ? 'sanity' : 'knowledge';
      break;
    case 'general':
    default:
      // 一般傷害由玩家選擇（這裡選擇數值最高的屬性）
      const stats = player.currentStats;
      const statEntries = Object.entries(stats) as [StatType, number][];
      statToDamage = statEntries.reduce((highest, current) =>
        current[1] > highest[1] ? current : highest
      )[0];
      break;
  }

  // 應用傷害（減少屬性值）
  const currentValue = player.currentStats[statToDamage];
  const newValue = Math.max(0, currentValue - damage.amount);
  const actualDamage = currentValue - newValue;

  player.currentStats[statToDamage] = newValue;

  // 檢查是否死亡（所有屬性都為 0）
  const allStatsZero = Object.values(player.currentStats).every(v => v <= 0);
  if (allStatsZero) {
    player.isDead = true;
  }

  return { applied: actualDamage > 0, amount: actualDamage };
}

// ==================== 便捷函數 ====================

/**
 * 創建強制移動到指定位置的選項
 */
export function createForcedMoveToPosition(
  position: Position3D,
  reason?: string,
  damage?: { type: DamageType; amount: number }
): ForcedMoveOptions {
  return {
    type: 'any_tile',
    targetPosition: position,
    reason,
    damage,
  };
}

/**
 * 創建強制移動到相鄰位置的選項
 */
export function createForcedMoveAdjacent(
  direction?: Direction,
  reason?: string,
  damage?: { type: DamageType; amount: number }
): ForcedMoveOptions {
  return {
    type: 'adjacent',
    direction,
    reason,
    damage,
  };
}

/**
 * 創建強制移動回上一個位置的選項
 */
export function createForcedMoveToPrevious(
  reason?: string,
  damage?: { type: DamageType; amount: number }
): ForcedMoveOptions {
  return {
    type: 'previous',
    reason,
    damage,
  };
}

/**
 * 創建強制移動到 Landing 房間的選項
 */
export function createForcedMoveToLanding(
  floor: 'ground' | 'basement' | 'upper',
  reason?: string,
  damage?: { type: DamageType; amount: number }
): ForcedMoveOptions {
  const typeMap = {
    ground: 'landing_ground',
    basement: 'landing_basement',
    upper: 'landing_upper',
  } as const;

  return {
    type: typeMap[floor],
    reason,
    damage,
  };
}

// ==================== 匯出 ====================

export default {
  executeForcedMove,
  createForcedMoveToPosition,
  createForcedMoveAdjacent,
  createForcedMoveToPrevious,
  createForcedMoveToLanding,
};
