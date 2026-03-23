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

// Betrayal 3rd Edition - 6位角色（德文版官方數值）
// 數值來源: https://hexagamers.com/wp-content/uploads/2017/04/Betrayal-at-House-on-the-Hill-Character-Cards.jpg
export const CHARACTERS: Character[] = [
  {
    id: 'persephone',
    name: '珀瑟芬妮·福奇',
    nameEn: 'Persephone Fauci',
    age: 28,
    description: '一位冷靜沉著的科學家，總是用邏輯分析眼前的一切。',
    color: '#4169E1', // 藍色
    portraitSvg: '/gallery/characters/char-persephone-portrait.svg',
    fullSvg: '/gallery/characters/char-persephone-full.svg',
    stats: {
      speed: [5, 5],
      might: [3, 3],
      sanity: [4, 4],
      knowledge: [5, 5],
    },
    statTrack: {
      speed: [0, 2, 3, 4, 5, 6, 7, 8],    // 2,3,4,5*,6,7,7,8
      might: [0, 2, 3, 3, 4, 5, 6, 7],    // 2,3,3,4*,5,6,6,7
      sanity: [0, 1, 2, 3, 4, 5, 6, 7],   // 1,2,3,4*,5,5,6,7
      knowledge: [0, 3, 4, 5, 5, 5, 6, 7], // 3,4,5,5*,5,6,6,7
    },
  },
  {
    id: 'josef',
    name: '約瑟夫·比利-鮑勃·胡珀',
    nameEn: 'Josef Billy-Bob Hooper',
    age: 45,
    description: '來自南方的農夫，有著樸實的外表和堅強的意志。',
    color: '#DC143C', // 紅色
    portraitSvg: '/gallery/characters/char-josef-portrait.svg',
    fullSvg: '/gallery/characters/char-josef-full.svg',
    stats: {
      speed: [4, 4],
      might: [4, 4],
      sanity: [5, 5],
      knowledge: [3, 3],
    },
    statTrack: {
      speed: [0, 2, 3, 3, 4, 5, 6, 7],    // 2,3,3,4*,5,6,7,7
      might: [0, 3, 4, 4, 5, 6, 6, 8],    // 3,4,4,5*,6,6,7,8
      sanity: [0, 3, 4, 5, 5, 6, 6, 8],   // 3,4,5,5*,6,6,7,8
      knowledge: [0, 2, 3, 3, 4, 5, 5, 6], // 2,3,3,4*,5,5,6,6
    },
  },
  {
    id: 'ace',
    name: '艾斯·瓊斯',
    nameEn: 'Ace Jones',
    age: 32,
    description: '特技飛行員，喜歡冒險和刺激，從不拒絕挑戰。',
    color: '#228B22', // 綠色
    portraitSvg: '/gallery/characters/char-ace-portrait.svg',
    fullSvg: '/gallery/characters/char-ace-full.svg',
    stats: {
      speed: [5, 5],
      might: [3, 3],
      sanity: [4, 4],
      knowledge: [3, 3],
    },
    statTrack: {
      speed: [0, 3, 4, 4, 5, 6, 7, 8],    // 3,4,4,5*,6,7,7,8
      might: [0, 2, 3, 3, 4, 5, 5, 7],    // 2,3,3,4*,5,5,6,7
      sanity: [0, 3, 3, 4, 5, 6, 6, 8],   // 3,3,4,5*,6,6,7,8
      knowledge: [0, 2, 3, 3, 4, 5, 6, 7], // 2,3,3,4*,5,6,6,7
    },
  },
  {
    id: 'rochelle',
    name: '羅謝爾·門羅',
    nameEn: 'Rochelle Monroe',
    age: 38,
    description: '知名的靈異調查員，專門揭穿偽科學和超自然騙局。',
    color: '#9932CC', // 紫色
    portraitSvg: '/gallery/characters/char-rochelle-portrait.svg',
    fullSvg: '/gallery/characters/char-rochelle-full.svg',
    stats: {
      speed: [4, 4],
      might: [3, 3],
      sanity: [5, 5],
      knowledge: [4, 4],
    },
    statTrack: {
      speed: [0, 2, 3, 4, 4, 5, 6, 6],    // 2,3,4,4*,5,6,6,6
      might: [0, 2, 3, 3, 4, 4, 5, 6],    // 2,3,3,4*,4,5,6,6
      sanity: [0, 3, 4, 5, 6, 6, 6, 8],   // 3,4,5,6*,6,6,7,8
      knowledge: [0, 2, 3, 3, 4, 5, 6, 8], // 2,3,3,4*,5,6,7,8
    },
  },
  {
    id: 'anita',
    name: '安妮塔·赫南德茲',
    nameEn: 'Anita Hernandez',
    age: 26,
    description: '年輕的考古學家，對古代文明和神秘學有深入研究。',
    color: '#FFD700', // 黃色
    portraitSvg: '/gallery/characters/char-anita-portrait.svg',
    fullSvg: '/gallery/characters/char-anita-full.svg',
    stats: {
      speed: [5, 5],
      might: [3, 3],
      sanity: [4, 4],
      knowledge: [4, 4],
    },
    statTrack: {
      speed: [0, 3, 4, 5, 6, 6, 6, 7],    // 3,4,5,6*,6,6,7,7
      might: [0, 2, 3, 3, 4, 5, 5, 6],    // 2,3,3,4*,5,5,6,6
      sanity: [0, 3, 4, 4, 4, 5, 6, 7],   // 3,4,4,4*,5,6,7,7
      knowledge: [0, 2, 3, 3, 4, 5, 6, 7], // 2,3,3,4*,5,6,6,7
    },
  },
  {
    id: 'dan',
    name: '丹·阮醫生',
    nameEn: 'Dan Nguyen, M.D.',
    age: 52,
    description: '經驗豐富的醫生，在危急時刻總能保持冷靜。',
    color: '#F5F5F5', // 白色
    portraitSvg: '/gallery/characters/char-dan-portrait.svg',
    fullSvg: '/gallery/characters/char-dan-full.svg',
    stats: {
      speed: [4, 4],
      might: [3, 3],
      sanity: [4, 4],
      knowledge: [5, 5],
    },
    statTrack: {
      speed: [0, 2, 3, 3, 4, 5, 5, 7],    // 2,3,3,4*,5,5,6,7
      might: [0, 2, 3, 3, 4, 5, 6, 7],    // 2,3,3,4*,5,6,6,7
      sanity: [0, 2, 3, 4, 5, 5, 6, 7],   // 2,3,4,5*,5,6,7,7
      knowledge: [0, 3, 4, 5, 5, 6, 7, 8], // 3,4,5,5*,6,7,7,8
    },
  },
];
