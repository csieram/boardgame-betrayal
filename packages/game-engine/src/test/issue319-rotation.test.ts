/**
 * Issue #319 Debug Test - Library Rotation Bug
 */

import { RoomDiscoveryManager, findValidRotation, wouldCloseBoardWithRotation, VALID_ROTATIONS } from '../rules/roomDiscovery';
import { Direction } from '../types';

describe('Issue #319 - Library Rotation Bug', () => {
  it('should verify Library rotation logic', () => {
    // Library doors from rooms.ts: ['south', 'west']
    const libraryDoors: Direction[] = ['south', 'west'];
    
    console.log('\n========== Library Rotation Test ==========');
    console.log('Library original doors:', libraryDoors);
    
    // Test each rotation
    for (const rotation of VALID_ROTATIONS) {
      const rotatedDoors = RoomDiscoveryManager.rotateDoors(libraryDoors, rotation);
      const hasWest = rotatedDoors.includes('west');
      console.log(`${rotation}°: doors=[${rotatedDoors.join(', ')}], hasWest=${hasWest}`);
    }
    
    // Verify expected rotations
    expect(RoomDiscoveryManager.rotateDoors(libraryDoors, 0)).toEqual(['south', 'west']);
    expect(RoomDiscoveryManager.rotateDoors(libraryDoors, 90)).toEqual(['west', 'north']);
    expect(RoomDiscoveryManager.rotateDoors(libraryDoors, 180)).toEqual(['north', 'east']);
    expect(RoomDiscoveryManager.rotateDoors(libraryDoors, 270)).toEqual(['east', 'south']);
    
    // 0° and 90° should have west door
    expect(RoomDiscoveryManager.rotateDoors(libraryDoors, 0)).toContain('west');
    expect(RoomDiscoveryManager.rotateDoors(libraryDoors, 90)).toContain('west');
    
    // 180° and 270° should NOT have west door
    expect(RoomDiscoveryManager.rotateDoors(libraryDoors, 180)).not.toContain('west');
    expect(RoomDiscoveryManager.rotateDoors(libraryDoors, 270)).not.toContain('west');
  });
});
