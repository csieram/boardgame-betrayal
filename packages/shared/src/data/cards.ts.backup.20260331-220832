export type CardType = 'event' | 'item' | 'omen';

export interface Card {
  id: string;
  type: CardType;
  name: string;
  description: string;
  icon: string; // SVG
  effect?: string;
  rollRequired?: {
    stat: 'speed' | 'might' | 'sanity' | 'knowledge';
    target: number;
  };
  success?: string;
  failure?: string;
}

// 事件卡
export const EVENT_CARDS: Card[] = [
  {
    id: 'event_1',
    type: 'event',
    name: '地板塌陷',
    description: '你腳下的地板突然塌陷！',
    icon: `<rect x="20" y="20" width="60" height="60" fill="#5A4A3A"/>
           <polygon points="50,40 30,70 70,70" fill="#2A1A0A"/>
           <circle cx="50" cy="55" r="8" fill="#1A0A00"/>`,
    rollRequired: { stat: 'speed', target: 4 },
    success: '你及時跳開，安全落地。',
    failure: '你摔了下去，失去 1 點體力。',
  },
  {
    id: 'event_2',
    type: 'event',
    name: '詭異的聲音',
    description: '牆壁裡傳來低語聲，似乎在呼喚你的名字。',
    icon: `<rect x="20" y="20" width="60" height="60" fill="#4A3A4A"/>
           <path d="M30 40 Q40 30 50 40 Q60 50 50 60 Q40 70 30 60" fill="none" stroke="#8B7B8B" stroke-width="2"/>
           <text x="35" y="50" font-size="20" fill="#A090A0">〰</text>`,
    rollRequired: { stat: 'sanity', target: 5 },
    success: '你保持冷靜，聲音消失了。',
    failure: '你嚇壞了，失去 1 點理智。',
  },
  {
    id: 'event_3',
    type: 'event',
    name: '隱藏的通道',
    description: '你發現了一個隱藏的通道！',
    icon: `<rect x="20" y="20" width="60" height="60" fill="#5A4A3A"/>
           <rect x="35" y="30" width="30" height="40" fill="#2A1A0A"/>
           <rect x="40" y="35" width="20" height="30" fill="#1A0A00"/>
           <path d="M45 50 L55 50 M50 45 L50 55" stroke="#FFD700" stroke-width="2"/>`,
    effect: '你可以立即移動到相鄰的任何一個已發現的房間。',
  },
  {
    id: 'event_4',
    type: 'event',
    name: '蜘蛛群',
    description: '一大群蜘蛛從天花板傾瀉而下！',
    icon: `<rect x="20" y="20" width="60" height="60" fill="#3A3A2A"/>
           <circle cx="35" cy="35" r="5" fill="#000"/>
           <line x1="35" y1="35" x2="25" y2="25" stroke="#000" stroke-width="1"/>
           <line x1="35" y1="35" x2="45" y2="25" stroke="#000" stroke-width="1"/>
           <line x1="35" y1="35" x2="25" y2="45" stroke="#000" stroke-width="1"/>
           <line x1="35" y1="35" x2="45" y2="45" stroke="#000" stroke-width="1"/>
           <circle cx="55" cy="50" r="4" fill="#000"/>
           <circle cx="45" cy="65" r="3" fill="#000"/>`,
    rollRequired: { stat: 'might', target: 4 },
    success: '你揮開蜘蛛，毫髮無傷。',
    failure: '你被蜘蛛咬傷，失去 1 點體力。',
  },
  {
    id: 'event_5',
    type: 'event',
    name: '古老的日記',
    description: '你發現一本古老的日記，記載著這棟房子的秘密。',
    icon: `<rect x="25" y="20" width="40" height="50" fill="#8B4513"/>
           <rect x="28" y="23" width="34" height="44" fill="#FFF8DC"/>
           <line x1="32" y1="30" x2="58" y2="30" stroke="#333" stroke-width="1"/>
           <line x1="32" y1="35" x2="58" y2="35" stroke="#333" stroke-width="1"/>
           <line x1="32" y1="40" x2="58" y2="40" stroke="#333" stroke-width="1"/>
           <line x1="32" y1="45" x2="50" y2="45" stroke="#333" stroke-width="1"/>`,
    rollRequired: { stat: 'knowledge', target: 4 },
    success: '你讀懂了日記，獲得 1 點知識。',
    failure: '文字太過模糊，你無法理解。',
  },
  {
    id: 'event_6',
    type: 'event',
    name: '幽靈顯現',
    description: '一個透明的身影飄過你面前。',
    icon: `<rect x="20" y="20" width="60" height="60" fill="#3A3A4A"/>
           <ellipse cx="50" cy="40" rx="12" ry="15" fill="#8B8B9B" opacity="0.5"/>
           <circle cx="46" cy="38" r="2" fill="#FFF"/>
           <circle cx="54" cy="38" r="2" fill="#FFF"/>
           <ellipse cx="50" cy="45" rx="3" ry="2" fill="#333" opacity="0.3"/>`,
    rollRequired: { stat: 'sanity', target: 6 },
    success: '你與幽靈對視，它似乎想告訴你什麼。',
    failure: '你嚇得尖叫，失去 2 點理智。',
  },
];

// 物品卡
export const ITEM_CARDS: Card[] = [
  {
    id: 'item_1',
    type: 'item',
    name: '十字架',
    description: '一個古老的銀製十字架。',
    icon: `<rect x="20" y="20" width="60" height="60" fill="#4A4A4A"/>
           <rect x="46" y="30" width="8" height="40" fill="#C0C0C0"/>
           <rect x="35" y="42" width="30" height="8" fill="#C0C0C0"/>
           <circle cx="50" cy="46" r="3" fill="#FFD700"/>`,
    effect: '對抗幽靈時，你的理智檢定 +2。',
  },
  {
    id: 'item_2',
    type: 'item',
    name: '醫療包',
    description: '破舊的醫療包，但還有一些繃帶。',
    icon: `<rect x="25" y="30" width="40" height="30" fill="#FFF" stroke="#DC143C" stroke-width="2"/>
           <rect x="35" y="38" width="20" height="14" fill="#DC143C"/>
           <text x="42" y="49" font-size="10" fill="#FFF">+</text>`,
    effect: '使用後恢復 2 點體力，然後丟棄。',
  },
  {
    id: 'item_3',
    type: 'item',
    name: '手槍',
    description: '一把老舊但還能用的左輪手槍。',
    icon: `<rect x="20" y="20" width="60" height="60" fill="#4A4A4A"/>
           <rect x="30" y="42" width="35" height="8" fill="#2A2A2A"/>
           <rect x="30" y="42" width="12" height="8" fill="#4A3728"/>
           <circle cx="55" cy="46" r="4" fill="#FFD700"/>
           <rect x="65" y="44" width="5" height="4" fill="#C0C0C0"/>`,
    effect: '攻擊時可以造成 2 點傷害（需消耗子彈）。',
  },
  {
    id: 'item_4',
    type: 'item',
    name: '蠟燭',
    description: '可以驅散黑暗的蠟燭。',
    icon: `<rect x="20" y="20" width="60" height="60" fill="#2A2A1A"/>
           <rect x="45" y="50" width="10" height="15" fill="#FFF8DC"/>
           <ellipse cx="50" cy="50" rx="5" ry="3" fill="#FFF8DC"/>
           <circle cx="50" cy="45" r="4" fill="#FFD700" opacity="0.8"/>
           <circle cx="50" cy="42" r="6" fill="#FFA500" opacity="0.4"/>`,
    effect: '在黑暗房間中，你的所有檢定 +1。',
  },
  {
    id: 'item_5',
    type: 'item',
    name: '地下室鑰匙',
    description: '生鏽的鑰匙，上面標著「禁止進入」。',
    icon: `<rect x="20" y="20" width="60" height="60" fill="#5A4A3A"/>
           <circle cx="40" cy="45" r="8" fill="#8B7355"/>
           <rect x="45" y="42" width="20" height="6" fill="#8B7355"/>
           <rect x="55" y="42" width="4" height="6" fill="#6B5B45"/>
           <rect x="60" y="42" width="4" height="6" fill="#6B5B45"/>`,
    effect: '可以打開鎖住的地下室門。',
  },
  // 武器
  {
    id: 'weapon_chainsaw',
    type: 'item',
    name: '電鋸',
    description: '一把沾滿血跡的電鋸，還能運作。',
    icon: `<rect x="20" y="20" width="60" height="60" fill="#4A3A3A"/>
           <rect x="30" y="40" width="30" height="12" fill="#8B4513"/>
           <rect x="60" y="38" width="15" height="16" fill="#C0C0C0"/>
           <rect x="35" y="44" width="20" height="4" fill="#A52A2A"/>`,
    effect: '攻擊時力量 +3。',
  },
  {
    id: 'weapon_axe',
    type: 'item',
    name: '斧頭',
    description: '一把鋒利的斧頭。',
    icon: `<rect x="20" y="20" width="60" height="60" fill="#4A4A4A"/>
           <rect x="45" y="30" width="6" height="35" fill="#8B4513"/>
           <polygon points="35,35 51,35 51,45 35,50" fill="#C0C0C0"/>`,
    effect: '攻擊時力量 +2。',
  },
  {
    id: 'weapon_knife',
    type: 'item',
    name: '匕首',
    description: '一把鋒利的匕首。',
    icon: `<rect x="20" y="20" width="60" height="60" fill="#3A3A3A"/>
           <rect x="48" y="35" width="4" height="25" fill="#4A3728"/>
           <polygon points="45,35 55,35 50,25" fill="#C0C0C0"/>`,
    effect: '攻擊時力量 +1。',
  },
];

// 預兆卡
export const OMEN_CARDS: Card[] = [
  {
    id: 'omen_1',
    type: 'omen',
    name: '染血的匕首',
    description: '一把古老的匕首，刀刃上還有乾涸的血跡。',
    icon: `<rect x="20" y="20" width="60" height="60" fill="#3A2A2A"/>
           <rect x="35" y="25" width="8" height="30" fill="#C0C0C0"/>
           <polygon points="39,25 35,15 43,15" fill="#C0C0C0"/>
           <rect x="33" y="50" width="12" height="8" fill="#4A3728"/>
           <path d="M43 35 L55 25" stroke="#8B0000" stroke-width="3"/>`,
    effect: '攻擊時傷害 +1。',
  },
  {
    id: 'omen_2',
    type: 'omen',
    name: '詭異的畫像',
    description: '畫中人的眼睛似乎在跟著你移動。',
    icon: `<rect x="25" y="15" width="40" height="50" fill="#4A3728"/>
           <rect x="28" y="18" width="34" height="44" fill="#8B7355"/>
           <ellipse cx="45" cy="35" rx="10" ry="12" fill="#F5DEB3"/>
           <circle cx="42" cy="33" r="2" fill="#333"/>
           <circle cx="48" cy="33" r="2" fill="#333"/>
           <path d="M42 42 Q45 45 48 42" stroke="#333" stroke-width="1" fill="none"/>`,
    effect: '每回合開始時，可以查看一個相鄰的未探索房間。',
  },
  {
    id: 'omen_3',
    type: 'omen',
    name: '破碎的鏡子',
    description: '鏡子碎裂成無數片，每片都反射著不同的景象。',
    icon: `<rect x="25" y="20" width="40" height="50" fill="#4A4A5A"/>
           <rect x="28" y="23" width="34" height="44" fill="#87CEEB" opacity="0.3"/>
           <line x1="28" y1="35" x2="62" y2="50" stroke="#FFF" stroke-width="1"/>
           <line x1="62" y1="30" x2="35" y2="67" stroke="#FFF" stroke-width="1"/>
           <line x1="30" y1="23" x2="55" y2="67" stroke="#FFF" stroke-width="1"/>`,
    effect: '當你受到傷害時，可以擲骰減少 1 點傷害。',
  },
  {
    id: 'omen_4',
    type: 'omen',
    name: '神秘的符咒',
    description: '一張寫滿未知符號的羊皮紙。',
    icon: `<rect x="25" y="25" width="40" height="45" fill="#F5DEB3"/>
           <text x="32" y="40" font-size="12" fill="#8B0000">☥</text>
           <text x="45" y="50" font-size="10" fill="#4B0082">✦</text>
           <text x="35" y="60" font-size="11" fill="#006400">❋</text>
           <circle cx="50" cy="35" r="3" fill="none" stroke="#8B0000"/>`,
    effect: '對抗超自然存在時，所有檢定 +1。',
  },
  {
    id: 'omen_5',
    type: 'omen',
    name: '狗靈',
    description: '一隻透明的狗跟著你，只有你能看見牠。',
    icon: `<rect x="20" y="20" width="60" height="60" fill="#3A3A4A"/>
           <ellipse cx="50" cy="50" rx="15" ry="10" fill="#8B8B9B" opacity="0.4"/>
           <circle cx="40" cy="45" r="6" fill="#8B8B9B" opacity="0.4"/>
           <ellipse cx="35" cy="42" rx="3" ry="2" fill="#8B8B9B" opacity="0.3"/>
           <circle cx="38" cy="44" r="1" fill="#FFF"/>
           <rect x="55" y="55" width="8" height="3" fill="#8B8B9B" opacity="0.4"/>`,
    effect: '你的速度 +1，並且可以感知附近的危險。',
  },
  {
    id: 'omen_6',
    type: 'omen',
    name: '家族戒指',
    description: '一枚刻著詭異紋章的戒指，戴上後你感到頭暈目眩。',
    icon: `<rect x="20" y="20" width="60" height="60" fill="#2A1A0A"/>
           <ellipse cx="50" cy="50" rx="18" ry="20" fill="none" stroke="#FFD700" stroke-width="4"/>
           <rect x="45" y="30" width="10" height="8" fill="#8B0000"/>
           <text x="47" y="37" font-size="6" fill="#FFD700">⚜</text>`,
    effect: '你的知識 +1，但理智檢定 -1。',
  },
  {
    id: 'omen_7',
    type: 'omen',
    name: '水晶球',
    description: '一個散發著詭異光芒的水晶球。',
    icon: `<circle cx="50" cy="45" r="20" fill="#E0FFFF" opacity="0.6"/>
           <circle cx="50" cy="45" r="15" fill="#FFF" opacity="0.4"/>
           <ellipse cx="50" cy="70" rx="15" ry="5" fill="#4A4A4A"/>`,
    effect: '每回合可以查看牌堆頂的一張卡。',
  },
  {
    id: 'omen_8',
    type: 'omen',
    name: '染血的匕首',
    description: '一把沾滿血跡的古老匕首。',
    icon: `<rect x="45" y="20" width="10" height="40" fill="#C0C0C0"/>
           <rect x="42" y="60" width="16" height="8" fill="#8B4513"/>
           <path d="M48 25 L50 20 L52 25" fill="#8B0000"/>`,
    effect: '攻擊時可以額外造成 1 點傷害。',
  },
  {
    id: 'omen_9',
    type: 'omen',
    name: '破碎的鏡子',
    description: '一面破碎的鏡子，碎片中似乎映出另一個世界。',
    icon: `<rect x="25" y="20" width="40" height="50" fill="#E0E0E0"/>
           <line x1="25" y1="45" x2="65" y2="35" stroke="#000" stroke-width="1"/>
           <line x1="35" y1="20" x2="45" y2="70" stroke="#000" stroke-width="1"/>
           <line x1="25" y1="60" x2="65" y2="50" stroke="#000" stroke-width="1"/>`,
    effect: '可以查看一個隨機的未發現房間。',
  },
  {
    id: 'omen_10',
    type: 'omen',
    name: '黑暗蠟燭',
    description: '一支燃燒著黑色火焰的蠟燭。',
    icon: `<rect x="45" y="40" width="10" height="25" fill="#F5DEB3"/>
           <ellipse cx="50" cy="40" rx="5" ry="8" fill="#000"/>
           <circle cx="50" cy="35" r="3" fill="#4B0082"/>`,
    effect: '作祟開始後，可以無視房間的負面效果一次。',
  },
];

export function drawCard(type: CardType): Card {
  let deck: Card[];
  switch (type) {
    case 'event':
      deck = EVENT_CARDS;
      break;
    case 'item':
      deck = ITEM_CARDS;
      break;
    case 'omen':
      deck = OMEN_CARDS;
      break;
    default:
      deck = EVENT_CARDS;
  }
  return deck[Math.floor(Math.random() * deck.length)];
}
