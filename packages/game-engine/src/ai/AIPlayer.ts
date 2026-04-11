/**
 * AI Player Logic - AI 玩家邏輯
 * 
 * 這個模組處理 AI 玩家的決策和行動
 */

import { 
  Player, 
  AIPlayer, 
  GameState, 
  Card, 
  AICardDrawResult,
  HauntRollResult 
} from '../types';

// ==================== 鬼魂擲骰函數 ====================

/**
 * 執行鬼魂擲骰
 * 根據 Betrayal 規則書：擲擲六面骰，總和需大於等於已揭示的預兆數量
 * 
 * @param player - 執行擲骰的玩家
 * @param omenCount - 當前已揭示的預兆數量
 * @returns 擲骰結果
 */
export function makeHauntRoll(player: Player, omenCount: number): HauntRollResult {
  // 擲六顆六面骰
  const dice: number[] = [];
  for (let i = 0; i < 6; i++) {
    dice.push(Math.floor(Math.random() * 6) + 1);
  }
  
  const total = dice.reduce((sum, val) => sum + val, 0);
  
  // 鬼魂觸發條件：總和小於預兆數量
  const triggered = total < omenCount;
  
  return {
    dice,
    total,
    triggered
  };
}

// ==================== AI 卡牌抽取 ====================

/**
 * AI 玩家抽取卡牌並處理預兆檢查
 * 
 * @param aiPlayer - AI 玩家
 * @param gameState - 當前遊戲狀態
 * @param drawnCard - 抽到的卡牌
 * @returns AI 卡牌抽取結果，包含鬼魂擲骰資訊（如果是預兆卡）
 */
export function handleAICardDraw(
  aiPlayer: AIPlayer,
  gameState: GameState,
  drawnCard: Card
): AICardDrawResult {
  // 檢查是否為預兆卡
  if (drawnCard.type === 'omen') {
    // 執行鬼魂擲骰
    const hauntRoll = makeHauntRoll(aiPlayer, gameState.omenCount);
    
    // 返回結果，包含鬼魂擲骰資訊
    return {
      card: drawnCard,
      hauntRoll: {
        dice: hauntRoll.dice,
        total: hauntRoll.total,
        triggered: hauntRoll.triggered
      }
    };
  }
  
  // 非預兆卡，直接返回卡牌資訊
  return {
    card: drawnCard
  };
}

// ==================== AI 回合處理 ====================

export interface AITurnResult {
  action: string;
  cardDrawn?: AICardDrawResult;
  hauntTriggered?: boolean;
}

/**
 * 處理 AI 玩家回合
 * 
 * @param aiPlayer - AI 玩家
 * @param gameState - 當前遊戲狀態
 * @returns AI 回合結果
 */
export function processAITurn(
  aiPlayer: AIPlayer,
  gameState: GameState
): AITurnResult {
  // TODO: 實作完整的 AI 回合邏輯
  // 這裡先回傳基本結構
  
  return {
    action: 'move',
    hauntTriggered: false
  };
}

// ==================== AI 決策輔助函數 ====================

/**
 * 判斷是否應該抽取卡牌
 * 
 * @param aiPlayer - AI 玩家
 * @param gameState - 當前遊戲狀態
 * @returns 是否應該抽卡
 */
export function shouldDrawCard(aiPlayer: AIPlayer, gameState: GameState): boolean {
  // TODO: 實作 AI 決策邏輯
  return true;
}

/**
 * 選擇移動方向
 * 
 * @param aiPlayer - AI 玩家
 * @param gameState - 當前遊戲狀態
 * @returns 移動方向
 */
export function chooseMoveDirection(
  aiPlayer: AIPlayer, 
  gameState: GameState
): string | null {
  // TODO: 實作 AI 路徑尋找邏輯
  return null;
}
