/**
 * Simple test for Issue #319 - Library Rotation Bug
 */

import { RoomDiscoveryManager } from '../rules/roomDiscovery';
import { Direction } from '../types';

describe('Issue #319 - Library Rotation Bug', () => {
  it('should correctly rotate Library doors', () => {
    // Library has west, south doors
    const libraryDoors: Direction[] = ['west', 'south'];
    console.log('Library original doors:', libraryDoors);

    for (const rotation of [0, 90, 180, 270] as const) {
      const rotated = RoomDiscoveryManager.rotateDoors(libraryDoors, rotation);
      console.log(`  ${rotation}°: ${rotated.join(', ')} (has west? ${rotated.includes('west')})`);
    }

    // Verify 0° has west door
    const rotated0 = RoomDiscoveryManager.rotateDoors(libraryDoors, 0);
    expect(rotated0).toContain('west');

    // Verify 180° does NOT have west door
    const rotated180 = RoomDiscoveryManager.rotateDoors(libraryDoors, 180);
    expect(rotated180).not.toContain('west');
  });
});
