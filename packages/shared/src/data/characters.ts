export interface CharacterStat {
  values: number[];  // 8個數值，從高到低
  startIndex: number; // 起始索引（0-based）
}

export interface Character {
  id: string;
  name: string;
  emoji: string;
  description: string;
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
    emoji: '👦',
    description: 'A young boy with a curious mind.',
    stats: {
      might: { values: [7, 5, 4, 4, 4, 3, 3, 2], startIndex: 2 },
      speed: { values: [5, 4, 4, 4, 3, 3, 2, 2], startIndex: 1 },
      sanity: { values: [6, 5, 4, 3, 3, 3, 2, 2], startIndex: 2 },
      knowledge: { values: [5, 5, 3, 4, 3, 3, 2, 2], startIndex: 2 },
    },
  },
  {
    id: 'peter_akimoto',
    name: 'Peter Akimoto',
    emoji: '👦',
    description: 'A clever boy who loves solving puzzles.',
    stats: {
      might: { values: [6, 5, 5, 3, 4, 3, 3, 2], startIndex: 3 },
      speed: { values: [6, 5, 4, 4, 4, 3, 3, 3], startIndex: 3 },
      sanity: { values: [6, 5, 4, 4, 3, 3, 3, 2], startIndex: 2 },
      knowledge: { values: [5, 5, 4, 3, 4, 3, 3, 2], startIndex: 3 },
    },
  },
  {
    id: 'vivian_lopez',
    name: 'Vivian Lopez',
    emoji: '👧',
    description: 'A smart girl who loves reading books.',
    stats: {
      might: { values: [4, 4, 4, 2, 3, 2, 2, 2], startIndex: 3 },
      speed: { values: [6, 5, 4, 4, 4, 3, 2, 2], startIndex: 3 },
      sanity: { values: [7, 6, 5, 4, 5, 4, 3, 3], startIndex: 3 },
      knowledge: { values: [8, 7, 6, 5, 5, 5, 4, 4], startIndex: 4 },
    },
  },
  {
    id: 'darrin_flash_williams',
    name: 'Darrin "Flash" Williams',
    emoji: '👦',
    description: 'The fastest kid in school.',
    stats: {
      might: { values: [6, 5, 3, 4, 3, 3, 2, 2], startIndex: 2 },
      speed: { values: [8, 7, 6, 6, 5, 5, 4, 4], startIndex: 2 },
      sanity: { values: [5, 4, 3, 3, 3, 2, 2, 1], startIndex: 2 },
      knowledge: { values: [5, 4, 3, 3, 3, 2, 2, 1], startIndex: 2 },
    },
  },
  {
    id: 'heather_granville',
    name: 'Heather Granville',
    emoji: '👩',
    description: 'A popular girl with hidden depths.',
    stats: {
      might: { values: [5, 4, 3, 3, 3, 2, 2, 2], startIndex: 2 },
      speed: { values: [6, 5, 4, 3, 4, 3, 3, 2], startIndex: 3 },
      sanity: { values: [6, 5, 4, 3, 4, 3, 2, 2], startIndex: 3 },
      knowledge: { values: [8, 7, 6, 5, 5, 4, 4, 3], startIndex: 4 },
    },
  },
  {
    id: 'jenny_leclerc',
    name: 'Jenny LeClerc',
    emoji: '👩',
    description: 'A quiet girl with a strong will.',
    stats: {
      might: { values: [4, 4, 3, 3, 3, 2, 2, 1], startIndex: 2 },
      speed: { values: [8, 6, 5, 4, 4, 4, 3, 2], startIndex: 3 },
      sanity: { values: [6, 5, 4, 5, 4, 3, 2, 2], startIndex: 3 },
      knowledge: { values: [6, 5, 4, 3, 3, 3, 2, 2], startIndex: 3 },
    },
  },
  {
    id: 'zoe_ingstrom',
    name: 'Zoe Ingstrom',
    emoji: '👧',
    description: 'A sweet girl who loves animals.',
    stats: {
      might: { values: [5, 4, 3, 3, 3, 3, 2, 2], startIndex: 2 },
      speed: { values: [5, 4, 4, 4, 3, 3, 3, 2], startIndex: 3 },
      sanity: { values: [7, 6, 5, 5, 4, 4, 3, 3], startIndex: 3 },
      knowledge: { values: [5, 5, 4, 3, 3, 3, 2, 2], startIndex: 3 },
    },
  },
  {
    id: 'ox_bellows',
    name: 'Ox Bellows',
    emoji: '👨',
    description: 'A strong man who works at the docks.',
    stats: {
      might: { values: [8, 7, 6, 5, 5, 5, 4, 4], startIndex: 3 },
      speed: { values: [5, 5, 3, 4, 3, 3, 2, 2], startIndex: 2 },
      sanity: { values: [5, 4, 3, 3, 2, 2, 1, 1], startIndex: 2 },
      knowledge: { values: [4, 3, 2, 3, 2, 2, 1, 1], startIndex: 2 },
    },
  },
  {
    id: 'father_rhinehardt',
    name: 'Father Rhinehardt',
    emoji: '👨',
    description: 'A priest seeking to understand the darkness.',
    stats: {
      might: { values: [4, 4, 2, 3, 2, 2, 1, 1], startIndex: 2 },
      speed: { values: [5, 4, 4, 3, 3, 2, 2, 1], startIndex: 3 },
      sanity: { values: [7, 6, 6, 5, 5, 4, 3, 3], startIndex: 3 },
      knowledge: { values: [6, 6, 5, 4, 4, 4, 3, 2], startIndex: 3 },
    },
  },
  {
    id: 'professor_longfellow',
    name: 'Professor Longfellow',
    emoji: '👨',
    description: 'A professor fascinated by the occult.',
    stats: {
      might: { values: [4, 3, 2, 2, 2, 2, 1, 1], startIndex: 2 },
      speed: { values: [4, 4, 2, 3, 2, 2, 1, 1], startIndex: 2 },
      sanity: { values: [6, 6, 5, 4, 5, 4, 3, 3], startIndex: 3 },
      knowledge: { values: [8, 7, 6, 6, 5, 5, 4, 4], startIndex: 4 },
    },
  },
  {
    id: 'missy_dubourde',
    name: 'Missy Dubourde',
    emoji: '👩',
    description: 'A girl who loves sports and adventure.',
    stats: {
      might: { values: [5, 4, 3, 4, 3, 3, 2, 2], startIndex: 2 },
      speed: { values: [6, 5, 4, 4, 4, 3, 2, 2], startIndex: 3 },
      sanity: { values: [5, 4, 3, 3, 3, 2, 2, 1], startIndex: 2 },
      knowledge: { values: [6, 5, 5, 4, 4, 3, 3, 2], startIndex: 3 },
    },
  },
  {
    id: 'madame_zostra',
    name: 'Madame Zostra',
    emoji: '👩',
    description: 'A mysterious woman with psychic abilities.',
    stats: {
      might: { values: [6, 5, 4, 4, 4, 3, 3, 2], startIndex: 2 },
      speed: { values: [5, 5, 3, 4, 3, 3, 2, 2], startIndex: 2 },
      sanity: { values: [7, 6, 5, 5, 4, 4, 3, 3], startIndex: 3 },
      knowledge: { values: [7, 6, 5, 4, 4, 4, 3, 2], startIndex: 3 },
    },
  },
];
