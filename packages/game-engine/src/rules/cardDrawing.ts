import { Card, CardType, EVENT_CARDS, ITEM_CARDS, OMEN_CARDS } from '@betrayal/shared';
import { SeededRng } from '../core/GameState';

/**
 * 卡牌抽牌管理器
 * 
 * 負責管理三種卡牌牌堆的洗牌、抽牌和效果應用
 * Rulebook Reference: 當玩家進入有符號的房間時抽牌
 */
export class CardDrawingManager {
  private eventDeck: Card[] = [];
  private itemDeck: Card[] = [];
  private omenDeck: Card[] = [];
  
  private eventDiscard: Card[] = [];
  private itemDiscard: Card[] = [];
  private omenDiscard: Card[] = [];
  
  private drawnCards: Set<string> = new Set();
  private rng: SeededRng;
  
  // 作祟相關狀態
  private omenCount: number = 0;
  private hauntTriggered: boolean = false;

  constructor(seed: string) {
    this.rng = new SeededRng(seed);
    this.initializeDecks();
  }

  /**
   * 初始化並洗牌所有牌堆
   * Rulebook: 遊戲開始時洗牌
   */
  private initializeDecks(): void {
    // 複製卡牌資料
    this.eventDeck = [...EVENT_CARDS];
    this.itemDeck = [...ITEM_CARDS];
    this.omenDeck = [...OMEN_CARDS];
    
    // 洗牌
    this.eventDeck = this.rng.shuffle(this.eventDeck);
    this.itemDeck = this.rng.shuffle(this.itemDeck);
    this.omenDeck = this.rng.shuffle(this.omenDeck);
    
    console.log('[CardDrawingManager] Decks initialized and shuffled');
    console.log(`[CardDrawingManager] Event deck: ${this.eventDeck.length} cards`);
    console.log(`[CardDrawingManager] Item deck: ${this.itemDeck.length} cards`);
    console.log(`[CardDrawingManager] Omen deck: ${this.omenDeck.length} cards`);
  }

  /**
   * 抽一張卡牌
   * @param type 卡牌類型：'event' | 'item' | 'omen'
   * @returns 抽到的卡牌，若牌堆為空則返回 null
   */
  drawCard(type: CardType): Card | null {
    let deck: Card[];
    let discard: Card[];
    
    switch (type) {
      case 'event':
        deck = this.eventDeck;
        discard = this.eventDiscard;
        break;
      case 'item':
        deck = this.itemDeck;
        discard = this.itemDiscard;
        break;
      case 'omen':
        deck = this.omenDeck;
        discard = this.omenDiscard;
        break;
      default:
        throw new Error(`Unknown card type: ${type}`);
    }

    // 如果牌堆為空，將棄牌堆洗回牌堆
    if (deck.length === 0 && discard.length > 0) {
      console.log(`[CardDrawingManager] Reshuffling ${type} discard pile`);
      deck.push(...this.rng.shuffle(discard));
      discard.length = 0;
    }

    // 如果還是沒有牌，返回 null
    if (deck.length === 0) {
      console.log(`[CardDrawingManager] No ${type} cards available`);
      return null;
    }

    // 抽牌
    const card = deck.pop()!;
    this.drawnCards.add(card.id);
    
    console.log(`[CardDrawingManager] Drew ${type} card: ${card.name}`);

    // 如果是預兆卡，增加預兆計數
    if (type === 'omen') {
      this.omenCount++;
      console.log(`[CardDrawingManager] Omen count: ${this.omenCount}`);
    }

    return card;
  }

  /**
   * 棄置卡牌
   * @param card 要棄置的卡牌
   */
  discardCard(card: Card): void {
    switch (card.type) {
      case 'event':
        this.eventDiscard.push(card);
        break;
      case 'item':
        this.itemDiscard.push(card);
        break;
      case 'omen':
        this.omenDiscard.push(card);
        break;
    }
    console.log(`[CardDrawingManager] Discarded ${card.type} card: ${card.name}`);
  }

  /**
   * 檢查是否需要進行作祟檢定
   * Rulebook: 抽到預兆卡後進行作祟檢定
   * @returns 是否需要檢定
   */
  shouldTriggerHauntRoll(): boolean {
    return this.omenCount > 0 && !this.hauntTriggered;
  }

  /**
   * 進行作祟檢定
   * Rulebook: 擲骰子，若結果小於已抽預兆卡數量，則觸發作祟
   * @returns 是否觸發作祟
   */
  performHauntRoll(): { triggered: boolean; roll: number; threshold: number } {
    // 擲六面骰（1-6）
    const roll = this.rng.nextInt(1, 6);
    const threshold = this.omenCount;
    const triggered = roll < threshold;

    console.log(`[CardDrawingManager] Haunt roll: ${roll} vs threshold ${threshold}`);
    console.log(`[CardDrawingManager] Haunt ${triggered ? 'TRIGGERED!' : 'not triggered'}`);

    if (triggered) {
      this.hauntTriggered = true;
    }

    return { triggered, roll, threshold };
  }

  /**
   * 獲取牌堆狀態
   */
  getDeckStatus(): {
    event: { remaining: number; discarded: number };
    item: { remaining: number; discarded: number };
    omen: { remaining: number; discarded: number };
    omenCount: number;
    hauntTriggered: boolean;
  } {
    return {
      event: { remaining: this.eventDeck.length, discarded: this.eventDiscard.length },
      item: { remaining: this.itemDeck.length, discarded: this.itemDiscard.length },
      omen: { remaining: this.omenDeck.length, discarded: this.omenDiscard.length },
      omenCount: this.omenCount,
      hauntTriggered: this.hauntTriggered,
    };
  }

  /**
   * 獲取剩餘卡牌數量
   */
  getRemainingCount(type: CardType): number {
    switch (type) {
      case 'event':
        return this.eventDeck.length;
      case 'item':
        return this.itemDeck.length;
      case 'omen':
        return this.omenDeck.length;
      default:
        return 0;
    }
  }

  /**
   * 重置牌堆（用於測試）
   */
  reset(): void {
    this.eventDeck = [];
    this.itemDeck = [];
    this.omenDeck = [];
    this.eventDiscard = [];
    this.itemDiscard = [];
    this.omenDiscard = [];
    this.drawnCards.clear();
    this.omenCount = 0;
    this.hauntTriggered = false;
    this.initializeDecks();
  }
}

/**
 * 卡牌效果應用器
 * 負責將卡牌效果應用到玩家身上
 */
export interface PlayerState {
  id: string;
  name: string;
  stats: {
    speed: number;
    might: number;
    sanity: number;
    knowledge: number;
  };
  items: Card[];
  omens: Card[];
}

export interface CardEffectResult {
  success: boolean;
  message: string;
  statChanges?: Partial<Record<'speed' | 'might' | 'sanity' | 'knowledge', number>>;
  itemAdded?: Card;
  omenAdded?: Card;
  requiresRoll?: boolean;
  rollStat?: 'speed' | 'might' | 'sanity' | 'knowledge';
  rollTarget?: number;
  rollSuccess?: string;
  rollFailure?: string;
}

export class CardEffectApplier {
  private rng: SeededRng;

  constructor(seed: string) {
    this.rng = new SeededRng(seed);
  }

  /**
   * 應用卡牌效果
   * @param card 卡牌
   * @param player 玩家狀態
   * @returns 效果結果
   */
  applyCardEffect(card: Card, player: PlayerState): CardEffectResult {
    console.log(`[CardEffectApplier] Applying ${card.type} card effect: ${card.name}`);

    switch (card.type) {
      case 'event':
        return this.applyEventEffect(card, player);
      case 'item':
        return this.applyItemEffect(card, player);
      case 'omen':
        return this.applyOmenEffect(card, player);
      default:
        return { success: false, message: '未知的卡牌類型' };
    }
  }

  /**
   * 應用事件卡效果
   * 事件卡：立即應用效果，然後棄置
   */
  private applyEventEffect(card: Card, player: PlayerState): CardEffectResult {
    // 如果需要擲骰檢定
    if (card.rollRequired) {
      return {
        success: true,
        message: `${card.description} 需要進行 ${card.rollRequired.stat} 檢定（目標 ${card.rollRequired.target}）`,
        requiresRoll: true,
        rollStat: card.rollRequired.stat,
        rollTarget: card.rollRequired.target,
        rollSuccess: card.success,
        rollFailure: card.failure,
      };
    }

    // 直接應用效果
    const result: CardEffectResult = {
      success: true,
      message: card.description,
    };

    // 根據效果描述解析數值變化
    const statChanges = this.parseEffectStats(card.effect);
    if (statChanges) {
      result.statChanges = statChanges;
    }

    return result;
  }

  /**
   * 應用物品卡效果
   * 物品卡：加入玩家背包
   */
  private applyItemEffect(card: Card, player: PlayerState): CardEffectResult {
    player.items.push(card);
    
    return {
      success: true,
      message: `獲得物品：${card.name} - ${card.description}`,
      itemAdded: card,
    };
  }

  /**
   * 應用預兆卡效果
   * 預兆卡：加入玩家預兆列表，並觸發作祟檢定
   */
  private applyOmenEffect(card: Card, player: PlayerState): CardEffectResult {
    player.omens.push(card);
    
    return {
      success: true,
      message: `獲得預兆：${card.name} - ${card.description}`,
      omenAdded: card,
    };
  }

  /**
   * 執行檢定擲骰
   * @param stat 屬性
   * @param target 目標值
   * @param playerCurrentValue 玩家當前屬性值
   * @returns 檢定結果
   */
  performRoll(
    stat: 'speed' | 'might' | 'sanity' | 'knowledge',
    target: number,
    playerCurrentValue: number
  ): { success: boolean; roll: number; message: string } {
    // 擲骰子（使用玩家屬性值決定骰子數量，每個骰子 0-2）
    const numDice = Math.max(1, playerCurrentValue);
    let total = 0;
    const rolls: number[] = [];

    for (let i = 0; i < numDice; i++) {
      // 0, 1, 或 2
      const roll = this.rng.nextInt(0, 2);
      rolls.push(roll);
      total += roll;
    }

    const success = total >= target;
    const message = success
      ? `檢定成功！擲出 ${rolls.join('+')} = ${total}（目標 ${target}）`
      : `檢定失敗！擲出 ${rolls.join('+')} = ${total}（目標 ${target}）`;

    console.log(`[CardEffectApplier] Roll for ${stat}: ${rolls.join('+')} = ${total} vs ${target} -> ${success ? 'SUCCESS' : 'FAILURE'}`);

    return { success, roll: total, message };
  }

  /**
   * 解析效果描述中的數值變化
   * 簡單的解析器，處理常見的效果格式
   */
  private parseEffectStats(effect?: string): Partial<Record<'speed' | 'might' | 'sanity' | 'knowledge', number>> | null {
    if (!effect) return null;

    const changes: Partial<Record<'speed' | 'might' | 'sanity' | 'knowledge', number>> = {};
    const lowerEffect = effect.toLowerCase();

    // 解析體力/力量變化
    const mightMatch = lowerEffect.match(/(力量|體力|might)\s*([+-])(\d+)/);
    if (mightMatch) {
      changes.might = mightMatch[2] === '+' ? parseInt(mightMatch[3]) : -parseInt(mightMatch[3]);
    }

    // 解析速度變化
    const speedMatch = lowerEffect.match(/(速度|speed)\s*([+-])(\d+)/);
    if (speedMatch) {
      changes.speed = speedMatch[2] === '+' ? parseInt(speedMatch[3]) : -parseInt(speedMatch[3]);
    }

    // 解析理智變化
    const sanityMatch = lowerEffect.match(/(理智|sanity)\s*([+-])(\d+)/);
    if (sanityMatch) {
      changes.sanity = sanityMatch[2] === '+' ? parseInt(sanityMatch[3]) : -parseInt(sanityMatch[3]);
    }

    // 解析知識變化
    const knowledgeMatch = lowerEffect.match(/(知識|knowledge)\s*([+-])(\d+)/);
    if (knowledgeMatch) {
      changes.knowledge = knowledgeMatch[2] === '+' ? parseInt(knowledgeMatch[3]) : -parseInt(knowledgeMatch[3]);
    }

    return Object.keys(changes).length > 0 ? changes : null;
  }
}

/**
 * 卡牌抽牌結果
 */
export interface CardDrawResult {
  success: boolean;
  card: Card | null;
  type: CardType;
  message: string;
  effectResult?: CardEffectResult;
  hauntRoll?: {
    triggered: boolean;
    roll: number;
    threshold: number;
  };
}

/**
 * 抽牌並應用效果的便捷函數
 */
export function drawAndApplyCard(
  cardManager: CardDrawingManager,
  effectApplier: CardEffectApplier,
  type: CardType,
  player: PlayerState
): CardDrawResult {
  // 抽牌
  const card = cardManager.drawCard(type);
  
  if (!card) {
    return {
      success: false,
      card: null,
      type,
      message: `沒有可用的${type === 'event' ? '事件' : type === 'item' ? '物品' : '預兆'}卡`,
    };
  }

  // 應用效果
  const effectResult = effectApplier.applyCardEffect(card, player);

  // 事件卡立即棄置
  if (type === 'event') {
    cardManager.discardCard(card);
  }

  const result: CardDrawResult = {
    success: true,
    card,
    type,
    message: effectResult.message,
    effectResult,
  };

  // 如果是預兆卡，進行作祟檢定
  if (type === 'omen' && cardManager.shouldTriggerHauntRoll()) {
    result.hauntRoll = cardManager.performHauntRoll();
  }

  return result;
}

// 匯出類型和函數
export type { Card, CardType } from '@betrayal/shared';
