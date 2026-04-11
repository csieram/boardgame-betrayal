/**
 * Card Drawing Logic - 卡牌抽取邏輯
 * 
 * 這個模組處理遊戲中的卡牌抽取機制
 * 
 * Rulebook References:
 * - Page 8: Drawing Cards
 * - Page 9: Omen Cards and the Haunt
 */

import { 
  Card, 
  CardType, 
  Player, 
  AIPlayer, 
  GameState, 
  CardDrawResult,
  AICardDrawResult 
} from '../types';
import { handleAICardDraw } from '../ai/AIPlayer';

// ==================== 卡牌抽取函數 ====================

/**
 * 從牌堆抽取一張卡牌
 * 
 * @param deck - 卡牌牌堆
 * @returns 抽到的卡牌，或 null 如果牌堆為空
 */
export function drawCardFromDeck(deck: Card[]): Card | null {
  if (deck.length === 0) {
    return null;
  }
  // 從牌堆頂部抽卡（陣列末尾）
  return deck.pop() || null;
}

/**
 * 將卡牌加入棄牌堆
 * 
 * @param discardPile - 棄牌堆
 * @param card - 要棄置的卡牌
 */
export function discardCard(discardPile: Card[], card: Card): void {
  discardPile.push(card);
}

/**
 * 洗牌
 * 
 * @param deck - 要洗的牌堆
 */
export function shuffleDeck(deck: Card[]): void {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
}

// ==================== 玩家卡牌抽取 ====================

/**
 * 玩家抽取卡牌
 * 
 * @param player - 抽取卡牌的玩家
 * @param gameState - 當前遊戲狀態
 * @param cardType - 卡牌類型
 * @returns 卡牌抽取結果
 */
export function drawCard(
  player: Player,
  gameState: GameState,
  cardType: CardType
): CardDrawResult {
  const deck = gameState.cardDecks[`${cardType}s` as keyof typeof gameState.cardDecks];
  
  let card = drawCardFromDeck(deck);
  
  // 如果牌堆為空，重新洗牌
  if (!card) {
    const discardPile = gameState.discardPiles[`${cardType}s` as keyof typeof gameState.discardPiles];
    if (discardPile.length > 0) {
      // 將棄牌堆移回牌堆並洗牌
      deck.push(...discardPile);
      discardPile.length = 0;
      shuffleDeck(deck);
      card = drawCardFromDeck(deck);
    }
  }
  
  if (!card) {
    return {
      success: false,
      error: `No ${cardType} cards available`
    };
  }
  
  // 將卡牌加入玩家背包
  player.inventory.push(card);
  
  return {
    success: true,
    card
  };
}

// ==================== AI 卡牌抽取 ====================

/**
 * AI 玩家抽取卡牌
 * 
 * @param aiPlayer - AI 玩家
 * @param gameState - 當前遊戲狀態
 * @param cardType - 卡牌類型
 * @returns AI 卡牌抽取結果，包含鬼魂擲骰資訊（如果是預兆卡）
 */
export function drawCardForAI(
  aiPlayer: AIPlayer,
  gameState: GameState,
  cardType: CardType
): AICardDrawResult {
  const deck = gameState.cardDecks[`${cardType}s` as keyof typeof gameState.cardDecks];
  
  let card = drawCardFromDeck(deck);
  
  // 如果牌堆為空，重新洗牌
  if (!card) {
    const discardPile = gameState.discardPiles[`${cardType}s` as keyof typeof gameState.discardPiles];
    if (discardPile.length > 0) {
      deck.push(...discardPile);
      discardPile.length = 0;
      shuffleDeck(deck);
      card = drawCardFromDeck(deck);
    }
  }
  
  if (!card) {
    throw new Error(`No ${cardType} cards available`);
  }
  
  // 將卡牌加入 AI 玩家背包
  aiPlayer.inventory.push(card);
  
  // 使用 AI 卡牌抽取處理函數
  return handleAICardDraw(aiPlayer, gameState, card);
}

// ==================== 預兆卡特殊處理 ====================

/**
 * 處理預兆卡抽取
 * 當抽到預兆卡時，需要進行鬼魂擲骰
 * 
 * @param player - 抽取卡牌的玩家
 * @param gameState - 當前遊戲狀態
 * @returns 卡牌抽取結果，包含鬼魂擲骰結果
 */
export function drawOmenCard(
  player: Player,
  gameState: GameState
): CardDrawResult {
  // 如果是 AI 玩家，使用 AI 專用函數
  if (player.isAI) {
    const aiResult = drawCardForAI(player as AIPlayer, gameState, 'omen');
    
    return {
      success: true,
      card: aiResult.card,
      hauntRoll: aiResult.hauntRoll
    };
  }
  
  // 一般玩家抽取預兆卡
  const result = drawCard(player, gameState, 'omen');
  
  if (!result.success || !result.card) {
    return result;
  }
  
  // 增加預兆計數
  gameState.omenCount++;
  
  // 注意：一般玩家的鬼魂擲骰由前端處理
  // 這裡只返回卡牌資訊
  return result;
}

// ==================== 事件卡抽取 ====================

/**
 * 抽取事件卡
 * 
 * @param player - 抽取卡牌的玩家
 * @param gameState - 當前遊戲狀態
 * @returns 卡牌抽取結果
 */
export function drawEventCard(
  player: Player,
  gameState: GameState
): CardDrawResult {
  return drawCard(player, gameState, 'event');
}

// ==================== 物品卡抽取 ====================

/**
 * 抽取物品卡
 * 
 * @param player - 抽取卡牌的玩家
 * @param gameState - 當前遊戲狀態
 * @returns 卡牌抽取結果
 */
export function drawItemCard(
  player: Player,
  gameState: GameState
): CardDrawResult {
  return drawCard(player, gameState, 'item');
}
