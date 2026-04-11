/**
 * Core Types - 核心類型定義
 * 
 * 這個模組定義遊戲引擎的核心類型接口
 */

// ==================== 卡牌類型 ====================

export type CardType = 'omen' | 'event' | 'item';

export interface Card {
  id: string;
  name: string;
  nameEn: string;
  type: CardType;
  description: string;
  effect?: string;
}

// ==================== 玩家類型 ====================

export type StatType = 'might' | 'speed' | 'sanity' | 'knowledge';

export interface Player {
  id: string;
  name: string;
  characterId: string;
  position: {
    x: number;
    y: number;
    floor: string;
  };
  stats: {
    might: number;
    speed: number;
    sanity: number;
    knowledge: number;
  };
  currentStats: {
    might: number;
    speed: number;
    sanity: number;
    knowledge: number;
  };
  inventory: Card[];
  isTraitor: boolean;
  isAI: boolean;
}

export interface AIPlayer extends Player {
  isAI: true;
  difficulty: 'easy' | 'medium' | 'hard';
}

// ==================== 遊戲狀態類型 ====================

export interface GameState {
  id: string;
  phase: 'setup' | 'exploration' | 'haunt' | 'end';
  turn: number;
  currentPlayerId: string;
  players: Player[];
  omenCount: number;
  hauntTriggered: boolean;
  hauntNumber?: number;
  traitorId?: string;
  map: GameMap;
  cardDecks: {
    omens: Card[];
    events: Card[];
    items: Card[];
  };
  discardPiles: {
    omens: Card[];
    events: Card[];
    items: Card[];
  };
}

export interface GameMap {
  [key: string]: PlacedRoom;
}

export interface PlacedRoom {
  id: string;
  room: {
    id: string;
    name: string;
    nameEn: string;
    type: string;
    doors: string[];
  };
  x: number;
  y: number;
  floor: string;
  rotation: number;
}

// ==================== 擲骰類型 ====================

export interface DiceRoll {
  dice: number[];
  total: number;
}

// ==================== 鬼魂相關類型 ====================

export interface HauntRollResult {
  dice: number[];
  total: number;
  triggered: boolean;
}

// ==================== AI 卡牌抽取結果 ====================

export interface AICardDrawResult {
  card: Card;
  hauntRoll?: {
    dice: number[];
    total: number;
    triggered: boolean;
  };
}

// ==================== 卡牌抽取結果 ====================

export interface CardDrawResult {
  success: boolean;
  card?: Card;
  hauntRoll?: HauntRollResult;
  error?: string;
}
