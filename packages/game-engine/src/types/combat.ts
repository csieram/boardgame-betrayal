/**
 * Combat Types - Issue #239
 * 
 * 戰鬥系統的類型定義
 */

import { StatType, DiceRoll } from './index';

/** 戰鬥選項 */
export interface CombatOptions {
  /** 是否允許遠程攻擊 */
  allowRanged: boolean;
  /** 是否允許逃跑 */
  allowFlee: boolean;
  /** 最小距離 */
  minDistance: number;
  /** 最大距離 */
  maxDistance: number;
}

/** 戰鬥動作類型 */
export type CombatActionType = 'attack' | 'defend' | 'flee' | 'use_item';

/** 戰鬥動作 */
export interface CombatAction {
  /** 動作類型 */
  type: CombatActionType;
  /** 執行者 ID */
  actorId: string;
  /** 目標 ID（如適用） */
  targetId?: string;
  /** 使用的物品 ID（如適用） */
  itemId?: string;
  /** 時間戳 */
  timestamp: number;
}

/** 玩家戰鬥狀態 */
export interface PlayerCombatState {
  /** 玩家 ID */
  playerId: string;
  /** 是否已選擇動作 */
  hasActed: boolean;
  /** 選擇的動作 */
  selectedAction?: CombatAction;
  /** 擲骰結果 */
  rollResult?: DiceRoll;
  /** 使用的屬性 */
  usedStat?: StatType;
  /** 是否已受到傷害 */
  damageTaken: number;
}

/** 標準戰鬥使用的屬性 */
export const COMBAT_STAT: StatType = 'might';

/** 遠程戰鬥使用的屬性 */
export const RANGED_COMBAT_STAT: StatType = 'speed';

/** 預設武器效果 */
export const DEFAULT_WEAPON_EFFECT = {
  name: 'Unarmed',
  type: 'melee' as const,
  extraDice: 0,
  rollBonus: 0,
  statToUse: 'might' as const,
  description: '徒手攻擊',
};
