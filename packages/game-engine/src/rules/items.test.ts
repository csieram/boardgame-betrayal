/**
 * Item Burying System Tests (Issue #232)
 */


import {
  buryItem,
  canBuryItem,
  getBuryableItems,
  getEventBuryOption,
  hasBuryOption,
  formatBenefitDescription,
  createBuryOption,
  applyBuryResultToGameState,
  DEFAULT_EVENT_BURY_OPTIONS,
} from './items';
import { Player, GameState, CharacterStats } from '../types';
import { Card } from '@betrayal/shared';

// 測試用的假資料
const createMockCard = (id: string, name: string, type: 'item' | 'omen' | 'event'): Card => ({
  id,
  type,
  name,
  description: `Test ${name}`,
  icon: '<circle/>',
  effect: 'Test effect',
});

const createMockPlayer = (items: Card[] = [], omens: Card[] = []): Player => ({
  id: 'player-1',
  name: 'Test Player',
  character: {
    id: 'character-1',
    name: 'Test Character',
    nameEn: 'Test Character',
    age: 30,
    description: 'Test',
    color: '#000000',
    stats: {
      speed: [4, 4],
      might: [4, 4],
      sanity: [4, 4],
      knowledge: [4, 4],
    },
    statTrack: {
      speed: [0, 2, 3, 4, 5, 6, 7, 8],
      might: [0, 2, 3, 4, 5, 6, 7, 8],
      sanity: [0, 2, 3, 4, 5, 6, 7, 8],
      knowledge: [0, 2, 3, 4, 5, 6, 7, 8],
    },
  },
  position: { x: 7, y: 7, floor: 'ground' },
  currentStats: {
    speed: 4,
    might: 4,
    sanity: 4,
    knowledge: 4,
  },
  items,
  omens,
  isTraitor: false,
  isDead: false,
  usedItemsThisTurn: [],
});

const createMockGameState = (): GameState => ({
  gameId: 'test-game',
  version: '1.0.0',
  phase: 'exploration',
  result: 'ongoing',
  config: { playerCount: 1, enableAI: false, seed: 'test', maxTurns: 100 },
  map: {
    ground: [],
    upper: [],
    basement: [],
    roof: [],
    placedRoomCount: 0,
  },
  players: [],
  playerOrder: ['player-1'],
  turn: {
    currentPlayerId: 'player-1',
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
  roomDeck: {
    ground: [],
    upper: [],
    basement: [],
    roof: [],
    drawn: new Set(),
  },
  haunt: {
    isActive: false,
    type: 'none',
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
  rngState: { seed: 'test', count: 0, internalState: [] },
  placedRoomIds: new Set(),
  discardedItems: [],
});

describe('Item Burying System', () => {
  describe('buryItem', () => {
    it('should successfully bury an item and apply stat benefit', () => {
      const item = createMockCard('item-1', 'Dagger', 'item');
      const player = createMockPlayer([item]);
      const gameState = createMockGameState();

      const result = buryItem(player, gameState, {
        itemId: 'item-1',
        benefit: { type: 'stat', stat: 'sanity', amount: 1 },
      });

      expect(result.success).toBe(true);
      expect(result.buriedItem).toEqual(item);
      expect(result.benefitApplied).toBe(true);
      expect(result.newStats?.sanity).toBe(5); // 4 + 1
      expect(result.message).toContain('Dagger');
      expect(result.message).toContain('理智 +1');
    });

    it('should successfully bury an omen and apply stat benefit', () => {
      const omen = createMockCard('omen-1', 'Crystal Ball', 'omen');
      const player = createMockPlayer([], [omen]);
      const gameState = createMockGameState();

      const result = buryItem(player, gameState, {
        itemId: 'omen-1',
        benefit: { type: 'stat', stat: 'might', amount: 2 },
      });

      expect(result.success).toBe(true);
      expect(result.buriedItem).toEqual(omen);
      expect(result.newStats?.might).toBe(6); // 4 + 2
    });

    it('should fail when player does not have the item', () => {
      const player = createMockPlayer([]);
      const gameState = createMockGameState();

      const result = buryItem(player, gameState, {
        itemId: 'non-existent',
        benefit: { type: 'stat', stat: 'sanity', amount: 1 },
      });

      expect(result.success).toBe(false);
      expect(result.buriedItem).toBeNull();
      expect(result.benefitApplied).toBe(false);
    });

    it('should cap stat at maximum value of 8', () => {
      const item = createMockCard('item-1', 'Power Gem', 'item');
      const player = createMockPlayer([item]);
      player.currentStats.sanity = 8;
      const gameState = createMockGameState();

      const result = buryItem(player, gameState, {
        itemId: 'item-1',
        benefit: { type: 'stat', stat: 'sanity', amount: 1 },
      });

      expect(result.success).toBe(true);
      expect(result.newStats?.sanity).toBe(8); // Capped at 8
    });

    it('should floor stat at minimum value of 0', () => {
      const item = createMockCard('item-1', 'Cursed Item', 'item');
      const player = createMockPlayer([item]);
      player.currentStats.might = 0;
      const gameState = createMockGameState();

      const result = buryItem(player, gameState, {
        itemId: 'item-1',
        benefit: { type: 'stat', stat: 'might', amount: -1 },
      });

      expect(result.success).toBe(true);
      expect(result.newStats?.might).toBe(0); // Floored at 0
    });

    it('should handle avoid_damage benefit type', () => {
      const item = createMockCard('item-1', 'Shield', 'item');
      const player = createMockPlayer([item]);
      const gameState = createMockGameState();

      const result = buryItem(player, gameState, {
        itemId: 'item-1',
        benefit: { type: 'avoid_damage', damageType: 'general' },
      });

      expect(result.success).toBe(true);
      expect(result.benefitApplied).toBe(true);
      expect(result.message).toContain('避免');
    });
  });

  describe('canBuryItem', () => {
    it('should return true when player has items', () => {
      const item = createMockCard('item-1', 'Dagger', 'item');
      const player = createMockPlayer([item]);

      expect(canBuryItem(player)).toBe(true);
    });

    it('should return true when player has omens', () => {
      const omen = createMockCard('omen-1', 'Crystal Ball', 'omen');
      const player = createMockPlayer([], [omen]);

      expect(canBuryItem(player)).toBe(true);
    });

    it('should return false when player has no items or omens', () => {
      const player = createMockPlayer();

      expect(canBuryItem(player)).toBe(false);
    });
  });

  describe('getBuryableItems', () => {
    it('should return all items and omens', () => {
      const item = createMockCard('item-1', 'Dagger', 'item');
      const omen = createMockCard('omen-1', 'Crystal Ball', 'omen');
      const player = createMockPlayer([item], [omen]);

      const buryableItems = getBuryableItems(player);

      expect(buryableItems).toHaveLength(2);
      expect(buryableItems).toContain(item);
      expect(buryableItems).toContain(omen);
    });
  });

  describe('getEventBuryOption', () => {
    it('should return bury option for wandering_ghost', () => {
      const option = getEventBuryOption('wandering_ghost');

      expect(option).toBeDefined();
      expect(option?.label).toBe('埋葬物品');
      expect(option?.benefit.type).toBe('stat');
      expect(option?.benefit.stat).toBe('sanity');
      expect(option?.benefit.amount).toBe(1);
    });

    it('should return null for unknown event card', () => {
      const option = getEventBuryOption('unknown_card');

      expect(option).toBeNull();
    });
  });

  describe('hasBuryOption', () => {
    it('should return true for wandering_ghost', () => {
      expect(hasBuryOption('wandering_ghost')).toBe(true);
    });

    it('should return false for unknown event card', () => {
      expect(hasBuryOption('unknown_card')).toBe(false);
    });
  });

  describe('formatBenefitDescription', () => {
    it('should format stat benefit correctly', () => {
      expect(formatBenefitDescription({ type: 'stat', stat: 'sanity', amount: 1 })).toBe('理智 +1');
      expect(formatBenefitDescription({ type: 'stat', stat: 'might', amount: -1 })).toBe('力量 -1');
    });

    it('should format avoid_damage benefit correctly', () => {
      expect(formatBenefitDescription({ type: 'avoid_damage', damageType: 'general' })).toBe('避免 一般傷害');
      expect(formatBenefitDescription({ type: 'avoid_damage', damageType: 'physical' })).toBe('避免 物理傷害');
      expect(formatBenefitDescription({ type: 'avoid_damage', damageType: 'mental' })).toBe('避免 精神傷害');
    });

    it('should format other benefit type', () => {
      expect(formatBenefitDescription({ type: 'other' })).toBe('特殊效果');
    });
  });

  describe('createBuryOption', () => {
    it('should create a custom bury option', () => {
      const option = createBuryOption(
        '獻祭物品',
        '獻祭一個物品給古老的神靈',
        { type: 'stat', stat: 'knowledge', amount: 2 },
        {
          label: '拒絕獻祭',
          description: '拒絕神靈的要求',
          isRoll: true,
          rollStat: 'sanity',
          rollTarget: 5,
        }
      );

      expect(option.label).toBe('獻祭物品');
      expect(option.description).toBe('獻祭一個物品給古老的神靈');
      expect(option.benefit.stat).toBe('knowledge');
      expect(option.alternative).toBeDefined();
    });
  });

  describe('applyBuryResultToGameState', () => {
    it('should apply bury result to game state', () => {
      const item = createMockCard('item-1', 'Dagger', 'item');
      const player = createMockPlayer([item]);
      const gameState = createMockGameState();
      gameState.players = [player];

      const buryResult = buryItem(player, gameState, {
        itemId: 'item-1',
        benefit: { type: 'stat', stat: 'sanity', amount: 1 },
      });

      const updatedState = applyBuryResultToGameState(gameState, 'player-1', buryResult);

      expect(updatedState.players[0].items).toHaveLength(0);
      expect(updatedState.players[0].currentStats.sanity).toBe(5);
      expect(updatedState.discardedItems).toContain(item);
      expect(updatedState.log).toHaveLength(1);
      expect(updatedState.log[0].actionType).toBe('BURY_ITEM');
    });

    it('should return original state if bury failed', () => {
      const player = createMockPlayer();
      const gameState = createMockGameState();
      gameState.players = [player];

      const buryResult = buryItem(player, gameState, {
        itemId: 'non-existent',
        benefit: { type: 'stat', stat: 'sanity', amount: 1 },
      });

      const updatedState = applyBuryResultToGameState(gameState, 'player-1', buryResult);

      expect(updatedState).toEqual(gameState);
    });
  });
});
