// Room Configuration Test - Issue #269
// Validates room door counts per rulebook

import { ALL_ROOMS, ROOMS_BY_ID } from '../shared-data/rooms/rooms.ts';

interface RoomTest {
  id: string;
  expectedDoors: string[];
  floor: string;
}

const roomTests: RoomTest[] = [
  { id: 'entrance_hall', expectedDoors: ['north', 'south', 'east', 'west'], floor: 'ground' },
  { id: 'coal_chute', expectedDoors: ['north'], floor: 'ground' },
  { id: 'wine_cellar', expectedDoors: ['north', 'south'], floor: 'basement' },
  { id: 'library', expectedDoors: ['north', 'south', 'east', 'west'], floor: 'upper' },
  { id: 'bedroom', expectedDoors: ['east', 'west'], floor: 'upper' },
  { id: 'crypt', expectedDoors: ['north', 'east'], floor: 'basement' },
  { id: 'gallery', expectedDoors: ['north', 'south', 'east', 'west'], floor: 'upper' },
  { id: 'chapel', expectedDoors: ['north', 'east'], floor: 'ground' },
];

console.log('🏗️ Room Configuration Test - Issue #269\n');

let passed = 0;
let failed = 0;

for (const test of roomTests) {
  const room = ROOMS_BY_ID[test.id];

  if (!room) {
    console.log(`❌ ${test.id}: Room not found`);
    failed++;
    continue;
  }

  const actualDoors = room.doors.sort().join(',');
  const expectedDoors = test.expectedDoors.sort().join(',');

  if (actualDoors === expectedDoors) {
    console.log(`✅ ${room.nameEn}: ${room.doors.join(', ')} (${room.doors.length} doors)`);
    passed++;
  } else {
    console.log(`❌ ${room.nameEn}:`);
    console.log(`   Expected: ${test.expectedDoors.join(', ')} (${test.expectedDoors.length} doors)`);
    console.log(`   Actual:   ${room.doors.join(', ')} (${room.doors.length} doors)`);
    failed++;
  }
}

console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);

if (failed === 0) {
  console.log('\n🎉 All room configurations are correct!');
  process.exit(0);
} else {
  console.log('\n⚠️ Some room configurations need fixing');
  process.exit(1);
}
