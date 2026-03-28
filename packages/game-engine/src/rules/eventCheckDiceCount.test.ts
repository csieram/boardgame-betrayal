import {
  CardEffectApplier,
  PlayerState,
} from './cardDrawing';
import { Card } from '@betrayal/shared';

// 測試用的種子，確保可重現性
const TEST_SEED = 'test-seed-162';

describe('Event Check Dice Count Bug #162', () => {
  let effectApplier: CardEffectApplier;
  let player: PlayerState;

  beforeEach(() => {
    effectApplier = new CardEffectApplier(TEST_SEED);
    player = {
      id: 'test-player',
      name: 'Test Player',
      stats: {
        speed: 4,
        might: 3,
        sanity: 5,
        knowledge: 2,
      },
      items: [],
      omens: [],
    };
  });

  describe('Dice count calculation', () => {
    it('should use correct trait value for dice count - speed', () => {
      const eventCard: Card = {
        id: 'event_test_speed',
        type: 'event',
        name: 'Test Event',
        description: 'Test event requiring speed check',
        icon: '',
        rollRequired: { stat: 'speed', target: 4 },
        success: 'Success message',
        failure: 'Failure message',
      };

      const result = effectApplier.performEventCheck(eventCard, player);
      
      // Speed is 4, so should roll 4 dice
      expect(result.dice.length).toBe(4);
      expect(result.stat).toBe('speed');
    });

    it('should use correct trait value for dice count - might', () => {
      const eventCard: Card = {
        id: 'event_test_might',
        type: 'event',
        name: 'Test Event',
        description: 'Test event requiring might check',
        icon: '',
        rollRequired: { stat: 'might', target: 4 },
        success: 'Success message',
        failure: 'Failure message',
      };

      const result = effectApplier.performEventCheck(eventCard, player);
      
      // Might is 3, so should roll 3 dice
      expect(result.dice.length).toBe(3);
      expect(result.stat).toBe('might');
    });

    it('should use correct trait value for dice count - sanity', () => {
      const eventCard: Card = {
        id: 'event_test_sanity',
        type: 'event',
        name: 'Test Event',
        description: 'Test event requiring sanity check',
        icon: '',
        rollRequired: { stat: 'sanity', target: 4 },
        success: 'Success message',
        failure: 'Failure message',
      };

      const result = effectApplier.performEventCheck(eventCard, player);
      
      // Sanity is 5, so should roll 5 dice
      expect(result.dice.length).toBe(5);
      expect(result.stat).toBe('sanity');
    });

    it('should use correct trait value for dice count - knowledge', () => {
      const eventCard: Card = {
        id: 'event_test_knowledge',
        type: 'event',
        name: 'Test Event',
        description: 'Test event requiring knowledge check',
        icon: '',
        rollRequired: { stat: 'knowledge', target: 4 },
        success: 'Success message',
        failure: 'Failure message',
      };

      const result = effectApplier.performEventCheck(eventCard, player);
      
      // Knowledge is 2, so should roll 2 dice
      expect(result.dice.length).toBe(2);
      expect(result.stat).toBe('knowledge');
    });

    it('should roll at least 1 die even with 0 or negative trait value', () => {
      player.stats.might = 0;
      
      const eventCard: Card = {
        id: 'event_test_zero',
        type: 'event',
        name: 'Test Event',
        description: 'Test event requiring might check',
        icon: '',
        rollRequired: { stat: 'might', target: 4 },
        success: 'Success message',
        failure: 'Failure message',
      };

      const result = effectApplier.performEventCheck(eventCard, player);
      
      // Even with might=0, should roll at least 1 die
      expect(result.dice.length).toBe(1);
    });
  });

  describe('Stat modifiers affecting dice count', () => {
    it('should use modified trait value after stat changes', () => {
      // Initial might is 3
      expect(player.stats.might).toBe(3);
      
      // Simulate gaining might from an item
      player.stats.might = 5;
      
      const eventCard: Card = {
        id: 'event_test_modified',
        type: 'event',
        name: 'Test Event',
        description: 'Test event requiring might check',
        icon: '',
        rollRequired: { stat: 'might', target: 4 },
        success: 'Success message',
        failure: 'Failure message',
      };

      const result = effectApplier.performEventCheck(eventCard, player);
      
      // Modified might is 5, so should roll 5 dice
      expect(result.dice.length).toBe(5);
    });

    it('should use reduced trait value after taking damage', () => {
      // Initial might is 3
      expect(player.stats.might).toBe(3);
      
      // Simulate taking damage (reducing might)
      player.stats.might = 2;
      
      const eventCard: Card = {
        id: 'event_test_damage',
        type: 'event',
        name: 'Test Event',
        description: 'Test event requiring might check',
        icon: '',
        rollRequired: { stat: 'might', target: 4 },
        success: 'Success message',
        failure: 'Failure message',
      };

      const result = effectApplier.performEventCheck(eventCard, player);
      
      // Reduced might is 2, so should roll 2 dice
      expect(result.dice.length).toBe(2);
    });
  });

  describe('UI display consistency', () => {
    it('should match displayed dice count with actual trait value', () => {
      const testCases = [
        { stat: 'speed' as const, value: player.stats.speed },
        { stat: 'might' as const, value: player.stats.might },
        { stat: 'sanity' as const, value: player.stats.sanity },
        { stat: 'knowledge' as const, value: player.stats.knowledge },
      ];

      for (const { stat, value } of testCases) {
        const eventCard: Card = {
          id: `event_test_${stat}`,
          type: 'event',
          name: 'Test Event',
          description: `Test event requiring ${stat} check`,
          icon: '',
          rollRequired: { stat, target: 4 },
          success: 'Success message',
          failure: 'Failure message',
        };

        const result = effectApplier.performEventCheck(eventCard, player);
        
        // UI would display: Math.max(1, playerStatValue)
        const expectedDiceCount = Math.max(1, value);
        
        expect(result.dice.length).toBe(expectedDiceCount);
        expect(result.stat).toBe(stat);
      }
    });
  });

  // Issue #164: Dice count incorrect when event check fails
  describe('Dice count consistency for success vs failure', () => {
    it('should return consistent dice count regardless of check result', () => {
      // Create an event card with a high target to force failure
      const failingEventCard: Card = {
        id: 'event_test_fail',
        type: 'event',
        name: 'Test Event - High Difficulty',
        description: 'Test event that will likely fail',
        icon: '',
        rollRequired: { stat: 'might', target: 100 }, // Very high target to ensure failure
        success: '獲得 1 點體力',
        failure: '失去 1 點體力', // Stat reduction on failure
      };

      // Create an event card with a low target to force success
      const succeedingEventCard: Card = {
        id: 'event_test_success',
        type: 'event',
        name: 'Test Event - Low Difficulty',
        description: 'Test event that will likely succeed',
        icon: '',
        rollRequired: { stat: 'might', target: 0 }, // Very low target to ensure success
        success: '獲得 1 點體力',
        failure: '失去 1 點體力',
      };

      const initialMight = player.stats.might; // 3

      // Test failure case
      const failureResult = effectApplier.performEventCheck(failingEventCard, player);
      
      // Verify the check failed
      expect(failureResult.success).toBe(false);
      
      // The dice count should match the initial trait value (3)
      expect(failureResult.dice.length).toBe(initialMight);
      
      // The roll value should be the sum of dice
      const failureDiceSum = failureResult.dice.reduce((a, b) => a + b, 0);
      expect(failureResult.roll).toBe(failureDiceSum);

      // Test success case
      const successResult = effectApplier.performEventCheck(succeedingEventCard, player);
      
      // Verify the check succeeded
      expect(successResult.success).toBe(true);
      
      // The dice count should also match the initial trait value (3)
      expect(successResult.dice.length).toBe(initialMight);
      
      // The roll value should be the sum of dice
      const successDiceSum = successResult.dice.reduce((a, b) => a + b, 0);
      expect(successResult.roll).toBe(successDiceSum);
    });

    it('should include dice array with correct length in check result', () => {
      const eventCard: Card = {
        id: 'event_test_dice_array',
        type: 'event',
        name: 'Test Event',
        description: 'Test event for dice array verification',
        icon: '',
        rollRequired: { stat: 'sanity', target: 4 },
        success: 'Success',
        failure: 'Failure',
      };

      const result = effectApplier.performEventCheck(eventCard, player);

      // Verify dice array exists and has correct properties
      expect(result.dice).toBeDefined();
      expect(Array.isArray(result.dice)).toBe(true);
      expect(result.dice.length).toBe(player.stats.sanity); // 5

      // Each die should be 0, 1, or 2 (Betrayal dice faces)
      result.dice.forEach(die => {
        expect([0, 1, 2]).toContain(die);
      });

      // Roll should equal sum of dice
      expect(result.roll).toBe(result.dice.reduce((a, b) => a + b, 0));
    });
  });
});
