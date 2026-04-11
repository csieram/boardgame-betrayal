/**
 * Simple test for Issue #319 - Library Rotation Bug
 */

const { RoomDiscoveryManager, findValidRotation, wouldCloseBoardWithRotation } = require('./src/rules/roomDiscovery');

// Test DIRECTION_ROTATION_MAP
console.log('\n🔍 Testing DIRECTION_ROTATION_MAP\n');

// Library has west, south doors
const libraryDoors = ['west', 'south'];
console.log('Library original doors:', libraryDoors);

for (const rotation of [0, 90, 180, 270]) {
  const rotated = RoomDiscoveryManager.rotateDoors(libraryDoors, rotation);
  console.log(`  ${rotation}°: ${rotated.join(', ')} (has west? ${rotated.includes('west')})`);
}

console.log('\n✅ Test completed\n');
