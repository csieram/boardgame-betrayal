/**
 * Damage System for Betrayal at House on the Hill
 * 
 * 這個檔案實作傷害分配和死亡機制
 * 
 * Rulebook References:
 * - Page 9, 19: 角色死亡規則
 * - Page 15: 戰鬥傷害規則
 * 
 * 設計原則：
 * 1. 確定性邏輯 - 純函數，無副作用
 * 2. 可測試性 - 每個規則都有對應測試
 * 3. 可追溯性 - 每個實作都引用規則書頁碼
 */

import { CharacterStats, StatType, Player } from '../types';

// ==================== 類型定義 ====================

/** 傷害類型 */
export type DamageType = 'physical' | 'mental' | 'general';

/** 物理屬性（可承受物理傷害） */
export type PhysicalTrait = 'might' | 'speed';

/** 心智屬性（可承受心智傷害） */
export type MentalTrait = 'knowledge' | 'sanity';

/** 所有屬性 */
export type AllTrait = PhysicalTrait | MentalTrait;

/** 傷害分配請求 */
export interface DamageAllocation {
  /** 傷害類型 */
  type: DamageType;
  /** 傷害數值 */
  amount: number;
  /** 可選擇的屬性列表（由系統根據傷害類型決定） */
  availableTraits: StatType[];
}

/** 傷害應用結果 */
export interface DamageApplicationResult {
  /** 是否成功應用 */
  success: boolean;
  /** 玩家是否死亡 */
  playerDied: boolean;
  /** 新的屬性值 */
  newStats: CharacterStats;
  /** 減少的屬性 */
  reducedStat: StatType;
  /** 實際減少的數值 */
  actualReduction: number;
  /** 錯誤訊息（如果有） */
  error?: string;
}

/** 死亡結果 */
export interface DeathResult {
  /** 玩家 ID */
  playerId: string;
  /** 玩家名稱 */
  playerName: string;
  /** 死亡原因 */
  causeOfDeath: string;
  /** 死亡時的屬性狀態 */
  finalStats: CharacterStats;
  /** 導致死亡的屬性 */
  fatalStat: StatType;
  /** 玩家持有的物品 */
  items: string[];
  /** 玩家持有的預兆 */
  omens: string[];
}

/** 死亡處理結果 */
export interface DeathHandlingResult {
  /** 死亡結果詳情 */
  deathResult: DeathResult;
  /** 掉落的物品列表 */
  droppedItems: string[];
  /** 需要分發的物品列表（給其他玩家） */
  itemsToDistribute: string[];
  /** 死亡通知訊息 */
  deathNotification: string;
}

// ==================== 常數 ====================

/** 物理傷害可選屬性 */
export const PHYSICAL_DAMAGE_TRAITS: PhysicalTrait[] = ['might', 'speed'];

/** 心智傷害可選屬性 */
export const MENTAL_DAMAGE_TRAITS: MentalTrait[] = ['knowledge', 'sanity'];

/** 所有屬性 */
export const ALL_TRAITS: StatType[] = ['might', 'speed', 'knowledge', 'sanity'];

/** 屬性名稱對照（中文） */
export const TRAIT_NAMES: Record<StatType, string> = {
  might: '力量',
  speed: '速度',
  knowledge: '知識',
  sanity: '理智',
};

/** 屬性名稱對照（英文） */
export const TRAIT_NAMES_EN: Record<StatType, string> = {
  might: 'Might',
  speed: 'Speed',
  knowledge: 'Knowledge',
  sanity: 'Sanity',
};

/** 死亡閾值 */
export const DEATH_THRESHOLD = 0;

/** 探索階段最小屬性值（有骷髏符號但不死亡） */
export const EXPLORATION_MIN_STAT = 1;

// ==================== 核心函數 ====================

/**
 * 根據傷害類型取得可選屬性
 * 
 * Rulebook Reference: Page 15 - 戰鬥傷害規則
 * - 物理傷害：可以減少 Might 或 Speed
 * - 心智傷害：可以減少 Knowledge 或 Sanity
 * - 一般傷害：可以減少任何屬性
 * 
 * @param damageType 傷害類型
 * @returns 可選擇的屬性列表
 */
export function getAvailableTraitsForDamage(damageType: DamageType): StatType[] {
  switch (damageType) {
    case 'physical':
      return [...PHYSICAL_DAMAGE_TRAITS];
    case 'mental':
      return [...MENTAL_DAMAGE_TRAITS];
    case 'general':
      return [...ALL_TRAITS];
    default:
      return [...ALL_TRAITS];
  }
}

/**
 * 檢查屬性是否有效對應傷害類型
 * 
 * @param damageType 傷害類型
 * @param trait 要檢查的屬性
 * @returns 是否有效
 */
export function isValidTraitForDamage(damageType: DamageType, trait: StatType): boolean {
  const availableTraits = getAvailableTraitsForDamage(damageType);
  return availableTraits.includes(trait);
}

/**
 * 檢查玩家是否死亡
 * 
 * Rulebook Reference: Page 9, 19 - 角色死亡規則
 * - 作祟階段：任何屬性到達 0，角色死亡
 * - 探索階段：屬性不會低於臨界值（顯示骷髏符號但不死亡）
 * 
 * @param stats 角色屬性
 * @param isHauntActive 是否處於作祟階段
 * @returns 是否死亡
 */
export function checkDeath(stats: CharacterStats, isHauntActive: boolean = true): boolean {
  // 作祟階段：任何屬性 <= 0 即死亡
  if (isHauntActive) {
    return stats.might <= DEATH_THRESHOLD ||
           stats.speed <= DEATH_THRESHOLD ||
           stats.knowledge <= DEATH_THRESHOLD ||
           stats.sanity <= DEATH_THRESHOLD;
  }
  
  // 探索階段：屬性不會低於 1（有骷髏符號但不死亡）
  return false;
}

/**
 * 找出導致死亡的屬性
 * 
 * @param stats 角色屬性
 * @returns 導致死亡的屬性，如果沒有死亡則返回 null
 */
export function findFatalStat(stats: CharacterStats): StatType | null {
  if (stats.might <= DEATH_THRESHOLD) return 'might';
  if (stats.speed <= DEATH_THRESHOLD) return 'speed';
  if (stats.knowledge <= DEATH_THRESHOLD) return 'knowledge';
  if (stats.sanity <= DEATH_THRESHOLD) return 'sanity';
  return null;
}

/**
 * 計算屬性減少後的新值
 * 
 * Rulebook Reference: Page 9 - 屬性軌道
 * - 屬性有最小值限制（通常為 0 或 1）
 * - 探索階段不會低於 1
 * 
 * @param currentValue 當前值
 * @param reduction 減少數值
 * @param isHauntActive 是否處於作祟階段
 * @returns 新的屬性值
 */
export function calculateNewStatValue(
  currentValue: number,
  reduction: number,
  isHauntActive: boolean = true
): number {
  const minValue = isHauntActive ? 0 : EXPLORATION_MIN_STAT;
  return Math.max(minValue, currentValue - reduction);
}

/**
 * 計算實際可減少的數值
 * 
 * 考慮到屬性最小值限制，實際減少的數值可能小於請求的數值
 * 
 * @param currentValue 當前值
 * @param requestedReduction 請求減少數值
 * @param isHauntActive 是否處於作祟階段
 * @returns 實際可減少的數值
 */
export function calculateActualReduction(
  currentValue: number,
  requestedReduction: number,
  isHauntActive: boolean = true
): number {
  const minValue = isHauntActive ? 0 : EXPLORATION_MIN_STAT;
  const maxReduction = currentValue - minValue;
  return Math.min(requestedReduction, maxReduction);
}

/**
 * 應用傷害到指定屬性
 * 
 * Rulebook Reference: Page 15 - 戰鬥傷害
 * - 輸家降低屬性
 * - 玩家選擇要降低哪個屬性（根據傷害類型）
 * 
 * @param currentStats 當前屬性
 * @param damage 傷害分配請求
 * @param chosenTrait 玩家選擇的屬性
 * @param isHauntActive 是否處於作祟階段
 * @returns 傷害應用結果
 */
export function applyDamage(
  currentStats: CharacterStats,
  damage: DamageAllocation,
  chosenTrait: StatType,
  isHauntActive: boolean = true
): DamageApplicationResult {
  // 驗證選擇的屬性是否有效
  if (!isValidTraitForDamage(damage.type, chosenTrait)) {
    return {
      success: false,
      playerDied: false,
      newStats: { ...currentStats },
      reducedStat: chosenTrait,
      actualReduction: 0,
      error: `屬性 ${TRAIT_NAMES[chosenTrait]} 不能承受 ${damage.type} 傷害`,
    };
  }

  // 驗證選擇的屬性是否在可用列表中
  if (!damage.availableTraits.includes(chosenTrait)) {
    return {
      success: false,
      playerDied: false,
      newStats: { ...currentStats },
      reducedStat: chosenTrait,
      actualReduction: 0,
      error: `屬性 ${TRAIT_NAMES[chosenTrait]} 不在可用選項中`,
    };
  }

  // 計算實際減少的數值
  const currentValue = currentStats[chosenTrait];
  const actualReduction = calculateActualReduction(
    currentValue,
    damage.amount,
    isHauntActive
  );

  // 計算新屬性值
  const newValue = calculateNewStatValue(
    currentValue,
    actualReduction,
    isHauntActive
  );

  // 建立新屬性狀態
  const newStats: CharacterStats = {
    ...currentStats,
    [chosenTrait]: newValue,
  };

  // 檢查是否死亡
  const playerDied = checkDeath(newStats, isHauntActive);

  return {
    success: true,
    playerDied,
    newStats,
    reducedStat: chosenTrait,
    actualReduction,
  };
}

/**
 * 建立傷害分配請求
 * 
 * @param type 傷害類型
 * @param amount 傷害數值
 * @returns 傷害分配請求
 */
export function createDamageAllocation(
  type: DamageType,
  amount: number
): DamageAllocation {
  return {
    type,
    amount,
    availableTraits: getAvailableTraitsForDamage(type),
  };
}

// ==================== 死亡處理 ====================

/**
 * 建立死亡結果
 * 
 * @param player 死亡玩家
 * @param finalStats 最終屬性
 * @param isHauntActive 是否處於作祟階段
 * @returns 死亡結果，如果沒有死亡則返回 null
 */
export function createDeathResult(
  player: Player,
  finalStats: CharacterStats,
  isHauntActive: boolean = true
): DeathResult | null {
  if (!checkDeath(finalStats, isHauntActive)) {
    return null;
  }

  const fatalStat = findFatalStat(finalStats);
  if (!fatalStat) {
    return null;
  }

  const causeOfDeath = `${TRAIT_NAMES[fatalStat]}歸零`;

  return {
    playerId: player.id,
    playerName: player.name,
    causeOfDeath,
    finalStats: { ...finalStats },
    fatalStat,
    items: player.items.map(item => item.id),
    omens: player.omens.map(omen => omen.id),
  };
}

/**
 * 處理玩家死亡
 * 
 * Rulebook Reference: Page 19 - 作祟階段死亡
 * - 角色死亡後留下屍體在房間
 * - 其他玩家可以搜刮屍體
 * 
 * @param player 死亡玩家
 * @param finalStats 最終屬性
 * @param isHauntActive 是否處於作祟階段
 * @returns 死亡處理結果，如果沒有死亡則返回 null
 */
export function handlePlayerDeath(
  player: Player,
  finalStats: CharacterStats,
  isHauntActive: boolean = true
): DeathHandlingResult | null {
  const deathResult = createDeathResult(player, finalStats, isHauntActive);
  if (!deathResult) {
    return null;
  }

  // 收集所有物品
  const allItems = [...deathResult.items, ...deathResult.omens];
  
  // 死亡通知訊息
  const deathNotification = `💀 ${player.name} 已死亡！死因：${deathResult.causeOfDeath}`;

  return {
    deathResult,
    droppedItems: allItems,
    itemsToDistribute: allItems,
    deathNotification,
  };
}

/**
 * 建立死亡通知訊息
 * 
 * @param deathResult 死亡結果
 * @returns 格式化的死亡通知
 */
export function formatDeathNotification(deathResult: DeathResult): string {
  const lines = [
    `💀 ${deathResult.playerName} 已死亡！`,
    `   死因：${deathResult.causeOfDeath}`,
    `   最終屬性：力量=${deathResult.finalStats.might}, 速度=${deathResult.finalStats.speed}, 知識=${deathResult.finalStats.knowledge}, 理智=${deathResult.finalStats.sanity}`,
  ];

  if (deathResult.items.length > 0) {
    lines.push(`   持有物品：${deathResult.items.length} 個`);
  }

  if (deathResult.omens.length > 0) {
    lines.push(`   持有預兆：${deathResult.omens.length} 個`);
  }

  return lines.join('\n');
}

// ==================== 輔助函數 ====================

/**
 * 取得建議的傷害分配屬性
 * 
 * 根據當前屬性值，建議玩家選擇哪個屬性承受傷害
 * 策略：選擇當前值最高的屬性，以避免死亡
 * 
 * @param stats 當前屬性
 * @param damageType 傷害類型
 * @returns 建議的屬性
 */
export function getRecommendedTraitForDamage(
  stats: CharacterStats,
  damageType: DamageType
): StatType | null {
  const availableTraits = getAvailableTraitsForDamage(damageType);
  
  // 過濾掉已經很低的屬性（<= 1）
  const safeTraits = availableTraits.filter(
    trait => stats[trait] > 1
  );

  // 如果有安全的屬性，選擇最高的
  if (safeTraits.length > 0) {
    return safeTraits.reduce((best, trait) =>
      stats[trait] > stats[best] ? trait : best
    );
  }

  // 如果都不安全，選擇最高的（避免死亡的最後機會）
  return availableTraits.reduce((best, trait) =>
    stats[trait] > stats[best] ? trait : best
  );
}

/**
 * 檢查應用傷害是否會導致死亡
 * 
 * @param stats 當前屬性
 * @param damage 傷害分配請求
 * @param chosenTrait 選擇的屬性
 * @param isHauntActive 是否處於作祟階段
 * @returns 是否會導致死亡
 */
export function willDamageCauseDeath(
  stats: CharacterStats,
  damage: DamageAllocation,
  chosenTrait: StatType,
  isHauntActive: boolean = true
): boolean {
  const result = applyDamage(stats, damage, chosenTrait, isHauntActive);
  return result.playerDied;
}

/**
 * 取得所有可能導致死亡的屬性選擇
 * 
 * @param stats 當前屬性
 * @param damage 傷害分配請求
 * @param isHauntActive 是否處於作祟階段
 * @returns 會導致死亡的屬性列表
 */
export function getFatalTraitChoices(
  stats: CharacterStats,
  damage: DamageAllocation,
  isHauntActive: boolean = true
): StatType[] {
  return damage.availableTraits.filter(trait =>
    willDamageCauseDeath(stats, damage, trait, isHauntActive)
  );
}

/**
 * 取得所有安全的屬性選擇（不會導致死亡）
 * 
 * @param stats 當前屬性
 * @param damage 傷害分配請求
 * @param isHauntActive 是否處於作祟階段
 * @returns 不會導致死亡的屬性列表
 */
export function getSafeTraitChoices(
  stats: CharacterStats,
  damage: DamageAllocation,
  isHauntActive: boolean = true
): StatType[] {
  return damage.availableTraits.filter(trait =>
    !willDamageCauseDeath(stats, damage, trait, isHauntActive)
  );
}

// ==================== 匯出 ====================

export {
  // 類型已在上方匯出
};

export default {
  getAvailableTraitsForDamage,
  isValidTraitForDamage,
  checkDeath,
  findFatalStat,
  calculateNewStatValue,
  calculateActualReduction,
  applyDamage,
  createDamageAllocation,
  createDeathResult,
  handlePlayerDeath,
  formatDeathNotification,
  getRecommendedTraitForDamage,
  willDamageCauseDeath,
  getFatalTraitChoices,
  getSafeTraitChoices,
};
