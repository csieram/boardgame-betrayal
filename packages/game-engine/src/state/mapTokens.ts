/**
 * Map Token System - 地圖標記系統
 * 
 * Rulebook References:
 * - Event cards that allow placing special tokens on the map
 * - Secret Passages create connections between tiles
 * 
 * 這個模組實作 Betrayal 桌遊的地圖標記系統：
 * 1. Secret Passage - 創建兩個房間之間的連接
 * 2. Blocked - 阻擋通道
 * 3. Trap - 觸發效果
 * 4. Safe - 作祟期間的安全區域
 */

import { Position3D, Floor } from '../types';

// ==================== 類型定義 ====================

/** 標記類型 */
export type TokenType = 'secret_passage' | 'blocked' | 'trap' | 'safe';

/** 地圖標記 */
export interface MapToken {
  /** 標記唯一 ID */
  id: string;
  /** 標記類型 */
  type: TokenType;
  /** 標記位置 */
  position: Position3D;
  /** 連接位置（僅用於 secret_passage） */
  linkedPosition?: Position3D;
  /** 放置標記的玩家 ID */
  placedBy: string;
  /** 創建時間戳 */
  createdAt: number;
  /** 標記是否已觸發（用於 trap） */
  triggered?: boolean;
  /** 標記持續時間（回合數，null 表示永久） */
  duration?: number | null;
  /** 標記效果描述 */
  effectDescription?: string;
}

/** 地圖標記狀態 */
export interface MapTokenState {
  /** 所有標記列表 */
  tokens: MapToken[];
}

/** 標記驗證結果 */
export interface TokenValidationResult {
  valid: boolean;
  error?: string;
}

/** 標記放置結果 */
export interface TokenPlacementResult {
  success: boolean;
  error?: string;
  tokens?: MapToken[];
}

// ==================== 常數 ====================

/** 標記類型顯示名稱 */
export const TOKEN_TYPE_NAMES: Record<TokenType, string> = {
  secret_passage: '秘密通道',
  blocked: '阻擋標記',
  trap: '陷阱標記',
  safe: '安全區域',
};

/** 標記類型描述 */
export const TOKEN_TYPE_DESCRIPTIONS: Record<TokenType, string> = {
  secret_passage: '創建兩個房間之間的連接，玩家可以通過此通道移動',
  blocked: '阻擋通道，玩家無法通過此位置',
  trap: '陷阱標記，當玩家進入時觸發效果',
  safe: '安全區域，在作祟期間提供保護',
};

// ==================== 標記工廠函數 ====================

/**
 * 生成唯一標記 ID
 */
function generateTokenId(): string {
  return `token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 創建秘密通道標記對
 * 
 * @param position1 第一個位置
 * @param position2 第二個位置
 * @param playerId 放置標記的玩家 ID
 * @returns 兩個互相連接的標記
 */
export function createSecretPassage(
  position1: Position3D,
  position2: Position3D,
  playerId: string
): MapToken[] {
  const timestamp = Date.now();
  const id1 = generateTokenId();
  const id2 = generateTokenId();

  const token1: MapToken = {
    id: id1,
    type: 'secret_passage',
    position: position1,
    linkedPosition: position2,
    placedBy: playerId,
    createdAt: timestamp,
    effectDescription: `秘密通道連接到 (${position2.x}, ${position2.y}, ${position2.floor})`,
  };

  const token2: MapToken = {
    id: id2,
    type: 'secret_passage',
    position: position2,
    linkedPosition: position1,
    placedBy: playerId,
    createdAt: timestamp,
    effectDescription: `秘密通道連接到 (${position1.x}, ${position1.y}, ${position1.floor})`,
  };

  return [token1, token2];
}

/**
 * 創建阻擋標記
 * 
 * @param position 標記位置
 * @param playerId 放置標記的玩家 ID
 * @param direction 阻擋方向（可選）
 * @returns 阻擋標記
 */
export function createBlockedToken(
  position: Position3D,
  playerId: string,
  direction?: string
): MapToken {
  return {
    id: generateTokenId(),
    type: 'blocked',
    position,
    placedBy: playerId,
    createdAt: Date.now(),
    effectDescription: direction 
      ? `阻擋 ${direction} 方向的通道` 
      : '阻擋此位置的通道',
  };
}

/**
 * 創建陷阱標記
 * 
 * @param position 標記位置
 * @param playerId 放置標記的玩家 ID
 * @param effect 陷阱效果描述
 * @returns 陷阱標記
 */
export function createTrapToken(
  position: Position3D,
  playerId: string,
  effect: string
): MapToken {
  return {
    id: generateTokenId(),
    type: 'trap',
    position,
    placedBy: playerId,
    createdAt: Date.now(),
    triggered: false,
    effectDescription: effect,
  };
}

/**
 * 創建安全區域標記
 * 
 * @param position 標記位置
 * @param playerId 放置標記的玩家 ID
 * @returns 安全區域標記
 */
export function createSafeToken(
  position: Position3D,
  playerId: string
): MapToken {
  return {
    id: generateTokenId(),
    type: 'safe',
    position,
    placedBy: playerId,
    createdAt: Date.now(),
    effectDescription: '安全區域：在作祟期間提供保護',
  };
}

// ==================== 標記管理器 ====================

/**
 * 標記管理器
 * 用於管理地圖上的所有標記
 */
export class TokenManager {
  private tokens: MapToken[];

  constructor(initialTokens: MapToken[] = []) {
    this.tokens = [...initialTokens];
  }

  /**
   * 取得所有標記
   */
  getAllTokens(): MapToken[] {
    return [...this.tokens];
  }

  /**
   * 取得特定類型的標記
   */
  getTokensByType(type: TokenType): MapToken[] {
    return this.tokens.filter(token => token.type === type);
  }

  /**
   * 取得特定位置的標記
   */
  getTokensAtPosition(position: Position3D): MapToken[] {
    return this.tokens.filter(
      token =>
        token.position.x === position.x &&
        token.position.y === position.y &&
        token.position.floor === position.floor
    );
  }

  /**
   * 取得特定 ID 的標記
   */
  getTokenById(id: string): MapToken | undefined {
    return this.tokens.find(token => token.id === id);
  }

  /**
   * 新增標記
   */
  addToken(token: MapToken): void {
    this.tokens.push(token);
  }

  /**
   * 新增多個標記
   */
  addTokens(tokens: MapToken[]): void {
    this.tokens.push(...tokens);
  }

  /**
   * 移除標記
   */
  removeToken(id: string): boolean {
    const index = this.tokens.findIndex(token => token.id === id);
    if (index !== -1) {
      this.tokens.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * 移除特定位置的所有標記
   */
  removeTokensAtPosition(position: Position3D): number {
    const initialLength = this.tokens.length;
    this.tokens = this.tokens.filter(
      token =>
        !(
          token.position.x === position.x &&
          token.position.y === position.y &&
          token.position.floor === position.floor
        )
    );
    return initialLength - this.tokens.length;
  }

  /**
   * 標記陷阱為已觸發
   */
  triggerTrap(id: string): boolean {
    const token = this.getTokenById(id);
    if (token && token.type === 'trap') {
      token.triggered = true;
      return true;
    }
    return false;
  }

  /**
   * 取得秘密通道的連接位置
   */
  getSecretPassageDestination(position: Position3D): Position3D | undefined {
    const token = this.tokens.find(
      token =>
        token.type === 'secret_passage' &&
        token.position.x === position.x &&
        token.position.y === position.y &&
        token.position.floor === position.floor
    );
    return token?.linkedPosition;
  }

  /**
   * 檢查位置是否有秘密通道
   */
  hasSecretPassage(position: Position3D): boolean {
    return this.tokens.some(
      token =>
        token.type === 'secret_passage' &&
        token.position.x === position.x &&
        token.position.y === position.y &&
        token.position.floor === position.floor
    );
  }

  /**
   * 檢查位置是否被阻擋
   */
  isBlocked(position: Position3D): boolean {
    return this.tokens.some(
      token =>
        token.type === 'blocked' &&
        token.position.x === position.x &&
        token.position.y === position.y &&
        token.position.floor === position.floor
    );
  }

  /**
   * 檢查位置是否有陷阱
   */
  hasTrap(position: Position3D): MapToken | undefined {
    return this.tokens.find(
      token =>
        token.type === 'trap' &&
        token.position.x === position.x &&
        token.position.y === position.y &&
        token.position.floor === position.floor &&
        !token.triggered
    );
  }

  /**
   * 檢查位置是否為安全區域
   */
  isSafeZone(position: Position3D): boolean {
    return this.tokens.some(
      token =>
        token.type === 'safe' &&
        token.position.x === position.x &&
        token.position.y === position.y &&
        token.position.floor === position.floor
    );
  }

  /**
   * 取得標記狀態（用於序列化）
   */
  getState(): MapTokenState {
    return { tokens: [...this.tokens] };
  }

  /**
   * 從狀態載入標記
   */
  loadState(state: MapTokenState): void {
    this.tokens = [...state.tokens];
  }

  /**
   * 清除所有標記
   */
  clear(): void {
    this.tokens = [];
  }
}

// ==================== 驗證函數 ====================

/**
 * 驗證秘密通道位置
 * 
 * @param position1 第一個位置
 * @param position2 第二個位置
 * @returns 驗證結果
 */
export function validateSecretPassagePositions(
  position1: Position3D,
  position2: Position3D
): TokenValidationResult {
  // 檢查兩個位置是否相同
  if (
    position1.x === position2.x &&
    position1.y === position2.y &&
    position1.floor === position2.floor
  ) {
    return { valid: false, error: '兩個位置不能相同' };
  }

  // 檢查位置是否有效（在地圖範圍內）
  const isValidPosition = (pos: Position3D): boolean => {
    return (
      pos.x >= 0 &&
      pos.x < 15 &&
      pos.y >= 0 &&
      pos.y < 15 &&
      ['ground', 'upper', 'basement', 'roof'].includes(pos.floor)
    );
  };

  if (!isValidPosition(position1)) {
    return { valid: false, error: '第一個位置無效' };
  }

  if (!isValidPosition(position2)) {
    return { valid: false, error: '第二個位置無效' };
  }

  return { valid: true };
}

/**
 * 驗證標記放置
 * 
 * @param position 標記位置
 * @param tokenType 標記類型
 * @param existingTokens 現有標記列表
 * @returns 驗證結果
 */
export function validateTokenPlacement(
  position: Position3D,
  tokenType: TokenType,
  existingTokens: MapToken[]
): TokenValidationResult {
  // 檢查位置是否有效
  const isValidPosition = (pos: Position3D): boolean => {
    return (
      pos.x >= 0 &&
      pos.x < 15 &&
      pos.y >= 0 &&
      pos.y < 15 &&
      ['ground', 'upper', 'basement', 'roof'].includes(pos.floor)
    );
  };

  if (!isValidPosition(position)) {
    return { valid: false, error: '位置無效' };
  }

  // 檢查是否已有相同類型的標記
  const hasExistingToken = existingTokens.some(
    token =>
      token.type === tokenType &&
      token.position.x === position.x &&
      token.position.y === position.y &&
      token.position.floor === position.floor
  );

  if (hasExistingToken) {
    return { valid: false, error: `此位置已經有 ${TOKEN_TYPE_NAMES[tokenType]} 標記` };
  }

  return { valid: true };
}

// ==================== 預設匯出 ====================

export default TokenManager;
