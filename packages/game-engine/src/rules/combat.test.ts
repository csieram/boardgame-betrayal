/**
 * Combat System Tests - 戰鬥系統測試
 * 
 * 測試項目：
 * 1. 戰鬥驗證（相鄰檢查、死亡檢查、作祟階段檢查）
 * 2. 戰鬥解析（擲骰、勝負判定、傷害計算）
 * 3. 武器加成計算
 * 4. 傷害應用
 * 5. 平手處理
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  CombatManager,
  initiateCombat,
  resolveCombat,
  calculateDamage,
  applyDamage,
  calculateWeaponBonus,
  WEAPON_EFFECTS,
} from './combat';
import { GameState, Player, Position3D, DiceRoll, Card } from '../types';
import { SeededRng } from '../core/GameState';

// ==================== 測試輔助函數 ====================

/**
 * 建立測試用的遊戲狀態
 */
function createTestGameState(
  hauntActive: boolean = true,
  attackerPosition: Position3D = { x: 7, y: 7, floor: 'ground' },
  defenderPosition: Position3D = { x: 7, y: 7, floor: 'ground' }
): GameState {
  const baseCharacter = {
    id: 'test-char',
    name: 'Test Character',
    nameEn: 'Test Character',
    age: 30,
    description: 'Test',
    color: '#FF0000',
    stats: {
      speed: [4, 4] as [number, number],
      might: [4, 4] as [number, number],
      sanity: [4, 4] as [number, number],
      knowledge: [4, 4] as [number, number],
    },
    statTrack: {
      speed: [0, 4, 4, 5, 5, 6, 7, 7],
      might: [0, 4, 5, 5, 6, 6, 7, 8],
      sanity: [0, 4, 4, 5, 6, 6, 7, 7],
      knowledge: [0, 4, 4, 5, 5, 6, 7, 7],
    },
  };

  const attacker: Player = {
    id: 'attacker',
    name: 'Attacker',
    character: baseCharacter,
    position: attackerPosition,
    currentStats: { speed: 4, might: 4, sanity: 4, knowledge: 4 },
    items: [],
    omens: [],
    isTraitor: false,
    isDead: false,
    usedItemsThisTurn: [],
  };

  const defender: Player = {
    id: 'defender',
    name: 'Defender',
    character: baseCharacter,
    position: defenderPosition,
    currentStats: { speed: 4, might: 4, sanity: 4, knowledge: 4 },
    items: [],
    omens: [],
    isTraitor: false,
    isDead: false,
    usedItemsThisTurn: [],
  };

  return {
    gameId: 'test-game',
    version: '1.0.0',
    phase: hauntActive ? 'haunt' : 'exploration',
    result: 'ongoing',
    config: { playerCount: 2, enableAI: false, seed: 'test', maxTurns: 100 },
    map: {
      ground: [],
      upper: [],
      basement: [],
      placedRoomCount: 0,
    },
    players: [attacker, defender],
    playerOrder: ['attacker', 'defender'],
    turn: {
      currentPlayerId: 'attacker',
      turnNumber: 1,
      movesRemaining: 4,
      hasDiscoveredRoom: false,
      hasDrawnCard: false,
      hasEnded: false,
      usedSpecialActions: [],
      usedItems: [],
    },
    cardDecks: {
      event: { remaining: [], drawn: [], discarded: [] },
      item: { remaining: [], drawn: [], discarded: [] },
      omen: { remaining: [], drawn: [], discarded: [] },
    },
    roomDeck: { ground: [], upper: [], basement: [], drawn: new Set() },
    haunt: {
      isActive: hauntActive,
      type: hauntActive ? 'single_traitor' : 'none',
      hauntNumber: null,
      traitorPlayerId: null,
      omenCount: 0,
      heroObjective: null,
      traitorObjective: null,
    },
    combat: {
      isActive: false,
      attackerId: null,
      defenderId: null,
      usedStat: null,
      attackerRoll: null,
      defenderRoll: null,
      damage: null,
    },
    log: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    rngState: { seed: 'test', count: 0, internalState: [12345] },
    placedRoomIds: new Set(),
  };
}

// ==================== CombatManager 測試 ====================

describe('CombatManager', () => {
  let manager: CombatManager;
  let rng: SeededRng;

  beforeEach(() => {
    rng = new SeededRng('test-seed');
    manager = new CombatManager(rng);
  });

  describe('validateCombat', () => {
    it('應該允許在同一房間的玩家之間的戰鬥', () => {
      const state = createTestGameState(true);
      const result = manager.validateCombat(state, 'attacker', 'defender');
      expect(result.valid).toBe(true);
    });

    it('應該拒絕不同房間的玩家之間的戰鬥', () => {
      const state = createTestGameState(
        true,
        { x: 7, y: 7, floor: 'ground' },
        { x: 8, y: 7, floor: 'ground' }
      );
      const result = manager.validateCombat(state, 'attacker', 'defender');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('same room');
    });

    it('應該拒絕探索階段的戰鬥', () => {
      const state = createTestGameState(false);
      const result = manager.validateCombat(state, 'attacker', 'defender');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('haunt');
    });

    it('應該拒絕攻擊已死亡的玩家', () => {
      const state = createTestGameState(true);
      state.players[1].isDead = true;
      const result = manager.validateCombat(state, 'attacker', 'defender');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('dead');
    });

    it('應該拒絕已死亡的玩家發起攻擊', () => {
      const state = createTestGameState(true);
      state.players[0].isDead = true;
      const result = manager.validateCombat(state, 'attacker', 'defender');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('dead');
    });

    it('應該拒絕不存在的玩家', () => {
      const state = createTestGameState(true);
      const result = manager.validateCombat(state, 'nonexistent', 'defender');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('calculateDamage', () => {
    it('應該正確計算傷害（贏家 - 輸家）', () => {
      const damage = manager.calculateDamage(8, 3);
      expect(damage).toBe(5);
    });

    it('傷害不應該為負數', () => {
      const damage = manager.calculateDamage(3, 8);
      expect(damage).toBe(0);
    });

    it('平手時傷害應為 0', () => {
      const damage = manager.calculateDamage(5, 5);
      expect(damage).toBe(0);
    });
  });

  describe('applyDamage', () => {
    it('應該正確減少玩家的力量值', () => {
      const state = createTestGameState(true);
      const newState = manager.applyDamage(state, 'defender', 2);
      const defender = newState.players.find(p => p.id === 'defender');
      expect(defender?.currentStats.might).toBe(2);
    });

    it('力量值不應該低於 0', () => {
      const state = createTestGameState(true);
      const newState = manager.applyDamage(state, 'defender', 10);
      const defender = newState.players.find(p => p.id === 'defender');
      expect(defender?.currentStats.might).toBe(0);
    });

    it('傷害為 0 時不應該改變狀態', () => {
      const state = createTestGameState(true);
      const newState = manager.applyDamage(state, 'defender', 0);
      const defender = newState.players.find(p => p.id === 'defender');
      expect(defender?.currentStats.might).toBe(4);
    });

    it('力量歸零時玩家應該死亡', () => {
      const state = createTestGameState(true);
      const newState = manager.applyDamage(state, 'defender', 4);
      const defender = newState.players.find(p => p.id === 'defender');
      expect(defender?.isDead).toBe(true);
    });

    it('應該新增傷害日誌', () => {
      const state = createTestGameState(true);
      const newState = manager.applyDamage(state, 'defender', 2);
      expect(newState.log.length).toBeGreaterThan(0);
      expect(newState.log[newState.log.length - 1].actionType).toBe('DAMAGE');
    });
  });

  describe('calculateWeaponBonus', () => {
    it('應該正確計算武器的力量加成', () => {
      const items: Card[] = [
        { id: 'weapon_knife', type: 'item', name: '匕首', description: '', icon: '' },
      ];
      const bonus = manager.calculateWeaponBonus(items, []);
      expect(bonus).toBe(1);
    });

    it('應該正確計算多個武器的加成', () => {
      const items: Card[] = [
        { id: 'weapon_knife', type: 'item', name: '匕首', description: '', icon: '' },
        { id: 'weapon_axe', type: 'item', name: '斧頭', description: '', icon: '' },
      ];
      const bonus = manager.calculateWeaponBonus(items, []);
      expect(bonus).toBe(3);
    });

    it('應該包含預兆卡的武器效果', () => {
      const omens: Card[] = [
        { id: 'omen_1', type: 'omen', name: '染血的匕首', description: '', icon: '' },
      ];
      const bonus = manager.calculateWeaponBonus([], omens);
      expect(bonus).toBe(0); // 染血的匕首只有傷害加成
    });

    it('沒有武器時加成應為 0', () => {
      const bonus = manager.calculateWeaponBonus([], []);
      expect(bonus).toBe(0);
    });
  });

  describe('calculateDamageBonus', () => {
    it('應該正確計算傷害加成', () => {
      const omens: Card[] = [
        { id: 'omen_1', type: 'omen', name: '染血的匕首', description: '', icon: '' },
      ];
      const bonus = manager.calculateDamageBonus([], omens);
      expect(bonus).toBe(1);
    });

    it('應該正確計算多個來源的傷害加成', () => {
      const items: Card[] = [
        { id: 'item_3', type: 'item', name: '手槍', description: '', icon: '' },
      ];
      const omens: Card[] = [
        { id: 'omen_1', type: 'omen', name: '染血的匕首', description: '', icon: '' },
      ];
      const bonus = manager.calculateDamageBonus(items, omens);
      expect(bonus).toBe(3);
    });
  });

  describe('getValidTargets', () => {
    it('應該返回同一房間的其他玩家', () => {
      const state = createTestGameState(true);
      const targets = manager.getValidTargets(state, 'attacker');
      expect(targets).toContain('defender');
    });

    it('不應該包含自己', () => {
      const state = createTestGameState(true);
      const targets = manager.getValidTargets(state, 'attacker');
      expect(targets).not.toContain('attacker');
    });

    it('不應該包含死人', () => {
      const state = createTestGameState(true);
      state.players[1].isDead = true;
      const targets = manager.getValidTargets(state, 'attacker');
      expect(targets).not.toContain('defender');
    });

    it('探索階段應該返回空列表', () => {
      const state = createTestGameState(false);
      const targets = manager.getValidTargets(state, 'attacker');
      expect(targets).toHaveLength(0);
    });
  });

  describe('canAttack', () => {
    it('當有有效目標時應該返回 true', () => {
      const state = createTestGameState(true);
      const canAttack = manager.canAttack(state, 'attacker');
      expect(canAttack).toBe(true);
    });

    it('當沒有目標時應該返回 false', () => {
      const state = createTestGameState(true);
      state.players[1].position = { x: 10, y: 10, floor: 'ground' };
      const canAttack = manager.canAttack(state, 'attacker');
      expect(canAttack).toBe(false);
    });
  });

  describe('isWeapon', () => {
    it('應該正確識別武器', () => {
      expect(manager.isWeapon('weapon_knife')).toBe(true);
      expect(manager.isWeapon('weapon_axe')).toBe(true);
      expect(manager.isWeapon('item_1')).toBe(false);
    });
  });
});

// ==================== 獨立函數測試 ====================

describe('Combat Functions', () => {
  describe('initiateCombat', () => {
    it('應該執行完整的戰鬥流程', () => {
      const state = createTestGameState(true);
      const rng = new SeededRng('test-seed');
      const result = initiateCombat(state, 'attacker', 'defender', rng);
      
      expect(result.success).toBe(true);
      expect(result.attackerRoll).toBeDefined();
      expect(result.defenderRoll).toBeDefined();
    });

    it('應該拒絕無效的戰鬥', () => {
      const state = createTestGameState(false);
      const rng = new SeededRng('test-seed');
      const result = initiateCombat(state, 'attacker', 'defender', rng);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('resolveCombat', () => {
    it('攻擊者勝利時應該正確判定', () => {
      const attackerRoll: DiceRoll = { count: 4, results: [2, 2, 2, 2], total: 8 };
      const defenderRoll: DiceRoll = { count: 4, results: [1, 1, 1, 1], total: 4 };
      const result = resolveCombat(attackerRoll, defenderRoll);
      
      expect(result.winner).toBe('attacker');
      expect(result.damage).toBe(4);
    });

    it('防守者勝利時應該正確判定', () => {
      const attackerRoll: DiceRoll = { count: 4, results: [1, 1, 1, 1], total: 4 };
      const defenderRoll: DiceRoll = { count: 4, results: [2, 2, 2, 2], total: 8 };
      const result = resolveCombat(attackerRoll, defenderRoll);
      
      expect(result.winner).toBe('defender');
      expect(result.damage).toBe(4);
    });

    it('平手時應該正確判定', () => {
      const attackerRoll: DiceRoll = { count: 4, results: [1, 1, 1, 1], total: 4 };
      const defenderRoll: DiceRoll = { count: 4, results: [1, 1, 1, 1], total: 4 };
      const result = resolveCombat(attackerRoll, defenderRoll);
      
      expect(result.winner).toBe('tie');
      expect(result.damage).toBe(0);
    });
  });

  describe('calculateDamage', () => {
    it('應該正確計算傷害', () => {
      expect(calculateDamage(8, 3)).toBe(5);
      expect(calculateDamage(5, 5)).toBe(0);
      expect(calculateDamage(3, 8)).toBe(0);
    });
  });

  describe('calculateWeaponBonus', () => {
    it('應該返回完整的武器資訊', () => {
      const items: Card[] = [
        { id: 'weapon_knife', type: 'item', name: '匕首', description: '', icon: '' },
        { id: 'weapon_axe', type: 'item', name: '斧頭', description: '', icon: '' },
      ];
      const result = calculateWeaponBonus(items, []);
      
      expect(result.mightBonus).toBe(3);
      expect(result.damageBonus).toBe(0);
      expect(result.weapons).toContain('匕首');
      expect(result.weapons).toContain('斧頭');
    });
  });
});

// ==================== 武器效果測試 ====================

describe('Weapon Effects', () => {
  it('應該定義所有武器效果', () => {
    expect(WEAPON_EFFECTS['weapon_knife']).toBeDefined();
    expect(WEAPON_EFFECTS['weapon_knife'].mightBonus).toBe(1);
    expect(WEAPON_EFFECTS['weapon_knife'].damageBonus).toBe(0);

    expect(WEAPON_EFFECTS['weapon_axe']).toBeDefined();
    expect(WEAPON_EFFECTS['weapon_axe'].mightBonus).toBe(2);

    expect(WEAPON_EFFECTS['weapon_chainsaw']).toBeDefined();
    expect(WEAPON_EFFECTS['weapon_chainsaw'].mightBonus).toBe(3);

    expect(WEAPON_EFFECTS['item_3']).toBeDefined();
    expect(WEAPON_EFFECTS['item_3'].damageBonus).toBe(2);

    expect(WEAPON_EFFECTS['omen_1']).toBeDefined();
    expect(WEAPON_EFFECTS['omen_1'].damageBonus).toBe(1);
  });
});

// ==================== 整合測試 ====================

describe('Combat Integration', () => {
  it('應該執行完整的戰鬥流程並更新狀態', () => {
    const state = createTestGameState(true);
    const rng = new SeededRng('test-seed');
    const manager = new CombatManager(rng);

    // 執行戰鬥
    const result = manager.initiateCombat(state, 'attacker', 'defender');

    expect(result.success).toBe(true);
    expect(result.attackerRoll).toBeDefined();
    expect(result.defenderRoll).toBeDefined();
    expect(result.winner).toBeDefined();
    expect(result.loser).toBeDefined();
    expect(result.damage).toBeDefined();
    expect(result.newState).toBeDefined();

    // 檢查狀態更新
    if (result.newState && result.damage && result.damage > 0) {
      const loser = result.newState.players.find(p => p.id === result.loser?.id);
      expect(loser?.currentStats.might).toBeLessThan(4);
    }
  });

  it('武器應該增加力量值並影響擲骰', () => {
    const state = createTestGameState(true);
    state.players[0].items = [
      { id: 'weapon_axe', type: 'item', name: '斧頭', description: '', icon: '' },
    ];

    const rng = new SeededRng('test-seed');
    const manager = new CombatManager(rng);

    // 驗證武器加成
    const weaponBonus = manager.calculateWeaponBonus(state.players[0].items, []);
    expect(weaponBonus).toBe(2);

    // 執行戰鬥
    const result = manager.initiateCombat(state, 'attacker', 'defender');
    expect(result.success).toBe(true);
  });

  it('平手時不應該有傷害', () => {
    // 使用固定的 RNG 來模擬平手
    const state = createTestGameState(true);
    
    // 手動執行戰鬥解析
    const attackerRoll: DiceRoll = { count: 4, results: [1, 1, 1, 1], total: 4 };
    const defenderRoll: DiceRoll = { count: 4, results: [1, 1, 1, 1], total: 4 };
    
    const resolveResult = resolveCombat(attackerRoll, defenderRoll);
    expect(resolveResult.winner).toBe('tie');
    expect(resolveResult.damage).toBe(0);
  });
});
