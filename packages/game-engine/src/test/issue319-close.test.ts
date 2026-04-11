/**
 * Issue #319 Debug Test - wouldCloseBoardWithRotation
 */

import { wouldCloseBoardWithRotation, RoomDiscoveryManager } from '../rules/roomDiscovery';
import { GameState, Direction, Floor, Tile, GameMap } from '../types';
import { Room, SymbolType } from '@betrayal/shared';

const createMockRoom = (
  id: string,
  doors: Direction[] = ['north', 'south', 'east', 'west'],
  floor: Floor = 'ground',
  symbol: SymbolType = null
): Room => ({
  id,
  name: 'Test Room',
  nameEn: 'Test Room',
  floor,
  symbol,
  doors,
  description: 'A test room',
  color: '#FFFFFF',
  icon: '',
  isOfficial: true,
});

const createEmptyTile = (x: number, y: number, floor: Floor): Tile => ({
  x,
  y,
  floor,
  room: null,
  discovered: false,
  rotation: 0,
  placementOrder: -1,
});

const createMockMap = (): GameMap => {
  const createFloor = (floor: Floor): Tile[][] => {
    const map: Tile[][] = [];
    for (let y = 0; y < 15; y++) {
      const row: Tile[] = [];
      for (let x = 0; x < 15; x++) {
        row.push(createEmptyTile(x, y, floor));
      }
      map.push(row);
    }
    return map;
  };

  return {
    ground: createFloor('ground'),
    upper: createFloor('upper'),
    basement: createFloor('basement'),
    roof: createFloor('roof'),
    placedRoomCount: 0,
  };
};

describe('Issue #319 - wouldCloseBoardWithRotation', () => {
  it('should NOT close board for Library at 0°', () => {
    const map = createMockMap();
    
    // Place Game Room at (7, 7)
    map.ground[7][7] = {
      x: 7,
      y: 7,
      floor: 'ground',
      room: createMockRoom('game_room', ['east', 'west'], 'ground'),
      discovered: true,
      rotation: 0,
      placementOrder: 0,
    };

    const state: Partial<GameState> = {
      map,
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
      players: [{
        id: 'player-1',
        name: 'Player 1',
        character: {
          id: 'test',
          name: 'Test',
          nameEn: 'Test',
          age: 25,
          description: 'Test',
          color: '#FF0000',
          emoji: '🧪',
          portraitSvg: '',
          stats: {
            speed: { currentIndex: 3, values: [0, 1, 2, 3, 4, 5, 6, 7] },
            might: { currentIndex: 3, values: [0, 1, 2, 3, 4, 5, 6, 7] },
            sanity: { currentIndex: 3, values: [0, 1, 2, 3, 4, 5, 6, 7] },
            knowledge: { currentIndex: 3, values: [0, 1, 2, 3, 4, 5, 6, 7] },
          },
        },
        position: { x: 7, y: 7, floor: 'ground' },
        currentStats: { speed: 4, might: 3, sanity: 3, knowledge: 3 },
        items: [],
        omens: [],
        isTraitor: false,
        isDead: false,
        usedItemsThisTurn: [],
      }],
    };

    // Library: south, west doors
    const library: Room = {
      id: 'library',
      name: '圖書室',
      nameEn: 'Library',
      floor: 'ground',
      symbol: 'E',
      doors: ['south', 'west'] as Direction[],
      description: '滿是書的圖書室',
      color: '#5D4E37',
      icon: '',
      isOfficial: true,
    };

    const position = { x: 8, y: 7 };
    const entryDirection: Direction = 'east';
    const floor: Floor = 'ground';

    console.log('\n========== wouldCloseBoardWithRotation Test ==========');
    console.log('Library doors:', library.doors);
    console.log('Position:', position);
    console.log('Entry direction:', entryDirection);
    console.log('Game Room at (7, 7):', state.map!.ground[7][7].room?.id);
    console.log('Tile at (8, 8):', state.map!.ground[8][8].room);

    // At 0°: south->(8,8) empty, west->(7,7) Game Room
    // So south door leads to unexplored area, should NOT close board
    const wouldClose0 = wouldCloseBoardWithRotation(
      state as GameState,
      position,
      library,
      0,
      floor,
      entryDirection
    );

    console.log('\n0° wouldClose:', wouldClose0);
    console.log('Expected: false (because south door leads to empty tile at (8,8))');

    // Should NOT close board because south door leads to unexplored area
    expect(wouldClose0).toBe(false);
  });
});
