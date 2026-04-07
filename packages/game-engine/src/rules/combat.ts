/**
 * Combat System - 戰鬥系統
 * 
 * Rulebook References:
 * - Page 15: Combat rules
 * 
 * 這個模組實作 Betrayal 桌遊的戰鬥規則：
 * 1. 攻擊相鄰目標
 * 2. 雙方擲力量骰（遠程武器使用速度）
 * 3. 較高總和獲勝
 * 4. 傷害 = 贏家擲骰 - 輸家擲骰
 * 5. 輸家減少力量值
 * 6. 武器可以增加骰子數量或提供加成
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

/** 武器類型 */
export type WeaponType = 'melee' | 'ranged';

/** 戰鬥參與者 */
export interface Combatant {
  id: string;
  type: CombatantType;
  name: string;
  position: Position3D;
  might: number;
  currentMight: number;
  speed: number;
  currentSpeed: number;
  weaponBonus?: number;
}

/** 戰鬥結果 */
export interface CombatResult {
  success: boolean;
  error?: string;
  winner?: Combatant;
  loser?: Combatant;
  winnerType?: 'attacker' | 'defender' | 'tie';
  attackerRoll?: DiceRoll;
  defenderRoll?: DiceRoll;
  damage?: number;
  attackerDamage?: number;
  defenderDamage?: number;
  damageType?: 'physical' | 'mental';
  newState?: GameState;
}

/** 戰鬥驗證結果 */
export interface CombatValidation {
  valid: boolean;
  error?: string;
}

/** 武器效果 - 新版（支援 Issue #239 要求） */
export interface WeaponEffect {
  name: string;
  type: WeaponType;
  /** 額外骰子數量 */
  extraDice: number;
  /** 擲骰加成 */
  rollBonus: number;
  /** 使用的屬性（might 或 speed） */
  statToUse: 'might' | 'speed';
  /** 副作用（如失去 speed） */
  sideEffects?: {
    stat: StatType;
    value: number;
  }[];
  description?: string;
}

/** 武器加成計算結果 */
export interface WeaponBonusResult {
  /** 額外骰子數量 */
  extraDice: number;
  /** 擲骰加成 */
  rollBonus: number;
  /** 使用的屬性 */
  statToUse: 'might' | 'speed';
  /** 副作用 */
  sideEffects: { stat: StatType; value: number }[];
  /** 武器名稱列表 */
  weapons: string[];
}

// ==================== 常數 ====================

/** 標準戰鬥使用的屬性 */
export const COMBAT_STAT: StatType = 'might';

/** 遠程戰鬥使用的屬性 */
export const RANGED_COMBAT_STAT: StatType = 'speed';

/**
 * 武器效果對照表
 * 
 * 根據 Betrayal at House on the Hill 規則書 Page 15:
 * - Machete: +1 to attack roll
 * - Dagger: Roll 2 extra dice, lose 1 Speed
 * - Chainsaw: Roll 1 extra die
 * - Crossbow: Attack at range, roll Speed instead of Might
 * - Gun: Attack at range, roll Speed instead of Might
 */
export const WEAPON_EFFECTS: Record<string, WeaponEffect> = {
  // 近戰武器 - Issue #239 要求
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
  
  // 遠程武器 - Issue #239 要求
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
  
  // 舊版武器（向後相容）
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
  
  // 預兆武器
  'omen_dagger': {
    name: 'Bloody Dagger',
    type: 'melee',
    extraDice: 0,
    rollBonus: 0,
    statToUse: 'might',
    description: '+1 damage on hit',
  },
  'omen_1': {
    name: 'Bloody Dagger',
    type: 'melee',
    extraDice: 0,
    rollBonus: 0,
    statToUse: 'might',
    description: '+1 damage on hit',
  },
  'omen_8': {
    name: 'Bloody Dagger',
    type: 'melee',
    extraDice: 0,
    rollBonus: 0,
    statToUse: 'might',
    description: '+1 damage on hit',
  },
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
   * @param weaponId 使用的武器 ID（可選）
   * @returns 戰鬥結果
   */
  initiateCombat(
    state: GameState,
    attackerId: string,
    defenderId: string,
    weaponId?: string
  ): CombatResult {
    // 驗證戰鬥合法性
    const validation = this.validateCombat(state, attackerId, defenderId, weaponId);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const attacker = this.getCombatant(state, attackerId, weaponId);
    const defender = this.getCombatant(state, defenderId);

    if (!attacker || !defender) {
      return { success: false, error: 'Combatant not found' };
    }

    // 執行戰鬥
    return this.resolveCombat(state, attacker, defender, weaponId);
  }

  /**
   * 驗證戰鬥合法性
   * Rulebook Page 15: Combat initiation rules
   * 
   * @param state 當前遊戲狀態
   * @param attackerId 攻擊者 ID
   * @param defenderId 防守者 ID
   * @param weaponId 使用的武器 ID（可選）
   * @returns 驗證結果
   */
  validateCombat(
    state: GameState,
    attackerId: string,
    defenderId: string,
    weaponId?: string
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
    // 遠程武器可以攻擊相鄰房間
    const weapon = weaponId ? WEAPON_EFFECTS[weaponId] : null;
    const isRanged = weapon?.type === 'ranged';
    
    if (!isRanged && !this.isInSameRoom(attacker.position, defender.position)) {
      return { valid: false, error: 'Target is not in the same room' };
    }
    
    // 遠程武器檢查相鄰
    if (isRanged && !this.isAdjacent(attacker.position, defender.position)) {
      return { valid: false, error: 'Target is not in range for ranged attack' };
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
   * 檢查兩個位置是否相鄰（用於遠程攻擊）
   */
  private isAdjacent(pos1: Position3D, pos2: Position3D): boolean {
    // 必須在同一樓層
    if (pos1.floor !== pos2.floor) return false;
    
    const dx = Math.abs(pos1.x - pos2.x);
    const dy = Math.abs(pos1.y - pos2.y);
    
    // 相鄰定義：距離為 1（上下左右）
    return (dx === 1 && dy === 0) || (dx === 0 && dy === 1) || this.isInSameRoom(pos1, pos2);
  }

  /**
   * 取得戰鬥參與者資訊
   * @param state 遊戲狀態
   * @param playerId 玩家 ID
   * @param weaponId 武器 ID（可選，用於計算加成）
   */
  private getCombatant(state: GameState, playerId: string, weaponId?: string): Combatant | null {
    const player = state.players.find(p => p.id === playerId);
    if (!player) return null;

    // 計算武器加成
    const weaponBonus = weaponId && playerId === state.players.find(p => p.id === playerId)?.id
      ? this.calculateWeaponBonusFromId(weaponId).rollBonus
      : 0;

    return {
      id: player.id,
      type: 'player',
      name: player.name,
      position: player.position,
      // Issue #297-fix: 正確存取 CharacterStat 的 values 陣列
      might: player.character.stats.might.values[player.character.stats.might.currentIndex],
      currentMight: player.currentStats.might,
      speed: player.character.stats.speed.values[player.character.stats.speed.currentIndex],
      currentSpeed: player.currentStats.speed,
      weaponBonus,
    };
  }

  /**
   * 計算武器加成（新版 - Issue #239）
   * @param weaponId 武器 ID
   * @returns 武器加成資訊
   */
  calculateWeaponBonusFromId(weaponId: string): WeaponBonusResult {
    const effect = WEAPON_EFFECTS[weaponId];
    if (!effect) {
      return {
        extraDice: 0,
        rollBonus: 0,
        statToUse: 'might',
        sideEffects: [],
        weapons: [],
      };
    }

    return {
      extraDice: effect.extraDice,
      rollBonus: effect.rollBonus,
      statToUse: effect.statToUse,
      sideEffects: effect.sideEffects || [],
      weapons: [effect.name],
    };
  }

  /**
   * 計算武器加成（從物品列表 - 舊版相容）
   * @param items 物品卡
   * @param omens 預兆卡
   * @returns 總武器加成
   */
  calculateWeaponBonus(items: Card[], omens: Card[]): number {
    let bonus = 0;

    for (const item of items) {
      const effect = WEAPON_EFFECTS[item.id];
      if (effect) {
        bonus += effect.rollBonus;
      }
    }

    for (const omen of omens) {
      const effect = WEAPON_EFFECTS[omen.id];
      if (effect) {
        bonus += effect.rollBonus;
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
   * @param weaponId 使用的武器 ID（可選）
   * @returns 戰鬥結果
   */
  resolveCombat(
    state: GameState,
    attacker: Combatant,
    defender: Combatant,
    weaponId?: string
  ): CombatResult {
    // 取得武器效果
    const weaponEffect = weaponId ? WEAPON_EFFECTS[weaponId] : null;
    
    // 決定使用的屬性
    const attackerStat = weaponEffect?.statToUse || 'might';
    const defenderStat = 'might'; // 防守者總是使用 might
    
    // 計算有效屬性值
    const attackerBaseStat = attackerStat === 'speed' ? attacker.currentSpeed : attacker.currentMight;
    const defenderBaseStat = defender.currentMight;
    
    // 計算額外骰子
    const attackerExtraDice = weaponEffect?.extraDice || 0;
    
    // 計算擲骰數量
    const attackerDiceCount = Math.max(0, attackerBaseStat + attackerExtraDice);
    const defenderDiceCount = Math.max(0, defenderBaseStat);

    // 雙方擲骰
    // Rulebook Page 15: "Both sides roll dice equal to their Might."
    const attackerRoll = this.rng.rollDice(attackerDiceCount);
    const defenderRoll = this.rng.rollDice(defenderDiceCount);
    
    // 加上擲骰加成
    const attackerTotal = attackerRoll.total + (weaponEffect?.rollBonus || 0);
    const defenderTotal = defenderRoll.total;

    // 決定勝負
    // Rulebook Page 15: "The higher total wins."
    let winner: Combatant;
    let loser: Combatant;
    let winnerType: 'attacker' | 'defender' | 'tie';
    let winnerTotal: number;
    let loserTotal: number;

    if (attackerTotal > defenderTotal) {
      winner = attacker;
      loser = defender;
      winnerType = 'attacker';
      winnerTotal = attackerTotal;
      loserTotal = defenderTotal;
    } else if (defenderTotal > attackerTotal) {
      winner = defender;
      loser = attacker;
      winnerType = 'defender';
      winnerTotal = defenderTotal;
      loserTotal = attackerTotal;
    } else {
      // 平手 - 根據規則，平手時雙方都受傷
      // Rulebook: "Tie = both take damage"
      return this.resolveTie(state, attacker, defender, attackerRoll, defenderRoll);
    }

    // 計算傷害
    // Rulebook Page 15: "The loser takes damage equal to the difference."
    const baseDamage = this.calculateDamage(winnerTotal, loserTotal);
    const totalDamage = baseDamage;

    // 應用傷害
    let newState = this.applyDamage(state, loser.id, totalDamage);
    
    // 應用武器副作用（如 Dagger 的 -1 Speed）
    if (weaponEffect?.sideEffects && winner.id === attacker.id) {
      newState = this.applySideEffects(newState, attacker.id, weaponEffect.sideEffects);
    }

    // 計算雙方受到的傷害（用於顯示）
    const attackerDamage = loser.id === attacker.id ? totalDamage : 0;
    const defenderDamage = loser.id === defender.id ? totalDamage : 0;

    return {
      success: true,
      winner,
      loser,
      winnerType,
      attackerRoll: { ...attackerRoll, total: attackerTotal },
      defenderRoll: { ...defenderRoll, total: defenderTotal },
      damage: totalDamage,
      attackerDamage,
      defenderDamage,
      damageType: 'physical',
      newState,
    };
  }

  /**
   * 處理平手情況
   * Rulebook: "Tie = both take damage"
   */
  private resolveTie(
    state: GameState,
    attacker: Combatant,
    defender: Combatant,
    attackerRoll: DiceRoll,
    defenderRoll: DiceRoll
  ): CombatResult {
    // 平手時雙方各受 1 點傷害（標準規則）
    const tieDamage = 1;
    
    let newState = this.applyDamage(state, attacker.id, tieDamage);
    newState = this.applyDamage(newState, defender.id, tieDamage);

    return {
      success: true,
      winner: undefined,
      loser: undefined,
      winnerType: 'tie',
      attackerRoll,
      defenderRoll,
      damage: tieDamage,
      attackerDamage: tieDamage,
      defenderDamage: tieDamage,
      damageType: 'physical',
      newState,
    };
  }

  /**
   * 應用武器副作用
   */
  private applySideEffects(
    state: GameState,
    playerId: string,
    sideEffects: { stat: StatType; value: number }[]
  ): GameState {
    const player = state.players.find(p => p.id === playerId);
    if (!player) return state;

    let updatedStats = { ...player.currentStats };
    
    for (const effect of sideEffects) {
      const currentValue = updatedStats[effect.stat];
      const newValue = Math.max(0, currentValue + effect.value);
      updatedStats = { ...updatedStats, [effect.stat]: newValue };
    }

    const updatedPlayers = state.players.map(p => {
      if (p.id !== playerId) return p;
      return { ...p, currentStats: updatedStats };
    });

    return { ...state, players: updatedPlayers };
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
   * @param weaponId 武器 ID（可選，遠程武器可以攻擊更遠）
   * @returns 可攻擊的目標 ID 列表
   */
  getValidTargets(state: GameState, attackerId: string, weaponId?: string): string[] {
    const attacker = state.players.find(p => p.id === attackerId);
    if (!attacker) return [];

    // 作祟階段才能攻擊
    if (!state.haunt.isActive) return [];

    const weapon = weaponId ? WEAPON_EFFECTS[weaponId] : null;
    const isRanged = weapon?.type === 'ranged';

    return state.players
      .filter(p => {
        // 不能攻擊自己
        if (p.id === attackerId) return false;
        // 不能攻擊死人
        if (p.isDead) return false;
        
        // 遠程武器可以攻擊相鄰房間
        if (isRanged) {
          return this.isAdjacent(attacker.position, p.position);
        }
        
        // 近戰武器必須在同一房間
        return this.isInSameRoom(attacker.position, p.position);
      })
      .map(p => p.id);
  }

  /**
   * 檢查玩家是否可以攻擊
   * 
   * @param state 當前遊戲狀態
   * @param playerId 玩家 ID
   * @param weaponId 武器 ID（可選）
   * @returns 是否可以攻擊
   */
  canAttack(state: GameState, playerId: string, weaponId?: string): boolean {
    const targets = this.getValidTargets(state, playerId, weaponId);
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
  
  /**
   * 檢查卡牌是否為遠程武器
   * 
   * @param cardId 卡牌 ID
   * @returns 是否為遠程武器
   */
  isRangedWeapon(cardId: string): boolean {
    const effect = WEAPON_EFFECTS[cardId];
    return effect?.type === 'ranged';
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
 * @param weaponId 使用的武器 ID（可選）
 * @returns 戰鬥結果
 */
export function initiateCombat(
  state: GameState,
  attackerId: string,
  defenderId: string,
  rng: SeededRng,
  weaponId?: string
): CombatResult {
  const manager = new CombatManager(rng);
  return manager.initiateCombat(state, attackerId, defenderId, weaponId);
}

/**
 * 解析戰鬥（使用已擲骰結果）
 * 
 * @param attackerRoll 攻擊者擲骰結果
 * @param defenderRoll 防守者擲骰結果
 * @param attackerBonus 攻擊者加成
 * @param defenderBonus 防守者加成
 * @returns 勝負結果
 */
export function resolveCombat(
  attackerRoll: DiceRoll,
  defenderRoll: DiceRoll,
  attackerBonus: number = 0,
  defenderBonus: number = 0
): { winner: 'attacker' | 'defender' | 'tie'; damage: number; attackerTotal: number; defenderTotal: number } {
  const attackerTotal = attackerRoll.total + attackerBonus;
  const defenderTotal = defenderRoll.total + defenderBonus;
  
  if (attackerTotal > defenderTotal) {
    return {
      winner: 'attacker',
      damage: attackerTotal - defenderTotal,
      attackerTotal,
      defenderTotal,
    };
  } else if (defenderTotal > attackerTotal) {
    return {
      winner: 'defender',
      damage: defenderTotal - attackerTotal,
      attackerTotal,
      defenderTotal,
    };
  } else {
    return {
      winner: 'tie',
      damage: 0,
      attackerTotal,
      defenderTotal,
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
 * 計算武器加成（新版 - Issue #239）
 * 
 * @param weaponId 武器 ID
 * @returns 武器加成資訊
 */
export function calculateWeaponBonus(weaponId: string): WeaponBonusResult {
  const manager = new CombatManager(new SeededRng('temp'));
  return manager.calculateWeaponBonusFromId(weaponId);
}

// ==================== 預設匯出 ====================

export default CombatManager;
