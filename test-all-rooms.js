#!/usr/bin/env node
/**
 * Comprehensive Room Rotation Test - All Rooms, All Directions
 * 
 * This script tests every room's rotation for all 4 entry directions
 */

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

// All rooms from the game
const ALL_ROOMS = [
  // Single door rooms
  { id: 'graveyard', name: '墓地', doors: ['south'] },
  { id: 'conservatory', name: '溫室', doors: ['north'] },
  { id: 'chapel', name: '禮拜堂', doors: ['north'] },
  { id: 'panic_room', name: '避難室', doors: ['east'] },
  { id: 'crypt', name: '墓穴', doors: ['north'] },
  { id: 'mystic_elevator', name: '神秘電梯', doors: ['north'] },
  { id: 'pentagram_chamber', name: '五芒星密室', doors: ['east'] },
  { id: 'coal_chute', name: '煤槽', doors: ['north'] },
  
  // Two door rooms
  { id: 'library', name: '書房', doors: ['west', 'south'] },
  { id: 'dining_room', name: '餐廳', doors: ['north', 'east'] },
  { id: 'tree_house', name: '樹屋', doors: ['east', 'south'] },
  { id: 'gymnasium', name: '健身房', doors: ['south', 'east'] },
  { id: 'kitchen', name: '廚房', doors: ['north', 'east'] },
  { id: 'master_bedroom', name: '主臥室', doors: ['north', 'west'] },
  { id: 'organ_room', name: '風琴室', doors: ['south', 'west'] },
  { id: 'operating_lab', name: '手術實驗室', doors: ['south', 'east'] },
  { id: 'chasm', name: '深淵', doors: ['east', 'west'] },
  { id: 'rookery', name: '鴿舍', doors: ['east', 'west'] },
  { id: 'larder', name: '儲藏室', doors: ['north', 'south'] },
  { id: 'gallery', name: '畫廊', doors: ['north', 'south'] },
  { id: 'research_lab', name: '研究實驗室', doors: ['north', 'south'] },
  
  // Three door rooms
  { id: 'game_room', name: '遊戲室', doors: ['north', 'south', 'east'] },
  { id: 'furnace_room', name: '鍋爐房', doors: ['north', 'south', 'west'] },
  { id: 'sewing_room', name: '縫紉室', doors: ['north', 'south', 'west'] },
  { id: 'patio', name: '庭院', doors: ['north', 'south', 'west'] },
  
  // Four door rooms
  { id: 'entrance_hall', name: '入口大廳', doors: ['north', 'south', 'east', 'west'] },
  { id: 'junk_room', name: '雜物間', doors: ['north', 'south', 'east', 'west'] },
  { id: 'servants_quarters', name: '僕人房', doors: ['north', 'south', 'east', 'west'] },
  { id: 'dusty_hallway', name: '積灰走廊', doors: ['north', 'south', 'east', 'west'] },
  { id: 'creaky_hallway', name: '吱嘎走廊', doors: ['north', 'south', 'east', 'west'] },
  { id: 'charred_room', name: '燒焦房間', doors: ['north', 'south', 'east', 'west'] },
  { id: 'roof_landing', name: '屋頂大廳', doors: ['north', 'south', 'east', 'west'] },
];

const DIRECTIONS = ['north', 'south', 'east', 'west'];

function rotateDoors(doors, rotation) {
  return doors.map(door => DIRECTION_ROTATION_MAP[door][rotation]);
}

function testAllRooms() {
  console.log('=== Comprehensive Room Rotation Test ===\n');
  
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  const failedCases = [];
  
  for (const room of ALL_ROOMS) {
    for (const entryDirection of DIRECTIONS) {
      totalTests++;
      const requiredDoor = OPPOSITE_DOOR[entryDirection];
      
      // Find valid rotations
      const validRotations = [];
      for (const rotation of [0, 90, 180, 270]) {
        const rotatedDoors = rotateDoors(room.doors, rotation);
        if (rotatedDoors.includes(requiredDoor)) {
          validRotations.push(rotation);
        }
      }
      
      const hasValidRotation = validRotations.length > 0;
      
      if (hasValidRotation) {
        passedTests++;
      } else {
        failedTests++;
        failedCases.push({
          room: room.name,
          roomId: room.id,
          doors: room.doors,
          entryDirection,
          requiredDoor,
        });
      }
    }
  }
  
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests} ✅`);
  console.log(`Failed: ${failedTests} ❌`);
  console.log('');
  
  if (failedCases.length > 0) {
    console.log('=== Failed Cases (Cannot connect in these directions) ===\n');
    for (const fail of failedCases) {
      console.log(`Room: ${fail.room} (${fail.roomId})`);
      console.log(`  Doors: ${fail.doors.join(', ')}`);
      console.log(`  Entry from: ${fail.entryDirection}`);
      console.log(`  Required: ${fail.requiredDoor}`);
      console.log(`  ❌ NO VALID ROTATION\n`);
    }
  }
  
  // Detailed report for specific rooms
  console.log('=== Detailed Report for User-Reported Rooms ===\n');
  const reportedRooms = ['graveyard', 'conservatory', 'chapel', 'panic_room', 'library', 'dining_room'];
  
  for (const roomId of reportedRooms) {
    const room = ALL_ROOMS.find(r => r.id === roomId);
    if (!room) continue;
    
    console.log(`\n${room.name} (${roomId}):`);
    console.log(`  Original doors: ${room.doors.join(', ')}`);
    console.log('');
    
    for (const entryDirection of DIRECTIONS) {
      const requiredDoor = OPPOSITE_DOOR[entryDirection];
      const validRotations = [];
      
      for (const rotation of [0, 90, 180, 270]) {
        const rotatedDoors = rotateDoors(room.doors, rotation);
        const hasRequired = rotatedDoors.includes(requiredDoor);
        validRotations.push({
          rotation,
          doors: rotatedDoors,
          valid: hasRequired,
        });
      }
      
      console.log(`  Entry from ${entryDirection} (needs ${requiredDoor}):`);
      for (const rot of validRotations) {
        const marker = rot.valid ? '✓' : '✗';
        console.log(`    ${rot.rotation}°: ${rot.doors.join(', ')} ${marker}`);
      }
    }
  }
  
  return { totalTests, passedTests, failedTests, failedCases };
}

// Run tests
testAllRooms();
