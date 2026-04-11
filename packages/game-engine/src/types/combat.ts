/**
 * Combat Types - 戰鬥系統類型定義
 * 
 * Rulebook References:
 * - Page 15: Combat rules
 * 
 * 這個模組定義戰鬥系統的所有類型接口
 */

import { Card, Player, GameState, DiceRoll, StatType } from './index';

// ==================== 核心戰鬥類型 ====================

/** 戰鬥參與者類型 */
export type CombatantType = 'player' | 'monster';

/** 戰鬥參與者 */
export interface Combatant {
  id: string;
  type: CombatantType;
  name: string;
  position: { x: number; y: number; floor: string };
  might: number;
  currentMight: number;
  speed: number;
  currentSpeed: number;
  weaponBonus?: number;
}

/** 戰鬥選項 */
export interface CombatOptions {
  /** 攻擊者 ID */
  attackerId: string;
  /** 防守者 ID */
  defenderId: string;
  /** 使用的武器（可選） */
  weapon?: Card;
  /** 是否為遠程攻擊 */
  isRanged?: boolean;
}

/** 戰鬥結果 */
export interface CombatResult {
  /** 是否成功執行 */
  success: boolean;
  /** 錯誤訊息（如有） */
  error?: string;
  /** 勝利者 */
  winner?: Combatant;
  /** 失敗者 */
  loser?: Combatant;
  /** 勝利者類型 */
  winnerType?: 'attacker' | 'defender' | 'tie';
  /** 攻擊者擲骰結果 */
  attackerRoll?: DiceRoll;
  /** 防守者擲骰結果 */
  defenderRoll?: DiceRoll;
  /** 造成的傷害 */
  damage?: number;
  /** 攻擊者受到的傷害 */
  attackerDamage?: number;
  /** 防守者受到的傷害 */
  defenderDamage?: number;
  /** 傷害類型 */
  damageType?: 'physical' | 'mental';
  /** 更新後的遊戲狀態 */
  newState?: GameState;
}

/** 戰鬥驗證結果 */
export interface CombatValidation {
  /** 是否有效 */
  valid: boolean;
  /** 錯誤訊息（如有） */
  error?: string;
}

// ==================== 武器系統類型 ====================

/** 武器類型 */
export type WeaponType = 'melee' | 'ranged';

/** 武器效果 */
export interface WeaponEffect {
  /** 武器名稱 */
  name: string;
  /** 武器類型 */
  type: WeaponType;
  /** 額外骰子數量 */
  extraDice: number;
  /** 擲骰加成 */
  rollBonus: number;
  /** 使用的屬性（might 或 speed） */
  statToUse: 'might' | 'speed';
  /** 副作用（如失去 speed） */
  sideEffects?: {
    /** 影響的屬性 */
    stat: StatType;
    /** 變化值（負數表示減少） */
    value: number;
  }[];
  /** 描述 */
  description?: string;
}

/** 武器加成計算結果 */
export interface WeaponBonus {
  /** 額外骰子數量 */
  extraDice: number;
  /** 擲骰加成 */
  rollBonus: number;
  /** 使用的屬性 */
  statToUse: 'might' | 'speed';
  /** 副作用 */
  sideEffects?: {
    stat: StatType;
    value: number;
  }[];
}

// ==================== 戰鬥狀態類型 ====================

/** 戰鬥狀態 */
export interface CombatState {
  /** 是否進行中 */
  isActive: boolean;
  /** 攻擊者 ID */
  attackerId: string | null;
  /** 防守者 ID */
  defenderId: string | null;
  /** 使用的屬性 */
  usedStat: StatType | null;
  /** 攻擊者擲骰結果 */
  attackerRoll: number | null;
  /** 防守者擲骰結果 */
  defenderRoll: number | null;
  /** 造成的傷害 */
  damage: number | null;
}

/** 戰鬥動作類型 */
export type CombatActionType = 'attack' | 'defend' | 'flee';

/** 戰鬥動作 */
export interface CombatAction {
  /** 動作類型 */
  type: CombatActionType;
  /** 執行玩家 ID */
  playerId: string;
  /** 目標玩家 ID */
  targetId: string;
  /** 使用的屬性 */
  stat: StatType;
  /** 使用的武器（可選） */
  weapon?: Card;
  /** 時間戳 */
  timestamp: number;
}

// ==================== 擴展玩家類型 ====================

/** 玩家戰鬥狀態 */
export interface PlayerCombatState {
  /** 玩家 ID */
  playerId: string;
  /** 當前力量值 */
  currentMight: number;
  /** 當前速度值 */
  currentSpeed: number;
  /** 持有的武器 */
  weapons: Card[];
  /** 本回合是否已攻擊 */
  hasAttackedThisTurn: boolean;
  /** 本回合是否已防禦 */
  hasDefendedThisTurn: boolean;
}

// ==================== 常數 ====================

/** 標準戰鬥使用的屬性 */
export const COMBAT_STAT: StatType = 'might';

/** 遠程武器使用的屬性 */
export const RANGED_COMBAT_STAT: StatType = 'speed';

/** 預設武器效果 */
export const DEFAULT_WEAPON_EFFECT: WeaponEffect = {
  name: 'Unarmed',
  type: 'melee',
  extraDice: 0,
  rollBonus: 0,
  statToUse: 'might',
};

// ==================== 武器資料 ====================

/**
 * 武器效果對照表
 * 
 * 根據 Betrayal at House on the Hill 規則書：
 * - Machete: +1 to attack roll
 * - Dagger: Roll 2 extra dice, lose 1 Speed
 * - Chainsaw: Roll 1 extra die
 * - Crossbow: Attack at range, roll Speed instead of Might
 * - Gun: Attack at range, roll Speed instead of Might
 */
export const WEAPON_EFFECTS: Record<string, WeaponEffect> = {
  // 近戰武器
  'weapon_machete': {
    name: 'Machete',
    type: 'melee',
    extraDice: 0,
    rollBonus: 1,
    statToUse: 'might',
    description: '+1 to attack roll',
  },
  'weapon_dagger': {
    name: 'Dagger',
    type: 'melee',
    extraDice: 2,
    rollBonus: 0,
    statToUse: 'might',
    sideEffects: [{ stat: 'speed', value: -1 }],
    description: 'Roll 2 extra dice, lose 1 Speed',
  },
  'weapon_chainsaw': {
    name: 'Chainsaw',
    type: 'melee',
    extraDice: 1,
    rollBonus: 0,
    statToUse: 'might',
    description: 'Roll 1 extra die',
  },
  'weapon_knife': {
    name: 'Knife',
    type: 'melee',
    extraDice: 0,
    rollBonus: 1,
    statToUse: 'might',
    description: '+1 to attack roll',
  },
  'weapon_axe': {
    name: 'Axe',
    type: 'melee',
    extraDice: 0,
    rollBonus: 2,
    statToUse: 'might',
    description: '+2 to attack roll',
  },
  
  // 遠程武器
  'weapon_crossbow': {
    name: 'Crossbow',
    type: 'ranged',
    extraDice: 0,
    rollBonus: 0,
    statToUse: 'speed',
    description: 'Attack at range, roll Speed instead of Might',
  },
  'weapon_gun': {
    name: 'Gun',
    type: 'ranged',
    extraDice: 0,
    rollBonus: 0,
    statToUse: 'speed',
    description: 'Attack at range, roll Speed instead of Might',
  },
  'item_pistol': {
    name: 'Pistol',
    type: 'ranged',
    extraDice: 0,
    rollBonus: 0,
    statToUse: 'speed',
    description: 'Attack at range, roll Speed instead of Might',
  },
  
  // 預兆武器
  'omen_dagger': {
    name: 'Bloody Dagger',
    type: 'melee',
    extraDice: 0,
    rollBonus: 0,
    statToUse: 'might',
    description: '+1 damage on hit',
  },
};
