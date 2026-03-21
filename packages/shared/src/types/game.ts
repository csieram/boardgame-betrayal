import { Room, RoomDeck, Floor, SymbolType } from '../data/rooms';
import { Character } from '../data/characters';
import { Card } from '../data/cards';
import { Haunt } from '../data/haunts/haunts';
import { Scenario } from '../data/scenarios';
import { Monster, TraitorPowers } from '../game/monsters';

// 遊戲階段
export type GamePhase = 
  | 'character_select'  // 選擇角色
  | 'exploration'       // 探索階段
  | 'haunt_reveal'      // 作祟揭示
  | 'haunt_survivor'    // 作祟：倖存者階段
  | 'haunt_traitor'     // 作祟：叛徒階段（單人模式AI）
  | 'game_over';        // 遊戲結束

// 地圖格子
export interface Tile {
  x: number;
  y: number;
  room: Room | null;
  discovered: boolean;
  rotation: 0 | 90 | 180 | 270; // 房間旋轉角度
}

// 玩家狀態
export interface Player {
  character: Character;
  position: { x: number; y: number };
  items: Card[];
  omens: Card[];
  isTraitor: boolean;
}

// 回合狀態
export interface TurnState {
  movesRemaining: number;      // 剩餘移動點數（基於 Speed）
  hasDiscoveredRoom: boolean;  // 本回合是否已發現新房間
  hasDrawnCard: boolean;       // 本回合是否已抽卡
  hasEnded: boolean;           // 回合是否已結束
  usedSpecialActions: Set<string>; // 本回合已使用的特殊行動
}

// 障礙物類型
export interface Obstacle {
  id: string;
  name: string;
  moveCost: number; // 移動消耗（通常是 2）
}

// 遊戲狀態
export interface GameState {
  phase: GamePhase;
  map: Tile[][];
  player: Player;
  currentHaunt: Haunt | null;
  hauntRevealed: boolean;
  omenCount: number;
  turn: number;
  log: string[];
  selectedStat: 'speed' | 'might' | 'sanity' | 'knowledge' | null;
  roomDeck: RoomDeck;
  turnState: TurnState;        // 當前回合狀態
  scenario: Scenario | null;   // 當前劇情
  monsters: Monster[];         // 怪物列表
  traitorPowers: TraitorPowers | null;  // 叛徒能力
}

// 探索方向
export type Direction = 'north' | 'south' | 'east' | 'west';

// 方向對應的座標變化
export const DIRECTION_DELTAS: Record<Direction, { x: number; y: number }> = {
  north: { x: 0, y: -1 },
  south: { x: 0, y: 1 },
  east: { x: 1, y: 0 },
  west: { x: -1, y: 0 },
};

// 相反方向
export const OPPOSITE_DIRECTION: Record<Direction, Direction> = {
  north: 'south',
  south: 'north',
  east: 'west',
  west: 'east',
};

// 檢查兩個房間的門是否相連
export function canConnect(room1: Room, room2: Room, direction: Direction): boolean {
  const opposite = OPPOSITE_DIRECTION[direction];
  return room1.doors.includes(direction) && room2.doors.includes(opposite);
}

// 旋轉房間門方向
export function rotateDoors(doors: Direction[], rotation: 0 | 90 | 180 | 270): Direction[] {
  const rotationMap: Record<Direction, Record<typeof rotation, Direction>> = {
    north: { 0: 'north', 90: 'east', 180: 'south', 270: 'west' },
    east: { 0: 'east', 90: 'south', 180: 'west', 270: 'north' },
    south: { 0: 'south', 90: 'west', 180: 'north', 270: 'east' },
    west: { 0: 'west', 90: 'north', 180: 'east', 270: 'south' },
  };
  
  return doors.map(door => rotationMap[door][rotation]);
}
