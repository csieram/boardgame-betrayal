// Official Betrayal at House on the Hill - 2nd Edition + Widow's Walk Rooms
// Generated from official room data
// Format: Each room can appear on multiple floors (floors: ['ground', 'upper', 'basement', 'roof'])

export type Floor = 'ground' | 'upper' | 'basement' | 'roof';
export type RoomType = 'omen' | 'event' | 'item' | 'none' | 'landing' | 'special';
export type CardSymbol = 'O' | 'E' | 'I' | null;

export interface Room {
  id: string;
  name: string;
  nameEn: string;
  floors: Floor[];  // Room can appear on multiple floors
  type: RoomType;
  symbol: CardSymbol;
  doors: ('north' | 'south' | 'east' | 'west')[];
  description: string;
  color: string;
  isOfficial: boolean;
  set: '2nd' | 'ww';
  hasDumbwaiter?: boolean;
  isOutside?: boolean;
  hasWindow?: boolean;
  specialText?: string;
}

// ==================== ALL OFFICIAL ROOMS ====================
export const ALL_ROOMS: Room[] = [
  // 2nd Edition - Core (45 rooms)
  { id: 'abandoned_room', name: '廢棄房間', nameEn: 'Abandoned Room', floors: ['ground', 'basement'], type: 'omen', symbol: 'O', doors: ['north', 'south', 'east', 'west'], description: '被遺棄的房間', color: '#4A4A4A', isOfficial: true, set: '2nd' },
  { id: 'attic', name: '閣樓', nameEn: 'Attic', floors: ['upper'], type: 'event', symbol: 'E', doors: ['south'], description: '屋頂的閣樓', color: '#4A4A3A', isOfficial: true, set: '2nd', specialText: 'Exit: Speed 3+ or lose 1 Might' },
  { id: 'balcony', name: '陽台', nameEn: 'Balcony', floors: ['upper'], type: 'omen', symbol: 'O', doors: ['north', 'south'], description: '俯瞰的陽台', color: '#6A6A5A', isOfficial: true, set: '2nd', isOutside: true },
  { id: 'ballroom', name: '舞廳', nameEn: 'Ballroom', floors: ['ground'], type: 'event', symbol: 'E', doors: ['north', 'south', 'east', 'west'], description: '華麗的舞廳', color: '#4A4A6A', isOfficial: true, set: '2nd' },
  { id: 'basement_landing', name: '地下室大廳', nameEn: 'Basement Landing', floors: ['basement'], type: 'landing', symbol: null, doors: ['north', 'south', 'east', 'west'], description: '地下室的起點', color: '#3A3A3A', isOfficial: true, set: '2nd' },
  { id: 'bedroom', name: '臥室', nameEn: 'Bedroom', floors: ['upper'], type: 'event', symbol: 'E', doors: ['east', 'west'], description: '普通的臥室', color: '#6B4B4B', isOfficial: true, set: '2nd', hasWindow: true },
  { id: 'bloody_room', name: '血跡房間', nameEn: 'Bloody Room', floors: ['upper', 'ground'], type: 'item', symbol: 'I', doors: ['north', 'south', 'east', 'west'], description: '滿是血跡的房間', color: '#5A3A3A', isOfficial: true, set: '2nd' },
  { id: 'catacombs', name: '地下墓穴', nameEn: 'Catacombs', floors: ['basement'], type: 'omen', symbol: 'O', doors: ['north', 'south'], description: '古老的地下墓穴', color: '#3A3A3A', isOfficial: true, set: '2nd', specialText: 'Sanity 6+ to cross' },
  { id: 'chapel', name: '禮拜堂', nameEn: 'Chapel', floors: ['upper', 'ground'], type: 'event', symbol: 'E', doors: ['north'], description: '小型的禮拜堂', color: '#4A4A5A', isOfficial: true, set: '2nd', hasWindow: true, specialText: 'Once/game +1 Sanity' },
  { id: 'charred_room', name: '燒焦房間', nameEn: 'Charred Room', floors: ['upper', 'ground'], type: 'omen', symbol: 'O', doors: ['north', 'south', 'east', 'west'], description: '被火燒過的房間', color: '#3A2A2A', isOfficial: true, set: '2nd' },
  { id: 'chasm', name: '深淵', nameEn: 'Chasm', floors: ['basement'], type: 'none', symbol: null, doors: ['east', 'west'], description: '地板裂開的深淵', color: '#1A1A1A', isOfficial: true, set: '2nd', specialText: 'Speed 3+ to cross' },
  { id: 'coal_chute', name: '煤槽', nameEn: 'Coal Chute', floors: ['ground'], type: 'none', symbol: null, doors: ['north'], description: '滑到地下室的煤槽', color: '#2A2A2A', isOfficial: true, set: '2nd', specialText: 'Slide to Basement Landing' },
  { id: 'collapsed_room', name: '倒塌房間', nameEn: 'Collapsed Room', floors: ['upper', 'ground'], type: 'none', symbol: null, doors: ['north', 'south', 'east', 'west'], description: '地板倒塌的房間', color: '#3A3A3A', isOfficial: true, set: '2nd', specialText: 'Speed 5+ or fall to basement' },
  { id: 'conservatory', name: '溫室', nameEn: 'Conservatory', floors: ['upper', 'ground'], type: 'event', symbol: 'E', doors: ['north'], description: '植物溫室', color: '#2F4F2F', isOfficial: true, set: '2nd', isOutside: true },
  { id: 'creaky_hallway', name: '吱嘎走廊', nameEn: 'Creaky Hallway', floors: ['upper', 'ground', 'basement'], type: 'none', symbol: null, doors: ['north', 'south', 'east', 'west'], description: '地板吱嘎作響的走廊', color: '#5A5A5A', isOfficial: true, set: '2nd' },
  { id: 'crypt', name: '墓穴', nameEn: 'Crypt', floors: ['basement'], type: 'event', symbol: 'E', doors: ['north'], description: '存放石棺的墓穴', color: '#3A3A4A', isOfficial: true, set: '2nd', specialText: 'End turn: 1 mental dmg' },
  { id: 'dining_room', name: '餐廳', nameEn: 'Dining Room', floors: ['ground'], type: 'omen', symbol: 'O', doors: ['north', 'east'], description: '長餐桌的餐廳', color: '#5A4A3A', isOfficial: true, set: '2nd', hasWindow: true },
  { id: 'dusty_hallway', name: '積灰走廊', nameEn: 'Dusty Hallway', floors: ['upper', 'ground', 'basement'], type: 'none', symbol: null, doors: ['north', 'south', 'east', 'west'], description: '滿是灰塵的走廊', color: '#6A6A5A', isOfficial: true, set: '2nd' },
  { id: 'entrance_hall', name: '入口大廳', nameEn: 'Entrance Hall', floors: ['ground'], type: 'landing', symbol: null, doors: ['north', 'south', 'east', 'west'], description: '房屋的入口', color: '#7B6354', isOfficial: true, set: '2nd', hasWindow: true, specialText: 'Part of 3-tile start' },
  { id: 'furnace_room', name: '鍋爐房', nameEn: 'Furnace Room', floors: ['basement'], type: 'omen', symbol: 'O', doors: ['north', 'south', 'west'], description: '燃燒的鍋爐房', color: '#4A3A2A', isOfficial: true, set: '2nd', specialText: 'End turn: 1 physical dmg' },
  { id: 'gallery', name: '畫廊', nameEn: 'Gallery', floors: ['upper'], type: 'omen', symbol: 'O', doors: ['north', 'south'], description: '展示畫作的畫廊', color: '#5A4A4A', isOfficial: true, set: '2nd', specialText: 'Fall to Ballroom' },
  { id: 'game_room', name: '遊戲室', nameEn: 'Game Room', floors: ['upper', 'ground', 'basement'], type: 'event', symbol: 'E', doors: ['north', 'south', 'east'], description: '遊戲娛樂室', color: '#4A5A6A', isOfficial: true, set: '2nd' },
  { id: 'gardens', name: '花園', nameEn: 'Gardens', floors: ['ground'], type: 'event', symbol: 'E', doors: ['north', 'south'], description: '戶外花園', color: '#2F4F2F', isOfficial: true, set: '2nd', isOutside: true },
  { id: 'graveyard', name: '墓地', nameEn: 'Graveyard', floors: ['ground'], type: 'event', symbol: 'E', doors: ['south'], description: '荒廢的墓地', color: '#3A4A3A', isOfficial: true, set: '2nd', isOutside: true, specialText: 'Exit: Sanity 4+ or lose Knowledge' },
  { id: 'gymnasium', name: '健身房', nameEn: 'Gymnasium', floors: ['upper', 'basement'], type: 'omen', symbol: 'O', doors: ['south', 'east'], description: '室內健身房', color: '#5A6A5A', isOfficial: true, set: '2nd', specialText: 'Once/game +1 Speed' },
  { id: 'junk_room', name: '雜物間', nameEn: 'Junk Room', floors: ['upper', 'ground', 'basement'], type: 'omen', symbol: 'O', doors: ['north', 'south', 'east', 'west'], description: '堆滿雜物的房間', color: '#4A4A3A', isOfficial: true, set: '2nd', specialText: 'Exit: Might 3+ or lose Speed' },
  { id: 'kitchen', name: '廚房', nameEn: 'Kitchen', floors: ['ground', 'basement'], type: 'omen', symbol: 'O', doors: ['north', 'east'], description: '家庭廚房', color: '#4A6741', isOfficial: true, set: '2nd' },
  { id: 'larder', name: '儲藏室', nameEn: 'Larder', floors: ['basement'], type: 'item', symbol: 'I', doors: ['north', 'south'], description: '存放食物的儲藏室', color: '#4A4A3A', isOfficial: true, set: '2nd', specialText: 'Once/game +1 Might' },
  { id: 'library', name: '圖書室', nameEn: 'Library', floors: ['upper', 'ground'], type: 'event', symbol: 'E', doors: ['south', 'west'], description: '滿是書的圖書室', color: '#5D4E37', isOfficial: true, set: '2nd', specialText: 'Once/game +1 Knowledge' },
  { id: 'master_bedroom', name: '主臥室', nameEn: 'Master Bedroom', floors: ['upper'], type: 'omen', symbol: 'O', doors: ['north', 'west'], description: '華麗的主臥室', color: '#7B4B4B', isOfficial: true, set: '2nd', hasWindow: true },
  { id: 'mystic_elevator', name: '神秘電梯', nameEn: 'Mystic Elevator', floors: ['upper', 'ground', 'basement'], type: 'none', symbol: null, doors: ['north'], description: '會移動的電梯', color: '#4A4A5A', isOfficial: true, set: '2nd', specialText: 'Moves floors' },
  { id: 'operating_lab', name: '手術實驗室', nameEn: 'Operating Laboratory', floors: ['upper', 'basement'], type: 'event', symbol: 'E', doors: ['south', 'east'], description: '進行手術的實驗室', color: '#4A5A4A', isOfficial: true, set: '2nd' },
  { id: 'organ_room', name: '風琴室', nameEn: 'Organ Room', floors: ['upper', 'ground', 'basement'], type: 'event', symbol: 'E', doors: ['south', 'west'], description: '有風琴的房間', color: '#5A4A5A', isOfficial: true, set: '2nd' },
  { id: 'patio', name: '庭院', nameEn: 'Patio', floors: ['ground'], type: 'event', symbol: 'E', doors: ['north', 'south', 'west'], description: '戶外庭院', color: '#6A6A5A', isOfficial: true, set: '2nd', isOutside: true },
  { id: 'pentagram_chamber', name: '五芒星密室', nameEn: 'Pentagram Chamber', floors: ['basement'], type: 'omen', symbol: 'O', doors: ['east'], description: '畫著五芒星的密室', color: '#3A1A4A', isOfficial: true, set: '2nd', specialText: 'Exit: Knowledge 4+ or lose Sanity' },
  { id: 'research_lab', name: '研究實驗室', nameEn: 'Research Laboratory', floors: ['upper', 'basement'], type: 'event', symbol: 'E', doors: ['north', 'south'], description: '研究用的實驗室', color: '#4A5A5A', isOfficial: true, set: '2nd' },
  { id: 'servants_quarters', name: '僕人房', nameEn: 'Servants Quarters', floors: ['upper', 'basement'], type: 'omen', symbol: 'O', doors: ['north', 'south', 'east', 'west'], description: '僕人居住的地方', color: '#4A4A4A', isOfficial: true, set: '2nd' },
  { id: 'stairs_from_basement', name: '地下室樓梯', nameEn: 'Stairs from Basement', floors: ['basement'], type: 'none', symbol: null, doors: ['north', 'south'], description: '通往一樓的樓梯', color: '#4A4A3A', isOfficial: true, set: '2nd' },
  { id: 'statuary_corridor', name: '雕像走廊', nameEn: 'Statuary Corridor', floors: ['upper', 'ground', 'basement'], type: 'event', symbol: 'E', doors: ['north', 'south'], description: '有雕像的走廊', color: '#5A5A6A', isOfficial: true, set: '2nd' },
  { id: 'storeroom', name: '儲物間', nameEn: 'Storeroom', floors: ['upper', 'basement'], type: 'item', symbol: 'I', doors: ['north'], description: '存放雜物的房間', color: '#4A4A4A', isOfficial: true, set: '2nd' },
  { id: 'tower', name: '塔樓', nameEn: 'Tower', floors: ['upper'], type: 'event', symbol: 'E', doors: ['east', 'west'], description: '高聳的塔樓', color: '#556B8B', isOfficial: true, set: '2nd', isOutside: true, specialText: 'Might 3+ to cross' },
  { id: 'underground_lake', name: '地下湖', nameEn: 'Underground Lake', floors: ['basement'], type: 'event', symbol: 'E', doors: ['north', 'west'], description: '地下的湖泊', color: '#2A3A4A', isOfficial: true, set: '2nd' },
  { id: 'upper_landing', name: '二樓大廳', nameEn: 'Upper Landing', floors: ['upper'], type: 'landing', symbol: null, doors: ['north', 'south', 'east', 'west'], description: '二樓的起點', color: '#6B5344', isOfficial: true, set: '2nd' },
  { id: 'vault', name: '金庫', nameEn: 'Vault', floors: ['upper', 'basement'], type: 'special', symbol: 'I', doors: ['north'], description: '存放貴重物品的金庫', color: '#4A4A3A', isOfficial: true, set: '2nd', specialText: 'Knowledge 6+ to open' },
  { id: 'wine_cellar', name: '酒窖', nameEn: 'Wine Cellar', floors: ['basement'], type: 'item', symbol: 'I', doors: ['north', 'south'], description: '存放酒的地下室', color: '#4A3A4A', isOfficial: true, set: '2nd' },

  // Widow's Walk Expansion (20 rooms)
  { id: 'arsenal', name: '軍械庫', nameEn: 'Arsenal', floors: ['ground', 'basement'], type: 'item', symbol: 'I', doors: ['south', 'east'], description: '存放武器的房間', color: '#4A4A3A', isOfficial: true, set: 'ww', specialText: 'Draw 2 items, keep 1' },
  { id: 'bathroom', name: '浴室', nameEn: 'Bathroom', floors: ['upper', 'ground'], type: 'event', symbol: 'E', doors: ['south'], description: '浴室', color: '#4A5A6A', isOfficial: true, set: 'ww' },
  { id: 'cave', name: '洞穴', nameEn: 'Cave', floors: ['basement'], type: 'event', symbol: 'E', doors: ['north', 'south', 'east', 'west'], description: '天然的洞穴', color: '#2A2A2A', isOfficial: true, set: 'ww', specialText: 'Lose die if pass-through' },
  { id: 'drawing_room', name: '繪畫室', nameEn: 'Drawing Room', floors: ['roof', 'upper'], type: 'special', symbol: null, doors: ['north', 'south', 'east', 'west'], description: '繪畫室', color: '#5A5A4A', isOfficial: true, set: 'ww', hasWindow: true, specialText: 'Gives any card type' },
  { id: 'dungeon', name: '地牢', nameEn: 'Dungeon', floors: ['basement'], type: 'omen', symbol: 'O', doors: ['north', 'south'], description: '陰森的地牢', color: '#2A2A3A', isOfficial: true, set: 'ww', specialText: 'Sanity 3+ or lose 1' },
  { id: 'laundry', name: '洗衣房', nameEn: 'Laundry', floors: ['ground', 'basement'], type: 'item', symbol: 'I', doors: ['south', 'west'], description: '洗衣房', color: '#4A5A5A', isOfficial: true, set: 'ww', hasDumbwaiter: true, specialText: 'Recycle item' },
  { id: 'locked_room', name: '上鎖房間', nameEn: 'Locked Room', floors: ['roof', 'upper', 'basement'], type: 'event', symbol: 'E', doors: ['north', 'south', 'east'], description: '上鎖的房間', color: '#4A4A5A', isOfficial: true, set: 'ww', specialText: 'Doors locked (Knowledge 3+)' },
  { id: 'menagerie', name: '動物園', nameEn: 'Menagerie', floors: ['ground', 'basement'], type: 'event', symbol: 'E', doors: ['east', 'west'], description: '動物展示室', color: '#4A5A4A', isOfficial: true, set: 'ww', hasDumbwaiter: true, specialText: 'Once/game +1 physical' },
  { id: 'nursery', name: '嬰兒房', nameEn: 'Nursery', floors: ['roof', 'upper'], type: 'omen', symbol: 'O', doors: ['north', 'east'], description: '嬰兒的房間', color: '#8B6B7B', isOfficial: true, set: 'ww', specialText: 'Sanity adjust' },
  { id: 'panic_room', name: '避難室', nameEn: 'Panic Room', floors: ['roof', 'upper', 'ground', 'basement'], type: 'event', symbol: 'E', doors: ['east'], description: '安全的避難室', color: '#4A5A4A', isOfficial: true, set: 'ww', hasDumbwaiter: true, specialText: 'Teleport via dumbwaiter' },
  { id: 'roof_landing', name: '屋頂大廳', nameEn: 'Roof Landing', floors: ['roof'], type: 'landing', symbol: null, doors: ['north', 'south', 'east', 'west'], description: '屋頂的起點', color: '#5A5A5A', isOfficial: true, set: 'ww', isOutside: true, specialText: 'Connects upper' },
  { id: 'rookery', name: '鴿舍', nameEn: 'Rookery', floors: ['roof'], type: 'omen', symbol: 'O', doors: ['east', 'west'], description: '鴿子居住的塔樓', color: '#5A5A6A', isOfficial: true, set: 'ww', specialText: 'Choose next room tile' },
  { id: 'sewing_room', name: '縫紉室', nameEn: 'Sewing Room', floors: ['roof', 'upper'], type: 'item', symbol: 'I', doors: ['north', 'south', 'west'], description: '縫紉工作的房間', color: '#6A5A6A', isOfficial: true, set: 'ww', hasDumbwaiter: true, hasWindow: true, specialText: 'Trade item for stat' },
  { id: 'solarium', name: '日光室', nameEn: 'Solarium', floors: ['roof', 'upper'], type: 'item', symbol: 'I', doors: ['north'], description: '陽光充足的房間', color: '#6A6A4A', isOfficial: true, set: 'ww', isOutside: true, specialText: 'Gain Sanity' },
  { id: 'spiral_staircase', name: '螺旋樓梯', nameEn: 'Spiral Staircase', floors: ['roof', 'upper', 'ground'], type: 'none', symbol: null, doors: ['north', 'south', 'east', 'west'], description: '連接各層的螺旋樓梯', color: '#5A5A5A', isOfficial: true, set: 'ww', specialText: 'Move between landings' },
  { id: 'storm_cellar', name: '避風窖', nameEn: 'Storm Cellar', floors: ['basement'], type: 'item', symbol: 'I', doors: ['south', 'east'], description: '躲避風暴的地下室', color: '#3A3A4A', isOfficial: true, set: 'ww' },
  { id: 'study', name: '書房', nameEn: 'Study', floors: ['roof', 'upper', 'ground'], type: 'omen', symbol: 'O', doors: ['south', 'east'], description: '讀書研究的房間', color: '#5D4E37', isOfficial: true, set: 'ww', hasDumbwaiter: true, specialText: 'Once/game +1 mental' },
  { id: 'theater', name: '劇院', nameEn: 'Theater', floors: ['upper', 'ground'], type: 'omen', symbol: 'O', doors: ['east', 'west'], description: '表演劇院的房間', color: '#4A3A4A', isOfficial: true, set: 'ww' },
  { id: 'tree_house', name: '樹屋', nameEn: 'Tree House', floors: ['ground'], type: 'event', symbol: 'E', doors: ['south', 'east'], description: '樹上的小屋', color: '#3A5A3A', isOfficial: true, set: 'ww', isOutside: true, specialText: 'Connect to roof' },
  { id: 'widows_walk', name: '寡婦步道', nameEn: 'Widow\'s Walk', floors: ['roof', 'upper'], type: 'event', symbol: 'E', doors: ['south', 'east', 'west'], description: '屋頂的步道', color: '#5A5A6A', isOfficial: true, set: 'ww', isOutside: true, specialText: '+Knowledge / -Speed' },
];

// ==================== ROOMS BY ID ====================
export const ROOMS_BY_ID: Record<string, Room> = ALL_ROOMS.reduce((acc, room) => {
  acc[room.id] = room;
  return acc;
}, {} as Record<string, Room>);

// ==================== ROOMS BY FLOOR ====================
export const GROUND_ROOMS = ALL_ROOMS.filter(r => r.floors.includes('ground'));
export const UPPER_ROOMS = ALL_ROOMS.filter(r => r.floors.includes('upper'));
export const BASEMENT_ROOMS = ALL_ROOMS.filter(r => r.floors.includes('basement'));
export const ROOF_ROOMS = ALL_ROOMS.filter(r => r.floors.includes('roof'));

// ==================== STARTING ROOMS ====================
export const STARTING_ROOMS = {
  entranceHall: ROOMS_BY_ID['entrance_hall'],
  basementLanding: ROOMS_BY_ID['basement_landing'],
  upperLanding: ROOMS_BY_ID['upper_landing'],
};

// ==================== ROOMS BY SET ====================
export const SECOND_EDITION_ROOMS = ALL_ROOMS.filter(r => r.set === '2nd');
export const WIDOWS_WALK_ROOMS = ALL_ROOMS.filter(r => r.set === 'ww');

// ==================== STATISTICS ====================
export const ROOM_STATS = {
  total: ALL_ROOMS.length,
  bySet: {
    '2nd': SECOND_EDITION_ROOMS.length,
    'ww': WIDOWS_WALK_ROOMS.length,
  },
  byFloor: {
    ground: GROUND_ROOMS.length,
    upper: UPPER_ROOMS.length,
    basement: BASEMENT_ROOMS.length,
    roof: ROOF_ROOMS.length,
  },
  byType: {
    omen: ALL_ROOMS.filter(r => r.type === 'omen').length,
    event: ALL_ROOMS.filter(r => r.type === 'event').length,
    item: ALL_ROOMS.filter(r => r.type === 'item').length,
    none: ALL_ROOMS.filter(r => r.type === 'none').length,
    landing: ALL_ROOMS.filter(r => r.type === 'landing').length,
    special: ALL_ROOMS.filter(r => r.type === 'special').length,
  },
};
