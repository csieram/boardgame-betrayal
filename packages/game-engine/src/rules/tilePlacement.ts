// Tile Placement Rules - Issue #304 Debug Version
// Validates door connections between rooms

import { Room } from '../../../shared-data/rooms/rooms';

export type Direction = 'north' | 'south' | 'east' | 'west';

export interface PlacedRoom {
  room: Room;
  x: number;
  y: number;
  floor: string;
}

export interface GameMap {
  [key: string]: PlacedRoom; // key: "x,y,floor"
}

// Opposite direction mapping
const OPPOSITE_DIRECTION: Record<Direction, Direction> = {
  north: 'south',
  south: 'north',
  east: 'west',
  west: 'east',
};

// Direction to coordinate delta
const DIRECTION_DELTA: Record<Direction, { dx: number; dy: number }> = {
  north: { dx: 0, dy: -1 },
  south: { dx: 0, dy: 1 },
  east: { dx: 1, dy: 0 },
  west: { dx: -1, dy: 0 },
};

/**
 * Check if two rooms can connect via doors
 */
export function canConnect(
  fromRoom: Room,
  toRoom: Room,
  direction: Direction
): boolean {
  const oppositeDirection = OPPOSITE_DIRECTION[direction];
  
  // Check if fromRoom has door in the specified direction
  const fromHasDoor = fromRoom.doors.includes(direction);
  
  // Check if toRoom has door in the opposite direction
  const toHasDoor = toRoom.doors.includes(oppositeDirection);
  
  // DEBUG #312: Log connection check
  console.log('[DEBUG #312] Checking connection:', {
    fromRoom: fromRoom.id,
    toRoom: toRoom.id,
    fromDoors: fromRoom.doors,
    toDoors: toRoom.doors,
    direction,
    oppositeDirection,
    fromHasDoor,
    toHasDoor,
    canConnect: fromHasDoor && toHasDoor
  });
  
  return fromHasDoor && toHasDoor;
}

/**
 * Check if a new room can be placed at the specified position
 */
export function canPlaceRoom(
  gameMap: GameMap,
  newRoom: Room,
  x: number,
  y: number,
  floor: string
): { valid: boolean; reason?: string } {
  const key = `${x},${y},${floor}`;
  
  // Check if position is already occupied
  if (gameMap[key]) {
    return { valid: false, reason: 'Position already occupied' };
  }
  
  // Check for adjacent rooms and door connections
  let hasAdjacentRoom = false;
  
  for (const [dir, delta] of Object.entries(DIRECTION_DELTA)) {
    const direction = dir as Direction;
    const adjacentX = x + delta.dx;
    const adjacentY = y + delta.dy;
    const adjacentKey = `${adjacentX},${adjacentY},${floor}`;
    
    const adjacentRoom = gameMap[adjacentKey];
    if (adjacentRoom) {
      hasAdjacentRoom = true;
      
      // Check door connection
      const canConnectResult = canConnect(adjacentRoom.room, newRoom, direction);
      
      if (!canConnectResult) {
        return {
          valid: false,
          reason: `Door mismatch with ${adjacentRoom.room.nameEn} (${adjacentRoom.room.id}) to the ${direction}`
        };
      }
    }
  }
  
  if (!hasAdjacentRoom) {
    return { valid: false, reason: 'No adjacent room to connect to' };
  }
  
  return { valid: true };
}

/**
 * Place a room on the map
 */
export function placeRoom(
  gameMap: GameMap,
  room: Room,
  x: number,
  y: number,
  floor: string
): GameMap {
  const key = `${x},${y},${floor}`;
  
  return {
    ...gameMap,
    [key]: {
      room,
      x,
      y,
      floor,
    },
  };
}

/**
 * Get all valid placement positions for a room
 */
export function getValidPlacements(
  gameMap: GameMap,
  room: Room,
  floor: string
): Array<{ x: number; y: number }> {
  const validPositions: Array<{ x: number; y: number }> = [];
  
  // Find all empty adjacent positions to existing rooms
  const emptyPositions = new Set<string>();
  
  for (const placedRoom of Object.values(gameMap)) {
    if (placedRoom.floor !== floor) continue;
    
    for (const delta of Object.values(DIRECTION_DELTA)) {
      const adjacentX = placedRoom.x + delta.dx;
      const adjacentY = placedRoom.y + delta.dy;
      const key = `${adjacentX},${adjacentY},${floor}`;
      
      if (!gameMap[key]) {
        emptyPositions.add(`${adjacentX},${adjacentY}`);
      }
    }
  }
  
  // Check each empty position
  for (const posKey of emptyPositions) {
    const [x, y] = posKey.split(',').map(Number);
    const result = canPlaceRoom(gameMap, room, x, y, floor);
    
    if (result.valid) {
      validPositions.push({ x, y });
    }
  }
  
  return validPositions;
}
