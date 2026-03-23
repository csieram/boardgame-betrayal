/**
 * Turn Flow System - 回合流程系統
 * 
 * Rulebook References:
 * - Page 11-13: Turn Flow
 * 
 * 這個模組實作 Betrayal 桌遊的回合流程規則：
 * 1. 回合順序輪轉
 * 2. 回合開始時根據 Speed 設定移動點數
 * 3. 發現新房間後自動結束回合
 * 4. 支援手動結束回合
 */

import {
  GameState,
  Player,
  TurnState,
  GamePhase,
  GameAction,
  EndTurnAction,
  Position3D,
} from '../types';

// ==================== 規則常數 ====================

/** 回合階段（根據規則書 Page 11-13） */
export type TurnPhase =
  | 'movement'      // 移動階段 - 可以移動最多 Speed 格
  | 'discovery'     // 發現階段 - 發現新房間
  | 'resolution'    // 解決階段 - 處理房間效果
  | 'draw_card'     // 抽卡階段
  | 'use_items'     // 使用物品階段
  | 'end';          // 回合結束

/** 回合結果 */
export interface TurnResult {
  success: boolean;
  error?: string;
  newState?: GameState;
}

/** 回合驗證結果 */
export interface TurnValidation {
  valid: boolean;
  error?: string;
}

// ==================== 回合管理器 ====================

/**
 * 回合管理器
 * 負責管理回合流程和順序
 */
export class TurnManager {
  /**
   * 開始新回合
   * Rulebook Page 11: "On your turn, you can move up to a number of spaces equal to your Speed."
   * 
   * @param state 當前遊戲狀態
   * @param playerId 玩家 ID
   * @returns 更新後的遊戲狀態
   */
  static startTurn(state: GameState, playerId: string): GameState {
    const player = state.players.find(p => p.id === playerId);
    if (!player) {
      throw new Error(`Player not found: ${playerId}`);
    }

    // Rulebook Page 13: "Your character can move a number of spaces up to his or her Speed."
    const movesRemaining = player.currentStats.speed;

    const newTurnState: TurnState = {
      currentPlayerId: playerId,
      turnNumber: state.turn.turnNumber,
      movesRemaining,
      hasDiscoveredRoom: false,
      hasDrawnCard: false,
      hasEnded: false,
      usedSpecialActions: [],
      usedItems: [],
    };

    return {
      ...state,
      turn: newTurnState,
      players: state.players.map(p =>
        p.id === playerId ? { ...p, usedItemsThisTurn: [] } : p
      ),
    };
  }

  /**
   * 結束當前回合並開始下一個玩家的回合
   * Rulebook Page 13: "End your turn. The player to your left takes the next turn."
   * 
   * @param state 當前遊戲狀態
   * @param action 結束回合動作
   * @returns 更新後的遊戲狀態
   */
  static endTurn(state: GameState, action: EndTurnAction): GameState {
    // 驗證是否為當前玩家
    if (action.playerId !== state.turn.currentPlayerId) {
      throw new Error('Not your turn');
    }

    const currentPlayer = state.players.find(p => p.id === action.playerId);
    if (!currentPlayer) {
      throw new Error(`Player not found: ${action.playerId}`);
    }

    // 找到下一個玩家（左邊的玩家，即順序中的下一個）
    // Rulebook Page 13: "The player to your left takes the next turn."
    const currentIndex = state.playerOrder.indexOf(action.playerId);
    const nextIndex = (currentIndex + 1) % state.playerOrder.length;
    const nextPlayerId = state.playerOrder[nextIndex];
    const nextPlayer = state.players.find(p => p.id === nextPlayerId)!;

    // 檢查是否完成一輪（回到第一個玩家）
    const isNewRound = nextIndex === 0;
    const newTurnNumber = isNewRound
      ? state.turn.turnNumber + 1
      : state.turn.turnNumber;

    // 檢查是否達到最大回合數
    if (newTurnNumber > state.config.maxTurns) {
      // 遊戲結束 - 達到最大回合數
      return {
        ...state,
        phase: 'game_over' as GamePhase,
        result: 'draw',
        turn: {
          ...state.turn,
          hasEnded: true,
        },
      };
    }

    // 建立新回合狀態
    const newTurnState: TurnState = {
      currentPlayerId: nextPlayerId,
      turnNumber: newTurnNumber,
      movesRemaining: nextPlayer.currentStats.speed,
      hasDiscoveredRoom: false,
      hasDrawnCard: false,
      hasEnded: false,
      usedSpecialActions: [],
      usedItems: [],
    };

    return {
      ...state,
      turn: newTurnState,
      players: state.players.map(p => ({
        ...p,
        usedItemsThisTurn: [], // 重置所有玩家的已使用物品
      })),
    };
  }

  /**
   * 檢查是否可以結束回合
   */
  static canEndTurn(state: GameState, playerId: string): TurnValidation {
    // 檢查是否為當前玩家
    if (playerId !== state.turn.currentPlayerId) {
      return { valid: false, error: 'Not your turn' };
    }

    // 檢查回合是否已結束
    if (state.turn.hasEnded) {
      return { valid: false, error: 'Turn already ended' };
    }

    return { valid: true };
  }

  /**
   * 檢查是否為當前玩家的回合
   */
  static isCurrentPlayer(state: GameState, playerId: string): boolean {
    return state.turn.currentPlayerId === playerId;
  }

  /**
   * 取得當前玩家
   */
  static getCurrentPlayer(state: GameState): Player | undefined {
    return state.players.find(p => p.id === state.turn.currentPlayerId);
  }

  /**
   * 取得下一個玩家 ID
   */
  static getNextPlayerId(state: GameState): string {
    const currentIndex = state.playerOrder.indexOf(state.turn.currentPlayerId);
    const nextIndex = (currentIndex + 1) % state.playerOrder.length;
    return state.playerOrder[nextIndex];
  }

  /**
   * 檢查回合是否因發現新房間而自動結束
   * Rulebook Page 12: "After you discover a new room, your turn ends."
   */
  static shouldAutoEndTurn(state: GameState): boolean {
    return state.turn.hasDiscoveredRoom;
  }

  /**
   * 標記回合為已發現新房間
   * 這會導致回合自動結束
   */
  static markRoomDiscovered(state: GameState): GameState {
    return {
      ...state,
      turn: {
        ...state.turn,
        hasDiscoveredRoom: true,
        hasEnded: true, // 發現新房間後自動結束回合
      },
    };
  }

  /**
   * 消耗移動點數
   */
  static consumeMovement(state: GameState, cost: number): GameState {
    return {
      ...state,
      turn: {
        ...state.turn,
        movesRemaining: Math.max(0, state.turn.movesRemaining - cost),
      },
    };
  }

  /**
   * 檢查是否還有剩餘移動點數
   */
  static hasMovementRemaining(state: GameState): boolean {
    return state.turn.movesRemaining > 0;
  }

  /**
   * 取得剩餘移動點數
   */
  static getRemainingMovement(state: GameState): number {
    return state.turn.movesRemaining;
  }

  /**
   * 檢查玩家是否可以使用物品
   * Rulebook Page 13: "You can use each item once during your turn."
   */
  static canUseItem(state: GameState, playerId: string, itemId: string): TurnValidation {
    if (!TurnManager.isCurrentPlayer(state, playerId)) {
      return { valid: false, error: 'Not your turn' };
    }

    const player = state.players.find(p => p.id === playerId);
    if (!player) {
      return { valid: false, error: 'Player not found' };
    }

    // 檢查物品是否已在本回合使用
    if (state.turn.usedItems.includes(itemId)) {
      return { valid: false, error: 'Item already used this turn' };
    }

    // 檢查玩家是否持有該物品
    const hasItem = player.items.some(i => i.id === itemId) ||
                    player.omens.some(o => o.id === itemId);
    if (!hasItem) {
      return { valid: false, error: 'Item not in possession' };
    }

    return { valid: true };
  }

  /**
   * 標記物品為已使用
   */
  static markItemUsed(state: GameState, itemId: string): GameState {
    return {
      ...state,
      turn: {
        ...state.turn,
        usedItems: [...state.turn.usedItems, itemId],
      },
    };
  }

  /**
   * 檢查是否可以抽卡
   */
  static canDrawCard(state: GameState, playerId: string): TurnValidation {
    if (!TurnManager.isCurrentPlayer(state, playerId)) {
      return { valid: false, error: 'Not your turn' };
    }

    if (state.turn.hasDrawnCard) {
      return { valid: false, error: 'Already drawn a card this turn' };
    }

    return { valid: true };
  }

  /**
   * 標記已抽卡
   */
  static markCardDrawn(state: GameState): GameState {
    return {
      ...state,
      turn: {
        ...state.turn,
        hasDrawnCard: true,
      },
    };
  }
}

// ==================== 回合順序管理 ====================

/**
 * 回合順序管理器
 * 管理玩家回合順序的輪轉
 */
export class TurnOrderManager {
  /**
   * 建立回合順序
   * Rulebook Page 7: 玩家順序由左至右（順時針）
   */
  static createTurnOrder(playerIds: string[]): string[] {
    // 複製陣列以避免修改原始資料
    return [...playerIds];
  }

  /**
   * 打亂回合順序（用於特殊情況）
   */
  static shuffleTurnOrder(playerIds: string[], seed?: string): string[] {
    // 簡單的 Fisher-Yates 洗牌
    const shuffled = [...playerIds];
    for (let i = shuffled.length - 1; i > 0; i--) {
      // 如果提供 seed，使用偽隨機；否則使用 Math.random
      const j = seed
        ? TurnOrderManager.seededRandom(i + 1, seed, i)
        : Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * 簡易 seeded random
   */
  private static seededRandom(max: number, seed: string, salt: number): number {
    let hash = 0;
    const str = seed + salt;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash) % max;
  }

  /**
   * 取得下一個玩家
   */
  static getNextPlayer(currentPlayerId: string, turnOrder: string[]): string {
    const currentIndex = turnOrder.indexOf(currentPlayerId);
    const nextIndex = (currentIndex + 1) % turnOrder.length;
    return turnOrder[nextIndex];
  }

  /**
   * 取得上一個玩家
   */
  static getPreviousPlayer(currentPlayerId: string, turnOrder: string[]): string {
    const currentIndex = turnOrder.indexOf(currentPlayerId);
    const previousIndex = (currentIndex - 1 + turnOrder.length) % turnOrder.length;
    return turnOrder[previousIndex];
  }

  /**
   * 檢查是否完成一輪
   */
  static isRoundComplete(currentPlayerId: string, turnOrder: string[]): boolean {
    const currentIndex = turnOrder.indexOf(currentPlayerId);
    return currentIndex === turnOrder.length - 1;
  }

  /**
   * 從回合順序中移除玩家（死亡時）
   */
  static removePlayer(playerId: string, turnOrder: string[]): string[] {
    return turnOrder.filter(id => id !== playerId);
  }

  /**
   * 插入玩家到回合順序（特殊情況）
   */
  static insertPlayer(playerId: string, turnOrder: string[], afterPlayerId?: string): string[] {
    if (!afterPlayerId) {
      return [...turnOrder, playerId];
    }
    const index = turnOrder.indexOf(afterPlayerId);
    if (index === -1) {
      return [...turnOrder, playerId];
    }
    const newOrder = [...turnOrder];
    newOrder.splice(index + 1, 0, playerId);
    return newOrder;
  }
}

// ==================== 回合階段管理 ====================

/**
 * 回合階段管理器
 * 管理回合內的各個階段
 */
export class TurnPhaseManager {
  /**
   * 取得當前回合階段
   */
  static getCurrentPhase(state: GameState): TurnPhase {
    if (state.turn.hasEnded) {
      return 'end';
    }

    if (state.turn.hasDiscoveredRoom) {
      // 發現新房間後進入解決階段
      return 'resolution';
    }

    if (state.turn.hasDrawnCard) {
      // 抽卡後可以使用物品
      return 'use_items';
    }

    // 預設為移動階段
    return 'movement';
  }

  /**
   * 檢查是否可以在當前階段執行動作
   */
  static canPerformAction(state: GameState, action: string): boolean {
    const phase = TurnPhaseManager.getCurrentPhase(state);

    switch (action) {
      case 'move':
        return phase === 'movement' && !state.turn.hasDiscoveredRoom;
      case 'discover':
        return phase === 'movement' || phase === 'discovery';
      case 'draw_card':
        return phase === 'resolution' && !state.turn.hasDrawnCard;
      case 'use_item':
        return phase === 'use_items' || phase === 'movement' || phase === 'resolution';
      case 'end_turn':
        return !state.turn.hasEnded;
      default:
        return false;
    }
  }
}

// ==================== 匯出 ====================

export default TurnManager;
