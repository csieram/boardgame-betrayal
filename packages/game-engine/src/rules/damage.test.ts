/**
 * Damage System Tests
 * 
 * 測試傷害分配和死亡機制的所有規則
 * 
 * Rulebook References:
 * - Page 9, 19: 角色死亡規則
 * - Page 15: 戰鬥傷害規則
 */

import {
  DamageType,
  DamageAllocation,
  DamageApplicationResult,
  DeathResult,
  DeathHandlingResult,
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
  PHYSICAL_DAMAGE_TRAITS,
  MENTAL_DAMAGE_TRAITS,
  ALL_TRAITS,
  TRAIT_NAMES,
  DEATH_THRESHOLD,
  EXPLORATION_MIN_STAT,
} from './damage';

import { CharacterStats, Player } from '../types';

const createMockStats = (
  might: number = 5,
  speed: number = 5,
  knowledge: number = 5,
  sanity: number = 5
): CharacterStats => ({
  might, speed, knowledge, sanity,
});

const createMockPlayer = (
  id: string = 'player-1',
  name: string = 'Test Player',
  stats: CharacterStats = createMockStats()
): Player => ({
  id, name,
  character: {
    id: 'test-character',
    name: 'Test Character',
    nameEn: 'Test Character',
    age: 25,
    description: 'Test',
    color: '#000000',
    stats: {
      speed: [stats.speed, stats.speed],
      might: [stats.might, stats.might],
      sanity: [stats.sanity, stats.sanity],
      knowledge: [stats.knowledge, stats.knowledge],
    },
    statTrack: {
      speed: [0, 1, 2, 3, 4, 5, 6, 7],
      might: [0, 1, 2, 3, 4, 5, 6, 7],
      sanity: [0, 1, 2, 3, 4, 5, 6, 7],
      knowledge: [0, 1, 2, 3, 4, 5, 6, 7],
    },
  },
  position: { x: 7, y: 7, floor: 'ground' },
  currentStats: stats,
  items: [],
  omens: [],
  isTraitor: false,
  isDead: false,
  usedItemsThisTurn: [],
});

describe('Damage System Constants', () => {
  test('PHYSICAL_DAMAGE_TRAITS should contain might and speed', () => {
    expect(PHYSICAL_DAMAGE_TRAITS).toContain('might');
    expect(PHYSICAL_DAMAGE_TRAITS).toContain('speed');
    expect(PHYSICAL_DAMAGE_TRAITS).toHaveLength(2);
  });

  test('MENTAL_DAMAGE_TRAITS should contain knowledge and sanity', () => {
    expect(MENTAL_DAMAGE_TRAITS).toContain('knowledge');
    expect(MENTAL_DAMAGE_TRAITS).toContain('sanity');
    expect(MENTAL_DAMAGE_TRAITS).toHaveLength(2);
  });

  test('DEATH_THRESHOLD should be 0', () => {
    expect(DEATH_THRESHOLD).toBe(0);
  });
});

describe('getAvailableTraitsForDamage', () => {
  test('physical damage should allow might and speed', () => {
    const traits = getAvailableTraitsForDamage('physical');
    expect(traits).toContain('might');
    expect(traits).toContain('speed');
    expect(traits).not.toContain('knowledge');
    expect(traits).toHaveLength(2);
  });

  test('mental damage should allow knowledge and sanity', () => {
    const traits = getAvailableTraitsForDamage('mental');
    expect(traits).toContain('knowledge');
    expect(traits).toContain('sanity');
    expect(traits).not.toContain('might');
    expect(traits).toHaveLength(2);
  });

  test('general damage should allow all traits', () => {
    const traits = getAvailableTraitsForDamage('general');
    expect(traits).toHaveLength(4);
  });
});

describe('checkDeath', () => {
  test('should return false when all stats are above 0 in haunt phase', () => {
    const stats = createMockStats(1, 1, 1, 1);
    expect(checkDeath(stats, true)).toBe(false);
  });

  test('should return true when might is 0 in haunt phase', () => {
    const stats = createMockStats(0, 5, 5, 5);
    expect(checkDeath(stats, true)).toBe(true);
  });

  test('should return true when speed is 0 in haunt phase', () => {
    const stats = createMockStats(5, 0, 5, 5);
    expect(checkDeath(stats, true)).toBe(true);
  });

  test('should return true when knowledge is 0 in haunt phase', () => {
    const stats = createMockStats(5, 5, 0, 5);
    expect(checkDeath(stats, true)).toBe(true);
  });

  test('should return true when sanity is 0 in haunt phase', () => {
    const stats = createMockStats(5, 5, 5, 0);
    expect(checkDeath(stats, true)).toBe(true);
  });

  test('should return false in exploration phase even with 0 stats', () => {
    const stats = createMockStats(0, 0, 0, 0);
    expect(checkDeath(stats, false)).toBe(false);
  });
});

describe('applyDamage', () => {
  test('should apply physical damage to might', () => {
    const stats = createMockStats(5, 5, 5, 5);
    const damage: DamageAllocation = {
      type: 'physical', amount: 2, availableTraits: ['might', 'speed'],
    };
    const result = applyDamage(stats, damage, 'might', true);

    expect(result.success).toBe(true);
    expect(result.playerDied).toBe(false);
    expect(result.newStats.might).toBe(3);
    expect(result.actualReduction).toBe(2);
  });

  test('should apply mental damage to knowledge', () => {
    const stats = createMockStats(5, 5, 5, 5);
    const damage: DamageAllocation = {
      type: 'mental', amount: 2, availableTraits: ['knowledge', 'sanity'],
    };
    const result = applyDamage(stats, damage, 'knowledge', true);

    expect(result.success).toBe(true);
    expect(result.newStats.knowledge).toBe(3);
  });

  test('should apply general damage to any trait', () => {
    const stats = createMockStats(5, 5, 5, 5);
    const damage: DamageAllocation = {
      type: 'general', amount: 2, availableTraits: ['might', 'speed', 'knowledge', 'sanity'],
    };
    const result = applyDamage(stats, damage, 'sanity', true);

    expect(result.success).toBe(true);
    expect(result.newStats.sanity).toBe(3);
  });

  test('should detect death when stat reaches 0', () => {
    const stats = createMockStats(2, 5, 5, 5);
    const damage: DamageAllocation = {
      type: 'physical', amount: 2, availableTraits: ['might', 'speed'],
    };
    const result = applyDamage(stats, damage, 'might', true);

    expect(result.success).toBe(true);
    expect(result.playerDied).toBe(true);
    expect(result.newStats.might).toBe(0);
  });

  test('should not die in exploration phase', () => {
    const stats = createMockStats(2, 5, 5, 5);
    const damage: DamageAllocation = {
      type: 'physical', amount: 2, availableTraits: ['might', 'speed'],
    };
    const result = applyDamage(stats, damage, 'might', false);

    expect(result.success).toBe(true);
    expect(result.playerDied).toBe(false);
    expect(result.newStats.might).toBe(1);
  });

  test('should fail when invalid trait is chosen', () => {
    const stats = createMockStats(5, 5, 5, 5);
    const damage: DamageAllocation = {
      type: 'physical', amount: 2, availableTraits: ['might', 'speed'],
    };
    const result = applyDamage(stats, damage, 'knowledge', true);

    expect(result.success).toBe(false);
  });
});

describe('createDamageAllocation', () => {
  test('should create physical damage allocation', () => {
    const allocation = createDamageAllocation('physical', 3);
    expect(allocation.type).toBe('physical');
    expect(allocation.amount).toBe(3);
  });

  test('should create mental damage allocation', () => {
    const allocation = createDamageAllocation('mental', 2);
    expect(allocation.type).toBe('mental');
    expect(allocation.amount).toBe(2);
  });
});

describe('handlePlayerDeath', () => {
  test('should return null when player is not dead', () => {
    const player = createMockPlayer();
    const stats = createMockStats(1, 1, 1, 1);
    const result = handlePlayerDeath(player, stats, true);
    expect(result).toBeNull();
  });

  test('should handle death with items', () => {
    const player = createMockPlayer('p1', 'Test Player');
    player.items = [{ id: 'item-1', type: 'item', name: 'Item 1', description: '', icon: '', effect: '' }];
    const stats = createMockStats(0, 5, 5, 5);
    const result = handlePlayerDeath(player, stats, true);

    expect(result).not.toBeNull();
    expect(result!.droppedItems).toContain('item-1');
    expect(result!.deathNotification).toContain('Test Player');
  });
});
