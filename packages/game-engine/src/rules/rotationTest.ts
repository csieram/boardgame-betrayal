/**
 * Comprehensive Room Rotation Test Suite
 * Issue #320: Verify all room rotation cases
 */

import { Room, Direction } from '@betrayal/shared';
import { rotateDoors, findValidRotation, wouldCloseBoardWithRotation } from './roomDiscovery';

// Test case definition
interface RotationTestCase {
  name: string;
  roomId: string;
  originalDoors: Direction[];
  entryDirection: Direction;
  requiredDoor: Direction;
  expectedRotations: number[]; // Valid rotations that have required door
  shouldNotClose: boolean;
}

// All test cases
const testCases: RotationTestCase[] = [
  // East exploration (needs WEST door)
  {
    name: 'Graveyard east of Game Room',
    roomId: 'graveyard',
    originalDoors: ['south'],
    entryDirection: 'east',
    requiredDoor: 'west',
    expectedRotations: [90], // south -> west
    shouldNotClose: true,
  },
  {
    name: 'Conservatory east of Game Room',
    roomId: 'conservatory',
    originalDoors: ['north'],
    entryDirection: 'east',
    requiredDoor: 'west',
    expectedRotations: [270], // north -> west
    shouldNotClose: true,
  },
  {
    name: 'Library east of Game Room',
    roomId: 'library',
    originalDoors: ['west', 'south'],
    entryDirection: 'east',
    requiredDoor: 'west',
    expectedRotations: [0, 180], // 0°: west,south; 180°: east,north (has west!)
    shouldNotClose: true,
  },
  {
    name: 'Dining Room east of Entrance Hall',
    roomId: 'dining_room',
    originalDoors: ['north', 'east'],
    entryDirection: 'east',
    requiredDoor: 'west',
    expectedRotations: [180, 270], // 180°: south,west; 270°: west,north
    shouldNotClose: true,
  },
  {
    name: 'Tree House east of Game Room',
    roomId: 'tree_house',
    originalDoors: ['east', 'south'],
    entryDirection: 'east',
    requiredDoor: 'west',
    expectedRotations: [90, 180], // 90°: south,west; 180°: west,north
    shouldNotClose: true,
  },
  
  // North exploration (needs SOUTH door)
  {
    name: 'Graveyard north of Game Room',
    roomId: 'graveyard',
    originalDoors: ['south'],
    entryDirection: 'north',
    requiredDoor: 'south',
    expectedRotations: [0], // south -> south (no rotation needed)
    shouldNotClose: true,
  },
  {
    name: 'Conservatory north of Game Room',
    roomId: 'conservatory',
    originalDoors: ['north'],
    entryDirection: 'north',
    requiredDoor: 'south',
    expectedRotations: [180], // north -> south
    shouldNotClose: true,
  },
  
  // South exploration (needs NORTH door)
  {
    name: 'Graveyard south of Game Room',
    roomId: 'graveyard',
    originalDoors: ['south'],
    entryDirection: 'south',
    requiredDoor: 'north',
    expectedRotations: [180], // south -> north
    shouldNotClose: true,
  },
  {
    name: 'Conservatory south of Game Room',
    roomId: 'conservatory',
    originalDoors: ['north'],
    entryDirection: 'south',
    requiredDoor: 'north',
    expectedRotations: [0], // north -> north (no rotation needed)
    shouldNotClose: true,
  },
  
  // West exploration (needs EAST door)
  {
    name: 'Graveyard west of Game Room',
    roomId: 'graveyard',
    originalDoors: ['south'],
    entryDirection: 'west',
    requiredDoor: 'east',
    expectedRotations: [270], // south -> east
    shouldNotClose: true,
  },
  {
    name: 'Conservatory west of Game Room',
    roomId: 'conservatory',
    originalDoors: ['north'],
    entryDirection: 'west',
    requiredDoor: 'east',
    expectedRotations: [90], // north -> east
    shouldNotClose: true,
  },
];

// Run all tests
export function runRotationTests() {
  console.log('=== Room Rotation Test Suite ===\n');
  
  let passed = 0;
  let failed = 0;
  
  for (const testCase of testCases) {
    console.log(`Testing: ${testCase.name}`);
    console.log(`  Room: ${testCase.roomId}`);
    console.log(`  Original doors: ${testCase.originalDoors.join(', ')}`);
    console.log(`  Entry from: ${testCase.entryDirection}, needs: ${testCase.requiredDoor}`);
    
    // Test each rotation
    const validRotations: number[] = [];
    for (const rotation of [0, 90, 180, 270]) {
      const rotatedDoors = rotateDoors(testCase.originalDoors, rotation as 0 | 90 | 180 | 270);
      const hasRequired = rotatedDoors.includes(testCase.requiredDoor);
      
      if (hasRequired) {
        validRotations.push(rotation);
      }
    }
    
    console.log(`  Expected rotations: ${testCase.expectedRotations.join(', ')}`);
    console.log(`  Actual valid rotations: ${validRotations.join(', ')}`);
    
    // Check if expected matches actual
    const matches = testCase.expectedRotations.every(r => validRotations.includes(r)) &&
                    validRotations.every(r => testCase.expectedRotations.includes(r));
    
    if (matches) {
      console.log('  ✅ PASSED\n');
      passed++;
    } else {
      console.log('  ❌ FAILED\n');
      failed++;
    }
  }
  
  console.log('=== Test Summary ===');
  console.log(`Total: ${testCases.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  
  return { passed, failed, total: testCases.length };
}

// Run tests if executed directly
if (require.main === module) {
  runRotationTests();
}
