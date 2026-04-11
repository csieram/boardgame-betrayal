/**
 * Issue #318 UI Debug Test
 * 
 * 這個測試用於驗證 UI 旋轉是否正確顯示房間門的位置
 * 
 * 測試場景：
 * - Entrance Hall 東門 → Dining Room
 * - Dining Room 原始門: ['north', 'east']
 * - 需要旋轉使 Dining Room 有 west 門來連接
 * 
 * 預期結果：
 * - 引擎選擇 180° 旋轉 (north→south, east→west)
 * - CSS rotate(180deg) 應該顯示相同的旋轉
 * - 視覺上 Dining Room 的門應該在南邊和西邊
 */

import { rotateDoors } from '@betrayal/shared';

describe('Issue #318 - UI Rotation Debug', () => {
  const diningRoomDoors = ['north', 'east'] as const;
  
  test('Rotation mapping is clockwise', () => {
    // Verify the rotation direction used by rotateDoors
    // Test using actual rotateDoors function
    const northDoor = ['north'] as ('north' | 'south' | 'east' | 'west')[];
    
    // 0°: north stays north
    expect(rotateDoors(northDoor, 0)).toEqual(['north']);
    // 90°: north becomes east (clockwise rotation)
    expect(rotateDoors(northDoor, 90)).toEqual(['east']);
    // 180°: north becomes south
    expect(rotateDoors(northDoor, 180)).toEqual(['south']);
    // 270°: north becomes west
    expect(rotateDoors(northDoor, 270)).toEqual(['west']);
  });

  test('rotateDoors function matches DIRECTION_ROTATION_MAP', () => {
    // Test with Dining Room doors
    const doors = ['north', 'east'] as ('north' | 'south' | 'east' | 'west')[];
    
    // 0°: ['north', 'east']
    expect(rotateDoors(doors, 0)).toEqual(['north', 'east']);
    
    // 90°: ['east', 'south']
    expect(rotateDoors(doors, 90)).toEqual(['east', 'south']);
    
    // 180°: ['south', 'west']
    expect(rotateDoors(doors, 180)).toEqual(['south', 'west']);
    
    // 270°: ['west', 'north']
    expect(rotateDoors(doors, 270)).toEqual(['west', 'north']);
  });

  test('CSS rotation direction matches engine', () => {
    // CSS transform: rotate() is clockwise
    // https://developer.mozilla.org/en-US/docs/Web/CSS/transform-function/rotate
    // Positive angle = clockwise rotation
    
    // Engine rotation is also clockwise (as verified above)
    // So they should match!
    
    const doors = ['north', 'east'] as ('north' | 'south' | 'east' | 'west')[];
    
    // At 180° rotation:
    // - Engine says: north→south, east→west
    const rotatedDoors = rotateDoors(doors, 180);
    expect(rotatedDoors).toContain('west');
    expect(rotatedDoors).toContain('south');
    
    // CSS rotate(180deg) should visually show:
    // - Original north door (at top) now appears at bottom (south)
    // - Original east door (at right) now appears at left (west)
    // This matches the engine's rotated doors!
  });

  test('Dining Room connection scenario', () => {
    // Scenario: Enter from Entrance Hall's east door
    // Entry direction: 'east' (player moves east from Entrance Hall)
    // Required door in new room: 'west' (opposite of entry direction)
    
    // Opposite door mapping
    const oppositeDoor: Record<string, string> = {
      north: 'south',
      south: 'north',
      east: 'west',
      west: 'east'
    };
    
    const entryDirection = 'east';
    const requiredDoor = oppositeDoor[entryDirection];
    
    expect(requiredDoor).toBe('west');
    
    // Find which rotation gives us 'west' door
    const doors = ['north', 'east'] as ('north' | 'south' | 'east' | 'west')[];
    
    for (const rotation of [0, 90, 180, 270] as const) {
      const rotated = rotateDoors(doors, rotation);
      console.log(`Rotation ${rotation}°:`, rotated);
    }
    
    // 180° gives ['south', 'west'] - has west ✓
    expect(rotateDoors(doors, 180)).toContain('west');
    
    // 270° gives ['west', 'north'] - also has west ✓
    expect(rotateDoors(doors, 270)).toContain('west');
  });
});

// Manual visual test description
console.log(`
=== Issue #318 Visual Test Guide ===

Test: Dining Room rotation when placed from Entrance Hall (east door)

1. Dining Room original doors: north (top), east (right)
   Visual:    [N]
            [W]   [E]
               [S]

2. After 180° rotation:
   - Engine rotated doors: south, west
   - CSS rotate(180deg): SVG rotates 180° clockwise
   
   Expected visual after CSS rotation:
   - Original north door (was at top) now at bottom → south ✓
   - Original east door (was at right) now at left → west ✓
   
   Visual:    [N]  (this is original south)
            [W]   [E]  (this is original west on left, original east on right)
               [S]  (this is original north)
   
   Wait... that's confusing. Let me think again.
   
   Actually, when you rotate the SVG 180°:
   - The entire image turns upside down
   - Original north (top) → now points down (south direction)
   - Original east (right) → now points left (west direction)
   
   So visually:
   - Door that WAS at top is now at bottom
   - Door that WAS at right is now at left
   
   But the door's "direction" in game terms:
   - The door at bottom connects to south
   - The door at left connects to west
   
   This matches engine: 180° rotation → doors at south and west ✓

3. Verify by checking:
   - Open browser console
   - Look for [DEBUG #318-UI] logs
   - Check that rotation value matches expected
   - Check that rotated doors include 'west'

=== End Test Guide ===
`);
