import { Card, CardType, EVENT_CARDS, ITEM_CARDS, OMEN_CARDS, CharacterStat } from '@betrayal/shared';
import { SeededRng } from '../core/GameState';

/**
 * 卡牌牌堆初始狀態
 * Issue #188: 用於從 gameState 恢復牌堆狀態
 */
export interface DeckState {
  event: { remaining: string[]; drawn: string[]; discarded: string[] };
  item: { remaining: string[]; drawn: string[]; discarded: string[] };
  omen: { remaining: string[]; drawn: string[]; discarded: string[] };
}

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

  // Issue #188: 是否使用外部牌堆狀態
  private useExternalDeckState: boolean = false;
  private externalDeckState?: DeckState;
  private onDeckStateChange?: (newState: DeckState) => void;

  constructor(seed: string, initialDecks?: DeckState) {
    this.rng = new SeededRng(seed);

    // Issue #188: 如果有初始牌堆狀態，使用它
    if (initialDecks) {
      this.useExternalDeckState = true;
      this.externalDeckState = initialDecks;
      this.initializeDecksFromState(initialDecks);
    } else {
      this.initializeDecks();
    }
  }

  /**
   * Issue #188: 設置牌堆狀態變更回調
   * 用於將牌堆狀態同步回 gameState
   */
  setDeckStateChangeCallback(callback: (newState: DeckState) => void): void {
    this.onDeckStateChange = callback;
  }

  /**
   * Issue #188: 從外部狀態初始化牌堆
   */
  private initializeDecksFromState(deckState: DeckState): void {
    // 根據 ID 從卡牌資料中查找對應卡牌
    this.eventDeck = deckState.event.remaining
      .map(id => EVENT_CARDS.find(c => c.id === id))
      .filter((c): c is Card => c !== undefined);
    this.itemDeck = deckState.item.remaining
      .map(id => ITEM_CARDS.find(c => c.id === id))
      .filter((c): c is Card => c !== undefined);
    this.omenDeck = deckState.omen.remaining
      .map(id => OMEN_CARDS.find(c => c.id === id))
      .filter((c): c is Card => c !== undefined);

    // 初始化棄牌堆
    this.eventDiscard = deckState.event.discarded
      .map(id => EVENT_CARDS.find(c => c.id === id))
      .filter((c): c is Card => c !== undefined);
    this.itemDiscard = deckState.item.discarded
      .map(id => ITEM_CARDS.find(c => c.id === id))
      .filter((c): c is Card => c !== undefined);
    this.omenDiscard = deckState.omen.discarded
      .map(id => OMEN_CARDS.find(c => c.id === id))
      .filter((c): c is Card => c !== undefined);

    // 記錄已抽卡牌
    deckState.event.drawn.forEach(id => this.drawnCards.add(id));
    deckState.item.drawn.forEach(id => this.drawnCards.add(id));
    deckState.omen.drawn.forEach(id => this.drawnCards.add(id));

    // 計算預兆數量
    this.omenCount = deckState.omen.drawn.length;

    console.log('[CardDrawingManager] Decks initialized from external state');
    console.log(`[CardDrawingManager] Event deck: ${this.eventDeck.length} cards`);
    console.log(`[CardDrawingManager] Item deck: ${this.itemDeck.length} cards`);
    console.log(`[CardDrawingManager] Omen deck: ${this.omenDeck.length} cards`);
  }

  /**
   * Issue #188: 通知牌堆狀態變更
   */
  private notifyDeckStateChange(): void {
    if (this.onDeckStateChange && this.useExternalDeckState) {
      const newState = this.getDeckState();
      this.onDeckStateChange(newState);
    }
  }

  /**
   * Issue #188: 獲取當前牌堆狀態
   */
  getDeckState(): DeckState {
    return {
      event: {
        remaining: this.eventDeck.map(c => c.id),
        drawn: Array.from(this.drawnCards).filter(id => EVENT_CARDS.some(c => c.id === id)),
        discarded: this.eventDiscard.map(c => c.id),
      },
      item: {
        remaining: this.itemDeck.map(c => c.id),
        drawn: Array.from(this.drawnCards).filter(id => ITEM_CARDS.some(c => c.id === id)),
        discarded: this.itemDiscard.map(c => c.id),
      },
      omen: {
        remaining: this.omenDeck.map(c => c.id),
        drawn: Array.from(this.drawnCards).filter(id => OMEN_CARDS.some(c => c.id === id)),
        discarded: this.omenDiscard.map(c => c.id),
      },
    };
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

    // Issue #188: 通知牌堆狀態變更
    this.notifyDeckStateChange();

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

    // Issue #188: 通知牌堆狀態變更
    this.notifyDeckStateChange();
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
   * Rulebook Page 14: 擲骰子數量 = 已發現的預兆數量
   * 若總和 < 預兆數量，則觸發作祟
   * @returns 是否觸發作祟
   */
  performHauntRoll(): { triggered: boolean; roll: number; dice: number[]; threshold: number } {
    // 擲 omenCount 顆骰子（每顆 0, 0, 1, 1, 2, 2）
    const diceCount = Math.max(1, this.omenCount);
    const dice: number[] = [];
    const DICE_FACES = [0, 0, 1, 1, 2, 2];
    
    for (let i = 0; i < diceCount; i++) {
      const faceIndex = this.rng.nextInt(0, 6);
      dice.push(DICE_FACES[faceIndex]);
    }
    
    const roll = dice.reduce((sum, val) => sum + val, 0);
    const threshold = this.omenCount;
    const triggered = roll < threshold;

    console.log(`[CardDrawingManager] Haunt roll: ${dice.join('+')} = ${roll} vs threshold ${threshold}`);
    console.log(`[CardDrawingManager] Haunt ${triggered ? 'TRIGGERED!' : 'not triggered'}`);

    if (triggered) {
      this.hauntTriggered = true;
    }

    return { triggered, roll, dice, threshold };
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
    speed: CharacterStat;
    might: CharacterStat;
    sanity: CharacterStat;
    knowledge: CharacterStat;
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
  ): { success: boolean; roll: number; message: string; dice: number[] } {
    // 擲骰子（使用玩家屬性值決定骰子數量，每個骰子 0-2）
    const numDice = Math.max(1, playerCurrentValue);
    let total = 0;
    const rolls: number[] = [];

    // 骰子面定義 [0,0,1,1,2,2] 來模擬真正的 Betrayal 骰子
    const DICE_FACES = [0, 0, 1, 1, 2, 2];
    for (let i = 0; i < numDice; i++) {
      const faceIndex = this.rng.nextInt(0, 6);
      const roll = DICE_FACES[faceIndex];
      rolls.push(roll);
      total += roll;
    }

    const success = total >= target;
    const message = success
      ? `檢定成功！擲出 ${rolls.join('+')} = ${total}（目標 ${target}）`
      : `檢定失敗！擲出 ${rolls.join('+')} = ${total}（目標 ${target}）`;

    console.log(`[CardEffectApplier] Roll for ${stat}: ${rolls.join('+')} = ${total} vs ${target} -> ${success ? 'SUCCESS' : 'FAILURE'}`);

    return { success, roll: total, message, dice: rolls };
  }

  /**
   * 執行事件卡屬性檢定
   * Rulebook Reference: 事件卡需要進行屬性檢定時使用
   * 
   * @param card 事件卡
   * @param player 玩家狀態
   * @returns 檢定結果，包含成功/失敗和對應效果
   */
  performEventCheck(
    card: Card,
    player: PlayerState
  ): {
    success: boolean;
    roll: number;
    dice: number[];
    stat: 'speed' | 'might' | 'sanity' | 'knowledge';
    target: number;
    message: string;
    effectDescription: string;
    statChanges?: Partial<Record<'speed' | 'might' | 'sanity' | 'knowledge', number>>;
    // Issue #270: 支援傷害分配（讓玩家選擇屬性）
    damage?: {
      type: 'physical' | 'mental' | 'general';
      amount: number;
    };
  } {
    if (!card.rollRequired) {
      throw new Error(`Card ${card.name} does not require a roll`);
    }

    const { stat, target } = card.rollRequired;
    const playerStatValue = getStatValue(player.stats[stat]);
    
    // 執行檢定擲骰
    const rollResult = this.performRoll(stat, target, playerStatValue);
    
    // Issue #270: 優先使用 tieredOutcomes 系統
    if (card.tieredOutcomes && card.tieredOutcomes.length > 0) {
      // 根據擲骰結果找到對應的 outcome
      const outcome = card.tieredOutcomes.find(
        o => rollResult.roll >= o.minRoll && rollResult.roll <= o.maxRoll
      );
      
      if (outcome) {
        console.log(`[CardEffectApplier] Tiered outcome found: ${outcome.effect}`);
        
        // Issue #270: 檢查是否有 damage 欄位
        if (outcome.damage) {
          console.log(`[CardEffectApplier] Damage outcome: ${outcome.damage.type} ${outcome.damage.amount}`);
          return {
            success: rollResult.success,
            roll: rollResult.roll,
            dice: rollResult.dice,
            stat,
            target,
            message: rollResult.message,
            effectDescription: outcome.effect,
            damage: outcome.damage,
          };
        }
        
        // 檢查是否有 statChange 欄位
        if (outcome.statChange) {
          const statChanges: Partial<Record<'speed' | 'might' | 'sanity' | 'knowledge', number>> = {
            [outcome.statChange.stat]: outcome.statChange.amount,
          };
          return {
            success: rollResult.success,
            roll: rollResult.roll,
            dice: rollResult.dice,
            stat,
            target,
            message: rollResult.message,
            effectDescription: outcome.effect,
            statChanges,
          };
        }
        
        // 只有效果描述，沒有數值變化
        return {
          success: rollResult.success,
          roll: rollResult.roll,
          dice: rollResult.dice,
          stat,
          target,
          message: rollResult.message,
          effectDescription: outcome.effect,
        };
      }
    }
    
    // 根據成功/失敗決定效果（舊版邏輯，向後兼容）
    let effectDescription = '';
    let statChanges: Partial<Record<'speed' | 'might' | 'sanity' | 'knowledge', number>> | undefined;
    
    if (rollResult.success) {
      effectDescription = card.success || '檢定成功！';
      // 解析成功效果中的數值變化
      statChanges = this.parseEffectStats(card.success) || undefined;
    } else {
      effectDescription = card.failure || '檢定失敗！';
      // 解析失敗效果中的數值變化（通常是傷害或損失）
      statChanges = this.parseEffectStats(card.failure) || undefined;
    }

    console.log(`[CardEffectApplier] Event check for ${card.name}: ${rollResult.success ? 'SUCCESS' : 'FAILURE'}`);
    console.log(`[CardEffectApplier] Effect: ${effectDescription}`);
    if (statChanges) {
      console.log(`[CardEffectApplier] Stat changes:`, statChanges);
    }

    return {
      success: rollResult.success,
      roll: rollResult.roll,
      dice: rollResult.dice,
      stat,
      target,
      message: rollResult.message,
      effectDescription,
      statChanges,
    };
  }

  /**
   * 解析效果描述中的數值變化
   * 簡單的解析器，處理常見的效果格式
   * Issue #117: 支援 "失去 X 點體力" 和 "獲得 X 點知識" 格式
   */
  private parseEffectStats(effect?: string): Partial<Record<'speed' | 'might' | 'sanity' | 'knowledge', number>> | null {
    if (!effect) return null;

    const changes: Partial<Record<'speed' | 'might' | 'sanity' | 'knowledge', number>> = {};
    const lowerEffect = effect.toLowerCase();

    // Issue #117: 解析 "失去 X 點屬性" 或 "獲得 X 點屬性" 格式
    // 例如："失去 1 點體力"、"獲得 1 點知識"
    
    // 解析體力/力量變化 (might)
    const mightLossMatch = lowerEffect.match(/失去\s*(\d+)\s*點體力/);
    const mightGainMatch = lowerEffect.match(/獲得\s*(\d+)\s*點體力/);
    if (mightLossMatch) {
      changes.might = -parseInt(mightLossMatch[1]);
    } else if (mightGainMatch) {
      changes.might = parseInt(mightGainMatch[1]);
    }

    // 解析速度變化 (speed)
    const speedLossMatch = lowerEffect.match(/失去\s*(\d+)\s*點速度/);
    const speedGainMatch = lowerEffect.match(/獲得\s*(\d+)\s*點速度/);
    if (speedLossMatch) {
      changes.speed = -parseInt(speedLossMatch[1]);
    } else if (speedGainMatch) {
      changes.speed = parseInt(speedGainMatch[1]);
    }

    // 解析理智變化 (sanity)
    const sanityLossMatch = lowerEffect.match(/失去\s*(\d+)\s*點理智/);
    const sanityGainMatch = lowerEffect.match(/獲得\s*(\d+)\s*點理智/);
    if (sanityLossMatch) {
      changes.sanity = -parseInt(sanityLossMatch[1]);
    } else if (sanityGainMatch) {
      changes.sanity = parseInt(sanityGainMatch[1]);
    }

    // 解析知識變化 (knowledge)
    const knowledgeLossMatch = lowerEffect.match(/失去\s*(\d+)\s*點知識/);
    const knowledgeGainMatch = lowerEffect.match(/獲得\s*(\d+)\s*點知識/);
    if (knowledgeLossMatch) {
      changes.knowledge = -parseInt(knowledgeLossMatch[1]);
    } else if (knowledgeGainMatch) {
      changes.knowledge = parseInt(knowledgeGainMatch[1]);
    }

    // 保留舊格式支援: "力量 +1"、"體力 -1" 等
    const mightMatch = lowerEffect.match(/(力量|體力|might)\s*([+-])(\d+)/);
    if (mightMatch && changes.might === undefined) {
      changes.might = mightMatch[2] === '+' ? parseInt(mightMatch[3]) : -parseInt(mightMatch[3]);
    }

    const speedMatch = lowerEffect.match(/(速度|speed)\s*([+-])(\d+)/);
    if (speedMatch && changes.speed === undefined) {
      changes.speed = speedMatch[2] === '+' ? parseInt(speedMatch[3]) : -parseInt(speedMatch[3]);
    }

    const sanityMatch = lowerEffect.match(/(理智|sanity)\s*([+-])(\d+)/);
    if (sanityMatch && changes.sanity === undefined) {
      changes.sanity = sanityMatch[2] === '+' ? parseInt(sanityMatch[3]) : -parseInt(sanityMatch[3]);
    }

    const knowledgeMatch = lowerEffect.match(/(知識|knowledge)\s*([+-])(\d+)/);
    if (knowledgeMatch && changes.knowledge === undefined) {
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
    dice: number[];
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
    const hauntRollResult = cardManager.performHauntRoll();
    result.hauntRoll = hauntRollResult;
  }

  return result;
}

/**
 * 事件卡檢定結果
 * Issue #104: Event Card Trait Checks
 */
export interface EventCheckResult {
  /** 檢定是否成功 */
  success: boolean;
  /** 擲骰總和 */
  roll: number;
  /** 各骰子結果 */
  dice: number[];
  /** 檢定屬性 */
  stat: 'speed' | 'might' | 'sanity' | 'knowledge';
  /** 目標值 */
  target: number;
  /** 檢定訊息 */
  message: string;
  /** 效果描述 */
  effectDescription: string;
  /** 屬性變化 */
  statChanges?: Partial<Record<'speed' | 'might' | 'sanity' | 'knowledge', number>>;
}

// ==================== CharacterStat 輔助函數 ====================

/**
 * 獲取當前屬性值
 * @param stat CharacterStat 對象
 * @returns 當前索引對應的數值
 */
export function getStatValue(stat: CharacterStat): number {
  return stat.values[stat.currentIndex];
}

/**
 * 應用傷害（降低索引）
 * @param stat CharacterStat 對象
 * @param amount 傷害數量
 * @returns 更新後的 CharacterStat
 */
export function applyDamageToStat(stat: CharacterStat, amount: number): CharacterStat {
  return {
    ...stat,
    currentIndex: Math.max(0, stat.currentIndex - amount)
  };
}

/**
 * 應用增益（提高索引）
 * @param stat CharacterStat 對象
 * @param amount 增益數量
 * @returns 更新後的 CharacterStat
 */
export function applyBuffToStat(stat: CharacterStat, amount: number): CharacterStat {
  return {
    ...stat,
    currentIndex: Math.min(7, stat.currentIndex + amount)
  };
}

// 匯出類型和函數
export type { Card, CardType } from '@betrayal/shared';
