/**
 * Combat System Tests - 戰鬥系統測試
 * 
 * GitHub Issue #239: Implement Combat System Core Logic
 * 
 * 測試項目：
 * 1. 戰鬥驗證（相鄰檢查、死亡檢查、作祟階段檢查）
 * 2. 戰鬥解析（擲骰、勝負判定、傷害計算）
 * 3. 武器加成計算（Machete, Dagger, Chainsaw, Crossbow, Gun）
 * 4. 遠程攻擊
 * 5. 平手處理（雙方受傷）
 * 6. 武器副作用（Dagger 的 -1 Speed）
 */

import {
  CombatManager,
  initiateCombat,
  resolveCombat,
  calculateDamage,
  applyDamage,
  calculateWeaponBonus,
  WEAPON_EFFECTS,
} from './combat';
import { GameState, Player, Position3D, DiceRoll } from '../types';
import { SeededRng } from '../core/GameState';

// ==================== 測試輔助函數 ====================

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
      roof: [],
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
    roomDeck: { ground: [], upper: [], basement: [], roof: [], drawn: new Set() },
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

    it('應該拒絕不同房間的玩家之間的近戰戰鬥', () => {
      const state = createTestGameState(
        true,
        { x: 7, y: 7, floor: 'ground' },
        { x: 8, y: 7, floor: 'ground' }
      );
      const result = manager.validateCombat(state, 'attacker', 'defender');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('same room');
    });

    it('遠程武器應該允許攻擊相鄰房間', () => {
      const state = createTestGameState(
        true,
        { x: 7, y: 7, floor: 'ground' },
        { x: 8, y: 7, floor: 'ground' }
      );
      const result = manager.validateCombat(state, 'attacker', 'defender', 'weapon_gun');
      expect(result.valid).toBe(true);
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
  });

  describe('applyDamage', () => {
    it('應該正確減少玩家的力量值', () => {
      const state = createTestGameState(true);
      const newState = manager.applyDamage(state, 'defender', 2);
      const defender = newState.players.find(p => p.id === 'defender');
      expect(defender?.currentStats.might).toBe(2);
    });

    it('力量歸零時玩家應該死亡', () => {
      const state = createTestGameState(true);
      const newState = manager.applyDamage(state, 'defender', 4);
      const defender = newState.players.find(p => p.id === 'defender');
      expect(defender?.isDead).toBe(true);
    });
  });
});

// ==================== 武器效果測試（Issue #239）====================

describe('Weapon Effects - Issue #239', () => {
  let manager: CombatManager;
  let rng: SeededRng;

  beforeEach(() => {
    rng = new SeededRng('test-seed');
    manager = new CombatManager(rng);
  });

  describe('Machete', () => {
    it('應該提供 +1 擲骰加成', () => {
      const bonus = manager.calculateWeaponBonusFromId('weapon_machete');
      expect(bonus.rollBonus).toBe(1);
      expect(bonus.extraDice).toBe(0);
      expect(bonus.statToUse).toBe('might');
    });

    it('應該是近戰武器', () => {
      const effect = WEAPON_EFFECTS['weapon_machete'];
      expect(effect.type).toBe('melee');
    });
  });

  describe('Dagger', () => {
    it('應該提供 2 個額外骰子', () => {
      const bonus = manager.calculateWeaponBonusFromId('weapon_dagger');
      expect(bonus.extraDice).toBe(2);
      expect(bonus.rollBonus).toBe(0);
    });

    it('應該有 -1 Speed 的副作用', () => {
      const bonus = manager.calculateWeaponBonusFromId('weapon_dagger');
      expect(bonus.sideEffects).toHaveLength(1);
      expect(bonus.sideEffects[0].stat).toBe('speed');
      expect(bonus.sideEffects[0].value).toBe(-1);
    });
  });

  describe('Chainsaw', () => {
    it('應該提供 1 個額外骰子', () => {
      const bonus = manager.calculateWeaponBonusFromId('weapon_chainsaw');
      expect(bonus.extraDice).toBe(1);
      expect(bonus.rollBonus).toBe(0);
    });
  });

  describe('Crossbow', () => {
    it('應該使用 Speed 而不是 Might', () => {
      const bonus = manager.calculateWeaponBonusFromId('weapon_crossbow');
      expect(bonus.statToUse).toBe('speed');
    });

    it('應該是遠程武器', () => {
      const effect = WEAPON_EFFECTS['weapon_crossbow'];
      expect(effect.type).toBe('ranged');
    });
  });

  describe('Gun', () => {
    it('應該使用 Speed 而不是 Might', () => {
      const bonus = manager.calculateWeaponBonusFromId('weapon_gun');
      expect(bonus.statToUse).toBe('speed');
    });

    it('應該是遠程武器', () => {
      const effect = WEAPON_EFFECTS['weapon_gun'];
      expect(effect.type).toBe('ranged');
    });
  });
});

// ==================== 戰鬥流程測試 ====================

describe('Combat Flow', () => {
  let manager: CombatManager;
  let rng: SeededRng;

  beforeEach(() => {
    rng = new SeededRng('test-seed');
    manager = new CombatManager(rng);
  });

  describe('Unarmed Combat', () => {
    it('應該使用 Might 進行擲骰', () => {
      const state = createTestGameState(true);
      const result = manager.initiateCombat(state, 'attacker', 'defender');
      
      expect(result.success).toBe(true);
      expect(result.attackerRoll?.count).toBe(4);
      expect(result.defenderRoll?.count).toBe(4);
    });
  });

  describe('Ranged Combat', () => {
    it('應該可以攻擊相鄰房間的目標', () => {
      const state = createTestGameState(
        true,
        { x: 7, y: 7, floor: 'ground' },
        { x: 8, y: 7, floor: 'ground' }
      );
      
      const meleeResult = manager.validateCombat(state, 'attacker', 'defender');
      expect(meleeResult.valid).toBe(false);
      
      const rangedResult = manager.validateCombat(state, 'attacker', 'defender', 'weapon_gun');
      expect(rangedResult.valid).toBe(true);
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

    it('應該支援武器參數', () => {
      const state = createTestGameState(true);
      const rng = new SeededRng('test-seed');
      const result = initiateCombat(state, 'attacker', 'defender', rng, 'weapon_machete');
      
      expect(result.success).toBe(true);
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

    it('平手時應該正確判定', () => {
      const attackerRoll: DiceRoll = { count: 4, results: [1, 1, 1, 1], total: 4 };
      const defenderRoll: DiceRoll = { count: 4, results: [1, 1, 1, 1], total: 4 };
      const result = resolveCombat(attackerRoll, defenderRoll);
      
      expect(result.winner).toBe('tie');
      expect(result.damage).toBe(0);
    });
  });

  describe('calculateWeaponBonus', () => {
    it('應該返回完整的武器資訊', () => {
      const result = calculateWeaponBonus('weapon_machete');
      
      expect(result.rollBonus).toBe(1);
      expect(result.statToUse).toBe('might');
    });
  });
});

// ==================== 武器資料測試 ====================

describe('Weapon Effects Data', () => {
  it('應該定義所有 Issue #239 要求的武器', () => {
    expect(WEAPON_EFFECTS['weapon_machete']).toBeDefined();
    expect(WEAPON_EFFECTS['weapon_dagger']).toBeDefined();
    expect(WEAPON_EFFECTS['weapon_chainsaw']).toBeDefined();
    expect(WEAPON_EFFECTS['weapon_crossbow']).toBeDefined();
    expect(WEAPON_EFFECTS['weapon_gun']).toBeDefined();
  });

  it('Machete 應該有正確的效果', () => {
    const effect = WEAPON_EFFECTS['weapon_machete'];
    expect(effect.name).toBe('Machete');
    expect(effect.rollBonus).toBe(1);
  });

  it('Dagger 應該有正確的效果', () => {
    const effect = WEAPON_EFFECTS['weapon_dagger'];
    expect(effect.name).toBe('Dagger');
    expect(effect.extraDice).toBe(2);
    expect(effect.sideEffects?.[0].value).toBe(-1);
  });
});
