#!/usr/bin/env node
/**
 * Debug Graveyard Rotation Issue
 */

// Simulate the exact logic from roomDiscovery.ts

const DIRECTION_ROTATION_MAP = {
  north: { 0: 'north', 90: 'east', 180: 'south', 270: 'west' },
  east: { 0: 'east', 90: 'south', 180: 'west', 270: 'north' },
  south: { 0: 'south', 90: 'west', 180: 'north', 270: 'east' },
  west: { 0: 'west', 90: 'north', 180: 'east', 270: 'south' },
};

const OPPOSITE_DOOR = {
  north: 'south',
  south: 'north',
  east: 'west',
  west: 'east',
};

const DIRECTION_DELTAS = {
  north: { x: 0, y: -1 },
  south: { x: 0, y: 1 },
  east: { x: 1, y: 0 },
  west: { x: -1, y: 0 },
};

function rotateDoors(doors, rotation) {
  return doors.map(door => DIRECTION_ROTATION_MAP[door][rotation]);
}

// Simulate wouldCloseBoardWithRotation for Graveyard
function simulateWouldCloseBoardWithRotation(
  roomDoors,
  rotation,
  position,
  entryDirection,
  existingRooms = []
) {
  const rotatedDoors = rotateDoors(roomDoors, rotation);
  const entryDoor = entryDirection ? OPPOSITE_DOOR[entryDirection] : null;
  
  console.log(`\n=== Simulating ${rotation}° ===`);
  console.log(`Original doors: ${roomDoors.join(',')}`);
  console.log(`Rotated doors: ${rotatedDoors.join(',')}`);
  console.log(`Entry direction: ${entryDirection}`);
  console.log(`Entry door (opposite): ${entryDoor}`);
  console.log(`Position: ${position.x},${position.y}`);
  
  const unconnectedDoors = [];
  
  for (const door of rotatedDoors) {
    const delta = DIRECTION_DELTAS[door];
    const neighborPos = {
      x: position.x + delta.x,
      y: position.y + delta.y,
    };
    
    // Check if neighbor has a room
    const hasNeighbor = existingRooms.some(
      r => r.x === neighborPos.x && r.y === neighborPos.y
    );
    
    console.log(`  Door ${door}: neighbor at ${neighborPos.x},${neighborPos.y}, hasRoom=${hasNeighbor}`);
    
    if (!hasNeighbor) {
      console.log(`    >>> Unconnected door found!`);
      unconnectedDoors.push(door);
    }
  }
  
  // Key logic from wouldCloseBoardWithRotation
  if (unconnectedDoors.length > 0) {
    console.log(`  >>> Result: NOT CLOSED (has ${unconnectedDoors.length} unconnected door(s))`);
    return false;
  }
  
  if (rotatedDoors.length >= 2) {
    console.log(`  >>> Result: WOULD CLOSE (all ${rotatedDoors.length} doors connected)`);
    return true;
  }
  
  console.log(`  >>> Result: NOT CLOSED (single-door room)`);
  return false;
}

// Test Graveyard scenario
console.log('=== GRAVEYARD DEBUG ===');
console.log('Scenario: Game Room at (7,7), Graveyard at (8,7) [east]');
console.log('Game Room has east door, Graveyard needs west door');

const gameRoom = { x: 7, y: 7, room: 'game_room' };
const graveyardPos = { x: 8, y: 7 };
const entryDirection = 'east'; // From Game Room to Graveyard

console.log('\nExisting rooms:', [gameRoom]);

// Test all rotations
for (const rotation of [0, 90, 180, 270]) {
  const wouldClose = simulateWouldCloseBoardWithRotation(
    ['south'], // Graveyard original doors
    rotation,
    graveyardPos,
    entryDirection,
    [gameRoom]
  );
  
  const rotatedDoors = rotateDoors(['south'], rotation);
  const hasWest = rotatedDoors.includes('west');
  
  console.log(`\n*** ${rotation}°: hasWest=${hasWest}, wouldClose=${wouldClose}, VALID=${hasWest && !wouldClose} ***`);
}

console.log('\n\n=== EXPECTED ===');
console.log('Graveyard (south door) needs to rotate to have west door');
console.log('south + 90° = west ✓');
console.log('So 90° should be VALID');
console.log('But if wouldCloseBoardWithRotation returns true for 90°, it will be rejected!');
