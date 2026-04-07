export interface CharacterStat {
  values: number[];  // 8個數值，從低到高（index 0 是骷髏頭位置，最低值）
  startIndex: number; // 起始索引（0-based）
}

export interface Character {
  id: string;
  name: string;
  nameEn: string;
  emoji: string;
  age: number;
  description: string;
  color: string;
  portraitSvg: string;
  fullSvg?: string;
  stats: {
    might: CharacterStat;
    speed: CharacterStat;
    sanity: CharacterStat;
    knowledge: CharacterStat;
  };
}

export const CHARACTERS: Character[] = [
  {
    id: 'brandon_jaspers',
    name: 'Brandon Jaspers',
    nameEn: 'Brandon Jaspers',
    emoji: '👦',
    age: 12,
    description: 'A young boy with a curious mind.',
    color: '#8B4513',
    portraitSvg: '/characters/brandon_jaspers.svg',
    fullSvg: '/characters/brandon_jaspers.svg',
    stats: {
      might: { values: [2, 3, 3, 4, 5, 6, 6, 7], startIndex: 3 },
      speed: { values: [3, 4, 4, 4, 5, 6, 7, 8], startIndex: 2 },
      sanity: { values: [3, 3, 4, 5, 5, 6, 6, 7], startIndex: 2 },
      knowledge: { values: [2, 3, 3, 4, 5, 5, 6, 6], startIndex: 2 },
    },
  },
  {
    id: 'peter_akimoto',
    name: 'Peter Akimoto',
    nameEn: 'Peter Akimoto',
    emoji: '👦',
    age: 13,
    description: 'A clever boy who loves solving puzzles.',
    color: '#2F4F4F',
    portraitSvg: '/characters/peter_akimoto.svg',
    fullSvg: '/characters/peter_akimoto.svg',
    stats: {
      might: { values: [2, 3, 3, 3, 4, 5, 5, 6], startIndex: 3 },
      speed: { values: [3, 3, 4, 4, 5, 5, 6, 6], startIndex: 3 },
      sanity: { values: [2, 3, 3, 4, 4, 5, 5, 6], startIndex: 3 },
      knowledge: { values: [2, 3, 3, 3, 4, 4, 5, 5], startIndex: 3 },
    },
  },
  {
    id: 'vivian_lopez',
    name: 'Vivian Lopez',
    nameEn: 'Vivian Lopez',
    emoji: '👧',
    age: 11,
    description: 'A smart girl who loves reading books.',
    color: '#4B0082',
    portraitSvg: '/characters/vivian_lopez.svg',
    fullSvg: '/characters/vivian_lopez.svg',
    stats: {
      might: { values: [2, 2, 3, 2, 3, 4, 4, 4], startIndex: 3 },
      speed: { values: [2, 2, 3, 4, 4, 5, 5, 6], startIndex: 3 },
      sanity: { values: [3, 3, 4, 4, 5, 5, 6, 7], startIndex: 3 },
      knowledge: { values: [4, 4, 5, 5, 6, 6, 7, 8], startIndex: 3 },
    },
  },
  {
    id: 'darrin_flash_williams',
    name: 'Darrin "Flash" Williams',
    nameEn: 'Darrin "Flash" Williams',
    emoji: '👦',
    age: 14,
    description: 'The fastest kid in school.',
    color: '#FF4500',
    portraitSvg: '/characters/darrin_williams.svg',
    fullSvg: '/characters/darrin_williams.svg',
    stats: {
      might: { values: [2, 2, 3, 3, 4, 4, 5, 6], startIndex: 3 },
      speed: { values: [4, 4, 5, 6, 6, 7, 7, 8], startIndex: 3 },
      sanity: { values: [1, 2, 2, 3, 3, 3, 4, 5], startIndex: 3 },
      knowledge: { values: [1, 2, 2, 3, 3, 4, 4, 5], startIndex: 3 },
    },
  },
  {
    id: 'heather_granville',
    name: 'Heather Granville',
    nameEn: 'Heather Granville',
    emoji: '👩',
    age: 18,
    description: 'A popular girl with hidden depths.',
    color: '#FFD700',
    portraitSvg: '/characters/heather_granville.svg',
    fullSvg: '/characters/heather_granville.svg',
    stats: {
      might: { values: [2, 2, 3, 3, 4, 4, 5, 5], startIndex: 3 },
      speed: { values: [2, 3, 3, 3, 4, 4, 5, 6], startIndex: 3 },
      sanity: { values: [2, 2, 3, 3, 4, 4, 5, 6], startIndex: 3 },
      knowledge: { values: [3, 4, 4, 5, 5, 6, 7, 8], startIndex: 3 },
    },
  },
  {
    id: 'jenny_leclerc',
    name: 'Jenny LeClerc',
    nameEn: 'Jenny LeClerc',
    emoji: '👩',
    age: 17,
    description: 'A quiet girl with a strong will.',
    color: '#800080',
    portraitSvg: '/characters/jenny_leclerc.svg',
    fullSvg: '/characters/jenny_leclerc.svg',
    stats: {
      might: { values: [1, 2, 2, 3, 3, 4, 4, 4], startIndex: 3 },
      speed: { values: [2, 3, 4, 4, 5, 6, 6, 8], startIndex: 3 },
      sanity: { values: [2, 2, 3, 5, 4, 4, 5, 6], startIndex: 3 },
      knowledge: { values: [2, 2, 3, 3, 4, 4, 5, 6], startIndex: 3 },
    },
  },
  {
    id: 'zoe_ingstrom',
    name: 'Zoe Ingstrom',
    nameEn: 'Zoe Ingstrom',
    emoji: '👧',
    age: 10,
    description: 'A sweet girl who loves animals.',
    color: '#FF69B4',
    portraitSvg: '/characters/zoe_ingstrom.svg',
    fullSvg: '/characters/zoe_ingstrom.svg',
    stats: {
      might: { values: [2, 2, 3, 3, 3, 4, 4, 5], startIndex: 3 },
      speed: { values: [2, 3, 3, 4, 4, 4, 5, 5], startIndex: 3 },
      sanity: { values: [3, 3, 4, 5, 5, 6, 6, 7], startIndex: 3 },
      knowledge: { values: [2, 2, 3, 3, 4, 4, 5, 5], startIndex: 3 },
    },
  },
  {
    id: 'ox_bellows',
    name: 'Ox Bellows',
    nameEn: 'Ox Bellows',
    emoji: '👨',
    age: 25,
    description: 'A strong man who works at the docks.',
    color: '#8B0000',
    portraitSvg: '/characters/ox_bellows.svg',
    fullSvg: '/characters/ox_bellows.svg',
    stats: {
      might: { values: [4, 4, 5, 5, 6, 6, 7, 8], startIndex: 3 },
      speed: { values: [2, 2, 3, 3, 4, 4, 5, 5], startIndex: 3 },
      sanity: { values: [1, 1, 2, 3, 3, 4, 4, 5], startIndex: 3 },
      knowledge: { values: [1, 1, 2, 2, 3, 3, 3, 4], startIndex: 3 },
    },
  },
  {
    id: 'father_rhinehardt',
    name: 'Father Rhinehardt',
    nameEn: 'Father Rhinehardt',
    emoji: '👨',
    age: 60,
    description: 'A priest seeking to understand the darkness.',
    color: '#191970',
    portraitSvg: '/characters/father_rhinehardt.svg',
    fullSvg: '/characters/father_rhinehardt.svg',
    stats: {
      might: { values: [1, 1, 2, 2, 3, 3, 4, 4], startIndex: 3 },
      speed: { values: [1, 2, 2, 3, 3, 4, 4, 5], startIndex: 3 },
      sanity: { values: [3, 3, 4, 5, 5, 6, 6, 7], startIndex: 3 },
      knowledge: { values: [2, 3, 4, 4, 5, 5, 6, 6], startIndex: 3 },
    },
  },
  {
    id: 'professor_longfellow',
    name: 'Professor Longfellow',
    nameEn: 'Professor Longfellow',
    emoji: '👨',
    age: 65,
    description: 'A professor fascinated by the occult.',
    color: '#556B2F',
    portraitSvg: '/characters/professor_longfellow.svg',
    fullSvg: '/characters/professor_longfellow.svg',
    stats: {
      might: { values: [1, 1, 2, 2, 2, 3, 3, 4], startIndex: 3 },
      speed: { values: [1, 1, 2, 2, 3, 3, 4, 4], startIndex: 3 },
      sanity: { values: [3, 3, 4, 4, 5, 5, 6, 6], startIndex: 3 },
      knowledge: { values: [4, 4, 5, 5, 6, 6, 7, 8], startIndex: 3 },
    },
  },
  {
    id: 'missy_dubourde',
    name: 'Missy Dubourde',
    nameEn: 'Missy Dubourde',
    emoji: '👩',
    age: 16,
    description: 'A girl from the South with a cheerful disposition.',
    color: '#FF6347',
    portraitSvg: '/characters/missy_dubourde.svg',
    fullSvg: '/characters/missy_dubourde.svg',
    stats: {
      might: { values: [2, 2, 3, 3, 4, 4, 4, 5], startIndex: 3 },
      speed: { values: [2, 2, 3, 4, 4, 5, 5, 6], startIndex: 3 },
      sanity: { values: [1, 2, 2, 3, 3, 4, 4, 5], startIndex: 3 },
      knowledge: { values: [2, 3, 3, 4, 4, 5, 5, 6], startIndex: 3 },
    },
  },
  {
    id: 'madame_zostra',
    name: 'Madame Zostra',
    nameEn: 'Madame Zostra',
    emoji: '👩',
    age: 45,
    description: 'A mysterious woman who reads fortunes.',
    color: '#4B0082',
    portraitSvg: '/characters/madame_zostra.svg',
    fullSvg: '/characters/madame_zostra.svg',
    stats: {
      might: { values: [2, 3, 3, 4, 4, 5, 5, 6], startIndex: 3 },
      speed: { values: [2, 2, 3, 3, 4, 4, 5, 5], startIndex: 3 },
      sanity: { values: [3, 3, 4, 5, 5, 6, 6, 7], startIndex: 3 },
      knowledge: { values: [2, 3, 4, 4, 5, 5, 6, 7], startIndex: 3 },
    },
  },
];
