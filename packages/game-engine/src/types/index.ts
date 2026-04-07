/**
 * Core Game State Types for Betrayal at House on the Hill
 * 
 * 這個檔案定義了遊戲的核心類型系統，是所有其他功能的基礎。
 * 設計原則：
 * 1. Immutable - 所有狀態更新都返回新物件
 * 2. Serializable - 支援 JSON 序列化（save/load）
 * 3. Deterministic - 支援 replay 功能
 * 4. Multiplayer-ready - 支援同步
 */

import { Room, SymbolType } from '@betrayal/shared';
import { MapToken } from '../state/mapTokens';

// Re-export Floor from shared
export type Floor = import('@betrayal/shared').Floor;

// ==================== 基礎類型 ====================

/** 遊戲階段 */
export type GamePhase =
  | 'setup'           // 遊戲設置中
  | 'character_select' // 選擇角色
  | 'exploration'     // 探索階段
  | 'haunt_reveal'    // 作祟揭示中
  | 'haunt'           // 作祟進行中
  | 'game_over';      // 遊戲結束

/** 遊戲結果 */
export type GameResult =
  | 'ongoing'
  | 'heroes_win'
  | 'traitor_wins'
  | 'draw';

/** 方向 */
export type Direction = 'north' | 'south' | 'east' | 'west';

/** 屬性類型 */
export type StatType = 'speed' | 'might' | 'sanity' | 'knowledge';

/** 卡牌類型 */
export type CardType = 'event' | 'item' | 'omen';

/** 作祟類型 */
export type HauntType =
  | 'none'           // 無作祟（探索階段）
  | 'cooperative'    // 無叛徒，全員合作
  | 'single_traitor' // 單叛徒
  | 'hidden_traitor' // 隱藏叛徒
  | 'free_for_all';  // 各自為戰

// ==================== 座標與位置 ====================

/** 2D 座標 */
export interface Position {
  x: number;
  y: number;
}

/** 3D 位置（包含樓層） */
export interface Position3D extends Position {
  floor: Floor;
}

/** 方向對應的座標變化 */
export const DIRECTION_DELTAS: Record<Direction, Position> = {
  north: { x: 0, y: -1 },
  south: { x: 0, y: 1 },
  east: { x: 1, y: 0 },
  west: { x: -1, y: 0 },
};

/** 相反方向 */
export const OPPOSITE_DIRECTION: Record<Direction, Direction> = {
  north: 'south',
  south: 'north',
  east: 'west',
  west: 'east',
};

// ==================== 地圖系統 ====================

/** 地圖格子（Tile）
 * 
 * 每個 Tile 代表地圖上的一個位置，可能包含房間或為空。
 * 使用 15x15 網格系統，支援多層樓（每層獨立網格）。
 */
export interface Tile {
  /** X 座標 (0-14) */
  x: number;
  /** Y 座標 (0-14) */
  y: number;
  /** 所屬樓層 */
  floor: Floor;
  /** 房間資料（null 表示未放置） */
  room: Room | null;
  /** 是否已被發現 */
  discovered: boolean;
  /** 房間旋轉角度（0, 90, 180, 270） */
  rotation: 0 | 90 | 180 | 270;
  /** 放置順序（用於 replay） */
  placementOrder: number;
}

/** 地圖層（每層樓一個 15x15 網格） */
export type FloorMap = Tile[][];

/** 完整遊戲地圖（四層樓） */
export interface GameMap {
  ground: FloorMap;
  upper: FloorMap;
  basement: FloorMap;
  roof: FloorMap;
  /** 已放置房間數量 */
  placedRoomCount: number;
}

// ==================== 角色與玩家 ====================

/** 角色屬性狀態 */
export interface CharacterStats {
  /** 速度（影響移動） */
  speed: number;
  /** 力量（影響戰鬥） */
  might: number;
  /** 理智（影響心智檢定） */
  sanity: number;
  /** 知識（影響知識檢定） */
  knowledge: number;
}

/** 角色屬性軌道（用於升降數值） */
export interface StatTrack {
  speed: number[];
  might: number[];
  sanity: number[];
  knowledge: number[];
}

/** 角色定義 - 從 shared 包導入 */
export type { Character, CharacterStat } from '@betrayal/shared';

/** 玩家狀態 */
export interface Player {
  /** 玩家唯一 ID */
  id: string;
  /** 玩家名稱 */
  name: string;
  /** 使用的角色 */
  character: Character;
  /** 當前位置 */
  position: Position3D;
  /** 上一個位置（用於強制移動回退） */
  previousPosition?: Position3D;
  /** 當前屬性值（可能因遊戲進行而改變） */
  currentStats: CharacterStats;
  /** 持有的物品卡 */
  items: Card[];
  /** 持有的預兆卡 */
  omens: Card[];
  /** 是否為叛徒 */
  isTraitor: boolean;
  /** 是否死亡 */
  isDead: boolean;
  /** 本回合已使用的物品 ID */
  usedItemsThisTurn: string[];
}

// ==================== 卡牌系統 ====================

/** 卡牌 */
export interface Card {
  id: string;
  type: CardType;
  name: string;
  description: string;
  icon: string; // SVG
  effect?: string;
  /** 是否需要檢定 */
  rollRequired?: {
    stat: StatType;
    target: number;
  };
  success?: string;
  failure?: string;
}

/** 卡牌堆狀態 (Issue #188)
 * 使用 string[] 存儲卡牌 ID，確保可序列化和跨組件共享
 */
export interface CardDecks {
  /** 事件卡牌堆 */
  event: { remaining: string[]; drawn: string[]; discarded: string[] };
  /** 物品卡牌堆 */
  item: { remaining: string[]; drawn: string[]; discarded: string[] };
  /** 預兆卡牌堆 */
  omen: { remaining: string[]; drawn: string[]; discarded: string[] };
}

/** 單一卡牌堆狀態 (Legacy - 使用 Card[])
 * @deprecated 請使用 CardDecks，它使用 string[] 存儲卡牌 ID
 */
export interface CardDeckState {
  /** 剩餘卡牌（牌堆頂在陣列尾端） */
  remaining: Card[];
  /** 已抽出的卡牌 */
  drawn: Card[];
  /** 已丟棄的卡牌 */
  discarded: Card[];
}

// ==================== 房間牌堆 ====================

/** 房間牌堆狀態（依樓層分類） */
export interface RoomDeckState {
  /** 地面層牌堆 */
  ground: Room[];
  /** 上層牌堆 */
  upper: Room[];
  /** 地下室牌堆 */
  basement: Room[];
  /** 屋頂牌堆 */
  roof: Room[];
  /** 已抽出的房間 ID */
  drawn: Set<string>;
}

/** 房間牌堆（用於初始化） */
export interface RoomDecks {
  upper: Room[];
  ground: Room[];
  basement: Room[];
}

// ==================== 回合系統 ====================

/** 回合狀態 */
export interface TurnState {
  /** 當前回合玩家 ID */
  currentPlayerId: string;
  /** 回合數 */
  turnNumber: number;
  /** 剩餘移動點數（基於 Speed） */
  movesRemaining: number;
  /** 本回合是否已發現新房間 */
  hasDiscoveredRoom: boolean;
  /** 本回合是否已抽卡 */
  hasDrawnCard: boolean;
  /** 本回合是否已結束 */
  hasEnded: boolean;
  /** 本回合已使用的特殊行動 */
  usedSpecialActions: string[];
  /** 本回合已使用的物品 ID */
  usedItems: string[];
}

// ==================== 作祟系統 ====================

/** 作祟狀態 */
export interface HauntState {
  /** 是否已觸發作祟 */
  isActive: boolean;
  /** 作祟類型 */
  type: HauntType;
  /** 作祟編號 */
  hauntNumber: number | null;
  /** 叛徒玩家 ID（如適用） */
  traitorPlayerId: string | null;
  /** 已發現的預兆數量（用於作祟檢定） */
  omenCount: number;
  /** 作祟目標（英雄方） */
  heroObjective: string | null;
  /** 作祟目標（叛徒方） */
  traitorObjective: string | null;
}

// ==================== 戰鬥系統 ====================

/** 戰鬥狀態 */
export interface CombatState {
  /** 是否進行中 */
  isActive: boolean;
  /** 攻擊者 ID */
  attackerId: string | null;
  /** 防守者 ID */
  defenderId: string | null;
  /** 使用的屬性 */
  usedStat: StatType | null;
  /** 攻擊者擲骰結果 */
  attackerRoll: number | null;
  /** 防守者擲骰結果 */
  defenderRoll: number | null;
  /** 造成的傷害 */
  damage: number | null;
}

// ==================== 遊戲狀態 ====================

/** 遊戲設定 */
export interface GameConfig {
  /** 玩家數量 */
  playerCount: number;
  /** 是否啟用 AI */
  enableAI: boolean;
  /** 隨機種子（用於 deterministic replay） */
  seed: string;
  /** 最大回合數（防止無限遊戲） */
  maxTurns: number;
}

/** 遊戲歷史記錄項目 */
export interface GameLogEntry {
  /** 時間戳 */
  timestamp: number;
  /** 回合數 */
  turn: number;
  /** 玩家 ID */
  playerId: string;
  /** 動作類型 */
  actionType: string;
  /** 描述 */
  description: string;
  /** 相關資料 */
  data?: Record<string, unknown>;
}

/** 完整遊戲狀態 */
export interface GameState {
  /** 遊戲 ID */
  gameId: string;
  /** 遊戲版本（用於 migration） */
  version: string;
  /** 遊戲階段 */
  phase: GamePhase;
  /** 遊戲結果 */
  result: GameResult;
  /** 遊戲設定 */
  config: GameConfig;
  /** 遊戲地圖 */
  map: GameMap;
  /** 所有玩家 */
  players: Player[];
  /** 玩家 ID 列表（順序） */
  playerOrder: string[];
  /** 當前回合狀態 */
  turn: TurnState;
  /** 卡牌堆 */
  cardDecks: CardDecks;
  /** 房間牌堆 */
  roomDeck: RoomDeckState;
  /** 作祟狀態 */
  haunt: HauntState;
  /** 戰鬥狀態 */
  combat: CombatState;
  /** 遊戲歷史 */
  log: GameLogEntry[];
  /** 狀態建立時間 */
  createdAt: number;
  /** 最後更新時間 */
  updatedAt: number;
  /** 隨機數生成器狀態（用於 replay） */
  rngState: RngState;
  /** 已放置的房間 ID（確保每個房間只出現一次） */
  placedRoomIds: Set<string>;
  /** 已埋葬/丟棄的物品（Issue #232） */
  discardedItems?: Card[];
  /** 地圖標記（Issue #235 - Secret Passages） */
  mapTokens?: MapToken[];
}

// ==================== RNG 系統（Deterministic） ====================

/** 隨機數生成器狀態 */
export interface RngState {
  /** 種子 */
  seed: string;
  /** 已生成次數 */
  count: number;
  /** 內部狀態（依實作而定） */
  internalState: number[];
}

/** 骰子結果 */
export interface DiceRoll {
  /** 擲骰數量 */
  count: number;
  /** 每個骰子的結果 */
  results: number[];
  /** 總和 */
  total: number;
}

// ==================== Action 類型 ====================

/** 動作基礎介面 */
export interface GameAction {
  /** 動作類型 */
  type: string;
  /** 執行玩家 ID */
  playerId: string;
  /** 時間戳 */
  timestamp: number;
  /** 動作 ID（唯一） */
  actionId: string;
}

/** 移動動作 */
export interface MoveAction extends GameAction {
  type: 'MOVE';
  /** 目標位置 */
  to: Position3D;
  /** 移動路徑 */
  path: Position3D[];
}

/** 發現房間動作 */
export interface DiscoverAction extends GameAction {
  type: 'DISCOVER';
  /** 發現方向 */
  direction: Direction;
  /** 抽到的房間 */
  room: Room;
  /** 放置位置 */
  position: Position3D;
  /** 旋轉角度 */
  rotation: 0 | 90 | 180 | 270;
}

/** 抽卡動作 */
export interface DrawCardAction extends GameAction {
  type: 'DRAW_CARD';
  /** 卡牌類型 */
  cardType: CardType;
  /** 抽到的卡牌 */
  card: Card;
}

/** 使用物品動作 */
export interface UseItemAction extends GameAction {
  type: 'USE_ITEM';
  /** 物品 ID */
  itemId: string;
  /** 目標（如適用） */
  target?: string;
}

/** 結束回合動作 */
export interface EndTurnAction extends GameAction {
  type: 'END_TURN';
}

/** 屬性檢定動作 */
export interface StatCheckAction extends GameAction {
  type: 'STAT_CHECK';
  /** 檢定屬性 */
  stat: StatType;
  /** 目標值 */
  target: number;
  /** 擲骰結果 */
  roll: DiceRoll;
  /** 是否成功 */
  success: boolean;
}

/** 作祟檢定動作 */
export interface HauntCheckAction extends GameAction {
  type: 'HAUNT_CHECK';
  /** 擲骰結果 */
  roll: DiceRoll;
  /** 是否觸發作祟 */
  triggered: boolean;
}

/** 戰鬥動作 */
export interface CombatAction extends GameAction {
  type: 'COMBAT';
  /** 戰鬥類型 */
  combatType: 'attack' | 'defend' | 'flee';
  /** 目標玩家 ID */
  targetId: string;
  /** 使用的屬性 */
  stat: StatType;
  /** 擲骰結果 */
  roll: DiceRoll;
}

/** 所有動作類型的聯集 */
export type AllActions =
  | MoveAction
  | DiscoverAction
  | DrawCardAction
  | UseItemAction
  | EndTurnAction
  | StatCheckAction
  | HauntCheckAction
  | CombatAction;

// ==================== 常數 ====================

/** 地圖大小 */
export const MAP_SIZE = 15;

/** 地圖中心點 */
export const MAP_CENTER = 7;

/** 起始房間 ID */
export const STARTING_ROOMS = {
  ground: 'entrance_hall',
  upper: 'stairs_from_upper',
  basement: 'stairs_from_basement',
} as const;

/** 最大玩家數 */
export const MAX_PLAYERS = 6;

/** 最小玩家數 */
export const MIN_PLAYERS = 3;

/** 骰子面數對應的數值 */
export const DICE_FACES = [0, 0, 1, 1, 2, 2];

/** 作祟觸發閾值 */
export const HAUNT_THRESHOLD = 5;
