/**
 * Test for addRandomDoor function
 * Issue #68: Verify that addRandomDoor actually adds a door to the room
 */

import { addRandomDoor, getUnconnectedDoors } from '../rules/roomDiscovery';
import { Room } from '@betrayal/shared';
import { Direction } from '../types';

// Mock room with only 2 doors (will close the board)
const mockRoom: Room = {
  id: 'test_room',
  name: 'Test Room',
  nameEn: 'Test Room',
  floor: 'ground' as const,
  symbol: null,
  doors: ['north', 'south'] as Direction[], // Only 2 doors - will close board
  description: 'A test room',
  color: '#7B6354',
  icon: '',
  isOfficial: true,
  gallerySvg: '',
};

// Create a minimal mock game state
const createMockGameState = (): any => {
  const groundMap = Array(15).fill(null).map((_: any, y: number) =>
    Array(15).fill(null).map((__: any, x: number) => ({
      x,
      y,
      floor: 'ground',
      room: null,
      discovered: false,
      rotation: 0,
      placementOrder: 0,
    }))
  );

  return {
    map: {
      ground: groundMap,
      upper: [],
      basement: [],
    },
    roomDeck: {
      ground: [],
      upper: [],
      basement: [],
      drawn: new Set(),
    },
    placedRoomIds: new Set(),
    players: [{
      id: 'test-player',
      position: { x: 7, y: 7, floor: 'ground' },
    }],
    turn: {
      currentPlayerId: 'test-player',
    },
  };
};

describe('addRandomDoor', () => {
  it('should add a door to a room with less than 4 doors', () => {
    const gameState = createMockGameState();
    const position = { x: 7, y: 7 };
    
    console.log('Original room doors:', mockRoom.doors);
    
    const modifiedRoom = addRandomDoor(mockRoom, gameState, position, 0);
    
    console.log('Modified room doors:', modifiedRoom.doors);
    
    // Verify a door was added
    expect(modifiedRoom.doors.length).toBeGreaterThan(mockRoom.doors.length);
    expect(modifiedRoom.doors.length).toBe(3); // Should have 3 doors now
    
    // Verify original room was not mutated
    expect(mockRoom.doors.length).toBe(2);
  });
  
  it('should not add a door to a room with 4 doors', () => {
    const gameState = createMockGameState();
    const position = { x: 7, y: 7 };
    
    const roomWith4Doors: Room = {
      ...mockRoom,
      doors: ['north', 'south', 'east', 'west'] as Direction[],
    };
    
    const modifiedRoom = addRandomDoor(roomWith4Doors, gameState, position, 0);
    
    // Verify no door was added
    expect(modifiedRoom.doors.length).toBe(4);
  });
  
  it('should add a door in the correct direction when rotated', () => {
    const gameState = createMockGameState();
    const position = { x: 7, y: 7 };
    
    // Room with only north and south doors
    const roomWith2Doors: Room = {
      ...mockRoom,
      doors: ['north', 'south'] as Direction[],
    };
    
    console.log('Room doors (room coords):', roomWith2Doors.doors);
    
    // When rotated 90 degrees:
    // - north (room) -> east (map)
    // - south (room) -> west (map)
    // Missing in map coords: north, south
    // Should add either north or south in map coords
    // Which means adding west or east in room coords
    
    const modifiedRoom = addRandomDoor(roomWith2Doors, gameState, position, 90);
    
    console.log('Modified room doors (room coords):', modifiedRoom.doors);
    
    // After rotation 90, the room has doors at east and west in map coords
    // The function should add either north or south in map coords
    // That means adding west or east in room coords
    expect(modifiedRoom.doors.length).toBe(3);
    expect(modifiedRoom.doors).toContain('north');
    expect(modifiedRoom.doors).toContain('south');
    // The new door should be either east or west
    const newDoor = modifiedRoom.doors.find((d: Direction) => !['north', 'south'].includes(d));
    expect(['east', 'west']).toContain(newDoor);
  });
});

describe('getUnconnectedDoors', () => {
  it('should return unconnected doors for a room', () => {
    const gameState = createMockGameState();
    const position = { x: 7, y: 7 };
    
    // Room with doors in all 4 directions
    const roomWith4Doors: Room = {
      ...mockRoom,
      doors: ['north', 'south', 'east', 'west'] as Direction[],
    };
    
    const unconnected = getUnconnectedDoors(gameState, position, roomWith4Doors, 0);
    
    // All 4 doors should be unconnected (no neighbors)
    expect(unconnected.length).toBe(4);
    expect(unconnected).toContain('north');
    expect(unconnected).toContain('south');
    expect(unconnected).toContain('east');
    expect(unconnected).toContain('west');
  });
});
