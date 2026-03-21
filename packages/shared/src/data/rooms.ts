// 樓層類型
export type Floor = 'ground' | 'upper' | 'basement';

// 符號類型
export type SymbolType = 'E' | 'I' | 'O' | null;

// 房間類型
export interface Room {
  id: string;
  name: string;
  nameEn: string;
  floor: Floor;
  symbol: SymbolType;
  doors: ('north' | 'south' | 'east' | 'west')[];
  description: string;
  color: string;
  icon: string;
  isOfficial: boolean;
  notes?: string;
  // Gallery SVG 路徑
  gallerySvg?: string;
  // 向後兼容
  omenRequired?: boolean;
  eventRequired?: boolean;
  type?: string;
}

// 門的 SVG
const doorN = `<rect x="42" y="0" width="16" height="8" fill="#4A3728" stroke="#2A1A0A" stroke-width="1"/>`;
const doorS = `<rect x="42" y="92" width="16" height="8" fill="#4A3728" stroke="#2A1A0A" stroke-width="1"/>`;
const doorE = `<rect x="92" y="42" width="8" height="16" fill="#4A3728" stroke="#2A1A0A" stroke-width="1"/>`;
const doorW = `<rect x="0" y="42" width="8" height="16" fill="#4A3728" stroke="#2A1A0A" stroke-width="1"/>`;

// 地板
const floor = (c: string) => `<rect x="8" y="8" width="84" height="84" fill="${c}" stroke="#2A2A2A" stroke-width="2"/>`;

// 符號標記
const symE = `<circle cx="85" cy="15" r="6" fill="#4A9A4A"/><text x="85" y="18" text-anchor="middle" font-size="8" fill="#FFF">E</text>`;
const symI = `<circle cx="85" cy="15" r="6" fill="#3D7AB8"/><text x="85" y="18" text-anchor="middle" font-size="8" fill="#FFF">I</text>`;
const symO = `<circle cx="85" cy="15" r="6" fill="#8B4DA8"/><text x="85" y="18" text-anchor="middle" font-size="8" fill="#FFF">O</text>`;

// ==================== BASEMENT (17 rooms) ====================
export const BASEMENT_ROOMS: Room[] = [
  { id: 'abandoned_room', name: '廢棄房間', nameEn: 'Abandoned Room', floor: 'basement', symbol: 'O', doors: ['north'], description: '被遺棄的房間', color: '#4A4A4A', icon: `${floor('#5A5A5A')}${doorN}${symO}`, isOfficial: true },
  { id: 'arsenal', name: '軍械庫', nameEn: 'Arsenal', floor: 'basement', symbol: 'I', doors: ['north', 'east'], description: '存放武器的房間', color: '#4A4A3A', icon: `${floor('#5A5A4A')}${doorN}${doorE}${symI}`, isOfficial: true },
  { id: 'bloody_room', name: '血跡房間', nameEn: 'Bloody Room', floor: 'basement', symbol: 'E', doors: ['north'], description: '滿是血跡的房間', color: '#5A3A3A', icon: `${floor('#6B4B4B')}${doorN}${symE}`, isOfficial: true },
  { id: 'catacombs', name: '地下墓穴', nameEn: 'Catacombs', floor: 'basement', symbol: null, doors: ['north', 'east', 'south'], description: '古老的地下墓穴', color: '#3A3A3A', icon: `${floor('#4A4A4A')}${doorN}${doorE}${doorS}`, isOfficial: true },
  { id: 'cavern', name: '洞穴', nameEn: 'Cavern', floor: 'basement', symbol: 'E', doors: ['north'], description: '天然形成的洞穴', color: '#2A2A2A', icon: `${floor('#3A3A3A')}${doorN}${symE}`, isOfficial: true },
  { id: 'charred_room', name: '燒焦房間', nameEn: 'Charred Room', floor: 'basement', symbol: 'O', doors: ['north'], description: '被火燒過的房間', color: '#3A2A2A', icon: `${floor('#4A3A3A')}${doorN}${symO}`, isOfficial: true },
  { id: 'chasm', name: '深淵', nameEn: 'Chasm', floor: 'basement', symbol: null, doors: ['north', 'east'], description: '地板裂開的深淵', color: '#1A1A1A', icon: `${floor('#0A0A0A')}${doorN}${doorE}`, isOfficial: true },
  { id: 'crypt', name: '墓穴', nameEn: 'Crypt', floor: 'basement', symbol: 'I', doors: ['north'], description: '存放石棺的墓穴', color: '#3A3A4A', icon: `${floor('#4A4A5A')}${doorN}${symI}`, isOfficial: true, gallerySvg: '/gallery/rooms/crypt.svg' },
  { id: 'dungeon', name: '地牢', nameEn: 'Dungeon', floor: 'basement', symbol: null, doors: ['north'], description: '陰森的地牢', color: '#2A2A3A', icon: `${floor('#3A3A4A')}${doorN}`, isOfficial: true, gallerySvg: '/gallery/rooms/dungeon.svg' },
  { id: 'furnace_room', name: '鍋爐房', nameEn: 'Furnace Room', floor: 'basement', symbol: 'O', doors: ['north', 'east'], description: '燃燒的鍋爐房', color: '#4A3A2A', icon: `${floor('#5A4A3A')}${doorN}${doorE}${symO}`, isOfficial: true, gallerySvg: '/gallery/rooms/furnace_room.svg' },
  { id: 'graveyard', name: '墓地', nameEn: 'Graveyard', floor: 'basement', symbol: null, doors: ['north', 'east'], description: '荒廢的墓地', color: '#3A4A3A', icon: `${floor('#4A5A4A')}${doorN}${doorE}`, isOfficial: true, gallerySvg: '/gallery/rooms/graveyard.svg' },
  { id: 'larder', name: '儲藏室', nameEn: 'Larder', floor: 'basement', symbol: 'I', doors: ['north'], description: '存放食物的儲藏室', color: '#4A4A3A', icon: `${floor('#5A5A4A')}${doorN}${symI}`, isOfficial: true },
  { id: 'operating_lab', name: '手術實驗室', nameEn: 'Operating Laboratory', floor: 'basement', symbol: 'I', doors: ['north'], description: '進行手術的實驗室', color: '#4A5A4A', icon: `${floor('#5A6A6A')}${doorN}${symI}`, isOfficial: true },
  { id: 'pentagram_chamber', name: '五芒星密室', nameEn: 'Pentagram Chamber', floor: 'basement', symbol: 'O', doors: ['north'], description: '畫著五芒星的密室', color: '#3A1A4A', icon: `${floor('#4A2A5A')}${doorN}${symO}`, isOfficial: true, gallerySvg: '/gallery/rooms/pentagram_chamber.svg' },
  { id: 'research_lab', name: '研究實驗室', nameEn: 'Research Laboratory', floor: 'basement', symbol: 'I', doors: ['north'], description: '研究用的實驗室', color: '#4A5A5A', icon: `${floor('#5A6A6A')}${doorN}${symI}`, isOfficial: true },
  { id: 'servants_quarters', name: '僕人房', nameEn: 'Servants Quarters', floor: 'basement', symbol: null, doors: ['north', 'east'], description: '僕人居住的地方', color: '#4A4A4A', icon: `${floor('#5A5A5A')}${doorN}${doorE}`, isOfficial: true },
  { id: 'underground_lake', name: '地下湖', nameEn: 'Underground Lake', floor: 'basement', symbol: null, doors: ['north'], description: '地下的湖泊', color: '#2A3A4A', icon: `${floor('#3A4A5A')}${doorN}`, isOfficial: true },
  { id: 'vault', name: '金庫', nameEn: 'Vault', floor: 'basement', symbol: 'I', doors: ['north'], description: '存放貴重物品的金庫', color: '#4A4A3A', icon: `${floor('#5A5A4A')}${doorN}${symI}`, isOfficial: true },
];

// ==================== GROUND FLOOR (12 rooms) ====================
export const GROUND_ROOMS: Room[] = [
  { id: 'ballroom', name: '舞廳', nameEn: 'Ballroom', floor: 'ground', symbol: null, doors: ['north', 'south'], description: '華麗的舞廳', color: '#4A4A6A', icon: `${floor('#5A5A7A')}${doorN}${doorS}`, isOfficial: true, gallerySvg: '/gallery/rooms/ballroom.svg' },
  { id: 'chapel', name: '禮拜堂', nameEn: 'Chapel', floor: 'ground', symbol: 'O', doors: ['north'], description: '小型的禮拜堂', color: '#4A4A5A', icon: `${floor('#5A5A6A')}${doorN}${symO}`, isOfficial: true, gallerySvg: '/gallery/rooms/chapel.svg' },
  { id: 'dining_room', name: '餐廳', nameEn: 'Dining Room', floor: 'ground', symbol: 'I', doors: ['north', 'east'], description: '長餐桌的餐廳', color: '#5A4A3A', icon: `${floor('#6B5B4B')}${doorN}${doorE}${symI}`, isOfficial: true, gallerySvg: '/gallery/rooms/dining_room.svg' },
  { id: 'entrance_hall', name: '入口大廳', nameEn: 'Entrance Hall', floor: 'ground', symbol: null, doors: ['north', 'south'], description: '房屋的入口', color: '#7B6354', icon: `${floor('#6B5344')}${doorN}${doorS}`, isOfficial: true, gallerySvg: '/gallery/rooms/entrance_hall.svg' },
  { id: 'foyer', name: '玄關', nameEn: 'Foyer', floor: 'ground', symbol: null, doors: ['north', 'south'], description: '房屋的玄關', color: '#8B7355', icon: `${floor('#6B5344')}${doorN}${doorS}`, isOfficial: true, gallerySvg: '/gallery/rooms/foyer.svg' },
  { id: 'garden', name: '花園', nameEn: 'Garden', floor: 'ground', symbol: 'E', doors: ['north', 'east'], description: '戶外花園', color: '#2F4F2F', icon: `${floor('#3A5A3A')}${doorN}${doorE}${symE}`, isOfficial: true, gallerySvg: '/gallery/rooms/garden.svg' },
  { id: 'gymnasium', name: '健身房', nameEn: 'Gymnasium', floor: 'ground', symbol: 'E', doors: ['north', 'east'], description: '室內健身房', color: '#5A6A5A', icon: `${floor('#6A7A6A')}${doorN}${doorE}${symE}`, isOfficial: true, gallerySvg: '/gallery/rooms/gymnasium.svg' },
  { id: 'kitchen', name: '廚房', nameEn: 'Kitchen', floor: 'ground', symbol: 'I', doors: ['north', 'east'], description: '家庭廚房', color: '#4A6741', icon: `${floor('#5A5A4A')}${doorN}${doorE}${symI}`, isOfficial: true, gallerySvg: '/gallery/rooms/kitchen.svg' },
  { id: 'library', name: '圖書室', nameEn: 'Library', floor: 'ground', symbol: 'I', doors: ['north', 'east'], description: '滿是書的圖書室', color: '#5D4E37', icon: `${floor('#6B5B4B')}${doorN}${doorE}${symI}`, isOfficial: true, gallerySvg: '/gallery/rooms/library.svg' },
  { id: 'patio', name: '庭院', nameEn: 'Patio', floor: 'ground', symbol: null, doors: ['north', 'east'], description: '戶外庭院', color: '#6A6A5A', icon: `${floor('#7A7A6A')}${doorN}${doorE}`, isOfficial: true, gallerySvg: '/gallery/rooms/patio.svg' },
  { id: 'storeroom', name: '儲物間', nameEn: 'Storeroom', floor: 'ground', symbol: 'I', doors: ['north'], description: '存放雜物的房間', color: '#4A4A4A', icon: `${floor('#5A5A5A')}${doorN}${symI}`, isOfficial: true },
  { id: 'tower', name: '塔樓', nameEn: 'Tower', floor: 'ground', symbol: null, doors: ['north'], description: '高聳的塔樓', color: '#556B8B', icon: `${floor('#5A6B7B')}${doorN}`, isOfficial: true, gallerySvg: '/gallery/rooms/tower.svg' },
];

// ==================== UPPER FLOOR (10 rooms) ====================
export const UPPER_ROOMS: Room[] = [
  { id: 'attic', name: '閣樓', nameEn: 'Attic', floor: 'upper', symbol: 'I', doors: ['north'], description: '屋頂的閣樓', color: '#4A4A3A', icon: `${floor('#5A5A4A')}${doorN}${symI}`, isOfficial: true, gallerySvg: '/gallery/rooms/attic.svg' },
  { id: 'balcony', name: '陽台', nameEn: 'Balcony', floor: 'upper', symbol: null, doors: ['north', 'south'], description: '俯瞰的陽台', color: '#6A6A5A', icon: `${floor('#7A7A6A')}${doorN}${doorS}`, isOfficial: true, gallerySvg: '/gallery/rooms/balcony.svg' },
  { id: 'bedroom', name: '臥室', nameEn: 'Bedroom', floor: 'upper', symbol: 'O', doors: ['north'], description: '普通的臥室', color: '#6B4B4B', icon: `${floor('#5A3B3B')}${doorN}${symO}`, isOfficial: true, gallerySvg: '/gallery/rooms/bedroom.svg' },
  { id: 'gallery', name: '畫廊', nameEn: 'Gallery', floor: 'upper', symbol: null, doors: ['north', 'east'], description: '展示畫作的畫廊', color: '#5A4A4A', icon: `${floor('#6A5A5A')}${doorN}${doorE}`, isOfficial: true },
  { id: 'junk_room', name: '雜物間', nameEn: 'Junk Room', floor: 'upper', symbol: 'O', doors: ['north'], description: '堆滿雜物的房間', color: '#4A4A3A', icon: `${floor('#5A5A4A')}${doorN}${symO}`, isOfficial: true },
  { id: 'master_bedroom', name: '主臥室', nameEn: 'Master Bedroom', floor: 'upper', symbol: 'O', doors: ['north', 'east'], description: '華麗的主臥室', color: '#7B4B4B', icon: `${floor('#6B4B4B')}${doorN}${doorE}${symO}`, isOfficial: true, gallerySvg: '/gallery/rooms/master_bedroom.svg' },
  { id: 'nursery', name: '嬰兒房', nameEn: 'Nursery', floor: 'upper', symbol: 'O', doors: ['north'], description: '嬰兒的房間', color: '#8B6B7B', icon: `${floor('#9B7B8B')}${doorN}${symO}`, isOfficial: true, gallerySvg: '/gallery/rooms/nursery.svg' },
  { id: 'walkway', name: '走道', nameEn: 'Walkway', floor: 'upper', symbol: null, doors: ['north', 'south'], description: '連接的走道', color: '#5A5A5A', icon: `${floor('#6A6A6A')}${doorN}${doorS}`, isOfficial: true },
  // 額外的 Library, Tower, Research Lab 也可以在二樓
  { id: 'library_upper', name: '圖書室(二樓)', nameEn: 'Library', floor: 'upper', symbol: 'I', doors: ['north'], description: '二樓的圖書室', color: '#5D4E37', icon: `${floor('#6B5B4B')}${doorN}${symI}`, isOfficial: true },
  { id: 'tower_upper', name: '塔樓(二樓)', nameEn: 'Tower', floor: 'upper', symbol: null, doors: ['north'], description: '二樓的塔樓', color: '#556B8B', icon: `${floor('#5A6B7B')}${doorN}`, isOfficial: true },
];

// ==================== MULTI-FLOOR ROOMS ====================
export const MULTI_FLOOR_ROOMS: Room[] = [
  { id: 'grand_staircase', name: '大樓梯', nameEn: 'Grand Staircase', floor: 'ground', symbol: null, doors: ['north', 'south'], description: '連接一樓和二樓', color: '#8B7355', icon: `${floor('#6B5344')}${doorN}${doorS}`, isOfficial: true, notes: 'connects Ground <-> Upper' },
  { id: 'stairs_from_basement', name: '地下室樓梯', nameEn: 'Stairs from Basement', floor: 'basement', symbol: null, doors: ['north'], description: '通往一樓', color: '#4A4A3A', icon: `${floor('#5A5A4A')}${doorN}`, isOfficial: true },
  { id: 'stairs_from_ground', name: '一樓樓梯(下)', nameEn: 'Stairs from Ground', floor: 'ground', symbol: null, doors: ['north'], description: '通往地下室', color: '#6B5344', icon: `${floor('#5A4334')}${doorN}`, isOfficial: true },
  { id: 'stairs_from_upper', name: '二樓樓梯', nameEn: 'Stairs from Upper', floor: 'upper', symbol: null, doors: ['north'], description: '通往一樓', color: '#5A4A4A', icon: `${floor('#4A3A3A')}${doorN}`, isOfficial: true },
  { id: 'mystic_elevator', name: '神秘電梯', nameEn: 'Mystic Elevator', floor: 'ground', symbol: null, doors: ['north'], description: '可移動到任何樓層', color: '#4A4A6A', icon: `${floor('#5A5A7A')}${doorN}`, isOfficial: true, notes: 'moves to any floor' },
  { id: 'collapsed_room', name: '坍塌房間', nameEn: 'Collapsed Room', floor: 'upper', symbol: null, doors: ['north'], description: '會掉到地下室', color: '#5A5A4A', icon: `${floor('#6A6A5A')}${doorN}`, isOfficial: true, notes: 'drop to B' },
];

// 所有官方房間（用於遊戲）
export const OFFICIAL_ROOMS: Room[] = [
  ...BASEMENT_ROOMS,
  ...GROUND_ROOMS,
  ...UPPER_ROOMS,
  ...MULTI_FLOOR_ROOMS,
];

// 向後兼容
export const ROOMS = OFFICIAL_ROOMS;
export const ALL_ROOMS = OFFICIAL_ROOMS;

// 牌堆管理類
export class RoomDeck {
  private ground: Room[] = [];
  private upper: Room[] = [];
  private basement: Room[] = [];
  private drawn: Set<string> = new Set();

  constructor() {
    this.reset();
  }

  reset() {
    // 只使用官方房間
    this.ground = [...GROUND_ROOMS.filter(r => r.type !== 'entrance'), ...MULTI_FLOOR_ROOMS.filter(r => r.floor === 'ground')];
    this.upper = [...UPPER_ROOMS, ...MULTI_FLOOR_ROOMS.filter(r => r.floor === 'upper')];
    this.basement = [...BASEMENT_ROOMS, ...MULTI_FLOOR_ROOMS.filter(r => r.floor === 'basement')];
    this.drawn.clear();
    this.shuffleAll();
  }

  private shuffleAll() {
    this.ground = this.shuffle(this.ground);
    this.upper = this.shuffle(this.upper);
    this.basement = this.shuffle(this.basement);
  }

  private shuffle<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  draw(floor: Floor): Room | null {
    let deck: Room[];
    switch (floor) {
      case 'ground': deck = this.ground; break;
      case 'upper': deck = this.upper; break;
      case 'basement': deck = this.basement; break;
      default: return null;
    }

    const index = deck.findIndex(r => !this.drawn.has(r.id));
    if (index === -1) return null;

    const room = deck[index];
    this.drawn.add(room.id);
    return room;
  }

  getCounts() {
    return {
      ground: this.ground.filter(r => !this.drawn.has(r.id)).length,
      upper: this.upper.filter(r => !this.drawn.has(r.id)).length,
      basement: this.basement.filter(r => !this.drawn.has(r.id)).length,
    };
  }

  getTotalRemaining() {
    const counts = this.getCounts();
    return counts.ground + counts.upper + counts.basement;
  }
}

// 舊的隨機函數（保留向後兼容）
export function getRandomRoom(): Room {
  const available = OFFICIAL_ROOMS.filter(r => r.type !== 'entrance');
  return available[Math.floor(Math.random() * available.length)];
}
