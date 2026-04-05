import { CorpseManager, canLootCorpse } from './corpses';
import { Player, Card, Position3D } from '../types';

describe('CorpseManager', () => {
  let manager: CorpseManager;
  let mockPlayer: Player;
  let mockPosition: Position3D;
  let mockItem: Card;

  beforeEach(() => {
    manager = new CorpseManager();
    mockPosition = { x: 5, y: 5, floor: 'ground' };
    mockItem = {
      id: 'item_001',
      type: 'item',
      name: 'Test Item',
      description: 'A test item',
      icon: 'sword',
    };
    mockPlayer = {
      id: 'player_001',
      name: 'Test Player',
      character: {} as any,
      position: mockPosition,
      currentStats: { speed: 4, might: 4, sanity: 4, knowledge: 4 },
      items: [mockItem],
      omens: [],
      isTraitor: false,
      isDead: true,
      usedItemsThisTurn: [],
    };
  });

  test('should create corpse from player', () => {
    const corpse = manager.createCorpse(mockPlayer, mockPosition);
    
    expect(corpse).toBeDefined();
    expect(corpse.playerId).toBe(mockPlayer.id);
    expect(corpse.playerName).toBe(mockPlayer.name);
    expect(corpse.position).toEqual(mockPosition);
    expect(corpse.items).toHaveLength(1);
    expect(corpse.items[0].id).toBe(mockItem.id);
  });

  test('should loot item from corpse', () => {
    const corpse = manager.createCorpse(mockPlayer, mockPosition);
    const lootedItem = manager.lootItem(corpse.id, mockItem.id);
    
    expect(lootedItem).toBeDefined();
    expect(lootedItem?.id).toBe(mockItem.id);
    expect(manager.getCorpseItemCount(corpse.id)).toBe(0);
  });

  test('should check if can loot', () => {
    const corpse = manager.createCorpse(mockPlayer, mockPosition);
    const samePosition: Position3D = { x: 5, y: 5, floor: 'ground' };
    const differentPosition: Position3D = { x: 6, y: 5, floor: 'ground' };
    
    expect(canLootCorpse(corpse, samePosition)).toBe(true);
    expect(canLootCorpse(corpse, differentPosition)).toBe(false);
  });

  test('should get corpses at position', () => {
    manager.createCorpse(mockPlayer, mockPosition);
    const corpses = manager.getCorpsesAtPosition(mockPosition);
    
    expect(corpses).toHaveLength(1);
    expect(corpses[0].playerId).toBe(mockPlayer.id);
  });

  test('should remove empty corpse after looting all items', () => {
    const corpse = manager.createCorpse(mockPlayer, mockPosition);
    manager.lootItem(corpse.id, mockItem.id);
    
    expect(manager.getCorpseById(corpse.id)).toBeUndefined();
  });
});
