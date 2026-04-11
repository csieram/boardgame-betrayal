// Debug script for Issue #318 - Room Rotation Bug
// Tests the findValidRotation function

import { findValidRotation, wouldCloseBoardWithRotation, RoomDiscoveryManager } from './packages/game-engine/src/rules/roomDiscovery';
import { ROOMS_BY_ID } from './shared-data/rooms/rooms';
import { GameState, Direction, Floor } from './packages/game-engine/src/types';

console.log('🔍 Issue #318 Debug - Room Rotation\n');

// Create a minimal game state for testing
const createTestGameState = (): GameState => {
  const emptyRow = Array(15).fill(null).map(() => ({
    room: null,
    discovered: false,
    x: 0,
    y: 0,
    floor: 'ground' as Floor,
  }));
  
  const floorMap = Array(15).fill(null).map((_, y) => 
    Array(15).fill(null).map((_, x) => ({
      room: null,
      discovered: false,
      x,
      y,
      floor: 'ground' as Floor,
    }))
  );
  
  // Place Entrance Hall at (7, 7) with doors north, south, east, west
  const entranceHall = ROOMS_BY_ID['entrance_hall'];
  floorMap[7][7] = {
    room: entranceHall,
    discovered: true,
    x: 7,
    y: 7,
    floor: 'ground',
  };
  
  return {
    map: {
      ground: floorMap,
      upper: Array(15).fill(null).map((_, y) => 
        Array(15).fill(null).map((_, x) => ({
          room: null,
          discovered: false,
          x,
          y,
          floor: 'upper' as Floor,
        }))
      ),
      basement: Array(15).fill(null).map((_, y) => 
        Array(15).fill(null).map((_, x) => ({
          room: null,
          discovered: false,
          x,
          y,
          floor: 'basement' as Floor,
        }))
      ),
      placedRoomCount: 1,
    },
    players: [{
      id: 'player1',
      name: 'Test Player',
      position: { x: 7, y: 7, floor: 'ground' },
      character: 'zoe' as any,
      stats: { speed: 3, might: 3, sanity: 3, knowledge: 3 },
      items: [],
      omens: [],
      isTraitor: false,
      isDead: false,
    }],
    turn: {
      currentPlayerId: 'player1',
      phase: 'exploration' as any,
      movesRemaining: 3,
      hasDiscoveredRoom: false,
      hasEnded: false,
    },
    roomDeck: {
      ground: [ROOMS_BY_ID['dining_room']],
      upper: [],
      basement: [],
      drawn: new Set(),
    },
    placedRoomIds: new Set(['entrance_hall']),
  };
};

// Test Dining Room
console.log('=== Test Case: Entrance Hall east → Dining Room ===\n');

const gameState = createTestGameState();
const diningRoom = ROOMS_BY_ID['dining_room'];

console.log('Dining Room:', diningRoom.nameEn);
console.log('Original doors:', diningRoom.doors);
console.log('');

// Position for new room (east of Entrance Hall at 7,7)
const position = { x: 8, y: 7 };
const entryDirection: Direction = 'east';
const floor: Floor = 'ground';

console.log('Entry direction:', entryDirection);
console.log('New room position:', position);
console.log('Floor:', floor);
console.log('');

const result = findValidRotation(diningRoom, gameState, position, entryDirection, floor);

console.log('\n=== Result ===');
if (result) {
  console.log('Selected rotation:', result.rotation);
  console.log('Expected: 180° or 270°');
  
  if (result.rotation === 90) {
    console.log('❌ BUG CONFIRMED: Selected 90° which does NOT have west door!');
  } else if (result.rotation === 180 || result.rotation === 270) {
    console.log('✅ Correct: Selected', result.rotation, '° which has west door');
  }
} else {
  console.log('❌ No valid rotation found');
}