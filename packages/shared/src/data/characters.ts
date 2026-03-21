export interface Character {
  id: string;
  name: string;
  nameEn: string;
  age: number;
  description: string;
  color: string;
  // Gallery SVG 路徑
  portraitSvg?: string;
  fullSvg?: string;
  // 屬性: 初始值, 當前值
  stats: {
    speed: [number, number];      // 速度
    might: [number, number];      // 力量
    sanity: [number, number];     // 理智
    knowledge: [number, number];  // 知識
  };
  // 屬性軌道（用於升降）
  statTrack: {
    speed: number[];
    might: number[];
    sanity: number[];
    knowledge: number[];
  };
}

export const CHARACTERS: Character[] = [
  {
    id: 'missy',
    name: '米西·杜波依斯',
    nameEn: 'Missy Dubois',
    age: 9,
    description: '一個看似天真無邪的小女孩，但眼神中藏著不屬於這個年齡的智慧。',
    color: '#FF69B4',
    portraitSvg: '/gallery/characters/char-missy-portrait.svg',
    fullSvg: '/gallery/characters/char-missy-full.svg',
    stats: {
      speed: [3, 3],
      might: [2, 2],
      sanity: [4, 4],
      knowledge: [3, 3],
    },
    statTrack: {
      speed: [0, 3, 4, 5, 6, 6, 7, 7],
      might: [0, 2, 3, 3, 3, 4, 5, 6],
      sanity: [0, 4, 5, 5, 5, 6, 7, 8],
      knowledge: [0, 3, 4, 4, 4, 5, 6, 6],
    },
  },
  {
    id: 'zoe',
    name: '柔伊·卡斯特羅',
    nameEn: 'Zoe Castro',
    age: 21,
    description: '大學生，主修超自然現象研究，對這棟房子有種奇怪的熟悉感。',
    color: '#9370DB',
    portraitSvg: '/gallery/characters/char-zoe-portrait.svg',
    fullSvg: '/gallery/characters/char-zoe.svg',
    stats: {
      speed: [4, 4],
      might: [2, 2],
      sanity: [3, 3],
      knowledge: [5, 5],
    },
    statTrack: {
      speed: [0, 4, 4, 4, 5, 6, 7, 8],
      might: [0, 2, 2, 3, 3, 4, 4, 5],
      sanity: [0, 3, 4, 5, 5, 6, 6, 7],
      knowledge: [0, 5, 5, 5, 5, 6, 7, 8],
    },
  },
  {
    id: 'brandon',
    name: '布蘭登·凱恩',
    nameEn: 'Brandon Kane',
    age: 35,
    description: '前軍人，體格強壯，但這棟房子裡的東西讓他開始懷疑自己的勇氣。',
    color: '#4682B4',
    portraitSvg: '/gallery/characters/char-brandon.svg',
    fullSvg: '/gallery/characters/full-brandon.svg',
    stats: {
      speed: [3, 3],
      might: [5, 5],
      sanity: [2, 2],
      knowledge: [2, 2],
    },
    statTrack: {
      speed: [0, 3, 3, 4, 5, 6, 7, 8],
      might: [0, 5, 5, 6, 6, 7, 8, 8],
      sanity: [0, 2, 3, 3, 4, 5, 5, 6],
      knowledge: [0, 2, 3, 3, 4, 4, 5, 6],
    },
  },
  {
    id: 'vivian',
    name: '薇薇安·羅培茲',
    nameEn: 'Vivian Lopez',
    age: 42,
    description: '靈媒，聲稱能與死者溝通。這棟房子的靈魂特別...吵雜。',
    color: '#DC143C',
    portraitSvg: '/gallery/characters/char-vivian.svg',
    fullSvg: '/gallery/characters/full-vivian.svg',
    stats: {
      speed: [3, 3],
      might: [2, 2],
      sanity: [5, 5],
      knowledge: [4, 4],
    },
    statTrack: {
      speed: [0, 3, 4, 4, 4, 5, 6, 6],
      might: [0, 2, 2, 3, 3, 3, 4, 5],
      sanity: [0, 5, 5, 6, 6, 7, 8, 8],
      knowledge: [0, 4, 4, 5, 5, 6, 6, 7],
    },
  },
  {
    id: 'peter',
    name: '彼得·艾金森',
    nameEn: 'Peter Akimoto',
    age: 58,
    description: '退休警探，相信邏輯與證據。但這棟房子裡，邏輯似乎不管用。',
    color: '#8B4513',
    portraitSvg: '/gallery/characters/char-peter.svg',
    fullSvg: '/gallery/characters/full-peter.svg',
    stats: {
      speed: [3, 3],
      might: [3, 3],
      sanity: [4, 4],
      knowledge: [4, 4],
    },
    statTrack: {
      speed: [0, 3, 3, 3, 4, 5, 6, 7],
      might: [0, 3, 3, 4, 5, 5, 6, 7],
      sanity: [0, 4, 4, 5, 5, 6, 6, 7],
      knowledge: [0, 4, 5, 5, 5, 6, 7, 7],
    },
  },
  {
    id: 'madame',
    name: '薩拉·貝利夫人',
    nameEn: 'Madame Zostra',
    age: 67,
    description: '神秘的算命師，她的塔羅牌早就預言了這場噩夢。',
    color: '#4B0082',
    portraitSvg: '/gallery/characters/char-madame.svg',
    fullSvg: '/gallery/characters/full-madame.svg',
    stats: {
      speed: [2, 2],
      might: [2, 2],
      sanity: [5, 5],
      knowledge: [5, 5],
    },
    statTrack: {
      speed: [0, 2, 3, 3, 4, 5, 5, 6],
      might: [0, 2, 3, 3, 4, 4, 5, 5],
      sanity: [0, 5, 5, 6, 6, 7, 8, 8],
      knowledge: [0, 5, 5, 5, 6, 6, 7, 8],
    },
  },
];
