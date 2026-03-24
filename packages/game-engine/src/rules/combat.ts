/**
 * Combat System - 戰鬥系統
 * 
 * Rulebook References:
 * - Page 15: Combat rules
 * 
 * 這個模組實作 Betrayal 桌遊的戰鬥規則：
 * 1. 攻擊相鄰目標
 * 2. 雙方擲力量骰
 * 3. 較高總和獲勝
 * 4. 傷害 = 贏家擲骰 - 輸家擲骰
 * 5. 輸家減少力量值
 * 6. 武器可以增加力量值
 */

import {
  GameState,
  Player,
  Position3D,
  DiceRoll,
  StatType,
  Card,
} from '../types';

import { SeededRng } from '../core/GameState';

// ==================== 類型定義 ====================

/** 戰鬥參與者類型 */
export type CombatantType = 'player' | 'monster';

/** 戰鬥參與者 */
export interface Combatant {
  id: string;
  type: CombatantType;
  name: string;
  position: Position3D;
  might: number;
  currentMight: number;
  weaponBonus?: number;
}

/** 戰鬥結果 */
export interface CombatResult {
  success: boolean;
  error?: string;
  winner?: Combatant;
  loser?: Combatant;
  attackerRoll?: DiceRoll;
  defenderRoll?: DiceRoll;
  damage?: number;
  attackerDamage?: number;
  defenderDamage?: number;
  newState?: GameState;
}

/** 戰鬥驗證結果 */
export interface CombatValidation {
  valid: boolean;
  error?: string;
}

/** 武器效果 */
export interface WeaponEffect {
  name: string;
  mightBonus: number;
  damageBonus: number;
}

// ==================== 常數 ====================

/** 標準戰鬥使用的屬性 */
export const COMBAT_STAT: StatType = 'might';

/** 武器效果對照表 */
export const WEAPON_EFFECTS: Record<string, WeaponEffect> = {
  'weapon_knife': { name: '匕首', mightBonus: 1, damageBonus: 0 },
  'weapon_axe': { name: '斧頭', mightBonus: 2, damageBonus: 0 },
  'weapon_chainsaw': { name: '電鋸', mightBonus: 3, damageBonus: 0 },
  'item_3': { name: '手槍', mightBonus: 0, damageBonus: 2 },
  'omen_1': { name: '染血的匕首', mightBonus: 0, damageBonus: 1 },
  'omen_8': { name: '染血的匕首', mightBonus: 0, damageBonus: 1 },
};

// ==================== 戰鬥管理器 ====================

/**
 * 戰鬥管理器
 * 負責管理戰鬥的完整流程
 */
export class CombatManager {
  private rng: SeededRng;

  constructor(rng: SeededRng) {
    this.rng = rng;
  }

  /**
   * 發起戰鬥
   * Rulebook Page 15: "To attack, you must be in the same room as your target."
   * 
   * @param state 當前遊戲狀態
   * @param attackerId 攻擊者 ID
   * @param defenderId 防守者 ID
   * @returns 戰鬥結果
   */
  initiateCombat(
    state: GameState,
    attackerId: string,
    defenderId: string
  ): CombatResult {
    // 驗證戰鬥合法性
    const validation = this.validateCombat(state, attackerId, defenderId);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const attacker = this.getCombatant(state, attackerId);
    const defender = this.getCombatant(state, defenderId);

    if (!attacker || !defender) {
      return { success: false, error: 'Combatant not found' };
    }

    // 執行戰鬥
    return this.resolveCombat(state, attacker, defender);
  }

  /**
   * 驗證戰鬥合法性
   * Rulebook Page 15: Combat initiation rules
   * 
   * @param state 當前遊戲狀態
   * @param attackerId 攻擊者 ID
   * @param defenderId 防守者 ID
   * @returns 驗證結果
   */
  validateCombat(
    state: GameState,
    attackerId: string,
    defenderId: string
  ): CombatValidation {
    // 檢查攻擊者是否存在
    const attacker = state.players.find(p => p.id === attackerId);
    if (!attacker) {
      return { valid: false, error: 'Attacker not found' };
    }

    // 檢查防守者是否存在
    const defender = state.players.find(p => p.id === defenderId);
    if (!defender) {
      return { valid: false, error: 'Defender not found' };
    }

    // 檢查攻擊者是否死亡
    if (attacker.isDead) {
      return { valid: false, error: 'Attacker is dead' };
    }

    // 檢查防守者是否死亡
    if (defender.isDead) {
      return { valid: false, error: 'Defender is dead' };
    }

    // 檢查是否在同一房間（相鄰）
    // Rulebook Page 15: "To attack, you must be in the same room as your target."
    if (!this.isInSameRoom(attacker.position, defender.position)) {
      return { valid: false, error: 'Target is not in the same room' };
    }

    // 檢查作祟階段
    if (!state.haunt.isActive) {
      return { valid: false, error: 'Combat is only allowed during the haunt' };
    }

    return { valid: true };
  }

  /**
   * 檢查兩個位置是否在同一房間
   */
  private isInSameRoom(pos1: Position3D, pos2: Position3D): boolean {
    return pos1.x === pos2.x && pos1.y === pos2.y && pos1.floor === pos2.floor;
  }

  /**
   * 取得戰鬥參與者資訊
   */
  private getCombatant(state: GameState, playerId: string): Combatant | null {
    const player = state.players.find(p => p.id === playerId);
    if (!player) return null;

    // 計算武器加成
    const weaponBonus = this.calculateWeaponBonus(player.items, player.omens);

    return {
      id: player.id,
      type: 'player',
      name: player.name,
      position: player.position,
      might: player.character.stats.might[1], // 初始力量值
      currentMight: player.currentStats.might,
      weaponBonus,
    };
  }

  /**
   * 計算武器加成
   * @param items 物品卡
   * @param omens 預兆卡
   * @returns 總武器加成
   */
  calculateWeaponBonus(items: Card[], omens: Card[]): number {
    let bonus = 0;

    // 檢查物品
    for (const item of items) {
      const effect = WEAPON_EFFECTS[item.id];
      if (effect) {
        bonus += effect.mightBonus;
      }
    }

    // 檢查預兆
    for (const omen of omens) {
      const effect = WEAPON_EFFECTS[omen.id];
      if (effect) {
        bonus += effect.mightBonus;
      }
    }

    return bonus;
  }

  /**
   * 計算傷害加成（來自武器）
   * @param items 物品卡
   * @param omens 預兆卡
   * @returns 總傷害加成
   */
  calculateDamageBonus(items: Card[], omens: Card[]): number {
    let bonus = 0;

    // 檢查物品
    for (const item of items) {
      const effect = WEAPON_EFFECTS[item.id];
      if (effect) {
        bonus += effect.damageBonus;
      }
    }

    // 檢查預兆
    for (const omen of omens) {
      const effect = WEAPON_EFFECTS[omen.id];
      if (effect) {
        bonus += effect.damageBonus;
      }
    }

    return bonus;
  }

  /**
   * 解析戰鬥
   * Rulebook Page 15: 
   * - "Both sides roll dice equal to their Might."
   * - "The higher total wins."
   * - "The loser takes damage equal to the difference."
   * 
   * @param state 當前遊戲狀態
   * @param attacker 攻擊者
   * @param defender 防守者
   * @returns 戰鬥結果
   */
  resolveCombat(
    state: GameState,
    attacker: Combatant,
    defender: Combatant
  ): CombatResult {
    // 計算有效力量值（包含武器加成）
    const attackerEffectiveMight = Math.max(0, attacker.currentMight + (attacker.weaponBonus || 0));
    const defenderEffectiveMight = Math.max(0, defender.currentMight + (defender.weaponBonus || 0));

    // 雙方擲骰
    // Rulebook Page 15: "Both sides roll dice equal to their Might."
    const attackerRoll = this.rng.rollDice(attackerEffectiveMight);
    const defenderRoll = this.rng.rollDice(defenderEffectiveMight);

    // 決定勝負
    // Rulebook Page 15: "The higher total wins."
    let winner: Combatant;
    let loser: Combatant;
    let winnerRoll: DiceRoll;
    let loserRoll: DiceRoll;

    if (attackerRoll.total > defenderRoll.total) {
      winner = attacker;
      loser = defender;
      winnerRoll = attackerRoll;
      loserRoll = defenderRoll;
    } else if (defenderRoll.total > attackerRoll.total) {
      winner = defender;
      loser = attacker;
      winnerRoll = defenderRoll;
      loserRoll = attackerRoll;
    } else {
      // 平手 - 沒有傷害
      return {
        success: true,
        winner: undefined,
        loser: undefined,
        attackerRoll,
        defenderRoll,
        damage: 0,
        attackerDamage: 0,
        defenderDamage: 0,
        newState: state,
      };
    }

    // 計算傷害
    // Rulebook Page 15: "The loser takes damage equal to the difference."
    const baseDamage = this.calculateDamage(winnerRoll.total, loserRoll.total);
    
    // 加上攻擊者的傷害加成
    const attackerDamageBonus = winner.id === attacker.id 
      ? this.calculateDamageBonus(
          state.players.find(p => p.id === attacker.id)?.items || [],
          state.players.find(p => p.id === attacker.id)?.omens || []
        )
      : 0;
    
    const totalDamage = baseDamage + attackerDamageBonus;

    // 應用傷害
    const newState = this.applyDamage(state, loser.id, totalDamage);

    // 計算雙方受到的傷害（用於顯示）
    const attackerDamage = loser.id === attacker.id ? totalDamage : 0;
    const defenderDamage = loser.id === defender.id ? totalDamage : 0;

    return {
      success: true,
      winner,
      loser,
      attackerRoll,
      defenderRoll,
      damage: totalDamage,
      attackerDamage,
      defenderDamage,
      newState,
    };
  }

  /**
   * 計算傷害
   * Rulebook Page 15: "The loser takes damage equal to the difference."
   * 
   * @param winnerRoll 贏家擲骰總和
   * @param loserRoll 輸家擲骰總和
   * @returns 傷害值
   */
  calculateDamage(winnerRoll: number, loserRoll: number): number {
    return Math.max(0, winnerRoll - loserRoll);
  }

  /**
   * 應用傷害到玩家
   * Rulebook Page 15: "The loser reduces their Might by the damage."
   * 
   * @param state 當前遊戲狀態
   * @param playerId 玩家 ID
   * @param damage 傷害值
   * @returns 更新後的遊戲狀態
   */
  applyDamage(state: GameState, playerId: string, damage: number): GameState {
    if (damage <= 0) return state;

    const player = state.players.find(p => p.id === playerId);
    if (!player) return state;

    // 計算新的力量值
    const newMight = Math.max(0, player.currentStats.might - damage);

    // 檢查是否死亡（力量歸零）
    const isDead = newMight <= 0;

    // 更新玩家狀態
    const updatedPlayers = state.players.map(p => {
      if (p.id !== playerId) return p;

      return {
        ...p,
        currentStats: {
          ...p.currentStats,
          might: newMight,
        },
        isDead,
      };
    });

    // 新增日誌
    const logEntry = {
      timestamp: Date.now(),
      turn: state.turn.turnNumber,
      playerId,
      actionType: 'DAMAGE',
      description: `${player.name} 受到 ${damage} 點傷害，力量從 ${player.currentStats.might} 降至 ${newMight}`,
      data: { damage, oldMight: player.currentStats.might, newMight, isDead },
    };

    return {
      ...state,
      players: updatedPlayers,
      log: [...state.log, logEntry],
    };
  }

  /**
   * 取得可用的攻擊目標
   * Rulebook Page 15: 必須在同一房間
   * 
   * @param state 當前遊戲狀態
   * @param attackerId 攻擊者 ID
   * @returns 可攻擊的目標 ID 列表
   */
  getValidTargets(state: GameState, attackerId: string): string[] {
    const attacker = state.players.find(p => p.id === attackerId);
    if (!attacker) return [];

    // 作祟階段才能攻擊
    if (!state.haunt.isActive) return [];

    return state.players
      .filter(p => {
        // 不能攻擊自己
        if (p.id === attackerId) return false;
        // 不能攻擊死人
        if (p.isDead) return false;
        // 必須在同一房間
        return this.isInSameRoom(attacker.position, p.position);
      })
      .map(p => p.id);
  }

  /**
   * 檢查玩家是否可以攻擊
   * 
   * @param state 當前遊戲狀態
   * @param playerId 玩家 ID
   * @returns 是否可以攻擊
   */
  canAttack(state: GameState, playerId: string): boolean {
    const targets = this.getValidTargets(state, playerId);
    return targets.length > 0;
  }

  /**
   * 取得武器資訊
   * 
   * @param cardId 卡牌 ID
   * @returns 武器效果或 null
   */
  getWeaponInfo(cardId: string): WeaponEffect | null {
    return WEAPON_EFFECTS[cardId] || null;
  }

  /**
   * 檢查卡牌是否為武器
   * 
   * @param cardId 卡牌 ID
   * @returns 是否為武器
   */
  isWeapon(cardId: string): boolean {
    return cardId in WEAPON_EFFECTS;
  }
}

// ==================== 獨立函數（用於簡單使用場景） ====================

/**
 * 發起戰鬥（簡化版）
 * 
 * @param state 當前遊戲狀態
 * @param attackerId 攻擊者 ID
 * @param defenderId 防守者 ID
 * @param rng 隨機數生成器
 * @returns 戰鬥結果
 */
export function initiateCombat(
  state: GameState,
  attackerId: string,
  defenderId: string,
  rng: SeededRng
): CombatResult {
  const manager = new CombatManager(rng);
  return manager.initiateCombat(state, attackerId, defenderId);
}

/**
 * 解析戰鬥（使用已擲骰結果）
 * 
 * @param attackerRoll 攻擊者擲骰結果
 * @param defenderRoll 防守者擲骰結果
 * @returns 勝負結果
 */
export function resolveCombat(
  attackerRoll: DiceRoll,
  defenderRoll: DiceRoll
): { winner: 'attacker' | 'defender' | 'tie'; damage: number } {
  if (attackerRoll.total > defenderRoll.total) {
    return {
      winner: 'attacker',
      damage: attackerRoll.total - defenderRoll.total,
    };
  } else if (defenderRoll.total > attackerRoll.total) {
    return {
      winner: 'defender',
      damage: defenderRoll.total - attackerRoll.total,
    };
  } else {
    return {
      winner: 'tie',
      damage: 0,
    };
  }
}

/**
 * 計算傷害
 * 
 * @param winnerRoll 贏家擲骰總和
 * @param loserRoll 輸家擲骰總和
 * @returns 傷害值
 */
export function calculateDamage(winnerRoll: number, loserRoll: number): number {
  return Math.max(0, winnerRoll - loserRoll);
}

/**
 * 應用傷害到玩家
 * 
 * @param state 當前遊戲狀態
 * @param playerId 玩家 ID
 * @param damage 傷害值
 * @returns 更新後的遊戲狀態
 */
export function applyDamage(
  state: GameState,
  playerId: string,
  damage: number
): GameState {
  const manager = new CombatManager(SeededRng.fromState(state.rngState));
  return manager.applyDamage(state, playerId, damage);
}

/**
 * 計算武器加成
 * 
 * @param items 物品卡
 * @param omens 預兆卡
 * @returns 武器加成資訊
 */
export function calculateWeaponBonus(
  items: Card[],
  omens: Card[]
): { mightBonus: number; damageBonus: number; weapons: string[] } {
  let mightBonus = 0;
  let damageBonus = 0;
  const weapons: string[] = [];

  // 檢查物品
  for (const item of items) {
    const effect = WEAPON_EFFECTS[item.id];
    if (effect) {
      mightBonus += effect.mightBonus;
      damageBonus += effect.damageBonus;
      weapons.push(effect.name);
    }
  }

  // 檢查預兆
  for (const omen of omens) {
    const effect = WEAPON_EFFECTS[omen.id];
    if (effect) {
      mightBonus += effect.mightBonus;
      damageBonus += effect.damageBonus;
      weapons.push(effect.name);
    }
  }

  return { mightBonus, damageBonus, weapons };
}

// ==================== 預設匯出 ====================

export default CombatManager;
