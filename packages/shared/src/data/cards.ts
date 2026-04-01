export type CardType = 'event' | 'item' | 'omen';

export interface Card {
  id: string;
  type: CardType;
  name: string;
  nameEn?: string;
  description: string;
  descriptionEn?: string;
  icon: string; // SVG
  effect?: string;
  effectEn?: string;
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

// 物品卡 - Betrayal at House on the Hill 2nd Edition (22張官方道具卡)
export const ITEM_CARDS: Card[] = [
  {
    id: 'item_angels_feather',
    type: 'item',
    name: '天使之羽',
    nameEn: "Angel's Feather",
    description: '握著它讓你感到平靜。',
    descriptionEn: 'Holding it gives you a feeling of peace.',
    icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="10" width="80" height="80" fill="#F5F5DC" rx="5"/>
      <path d="M50 75 Q30 55 35 35 Q40 20 50 25 Q60 20 65 35 Q70 55 50 75" fill="#FFF" stroke="#DDD" stroke-width="1"/>
      <line x1="50" y1="25" x2="50" y2="70" stroke="#E0E0E0" stroke-width="1"/>
      <line x1="40" y1="35" x2="60" y2="35" stroke="#E0E0E0" stroke-width="0.5"/>
      <line x1="38" y1="45" x2="62" y2="45" stroke="#E0E0E0" stroke-width="0.5"/>
      <line x1="40" y1="55" x2="60" y2="55" stroke="#E0E0E0" stroke-width="0.5"/>
      <circle cx="50" cy="72" r="3" fill="#FFD700" opacity="0.6"/>
    </svg>`,
    effect: '當需要進行特質檢定時，可埋葬此卡選擇 0-8 作為結果。',
    effectEn: 'When required to make a trait roll, may bury to choose number 0-8 as result.',
  },
  {
    id: 'item_brooch',
    type: 'item',
    name: '胸針',
    nameEn: 'Brooch',
    description: '觸感冰涼，卻莫名令人感到安慰。',
    descriptionEn: 'Icy to the touch, but somehow comforting.',
    icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="10" width="80" height="80" fill="#E8E8E8" rx="5"/>
      <ellipse cx="50" cy="50" rx="25" ry="20" fill="#87CEEB" stroke="#4682B4" stroke-width="2"/>
      <ellipse cx="50" cy="50" rx="18" ry="14" fill="#B0E0E6"/>
      <circle cx="50" cy="50" r="8" fill="#4682B4"/>
      <circle cx="50" cy="50" r="4" fill="#87CEEB"/>
      <path d="M50 30 L50 20 M65 35 L72 28 M70 50 L80 50 M65 65 L72 72 M50 70 L50 80 M35 65 L28 72 M30 50 L20 50 M35 35 L28 28" stroke="#C0C0C0" stroke-width="2"/>
    </svg>`,
    effect: '每當受到物理或精神傷害時，可改為承受一般傷害。',
    effectEn: 'Whenever you take Physical or Mental damage, may take it as General damage.',
  },
  {
    id: 'item_chainsaw',
    type: 'item',
    name: '電鋸',
    nameEn: 'Chainsaw',
    description: '它有啟動按鈕——真方便！',
    descriptionEn: 'It has a start button - how convenient!',
    icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="10" width="80" height="80" fill="#4A3A3A" rx="5"/>
      <rect x="25" y="42" width="35" height="16" fill="#8B4513" rx="2"/>
      <rect x="60" y="38" width="20" height="24" fill="#A9A9A9" rx="2"/>
      <rect x="62" y="40" width="16" height="20" fill="#C0C0C0" rx="1"/>
      <rect x="30" y="46" width="25" height="8" fill="#654321"/>
      <circle cx="70" cy="50" r="6" fill="#FF4500"/>
      <circle cx="70" cy="50" r="3" fill="#FFD700"/>
      <rect x="28" y="44" width="4" height="12" fill="#333"/>
    </svg>`,
    effect: '攻擊時，額外擲一顆骰子。',
    effectEn: 'When attacking, add one die to attack.',
  },
  {
    id: 'item_creepy_doll',
    type: 'item',
    name: '詭異娃娃',
    nameEn: 'Creepy Doll',
    description: '它的眼睛出奇地柔軟……而且帶著評判的意味。',
    descriptionEn: 'Its eyes are oddly soft... and judgmental.',
    icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="10" width="80" height="80" fill="#F5F5F5" rx="5"/>
      <circle cx="50" cy="40" r="18" fill="#FFE4C4" stroke="#DEB887" stroke-width="1"/>
      <circle cx="44" cy="38" r="4" fill="#4682B4"/>
      <circle cx="56" cy="38" r="4" fill="#4682B4"/>
      <circle cx="44" cy="37" r="1.5" fill="#FFF"/>
      <circle cx="56" cy="37" r="1.5" fill="#FFF"/>
      <ellipse cx="50" cy="46" rx="4" ry="2" fill="#FFB6C1"/>
      <path d="M35 55 Q50 65 65 55" stroke="#8B4513" stroke-width="8" fill="none"/>
      <ellipse cx="50" cy="72" rx="20" ry="15" fill="#FF69B4"/>
      <path d="M35 70 L35 85 M65 70 L65 85" stroke="#FFE4C4" stroke-width="6" stroke-linecap="round"/>
      <circle cx="50" cy="25" r="8" fill="#8B4513"/>
    </svg>`,
    effect: '每回合一次，重擲特質檢定的所有骰子，然後失去 1 點理智。',
    effectEn: 'Once per turn, reroll all dice on trait roll, then lose 1 Sanity.',
  },
  {
    id: 'item_crossbow',
    type: 'item',
    name: '十字弓',
    nameEn: 'Crossbow',
    description: '雖然老舊，但很有效。',
    descriptionEn: 'Old, but effective.',
    icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="10" width="80" height="80" fill="#5A4A3A" rx="5"/>
      <path d="M25 50 Q50 25 75 50" stroke="#8B4513" stroke-width="4" fill="none"/>
      <rect x="45" y="35" width="10" height="35" fill="#654321" rx="2"/>
      <rect x="48" y="30" width="4" height="45" fill="#4A3728"/>
      <line x1="30" y1="50" x2="70" y2="50" stroke="#C0C0C0" stroke-width="2"/>
      <polygon points="68,48 75,50 68,52" fill="#C0C0C0"/>
    </svg>`,
    effect: '可攻擊同一板塊或相鄰板塊的任何角色。擲速度檢定並+1顆骰子。若失敗，不承受傷害。',
    effectEn: 'Attack any character on your tile or adjacent. Roll Speed with +1 die. If lose, take no damage.',
  },
  {
    id: 'item_dynamite',
    type: 'item',
    name: '炸藥',
    nameEn: 'Dynamite',
    description: '它應該還算穩定。',
    descriptionEn: "It's probably still stable.",
    icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="10" width="80" height="80" fill="#8B4513" rx="5"/>
      <rect x="30" y="40" width="40" height="20" fill="#DC143C" rx="2"/>
      <rect x="32" y="42" width="36" height="16" fill="#FF4500" rx="1"/>
      <text x="38" y="54" font-size="10" fill="#FFF" font-weight="bold">TNT</text>
      <line x1="50" y1="40" x2="50" y2="25" stroke="#8B4513" stroke-width="3"/>
      <circle cx="50" cy="22" r="4" fill="#FFD700"/>
      <path d="M52 20 L55 15 M48 20 L45 15" stroke="#FF4500" stroke-width="1"/>
    </svg>`,
    effect: '埋葬此卡選擇一個板塊。該板塊上所有人進行速度檢定：4+無事，0-3承受4點物理傷害。',
    effectEn: 'Bury to choose tile. Everyone on tile makes Speed roll: 4+ nothing, 0-3 take 4 Physical damage.',
  },
  {
    id: 'item_first_aid_kit',
    type: 'item',
    name: '急救包',
    nameEn: 'First Aid Kit',
    description: '裡面有適合每個人的東西。',
    descriptionEn: 'Something for everyone.',
    icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="10" width="80" height="80" fill="#F5F5F5" rx="5"/>
      <rect x="25" y="35" width="50" height="30" fill="#FFF" stroke="#DC143C" stroke-width="2" rx="3"/>
      <rect x="28" y="38" width="44" height="24" fill="#FFF"/>
      <rect x="45" y="42" width="10" height="16" fill="#DC143C"/>
      <rect x="40" y="47" width="20" height="6" fill="#DC143C"/>
      <circle cx="75" cy="30" r="8" fill="#32CD32"/>
      <path d="M75 26 L75 34 M71 30 L79 30" stroke="#FFF" stroke-width="2"/>
    </svg>`,
    effect: '埋葬此卡治癒所有臨界特質。可對同一板塊的其他探險者使用。',
    effectEn: 'Bury to heal all critical traits. May use on another explorer on your tile.',
  },
  {
    id: 'item_flashlight',
    type: 'item',
    name: '手電筒',
    nameEn: 'Flashlight',
    description: '警告：請勿直射眼睛。',
    descriptionEn: 'Caution: Do not point at eyes.',
    icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="10" width="80" height="80" fill="#2A2A1A" rx="5"/>
      <rect x="45" y="55" width="10" height="20" fill="#333" rx="2"/>
      <rect x="42" y="35" width="16" height="20" fill="#C0C0C0" rx="2"/>
      <ellipse cx="50" cy="35" rx="10" ry="5" fill="#FFD700" opacity="0.8"/>
      <polygon points="30,35 42,25 42,45" fill="#FFD700" opacity="0.3"/>
      <polygon points="70,35 58,25 58,45" fill="#FFD700" opacity="0.3"/>
      <circle cx="50" cy="65" r="3" fill="#32CD32"/>
    </svg>`,
    effect: '在事件中，特質檢定額外擲2顆骰子。',
    effectEn: 'During Events, roll 2 extra dice on trait rolls.',
  },
  {
    id: 'item_gun',
    type: 'item',
    name: '槍',
    nameEn: 'Gun',
    description: '已經上滿子彈。',
    descriptionEn: 'Fully loaded.',
    icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="10" width="80" height="80" fill="#4A4A4A" rx="5"/>
      <rect x="25" y="45" width="45" height="10" fill="#2A2A2A" rx="2"/>
      <rect x="25" y="45" width="15" height="10" fill="#4A3728"/>
      <rect x="70" y="42" width="12" height="16" fill="#C0C0C0" rx="2"/>
      <circle cx="76" cy="50" r="4" fill="#FFD700"/>
      <rect x="35" y="47" width="20" height="2" fill="#555"/>
    </svg>`,
    effect: '可攻擊視線內的任何目標。擲速度檢定。若失敗，不承受傷害。',
    effectEn: 'Attack any target in line of sight. Roll Speed. If lose, take no damage.',
  },
  {
    id: 'item_headphones',
    type: 'item',
    name: '耳機',
    nameEn: 'Headphones',
    description: '它們沒有連接任何東西，但仍然播放著音樂。',
    descriptionEn: "They aren't connected to anything, but they still play a tune.",
    icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="10" width="80" height="80" fill="#2A2A3A" rx="5"/>
      <path d="M30 50 Q50 25 70 50" stroke="#333" stroke-width="4" fill="none"/>
      <rect x="25" y="45" width="12" height="15" fill="#4A4A5A" rx="3"/>
      <rect x="63" y="45" width="12" height="15" fill="#4A4A5A" rx="3"/>
      <circle cx="31" cy="52" r="4" fill="#FF69B4"/>
      <circle cx="69" cy="52" r="4" fill="#FF69B4"/>
      <path d="M35 40 Q50 35 65 40" stroke="#FF69B4" stroke-width="1" fill="none" opacity="0.5"/>
      <path d="M38 35 Q50 30 62 35" stroke="#87CEEB" stroke-width="1" fill="none" opacity="0.5"/>
    </svg>`,
    effect: '每當受到精神傷害時，減少1點。',
    effectEn: 'Whenever you take Mental damage, reduce by 1.',
  },
  {
    id: 'item_leather_jacket',
    type: 'item',
    name: '皮夾克',
    nameEn: 'Leather Jacket',
    description: '它非常重。你不確定它是用什麼動物的皮製成的。',
    descriptionEn: "It's very heavy. You aren't sure what kind of animal it's from.",
    icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="10" width="80" height="80" fill="#4A3728" rx="5"/>
      <path d="M30 30 L35 80 L65 80 L70 30 Q50 35 30 30" fill="#654321" stroke="#4A3728" stroke-width="2"/>
      <line x1="50" y1="35" x2="50" y2="80" stroke="#4A3728" stroke-width="1"/>
      <rect x="38" y="40" width="8" height="2" fill="#333"/>
      <rect x="54" y="40" width="8" height="2" fill="#333"/>
      <rect x="38" y="55" width="8" height="2" fill="#333"/>
      <rect x="54" y="55" width="8" height="2" fill="#333"/>
      <path d="M30 30 L25 50 L32 55 M70 30 L75 50 L68 55" stroke="#654321" stroke-width="4" fill="none"/>
    </svg>`,
    effect: '防禦攻擊時，額外擲一顆骰子。',
    effectEn: 'Roll extra die when defending against attack.',
  },
  {
    id: 'item_lucky_coin',
    type: 'item',
    name: '幸運幣',
    nameEn: 'Lucky Coin',
    description: '每次翻轉它，上面的圖案都會改變。',
    descriptionEn: 'The face changes every time you flip it.',
    icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="10" width="80" height="80" fill="#F5F5DC" rx="5"/>
      <circle cx="50" cy="50" r="28" fill="#FFD700" stroke="#DAA520" stroke-width="2"/>
      <circle cx="50" cy="50" r="22" fill="#FFD700" stroke="#DAA520" stroke-width="1"/>
      <text x="50" y="45" font-size="12" fill="#B8860B" text-anchor="middle">?</text>
      <path d="M38 55 Q50 65 62 55" stroke="#B8860B" stroke-width="2" fill="none"/>
      <circle cx="35" cy="35" r="3" fill="#FFD700" opacity="0.5"/>
      <circle cx="65" cy="65" r="3" fill="#FFD700" opacity="0.5"/>
    </svg>`,
    effect: '每回合一次，重擲所有空白骰子。每次重擲出現空白，失去1點理智。',
    effectEn: 'Once per turn, reroll all blank dice. For each blank on reroll, take 1 Mental damage.',
  },
  {
    id: 'item_machete',
    type: 'item',
    name: '砍刀',
    nameEn: 'Machete',
    description: '依然鋒利無比。',
    descriptionEn: 'Still razor sharp.',
    icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="10" width="80" height="80" fill="#4A4A4A" rx="5"/>
      <path d="M35 65 L40 35 Q60 30 65 50 Q70 70 35 65" fill="#C0C0C0" stroke="#888" stroke-width="1"/>
      <rect x="32" y="58" width="8" height="15" fill="#4A3728" rx="2"/>
      <line x1="42" y1="40" x2="58" y2="55" stroke="#888" stroke-width="0.5"/>
      <line x1="45" y1="38" x2="60" y2="52" stroke="#888" stroke-width="0.5"/>
    </svg>`,
    effect: '攻擊時，檢定結果+1。',
    effectEn: 'When attacking, add 1 to result of roll.',
  },
  {
    id: 'item_magic_camera',
    type: 'item',
    name: '魔法相機',
    nameEn: 'Magic Camera',
    description: '喀嚓！',
    descriptionEn: 'Click!',
    icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="10" width="80" height="80" fill="#4A4A4A" rx="5"/>
      <rect x="25" y="35" width="50" height="35" fill="#333" rx="3"/>
      <rect x="28" y="38" width="44" height="29" fill="#2A2A2A"/>
      <circle cx="50" cy="52" r="12" fill="#444" stroke="#666" stroke-width="2"/>
      <circle cx="50" cy="52" r="8" fill="#222"/>
      <circle cx="50" cy="52" r="4" fill="#4682B4" opacity="0.6"/>
      <circle cx="68" cy="42" r="3" fill="#FF4500"/>
      <rect x="30" y="32" width="10" height="4" fill="#666"/>
      <path d="M40 48 L45 52 L40 56" stroke="#87CEEB" stroke-width="1" fill="none" opacity="0.5"/>
    </svg>`,
    effect: '可使用理智值進行知識檢定。',
    effectEn: 'May use Sanity to make Knowledge rolls.',
  },
  {
    id: 'item_map',
    type: 'item',
    name: '地圖',
    nameEn: 'Map',
    description: '部分區域不斷變化。',
    descriptionEn: 'Parts of it keep shifting.',
    icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="10" width="80" height="80" fill="#F5DEB3" rx="5"/>
      <rect x="20" y="20" width="60" height="60" fill="#FFF8DC" stroke="#8B4513" stroke-width="1"/>
      <path d="M25 30 L35 25 L45 32 L55 28 L65 35 L75 30" stroke="#8B4513" stroke-width="1" fill="none"/>
      <path d="M25 50 L40 45 L50 52 L60 48 L75 55" stroke="#A0522D" stroke-width="1" fill="none"/>
      <path d="M30 70 L45 65 L55 72 L70 68" stroke="#CD853F" stroke-width="1" fill="none"/>
      <circle cx="35" cy="40" r="3" fill="#DC143C"/>
      <rect x="50" y="55" width="8" height="6" fill="#8B4513" opacity="0.5"/>
      <path d="M25 25 L30 20 M70 75 L75 70" stroke="#666" stroke-width="1"/>
    </svg>`,
    effect: '埋葬此卡將探險者放置在任何板塊上。',
    effectEn: 'Bury to place explorer on any tile.',
  },
  {
    id: 'item_mirror',
    type: 'item',
    name: '鏡子',
    nameEn: 'Mirror',
    description: '鏡中的面孔更加平靜，也更加睿智。',
    descriptionEn: 'The face in the mirror is calmer, and more knowing.',
    icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="10" width="80" height="80" fill="#E8E8E8" rx="5"/>
      <rect x="25" y="20" width="50" height="60" fill="#C0C0C0" rx="5"/>
      <rect x="30" y="25" width="40" height="50" fill="#E0FFFF" opacity="0.6"/>
      <ellipse cx="50" cy="50" rx="15" ry="20" fill="#F5F5F5" opacity="0.5"/>
      <circle cx="45" cy="48" r="3" fill="#87CEEB" opacity="0.6"/>
      <circle cx="55" cy="48" r="3" fill="#87CEEB" opacity="0.6"/>
      <path d="M47 56 Q50 58 53 56" stroke="#999" stroke-width="1" fill="none"/>
      <circle cx="50" cy="35" r="4" fill="#FFD700" opacity="0.4"/>
    </svg>`,
    effect: '埋葬此卡治癒知識和理智。',
    effectEn: 'Bury to heal Knowledge and Sanity.',
  },
  {
    id: 'item_mystical_stopwatch',
    type: 'item',
    name: '神秘懷錶',
    nameEn: 'Mystical Stopwatch',
    description: '當你啟動它時，指針會向後走。',
    descriptionEn: 'When you start it, the hands go backwards.',
    icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="10" width="80" height="80" fill="#2A2A1A" rx="5"/>
      <circle cx="50" cy="50" r="28" fill="#FFD700" stroke="#B8860B" stroke-width="3"/>
      <circle cx="50" cy="50" r="24" fill="#FFF8DC"/>
      <circle cx="50" cy="50" r="2" fill="#333"/>
      <line x1="50" y1="50" x2="50" y2="32" stroke="#333" stroke-width="2"/>
      <line x1="50" y1="50" x2="62" y2="50" stroke="#8B0000" stroke-width="2"/>
      <text x="50" y="28" font-size="6" fill="#666" text-anchor="middle">12</text>
      <text x="50" y="75" font-size="6" fill="#666" text-anchor="middle">6</text>
      <text x="28" y="52" font-size="6" fill="#666" text-anchor="middle">9</text>
      <text x="72" y="52" font-size="6" fill="#666" text-anchor="middle">3</text>
      <path d="M40 40 L45 45" stroke="#666" stroke-width="1"/>
      <path d="M60 40 L55 45" stroke="#666" stroke-width="1"/>
    </svg>`,
    effect: '埋葬此卡以進行額外回合（僅在作祟開始後）。',
    effectEn: 'Bury to take another turn (only after haunt has started).',
  },
  {
    id: 'item_necklace_of_teeth',
    type: 'item',
    name: '牙齒項鍊',
    nameEn: 'Necklace of Teeth',
    description: '大部分甚至不是人類的牙齒。',
    descriptionEn: "Most of them aren't even human.",
    icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="10" width="80" height="80" fill="#F5F5F5" rx="5"/>
      <path d="M25 35 Q50 25 75 35" stroke="#8B7355" stroke-width="3" fill="none"/>
      <ellipse cx="35" cy="38" rx="5" ry="7" fill="#FFF8DC" stroke="#DDD" stroke-width="1"/>
      <ellipse cx="45" cy="42" rx="4" ry="6" fill="#F5F5DC" stroke="#DDD" stroke-width="1"/>
      <ellipse cx="55" cy="42" rx="4" ry="6" fill="#FFF8DC" stroke="#DDD" stroke-width="1"/>
      <ellipse cx="65" cy="38" rx="5" ry="7" fill="#F0F0E0" stroke="#DDD" stroke-width="1"/>
      <ellipse cx="40" cy="50" rx="3" ry="5" fill="#FFE4C4" stroke="#DDD" stroke-width="1"/>
      <ellipse cx="60" cy="50" rx="3" ry="5" fill="#FFE4C4" stroke="#DDD" stroke-width="1"/>
      <ellipse cx="50" cy="48" rx="4" ry="6" fill="#FFF" stroke="#DDD" stroke-width="1"/>
    </svg>`,
    effect: '回合結束時，可選擇一個臨界特質並獲得1點。',
    effectEn: 'At end of turn, may gain 1 in critical trait of choice.',
  },
  {
    id: 'item_rabbits_foot',
    type: 'item',
    name: '兔腳',
    nameEn: "Rabbit's Foot",
    description: '對某些人來說是幸運物，對其他人則不然。',
    descriptionEn: 'Lucky for some, but not for others.',
    icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="10" width="80" height="80" fill="#F5F5DC" rx="5"/>
      <ellipse cx="50" cy="55" rx="12" ry="20" fill="#FFF" stroke="#DDD" stroke-width="1"/>
      <ellipse cx="45" cy="35" rx="4" ry="6" fill="#FFF" stroke="#DDD" stroke-width="1"/>
      <ellipse cx="55" cy="35" rx="4" ry="6" fill="#FFF" stroke="#DDD" stroke-width="1"/>
      <ellipse cx="42" cy="30" rx="2" ry="4" fill="#FFF" stroke="#DDD" stroke-width="1"/>
      <ellipse cx="48" cy="28" rx="2" ry="4" fill="#FFF" stroke="#DDD" stroke-width="1"/>
      <ellipse cx="52" cy="28" rx="2" ry="4" fill="#FFF" stroke="#DDD" stroke-width="1"/>
      <ellipse cx="58" cy="30" rx="2" ry="4" fill="#FFF" stroke="#DDD" stroke-width="1"/>
      <circle cx="40" cy="50" r="6" fill="#FF69B4" opacity="0.3"/>
      <rect x="46" y="72" width="8" height="10" fill="#8B4513" rx="2"/>
    </svg>`,
    effect: '每回合一次，重擲一顆骰子。',
    effectEn: 'Once per turn, reroll one die.',
  },
  {
    id: 'item_skeleton_key',
    type: 'item',
    name: '骷髏鑰匙',
    nameEn: 'Skeleton Key',
    description: '用真正的骨頭製成。',
    descriptionEn: 'Made with real bone.',
    icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="10" width="80" height="80" fill="#4A4A4A" rx="5"/>
      <circle cx="40" cy="45" r="12" fill="#F5F5DC" stroke="#DDD" stroke-width="1"/>
      <circle cx="37" cy="42" r="3" fill="#333"/>
      <circle cx="43" cy="42" r="3" fill="#333"/>
      <path d="M38 48 Q40 50 42 48" stroke="#333" stroke-width="1" fill="none"/>
      <rect x="38" y="52" width="4" height="3" fill="#333"/>
      <rect x="52" y="42" width="20" height="6" fill="#F5F5DC" rx="1"/>
      <rect x="58" y="42" width="3" height="6" fill="#333"/>
      <rect x="65" y="42" width="3" height="6" fill="#333"/>
      <line x1="52" y1="45" x2="40" y2="45" stroke="#F5F5DC" stroke-width="4"/>
    </svg>`,
    effect: '可穿牆移動。這樣做時擲一顆骰子，空白則埋葬鑰匙。無法發現新房間。',
    effectEn: 'May move through walls. When doing so, roll die. Blank = bury key. Cannot discover new rooms.',
  },
  {
    id: 'item_strange_amulet',
    type: 'item',
    name: '奇異護身符',
    nameEn: 'Strange Amulet',
    description: '戴上它讓你的思緒異常清晰。',
    descriptionEn: 'Wearing it makes your thoughts remarkably clear.',
    icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="10" width="80" height="80" fill="#2A1A2A" rx="5"/>
      <path d="M50 25 L55 40 L70 40 L58 50 L63 65 L50 55 L37 65 L42 50 L30 40 L45 40 Z" fill="#9370DB" stroke="#8A2BE2" stroke-width="1"/>
      <circle cx="50" cy="48" r="8" fill="#8A2BE2"/>
      <circle cx="50" cy="48" r="4" fill="#FFD700"/>
      <path d="M50 25 L50 15" stroke="#C0C0C0" stroke-width="2"/>
      <circle cx="50" cy="12" r="3" fill="#C0C0C0"/>
    </svg>`,
    effect: '每當受到物理傷害時，獲得1點理智。',
    effectEn: 'Whenever you take Physical damage, gain 1 Sanity.',
  },
  {
    id: 'item_strange_medicine',
    type: 'item',
    name: '奇異藥物',
    nameEn: 'Strange Medicine',
    description: '副作用包括顫抖、噁心和偏執。',
    descriptionEn: 'Side effects include jitters, nausea, and paranoia.',
    icon: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="10" width="80" height="80" fill="#F5F5F5" rx="5"/>
      <rect x="40" y="25" width="20" height="50" fill="#8B4513" rx="2"/>
      <rect x="42" y="27" width="16" height="20" fill="#654321"/>
      <rect x="42" y="50" width="16" height="23" fill="#8B0000"/>
      <rect x="44" y="55" width="12" height="2" fill="#FFF" opacity="0.5"/>
      <rect x="44" y="60" width="12" height="2" fill="#FFF" opacity="0.5"/>
      <rect x="44" y="65" width="12" height="2" fill="#FFF" opacity="0.5"/>
      <circle cx="35" cy="40" r="5" fill="#32CD32" opacity="0.5"/>
      <circle cx="65" cy="60" r="5" fill="#FF4500" opacity="0.5"/>
    </svg>`,
    effect: '埋葬此卡治癒體力和速度。',
    effectEn: 'Bury to heal Might and Speed.',
  },
];

// 預兆卡 (官方 Betrayal at House on the Hill 2nd Edition - 9張)
export const OMEN_CARDS: Card[] = [
  {
    id: 'omen_idol',
    type: 'omen',
    name: '詭異神像',
    nameEn: 'Idol',
    description: '這尊神像由一種奇怪、磨損的石頭製成。你無法確定它到底代表什麼。',
    icon: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="stoneBase" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#5A5A4A"/><stop offset="50%" stop-color="#3A3A2A"/><stop offset="100%" stop-color="#2A2A1A"/></linearGradient><linearGradient id="stoneHighlight" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#7A7A6A"/><stop offset="100%" stop-color="#4A4A3A"/></linearGradient><filter id="shadow"><feDropShadow dx="3" dy="3" stdDeviation="4" flood-opacity="0.5"/></filter></defs><rect x="10" y="10" width="180" height="180" fill="#2A2A1A" rx="10"/><ellipse cx="100" cy="160" rx="50" ry="15" fill="#3A3A2A" filter="url(#shadow)"/><path d="M70 150 L75 100 Q75 80 85 70 L90 50 Q95 35 100 35 Q105 35 110 50 L115 70 Q125 80 125 100 L130 150 Z" fill="url(#stoneBase)" stroke="#4A4A3A" stroke-width="2"/><ellipse cx="100" cy="55" rx="18" ry="22" fill="url(#stoneHighlight)"/><ellipse cx="93" cy="52" rx="5" ry="6" fill="#1A1A0A"/><ellipse cx="107" cy="52" rx="5" ry="6" fill="#1A1A0A"/><circle cx="94" cy="50" r="1.5" fill="#4A4A3A" opacity="0.6"/><circle cx="108" cy="50" r="1.5" fill="#4A4A3A" opacity="0.6"/><path d="M92 68 Q100 75 108 68" stroke="#2A2A1A" stroke-width="2" fill="none"/><path d="M85 90 L88 110" stroke="#2A2A1A" stroke-width="1.5" opacity="0.6"/><path d="M115 95 L112 115" stroke="#2A2A1A" stroke-width="1.5" opacity="0.6"/><ellipse cx="75" cy="145" rx="8" ry="4" fill="#3A4A2A" opacity="0.5"/><ellipse cx="125" cy="140" rx="6" ry="3" fill="#3A4A2A" opacity="0.4"/><ellipse cx="85" cy="75" rx="4" ry="6" fill="#3A4A2A" opacity="0.3"/><path d="M100 85 L95 95 L100 100 L105 95 Z" fill="#4A4A3A" opacity="0.7"/><circle cx="100" cy="92" r="3" fill="#2A2A1A"/></svg>`,
    effect: '你的力量檢定結果 +1。當你發現帶有事件符號的板塊時，你可以選擇不抽取事件卡。',
  },
  {
    id: 'omen_armor',
    type: 'omen',
    name: '生鏽盔甲',
    nameEn: 'Armor',
    description: '生鏽了，但還很堅固。',
    icon: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="armorMetal" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#6A6A5A"/><stop offset="30%" stop-color="#8A8A7A"/><stop offset="60%" stop-color="#5A5A4A"/><stop offset="100%" stop-color="#4A4A3A"/></linearGradient><linearGradient id="armorRust" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#8B4513"/><stop offset="50%" stop-color="#A0522D"/><stop offset="100%" stop-color="#654321"/></linearGradient><linearGradient id="metalShine" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#A0A090"/><stop offset="50%" stop-color="#707060"/><stop offset="100%" stop-color="#505040"/></linearGradient><filter id="armorShadow"><feDropShadow dx="4" dy="4" stdDeviation="5" flood-opacity="0.4"/></filter><filter id="rustTexture"><feTurbulence type="fractalNoise" baseFrequency="0.1" numOctaves="3" result="noise"/><feDisplacementMap in="SourceGraphic" in2="noise" scale="2"/></filter></defs><rect x="10" y="10" width="180" height="180" fill="#2A2A1A" rx="10"/><ellipse cx="100" cy="170" rx="60" ry="15" fill="#1A1A0A" opacity="0.5" filter="url(#armorShadow)"/><path d="M60 160 L70 80 Q70 60 80 50 L85 30 Q90 20 100 20 Q110 20 115 30 L120 50 Q130 60 130 80 L140 160 Z" fill="url(#armorMetal)" stroke="#3A3A2A" stroke-width="2" filter="url(#armorShadow)"/><path d="M75 80 Q75 65 82 58 L85 45 Q88 35 95 32 L100 30 L105 32 Q112 35 115 45 L118 58 Q125 65 125 80 L130 140" fill="none" stroke="url(#armorRust)" stroke-width="3" opacity="0.7"/><rect x="85" y="70" width="30" height="50" rx="3" fill="url(#metalShine)" stroke="#4A4A3A" stroke-width="1"/><rect x="88" y="75" width="24" height="40" fill="none" stroke="#5A5A4A" stroke-width="1"/><line x1="95" y1="75" x2="95" y2="115" stroke="#4A4A4A" stroke-width="0.5"/><line x1="105" y1="75" x2="105" y2="115" stroke="#4A4A4A" stroke-width="0.5"/><circle cx="100" cy="95" r="10" fill="#3A3A2A" stroke="#5A5A4A" stroke-width="2"/><circle cx="100" cy="95" r="6" fill="#2A2A1A"/><path d="M60 100 L45 120 L55 130" fill="none" stroke="url(#armorMetal)" stroke-width="8" stroke-linecap="round"/><path d="M140 100 L155 120 L145 130" fill="none" stroke="url(#armorMetal)" stroke-width="8" stroke-linecap="round"/><ellipse cx="70" cy="85" rx="8" ry="12" fill="url(#armorRust)" opacity="0.6"/><ellipse cx="130" cy="90" rx="6" ry="10" fill="url(#armorRust)" opacity="0.5"/><ellipse cx="75" cy="140" rx="5" ry="8" fill="url(#armorRust)" opacity="0.4"/><path d="M85 50 L115 50" stroke="#7A7A6A" stroke-width="1" opacity="0.5"/><path d="M82 60 L118 60" stroke="#7A7A6A" stroke-width="1" opacity="0.5"/></svg>`,
    effect: '每當你受到任何物理傷害時，該傷害減少 1 點。（盔甲無法防止一般傷害或力量/速度的損失。）',
  },
  {
    id: 'omen_ring',
    type: 'omen',
    name: '扭曲戒指',
    nameEn: 'Ring',
    description: '它在自己身上扭曲。',
    icon: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="ringGold" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#FFD700"/><stop offset="30%" stop-color="#FFF8DC"/><stop offset="50%" stop-color="#DAA520"/><stop offset="70%" stop-color="#B8860B"/><stop offset="100%" stop-color="#8B6914"/></linearGradient><linearGradient id="ringShadow" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#B8860B"/><stop offset="100%" stop-color="#5A4A0A"/></linearGradient><radialGradient id="gemGlow" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#FF6B6B" stop-opacity="0.8"/><stop offset="50%" stop-color="#8B0000" stop-opacity="0.9"/><stop offset="100%" stop-color="#4A0000" stop-opacity="1"/></radialGradient><filter id="ringShadowFilter"><feDropShadow dx="3" dy="3" stdDeviation="4" flood-opacity="0.5"/></filter><filter id="glow"><feGaussianBlur stdDeviation="3" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><rect x="10" y="10" width="180" height="180" fill="#1A0A0A" rx="10"/><ellipse cx="100" cy="165" rx="45" ry="12" fill="#0A0505" opacity="0.6" filter="url(#ringShadowFilter)"/><path d="M100 45 Q140 55 135 95 Q130 135 100 145 Q70 135 65 95 Q60 55 100 45" fill="none" stroke="url(#ringGold)" stroke-width="12" filter="url(#ringShadowFilter)"/><path d="M100 50 Q132 58 128 92 Q124 126 100 136 Q76 126 72 92 Q68 58 100 50" fill="none" stroke="url(#ringShadow)" stroke-width="8"/><path d="M85 70 Q100 65 115 70 Q110 85 100 88 Q90 85 85 70" fill="none" stroke="#B8860B" stroke-width="3" opacity="0.7"/><path d="M90 100 Q100 95 110 100 Q105 115 100 118 Q95 115 90 100" fill="none" stroke="#B8860B" stroke-width="3" opacity="0.7"/><ellipse cx="100" cy="95" rx="18" ry="22" fill="url(#gemGlow)" filter="url(#glow)"/><ellipse cx="100" cy="95" rx="12" ry="15" fill="#8B0000"/><ellipse cx="100" cy="95" rx="8" ry="10" fill="#A00000"/><ellipse cx="98" cy="92" rx="3" ry="4" fill="#FF6B6B" opacity="0.6"/><path d="M95 105 L100 110 L105 105 L100 100 Z" fill="#4A0000" opacity="0.5"/><circle cx="75" cy="75" r="4" fill="#FFD700" opacity="0.4"/><circle cx="125" cy="80" r="3" fill="#FFD700" opacity="0.3"/><circle cx="80" cy="115" r="3" fill="#FFD700" opacity="0.3"/><circle cx="120" cy="110" r="4" fill="#FFD700" opacity="0.4"/></svg>`,
    effect: '你的理智檢定結果 +1。當你使用戒指攻擊時，你和防守方都擲理智而非力量。輸方受到精神傷害。（每回合攻擊只能使用一件武器。你不能在同一回合使用武器攻擊後交易該武器。）',
  },
  {
    id: 'omen_dog',
    type: 'omen',
    name: '靈犬',
    nameEn: 'Dog',
    description: '牠用敏銳的智慧凝視著你。',
    icon: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="dogFur" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#8B6914"/><stop offset="30%" stop-color="#A67B2E"/><stop offset="60%" stop-color="#6B4914"/><stop offset="100%" stop-color="#4A3508"/></linearGradient><linearGradient id="dogEar" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#5A3A0A"/><stop offset="100%" stop-color="#3A2506"/></linearGradient><radialGradient id="eyeGlow" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#87CEEB" stop-opacity="0.9"/><stop offset="50%" stop-color="#4682B4" stop-opacity="0.8"/><stop offset="100%" stop-color="#1A3A5A" stop-opacity="1"/></radialGradient><filter id="dogShadow"><feDropShadow dx="4" dy="4" stdDeviation="5" flood-opacity="0.4"/></filter></defs><rect x="10" y="10" width="180" height="180" fill="#2A1A0A" rx="10"/><ellipse cx="100" cy="165" rx="55" ry="15" fill="#1A0A05" opacity="0.5" filter="url(#dogShadow)"/><ellipse cx="100" cy="115" rx="45" ry="35" fill="url(#dogFur)" filter="url(#dogShadow)"/><ellipse cx="65" cy="75" rx="22" ry="28" fill="url(#dogFur)"/><ellipse cx="135" cy="75" rx="22" ry="28" fill="url(#dogFur)"/><ellipse cx="55" cy="60" rx="12" ry="18" fill="url(#dogEar)"/><ellipse cx="145" cy="60" rx="12" ry="18" fill="url(#dogEar)"/><ellipse cx="68" cy="78" rx="8" ry="10" fill="#2A1A0A"/><ellipse cx="132" cy="78" rx="8" ry="10" fill="#2A1A0A"/><ellipse cx="70" cy="76" rx="5" ry="6" fill="url(#eyeGlow)"/><ellipse cx="130" cy="76" rx="5" ry="6" fill="url(#eyeGlow)"/><circle cx="71" cy="74" r="2" fill="#FFF" opacity="0.8"/><circle cx="131" cy="74" r="2" fill="#FFF" opacity="0.8"/><ellipse cx="100" cy="95" rx="10" ry="8" fill="#3A2A1A"/><ellipse cx="100" cy="98" rx="6" ry="4" fill="#1A0A05"/><ellipse cx="100" cy="105" rx="8" ry="5" fill="#4A3A2A"/><path d="M85 110 Q100 118 115 110" stroke="#2A1A0A" stroke-width="2" fill="none"/><ellipse cx="75" cy="140" rx="8" ry="20" fill="url(#dogFur)"/><ellipse cx="125" cy="140" rx="8" ry="20" fill="url(#dogFur)"/><ellipse cx="65" cy="155" rx="10" ry="6" fill="url(#dogFur)"/><ellipse cx="135" cy="155" rx="10" ry="6" fill="url(#dogFur)"/><path d="M60 50 Q65 35 75 40" stroke="#5A3A0A" stroke-width="2" fill="none" opacity="0.6"/><path d="M140 50 Q135 35 125 40" stroke="#5A3A0A" stroke-width="2" fill="none" opacity="0.6"/><ellipse cx="100" cy="125" rx="5" ry="3" fill="#4A3A2A" opacity="0.5"/></svg>`,
    effect: '你的速度檢定結果 +1。在你的回合中一次，你可以使用靈犬與最多 4 個板塊距離的另一名玩家交易任意數量的物品或預兆，使用正常交易規則。（你不能交易本回合已使用過的物品或預兆，也不能使用剛從其他玩家處收到的物品或預兆。）',
  },
  {
    id: 'omen_book',
    type: 'omen',
    name: '神秘古書',
    nameEn: 'Book',
    description: '奇怪的塗鴉覆蓋著書頁。',
    icon: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="bookCover" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#5A3A1A"/><stop offset="30%" stop-color="#8B4513"/><stop offset="60%" stop-color="#654321"/><stop offset="100%" stop-color="#4A2A0A"/></linearGradient><linearGradient id="bookSpine" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#3A2A0A"/><stop offset="50%" stop-color="#5A4A1A"/><stop offset="100%" stop-color="#3A2A0A"/></linearGradient><linearGradient id="pageEdge" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#F5DEB3"/><stop offset="50%" stop-color="#E8D4A2"/><stop offset="100%" stop-color="#D4C491"/></linearGradient><filter id="bookShadow"><feDropShadow dx="5" dy="5" stdDeviation="6" flood-opacity="0.5"/></filter></defs><rect x="10" y="10" width="180" height="180" fill="#2A1A0A" rx="10"/><path d="M55 160 L55 50 Q55 35 70 35 L140 35 Q155 35 155 50 L155 160 Z" fill="url(#bookCover)" filter="url(#bookShadow)"/><rect x="55" y="35" width="15" height="125" fill="url(#bookSpine)"/><rect x="70" y="40" width="80" height="115" fill="url(#pageEdge)"/><rect x="75" y="45" width="70" height="105" fill="#FFF8DC"/><path d="M80 60 Q95 55 110 60 Q105 68 95 65" stroke="#4B0082" stroke-width="2" fill="none" opacity="0.8"/><path d="M85 75 Q100 70 115 75 Q110 83 100 80" stroke="#8B0000" stroke-width="2" fill="none" opacity="0.8"/><path d="M90 90 Q105 85 120 90 Q115 98 105 95" stroke="#006400" stroke-width="2" fill="none" opacity="0.8"/><path d="M82 105 Q95 100 108 105 Q103 112 95 109" stroke="#4B0082" stroke-width="1.5" fill="none" opacity="0.7"/><path d="M88 118 Q101 113 114 118 Q109 125 101 122" stroke="#8B0000" stroke-width="1.5" fill="none" opacity="0.7"/><circle cx="100" cy="135" r="12" fill="none" stroke="#2A1A1A" stroke-width="2"/><path d="M95 130 L100 140 L105 130 M95 140 L105 130" stroke="#2A1A1A" stroke-width="1.5" fill="none"/><rect x="60" y="40" width="8" height="115" fill="none" stroke="#3A2A0A" stroke-width="1"/><rect x="62" y="45" width="4" height="105" fill="none" stroke="#4A3A1A" stroke-width="0.5" opacity="0.5"/><ellipse cx="100" cy="45" rx="35" ry="3" fill="#3A2A0A" opacity="0.3"/></svg>`,
    effect: '你的知識檢定結果 +1。在你的回合中一次，你可以使用古書失去 1 點理智。本回合你進行的下一次非攻擊特質檢定，你可以用知識代替指定的特質。（使用你知識檢定的加成，而非原特質的加成。）',
  },
  {
    id: 'omen_dagger',
    type: 'omen',
    name: '血祭匕首',
    nameEn: 'Dagger',
    description: '它散發著尖銳的血腥味。你的血。',
    icon: `<rect x="20" y="20" width="60" height="60" fill="#3A2A2A"/>
           <rect x="47" y="25" width="6" height="35" fill="#C0C0C0"/>
           <polygon points="50,25 42,15 58,15" fill="#C0C0C0"/>
           <rect x="44" y="55" width="12" height="8" fill="#4A3728"/>
           <path d="M52 30 L60 22" stroke="#8B0000" stroke-width="3"/>
           <path d="M54 35 L62 28" stroke="#8B0000" stroke-width="2"/>
           <circle cx="58" cy="25" r="2" fill="#8B0000"/>`,
    effect: '當你使用血祭匕首攻擊時，失去 1 點速度。攻擊時額外擲兩顆骰子。（每回合攻擊只能使用一件武器。你不能在同一回合使用武器攻擊後交易該武器。）',
  },
  {
    id: 'omen_holy_symbol',
    type: 'omen',
    name: '聖徽',
    nameEn: 'Holy Symbol',
    description: '一個在黑暗中發光的銀色符號。',
    icon: `<rect x="20" y="20" width="60" height="60" fill="#2A2A3A"/>
           <circle cx="50" cy="50" r="18" fill="none" stroke="#C0C0C0" stroke-width="3"/>
           <circle cx="50" cy="50" r="12" fill="none" stroke="#C0C0C0" stroke-width="2"/>
           <line x1="50" y1="32" x2="50" y2="68" stroke="#C0C0C0" stroke-width="2"/>
           <line x1="32" y1="50" x2="68" y2="50" stroke="#C0C0C0" stroke-width="2"/>
           <circle cx="50" cy="50" r="4" fill="#FFD700"/>
           <circle cx="50" cy="42" r="3" fill="#FFF" opacity="0.6"/>`,
    effect: '你的理智檢定結果 +1。每當你發現板塊時，你可以選擇將其埋葬並改為發現下一個板塊。如果你這樣做，不要結算第一個板塊的任何效果。',
  },
  {
    id: 'omen_skull',
    type: 'omen',
    name: '銘文頭骨',
    nameEn: 'Skull',
    description: '精緻地蝕刻著奇怪的記號。',
    icon: `<rect x="20" y="20" width="60" height="60" fill="#3A3A3A"/>
           <ellipse cx="50" cy="52" rx="16" ry="18" fill="#E8E8E8"/>
           <ellipse cx="50" cy="52" rx="14" ry="16" fill="#D0D0D0"/>
           <circle cx="44" cy="48" r="4" fill="#2A2A2A"/>
           <circle cx="56" cy="48" r="4" fill="#2A2A2A"/>
           <path d="M46 58 Q50 62 54 58" stroke="#2A2A2A" stroke-width="2" fill="none"/>
           <rect x="46" y="62" width="2" height="3" fill="#2A2A2A"/>
           <rect x="52" y="62" width="2" height="3" fill="#2A2A2A"/>
           <path d="M40 40 L42 44 M60 40 L58 44 M50 35 L50 38" stroke="#4A4A4A" stroke-width="1"/>
           <path d="M38 52 Q35 55 38 58 M62 52 Q65 55 62 58" stroke="#4A4A4A" stroke-width="1" fill="none"/>`,
    effect: '你的知識檢定結果 +1。如果某事會導致你的探險者死亡，先擲 3 顆骰子。4-6：你不會死亡，改為將所有特質設為臨界值。移除這張卡。0-3：你正常死亡。',
  },
  {
    id: 'omen_mask',
    type: 'omen',
    name: '詭異面具',
    nameEn: 'Mask',
    description: '你無法確定它是什麼材質做的，但它非常光滑且微微溫暖。',
    icon: `<rect x="20" y="20" width="60" height="60" fill="#4A3A4A"/>
           <ellipse cx="50" cy="50" rx="18" ry="22" fill="#8B7B6B"/>
           <ellipse cx="50" cy="50" rx="15" ry="18" fill="#9B8B7B"/>
           <ellipse cx="44" cy="46" rx="4" ry="3" fill="#2A1A1A"/>
           <ellipse cx="56" cy="46" rx="4" ry="3" fill="#2A1A1A"/>
           <path d="M46 56 Q50 60 54 56" stroke="#2A1A1A" stroke-width="1" fill="none"/>
           <ellipse cx="50" cy="38" rx="12" ry="4" fill="#8B7B6B"/>
           <path d="M35 50 Q32 55 35 60 M65 50 Q68 55 65 60" stroke="#7B6B5B" stroke-width="2" fill="none"/>`,
    effect: '你的速度檢定結果 +1。在你的回合中一次，你可以使用面具將你所在板塊上的所有其他人（探險者和怪物）移動到任意相鄰板塊。此效果不能用於發現新板塊。',
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
