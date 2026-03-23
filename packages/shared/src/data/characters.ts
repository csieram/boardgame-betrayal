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
  // 兼容舊代碼
  avatar?: string;
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
    id: 'persephone',
    name: '波瑟芬妮·佛奇',
    nameEn: 'Persephone Fauci',
    age: 29,
    description: '一位神秘的考古學家，專門研究古代神秘儀式。她相信這棟房子隱藏著某種古老的秘密。',
    color: '#8B4513',
    portraitSvg: '/gallery/characters/char-persephone-portrait.svg',
    fullSvg: '/gallery/characters/char-persephone-full.svg',
    stats: {
      speed: [3, 3],
      might: [2, 2],
      sanity: [4, 4],
      knowledge: [5, 5],
    },
    statTrack: {
      speed: [0, 3, 3, 4, 5, 6, 6, 7],
      might: [0, 2, 2, 3, 3, 4, 4, 5],
      sanity: [0, 4, 5, 5, 6, 6, 7, 8],
      knowledge: [0, 5, 5, 5, 6, 6, 7, 8],
    },
  },
  {
    id: 'josef',
    name: '約瑟夫·比利·鮑伯·胡珀',
    nameEn: 'Josef Billy-Bob Hooper',
    age: 45,
    description: '一位粗獷的獵人，聲稱見過各種超自然生物。他的直覺總是異常準確。',
    color: '#228B22',
    portraitSvg: '/gallery/characters/char-josef-portrait.svg',
    fullSvg: '/gallery/characters/char-josef-full.svg',
    stats: {
      speed: [4, 4],
      might: [4, 4],
      sanity: [3, 3],
      knowledge: [2, 2],
    },
    statTrack: {
      speed: [0, 4, 4, 5, 5, 6, 7, 7],
      might: [0, 4, 5, 5, 6, 6, 7, 8],
      sanity: [0, 3, 3, 4, 4, 5, 6, 6],
      knowledge: [0, 2, 3, 3, 4, 4, 5, 5],
    },
  },
  {
    id: 'ace',
    name: '艾斯·瓊斯',
    nameEn: 'Ace Jones',
    age: 32,
    description: '一位魅力十足的騙子，靠著牌技和口才維生。他的運氣似乎總是在最關鍵的時刻轉向。',
    color: '#DC143C',
    portraitSvg: '/gallery/characters/char-ace-portrait.svg',
    fullSvg: '/gallery/characters/char-ace-full.svg',
    stats: {
      speed: [5, 5],
      might: [3, 3],
      sanity: [3, 3],
      knowledge: [2, 2],
    },
    statTrack: {
      speed: [0, 5, 5, 6, 6, 7, 7, 8],
      might: [0, 3, 3, 4, 4, 5, 6, 6],
      sanity: [0, 3, 4, 4, 5, 5, 6, 7],
      knowledge: [0, 2, 3, 3, 4, 5, 5, 6],
    },
  },
  {
    id: 'rochelle',
    name: '羅雪兒·夢露',
    nameEn: 'Rochelle Monroe',
    age: 26,
    description: '一位充滿熱情的靈異調查員，經營著一個小有名氣的超自然部落格。她來這裡是為了尋找下一個爆紅的故事。',
    color: '#9370DB',
    portraitSvg: '/gallery/characters/char-rochelle-portrait.svg',
    fullSvg: '/gallery/characters/char-rochelle-full.svg',
    stats: {
      speed: [4, 4],
      might: [2, 2],
      sanity: [4, 4],
      knowledge: [3, 3],
    },
    statTrack: {
      speed: [0, 4, 4, 5, 6, 6, 7, 8],
      might: [0, 2, 3, 3, 4, 4, 5, 5],
      sanity: [0, 4, 4, 5, 6, 6, 7, 7],
      knowledge: [0, 3, 4, 4, 5, 5, 6, 7],
    },
  },
  {
    id: 'anita',
    name: '安妮塔·赫南德茲',
    nameEn: 'Anita Hernandez',
    age: 38,
    description: '一位經驗豐富的房地產經紀人，專門處理「問題房產」。她見過很多奇怪的房子，但這棟是最糟糕的。',
    color: '#FF69B4',
    portraitSvg: '/gallery/characters/char-anita-portrait.svg',
    fullSvg: '/gallery/characters/char-anita-full.svg',
    stats: {
      speed: [3, 3],
      might: [3, 3],
      sanity: [4, 4],
      knowledge: [3, 3],
    },
    statTrack: {
      speed: [0, 3, 4, 4, 5, 5, 6, 7],
      might: [0, 3, 3, 4, 4, 5, 6, 6],
      sanity: [0, 4, 4, 5, 5, 6, 7, 7],
      knowledge: [0, 3, 4, 4, 5, 6, 6, 7],
    },
  },
  {
    id: 'dan',
    name: '丹·阮醫師',
    nameEn: 'Dan Nguyen M.D.',
    age: 52,
    description: '一位冷靜沉著的精神科醫師，專門研究集體歇斯底里和幻覺現象。他來這裡是為了證明一切都有科學解釋。',
    color: '#4682B4',
    portraitSvg: '/gallery/characters/char-dan-portrait.svg',
    fullSvg: '/gallery/characters/char-dan-full.svg',
    stats: {
      speed: [2, 2],
      might: [2, 2],
      sanity: [5, 5],
      knowledge: [5, 5],
    },
    statTrack: {
      speed: [0, 2, 3, 3, 4, 4, 5, 6],
      might: [0, 2, 2, 3, 3, 4, 5, 5],
      sanity: [0, 5, 5, 6, 6, 7, 7, 8],
      knowledge: [0, 5, 5, 6, 6, 7, 8, 8],
    },
  },
];
