/**
 * Item System - Bury Item Logic
 * 
 * 實作物品埋葬（丟棄）系統，用於事件卡效果
 * Rulebook Reference: 某些事件卡允許玩家埋葬物品以獲得收益
 * 
 * Example: "Wandering Ghost" - "Bury item to gain 1 Sanity OR roll: 4+ Draw item, 0-3 Take 1 General damage"
 */

import { Card, CardType } from '@betrayal/shared';
import { Player, CharacterStats, GameState } from '../types';

// ==================== 類型定義 ====================

/** 埋葬物品選項 */
export interface BuryItemOptions {
  /** 要埋葬的物品 ID */
  itemId: string;
  /** 埋葬後獲得的收益 */
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

/** 埋葬物品結果 */
export interface BuryItemResult {
  /** 是否成功 */
  success: boolean;
  /** 被埋葬的物品（若失敗則為 null） */
  buriedItem: Card | null;
  /** 收益是否已應用 */
  benefitApplied: boolean;
  /** 新的玩家屬性（若有變化） */
  newStats?: CharacterStats;
  /** 訊息 */
  message: string;
}

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
  benefit: BuryItemOptions['benefit'];
}

/** 事件卡埋葬選項 */
export interface EventBuryOption {
  /** 選項標籤（顯示給玩家） */
  label: string;
  /** 選項描述 */
  description: string;
  /** 埋葬後的收益 */
  benefit: BuryItemOptions['benefit'];
  /** 替代選項（如果不埋葬） */
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

// ==================== 常數 ====================

/** 預設事件卡埋葬選項 */
export const DEFAULT_EVENT_BURY_OPTIONS: Record<string, EventBuryOption> = {
  // Wandering Ghost: 埋葬物品獲得 +1 理智，或擲骰檢定
  'wandering_ghost': {
    label: '埋葬物品',
    description: '埋葬一個物品來安撫遊蕩的幽靈',
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
  // 可以添加更多事件卡的埋葬選項
};

// ==================== 核心函數 ====================

/**
 * 埋葬物品
 * 
 * 將物品從玩家背包中移除，並添加到棄牌堆，然後應用收益
 * 
 * @param player 玩家狀態
 * @param gameState 遊戲狀態
 * @param options 埋葬選項
 * @returns 埋葬結果
 */
export function buryItem(
  player: Player,
  gameState: GameState,
  options: BuryItemOptions
): BuryItemResult {
  const { itemId, benefit } = options;

  // 1. 檢查玩家是否擁有該物品
  const itemIndex = player.items.findIndex(item => item.id === itemId);
  const omenIndex = player.omens.findIndex(omen => omen.id === itemId);

  let itemToBury: Card | null = null;
  let itemType: 'item' | 'omen' | null = null;

  if (itemIndex !== -1) {
    itemToBury = player.items[itemIndex];
    itemType = 'item';
  } else if (omenIndex !== -1) {
    itemToBury = player.omens[omenIndex];
    itemType = 'omen';
  }

  // 2. 如果找不到物品，返回失敗
  if (!itemToBury || !itemType) {
    return {
      success: false,
      buriedItem: null,
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
  const updatedDiscardedItems = [...(gameState.discardedItems || []), itemToBury];

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

  let message = `埋葬了 ${itemToBury.name}`;
  if (benefit.type === 'stat' && benefit.stat && benefit.amount) {
    const changeText = benefit.amount > 0 ? `+${benefit.amount}` : `${benefit.amount}`;
    message += `，${statNameMap[benefit.stat]} ${changeText}`;
  } else if (benefit.type === 'avoid_damage') {
    message += `，避免了 ${benefit.damageType === 'general' ? '一般' : benefit.damageType === 'physical' ? '物理' : '精神'}傷害`;
  }

  return {
    success: true,
    buriedItem: itemToBury,
    benefitApplied,
    newStats,
    message,
  };
}

/**
 * 檢查玩家是否可以埋葬物品
 * 
 * @param player 玩家狀態
 * @returns 是否可以埋葬
 */
export function canBuryItem(player: Player): boolean {
  return player.items.length > 0 || player.omens.length > 0;
}

/**
 * 獲取玩家可埋葬的物品列表
 * 
 * @param player 玩家狀態
 * @returns 可埋葬的物品列表
 */
export function getBuryableItems(player: Player): Card[] {
  return [...player.items, ...player.omens];
}

/**
 * 獲取事件卡的埋葬選項
 * 
 * @param eventCardId 事件卡 ID
 * @returns 埋葬選項，若無則返回 null
 */
export function getEventBuryOption(eventCardId: string): EventBuryOption | null {
  return DEFAULT_EVENT_BURY_OPTIONS[eventCardId] || null;
}

/**
 * 檢查事件卡是否有埋葬選項
 * 
 * @param eventCardId 事件卡 ID
 * @returns 是否有埋葬選項
 */
export function hasBuryOption(eventCardId: string): boolean {
  return eventCardId in DEFAULT_EVENT_BURY_OPTIONS;
}

/**
 * 創建自定義埋葬選項
 * 
 * @param label 選項標籤
 * @param description 選項描述
 * @param benefit 收益
 * @param alternative 替代選項
 * @returns 埋葬選項
 */
export function createBuryOption(
  label: string,
  description: string,
  benefit: BuryItemOptions['benefit'],
  alternative?: EventBuryOption['alternative']
): EventBuryOption {
  return {
    label,
    description,
    benefit,
    alternative,
  };
}

// ==================== 遊戲狀態更新函數 ====================

/**
 * 應用埋葬結果到遊戲狀態
 * 
 * @param gameState 原始遊戲狀態
 * @param playerId 玩家 ID
 * @param buryResult 埋葬結果
 * @returns 更新後的遊戲狀態
 */
export function applyBuryResultToGameState(
  gameState: GameState,
  playerId: string,
  buryResult: BuryItemResult
): GameState {
  if (!buryResult.success || !buryResult.buriedItem) {
    return gameState;
  }

  const playerIndex = gameState.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) {
    return gameState;
  }

  const player = gameState.players[playerIndex];
  const itemId = buryResult.buriedItem.id;

  // 更新玩家物品列表
  const updatedItems = player.items.filter(item => item.id !== itemId);
  const updatedOmens = player.omens.filter(omen => omen.id !== itemId);

  // 更新玩家屬性（如果有變化）
  const updatedStats = buryResult.newStats || player.currentStats;

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
  const updatedDiscardedItems = [...(gameState.discardedItems || []), buryResult.buriedItem];

  // 添加日誌
  const newLogEntry = {
    timestamp: Date.now(),
    turn: gameState.turn.turnNumber,
    playerId,
    actionType: 'BURY_ITEM',
    description: buryResult.message,
    data: {
      itemId: buryResult.buriedItem.id,
      itemName: buryResult.buriedItem.name,
      benefitApplied: buryResult.benefitApplied,
      newStats: buryResult.newStats,
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
 * 格式化埋葬收益描述
 * 
 * @param benefit 收益
 * @returns 格式化後的描述
 */
export function formatBenefitDescription(benefit: BuryItemOptions['benefit']): string {
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
 * 獲取埋葬選項的完整描述
 * 
 * @param option 埋葬選項
 * @returns 完整描述
 */
export function getBuryOptionFullDescription(option: EventBuryOption): string {
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
