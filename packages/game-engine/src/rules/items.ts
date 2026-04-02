/**
 * Item System - Discard Item Logic
 *
 * 實作物品捨棄（丟棄）系統，用於事件卡效果
 * Rulebook Reference: 某些事件卡允許玩家捨棄物品以獲得收益
 *
 * Example: "Wandering Ghost" - "Discard item to gain 1 Sanity OR roll: 4+ Draw item, 0-3 Take 1 General damage"
 */

import { Card, CardType } from '@betrayal/shared';
import { Player, CharacterStats, GameState } from '../types';

// ==================== 類型定義 ====================

/** 捨棄物品選項 */
export interface DiscardItemOptions {
  /** 要捨棄的物品 ID */
  itemId: string;
  /** 捨棄後獲得的收益 */
  benefit: {
    /** 收益類型 */
    type: 'stat' | 'avoid_damage' | 'other';
    /** 屬性類型（當 type 為 'stat' 時使用） */
    stat?: 'might' | 'speed' | 'knowledge' | 'sanity';
    /** 數值變化（正數為增加，負數為減少） */
    amount?: number;
    /** 傷害類型（當 type 為 'avoid_damage' 時使用） */
    damageType?: 'physical' | 'mental' | 'general';
  };
}

/** 捨棄物品選項（向後兼容的別名）
 * @deprecated 請使用 DiscardItemOptions
 */
export type BuryItemOptions = DiscardItemOptions;

/** 捨棄物品結果 */
export interface DiscardItemResult {
  /** 是否成功 */
  success: boolean;
  /** 被捨棄的物品（若失敗則為 null） */
  discardedItem: Card | null;
  /** 收益是否已應用 */
  benefitApplied: boolean;
  /** 新的玩家屬性（若有變化） */
  newStats?: CharacterStats;
  /** 訊息 */
  message: string;
}

/** 埋葬物品結果（向後兼容的別名）
 * @deprecated 請使用 DiscardItemResult
 */
export type BuryItemResult = DiscardItemResult;

/** 物品選擇選項 */
export interface ItemChoice {
  /** 選項 ID */
  id: string;
  /** 選項標籤 */
  label: string;
  /** 選項描述 */
  description: string;
  /** 需要的物品類型 */
  requiredItemType?: CardType;
  /** 收益 */
  benefit: DiscardItemOptions['benefit'];
}

/** 事件卡捨棄選項 */
export interface EventDiscardOption {
  /** 選項標籤（顯示給玩家） */
  label: string;
  /** 選項描述 */
  description: string;
  /** 捨棄後的收益 */
  benefit: DiscardItemOptions['benefit'];
  /** 替代選項（如果不捨棄） */
  alternative?: {
    label: string;
    description: string;
    /** 替代是擲骰檢定 */
    isRoll: boolean;
    /** 檢定屬性（若 isRoll 為 true） */
    rollStat?: 'might' | 'speed' | 'knowledge' | 'sanity';
    /** 目標值（若 isRoll 為 true） */
    rollTarget?: number;
    /** 成功效果 */
    successEffect?: string;
    /** 失敗效果 */
    failureEffect?: string;
  };
}

/** 事件卡埋葬選項（向後兼容的別名）
 * @deprecated 請使用 EventDiscardOption
 */
export type EventBuryOption = EventDiscardOption;

// ==================== 常數 ====================

/** 預設事件卡捨棄選項 */
export const DEFAULT_EVENT_DISCARD_OPTIONS: Record<string, EventDiscardOption> = {
  // Wandering Ghost: 捨棄物品獲得 +1 理智，或擲骰檢定
  'wandering_ghost': {
    label: '捨棄物品',
    description: '捨棄一個物品來安撫遊蕩的幽靈',
    benefit: {
      type: 'stat',
      stat: 'sanity',
      amount: 1,
    },
    alternative: {
      label: '冒險一搏',
      description: '嘗試與幽靈對抗',
      isRoll: true,
      rollStat: 'might',
      rollTarget: 4,
      successEffect: 'draw_item',
      failureEffect: 'take_1_general_damage',
    },
  },
  // 可以添加更多事件卡的捨棄選項
};

/** 預設事件卡埋葬選項（向後兼容的別名）
 * @deprecated 請使用 DEFAULT_EVENT_DISCARD_OPTIONS
 */
export const DEFAULT_EVENT_BURY_OPTIONS = DEFAULT_EVENT_DISCARD_OPTIONS;

// ==================== 核心函數 ====================

/**
 * 捨棄物品
 *
 * 將物品從玩家背包中移除，並添加到棄牌堆，然後應用收益
 *
 * @param player 玩家狀態
 * @param gameState 遊戲狀態
 * @param options 捨棄選項
 * @returns 捨棄結果
 */
export function discardItem(
  player: Player,
  gameState: GameState,
  options: DiscardItemOptions
): DiscardItemResult {
  const { itemId, benefit } = options;

  // 1. 檢查玩家是否擁有該物品
  const itemIndex = player.items.findIndex(item => item.id === itemId);
  const omenIndex = player.omens.findIndex(omen => omen.id === itemId);

  let itemToDiscard: Card | null = null;
  let itemType: 'item' | 'omen' | null = null;

  if (itemIndex !== -1) {
    itemToDiscard = player.items[itemIndex];
    itemType = 'item';
  } else if (omenIndex !== -1) {
    itemToDiscard = player.omens[omenIndex];
    itemType = 'omen';
  }

  // 2. 如果找不到物品，返回失敗
  if (!itemToDiscard || !itemType) {
    return {
      success: false,
      discardedItem: null,
      benefitApplied: false,
      message: `玩家沒有 ID 為 "${itemId}" 的物品`,
    };
  }

  // 3. 從玩家背包中移除物品
  const updatedItems = [...player.items];
  const updatedOmens = [...player.omens];

  if (itemType === 'item') {
    updatedItems.splice(itemIndex, 1);
  } else {
    updatedOmens.splice(omenIndex, 1);
  }

  // 4. 添加到棄牌堆（通過更新 gameState）
  const updatedDiscardedItems = [...(gameState.discardedItems || []), itemToDiscard];

  // 5. 應用收益
  let newStats: CharacterStats | undefined;
  let benefitApplied = false;

  if (benefit.type === 'stat' && benefit.stat && benefit.amount !== undefined) {
    // 屬性變化
    newStats = {
      ...player.currentStats,
      [benefit.stat]: Math.max(0, Math.min(8, player.currentStats[benefit.stat] + benefit.amount)),
    };
    benefitApplied = true;
  } else if (benefit.type === 'avoid_damage') {
    // 避免傷害 - 這種情況下不需要修改屬性，只是標記已應用
    benefitApplied = true;
  } else if (benefit.type === 'other') {
    // 其他收益類型
    benefitApplied = true;
  }

  // 6. 構建結果
  const statNameMap: Record<string, string> = {
    might: '力量',
    speed: '速度',
    sanity: '理智',
    knowledge: '知識',
  };

  let message = `捨棄了 ${itemToDiscard.name}`;
  if (benefit.type === 'stat' && benefit.stat && benefit.amount) {
    const changeText = benefit.amount > 0 ? `+${benefit.amount}` : `${benefit.amount}`;
    message += `，${statNameMap[benefit.stat]} ${changeText}`;
  } else if (benefit.type === 'avoid_damage') {
    message += `，避免了 ${benefit.damageType === 'general' ? '一般' : benefit.damageType === 'physical' ? '物理' : '精神'}傷害`;
  }

  return {
    success: true,
    discardedItem: itemToDiscard,
    benefitApplied,
    newStats,
    message,
  };
}

/**
 * 捨棄物品（向後兼容的別名）
 * @deprecated 請使用 discardItem
 */
export function buryItem(
  player: Player,
  gameState: GameState,
  options: DiscardItemOptions
): DiscardItemResult {
  return discardItem(player, gameState, options);
}

/**
 * 檢查玩家是否可以捨棄物品
 *
 * @param player 玩家狀態
 * @returns 是否可以捨棄
 */
export function canDiscardItem(player: Player): boolean {
  return player.items.length > 0 || player.omens.length > 0;
}

/**
 * 檢查玩家是否可以埋葬物品（向後兼容的別名）
 * @deprecated 請使用 canDiscardItem
 */
export function canBuryItem(player: Player): boolean {
  return canDiscardItem(player);
}

/**
 * 獲取玩家可捨棄的物品列表
 *
 * @param player 玩家狀態
 * @returns 可捨棄的物品列表
 */
export function getDiscardableItems(player: Player): Card[] {
  return [...player.items, ...player.omens];
}

/**
 * 獲取玩家可埋葬的物品列表（向後兼容的別名）
 * @deprecated 請使用 getDiscardableItems
 */
export function getBuryableItems(player: Player): Card[] {
  return getDiscardableItems(player);
}

/**
 * 獲取事件卡的捨棄選項
 *
 * @param eventCardId 事件卡 ID
 * @returns 捨棄選項，若無則返回 null
 */
export function getEventDiscardOption(eventCardId: string): EventDiscardOption | null {
  return DEFAULT_EVENT_DISCARD_OPTIONS[eventCardId] || null;
}

/**
 * 獲取事件卡的埋葬選項（向後兼容的別名）
 * @deprecated 請使用 getEventDiscardOption
 */
export function getEventBuryOption(eventCardId: string): EventDiscardOption | null {
  return getEventDiscardOption(eventCardId);
}

/**
 * 檢查事件卡是否有捨棄選項
 *
 * @param eventCardId 事件卡 ID
 * @returns 是否有捨棄選項
 */
export function hasDiscardOption(eventCardId: string): boolean {
  return eventCardId in DEFAULT_EVENT_DISCARD_OPTIONS;
}

/**
 * 檢查事件卡是否有埋葬選項（向後兼容的別名）
 * @deprecated 請使用 hasDiscardOption
 */
export function hasBuryOption(eventCardId: string): boolean {
  return hasDiscardOption(eventCardId);
}

/**
 * 創建自定義捨棄選項
 *
 * @param label 選項標籤
 * @param description 選項描述
 * @param benefit 收益
 * @param alternative 替代選項
 * @returns 捨棄選項
 */
export function createDiscardOption(
  label: string,
  description: string,
  benefit: DiscardItemOptions['benefit'],
  alternative?: EventDiscardOption['alternative']
): EventDiscardOption {
  return {
    label,
    description,
    benefit,
    alternative,
  };
}

/**
 * 創建自定義埋葬選項（向後兼容的別名）
 * @deprecated 請使用 createDiscardOption
 */
export function createBuryOption(
  label: string,
  description: string,
  benefit: DiscardItemOptions['benefit'],
  alternative?: EventDiscardOption['alternative']
): EventDiscardOption {
  return createDiscardOption(label, description, benefit, alternative);
}

// ==================== 遊戲狀態更新函數 ====================

/**
 * 應用捨棄結果到遊戲狀態
 *
 * @param gameState 原始遊戲狀態
 * @param playerId 玩家 ID
 * @param discardResult 捨棄結果
 * @returns 更新後的遊戲狀態
 */
export function applyDiscardResultToGameState(
  gameState: GameState,
  playerId: string,
  discardResult: DiscardItemResult
): GameState {
  if (!discardResult.success || !discardResult.discardedItem) {
    return gameState;
  }

  const playerIndex = gameState.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) {
    return gameState;
  }

  const player = gameState.players[playerIndex];
  const itemId = discardResult.discardedItem.id;

  // 更新玩家物品列表
  const updatedItems = player.items.filter(item => item.id !== itemId);
  const updatedOmens = player.omens.filter(omen => omen.id !== itemId);

  // 更新玩家屬性（如果有變化）
  const updatedStats = discardResult.newStats || player.currentStats;

  // 更新玩家
  const updatedPlayer: Player = {
    ...player,
    items: updatedItems,
    omens: updatedOmens,
    currentStats: updatedStats,
  };

  // 更新玩家列表
  const updatedPlayers = [...gameState.players];
  updatedPlayers[playerIndex] = updatedPlayer;

  // 更新棄牌堆
  const updatedDiscardedItems = [...(gameState.discardedItems || []), discardResult.discardedItem];

  // 添加日誌
  const newLogEntry = {
    timestamp: Date.now(),
    turn: gameState.turn.turnNumber,
    playerId,
    actionType: 'DISCARD_ITEM',
    description: discardResult.message,
    data: {
      itemId: discardResult.discardedItem.id,
      itemName: discardResult.discardedItem.name,
      benefitApplied: discardResult.benefitApplied,
      newStats: discardResult.newStats,
    },
  };

  return {
    ...gameState,
    players: updatedPlayers,
    discardedItems: updatedDiscardedItems,
    log: [...gameState.log, newLogEntry],
    updatedAt: Date.now(),
  };
}

// ==================== 輔助函數 ====================

/**
 * 格式化捨棄收益描述
 *
 * @param benefit 收益
 * @returns 格式化後的描述
 */
export function formatBenefitDescription(benefit: DiscardItemOptions['benefit']): string {
  const statNameMap: Record<string, string> = {
    might: '力量',
    speed: '速度',
    sanity: '理智',
    knowledge: '知識',
  };

  switch (benefit.type) {
    case 'stat':
      if (benefit.stat && benefit.amount !== undefined) {
        const changeText = benefit.amount > 0 ? `+${benefit.amount}` : `${benefit.amount}`;
        return `${statNameMap[benefit.stat]} ${changeText}`;
      }
      return '屬性變化';
    case 'avoid_damage':
      return `避免 ${benefit.damageType === 'general' ? '一般' : benefit.damageType === 'physical' ? '物理' : '精神'}傷害`;
    case 'other':
      return '特殊效果';
    default:
      return '未知收益';
  }
}

/**
 * 獲取捨棄選項的完整描述
 *
 * @param option 捨棄選項
 * @returns 完整描述
 */
export function getDiscardOptionFullDescription(option: EventDiscardOption): string {
  let description = option.description;
  description += `\n收益: ${formatBenefitDescription(option.benefit)}`;

  if (option.alternative) {
    description += `\n\n或選擇: ${option.alternative.label}`;
    description += `\n${option.alternative.description}`;
    if (option.alternative.isRoll) {
      description += `\n需要 ${option.alternative.rollStat} 檢定 (目標 ${option.alternative.rollTarget})`;
    }
  }

  return description;
}

/**
 * 獲取埋葬選項的完整描述（向後兼容的別名）
 * @deprecated 請使用 getDiscardOptionFullDescription
 */
export function getBuryOptionFullDescription(option: EventDiscardOption): string {
  return getDiscardOptionFullDescription(option);
}

/**
 * 應用埋葬結果到遊戲狀態（向後兼容的別名）
 * @deprecated 請使用 applyDiscardResultToGameState
 */
export function applyBuryResultToGameState(
  gameState: GameState,
  playerId: string,
  discardResult: DiscardItemResult
): GameState {
  return applyDiscardResultToGameState(gameState, playerId, discardResult);
}
