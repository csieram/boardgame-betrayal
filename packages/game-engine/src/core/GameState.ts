/**
 * Core Game State Implementation for Betrayal at House on the Hill
 * 
 * 這個檔案實作遊戲的核心狀態管理，包含：
 * 1. 狀態初始化
 * 2. 狀態轉換（applyAction）
 * 3. Deterministic RNG
 * 4. 序列化/反序列化
 */

import {
  GameState,
  GamePhase,
  GameConfig,
  GameMap,
  FloorMap,
  Tile,
  Player,
  TurnState,
  RoomDeckState,
  CardDecks,
  CardDeckState,
  HauntState,
  CombatState,
  GameAction,
  MoveAction,
  DiscoverAction,
  DrawCardAction,
  UseItemAction,
  EndTurnAction,
  StatCheckAction,
  HauntCheckAction,
  CombatAction,
  Position3D,
  Position,
  Direction,
  RngState,
  DiceRoll,
  GameLogEntry,
  MAP_SIZE,
  MAP_CENTER,
  DICE_FACES,
  HAUNT_THRESHOLD,
  StatType,
  CardType,
  Card,
  Floor,
  Character,
} from '../types';

import {
  Room,
  OFFICIAL_ROOMS,
  ALL_ROOMS,
} from '@betrayal/shared';

import { EVENT_CARDS, ITEM_CARDS, OMEN_CARDS } from '@betrayal/shared';

// ==================== Deterministic RNG ====================

/**
 * 簡易的 seeded RNG（Mulberry32）
 * 確保相同的 seed 產生相同的序列，支援 replay 功能
 */
export class SeededRng {
  private state: number;
  private count: number = 0;
  private initialSeed: string;

  constructor(seed: string) {
    this.initialSeed = seed;
    // 使用字串 hash 作為初始狀態
    let h = 1779033703 ^ seed.length;
    for (let i = 0; i < seed.length; i++) {
      h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    this.state = (h ^ (h >>> 16)) >>> 0;
  }

  /** 生成 0-1 之間的隨機數 */
  next(): number {
    this.count++;
    let t = this.state + 0x6D2B79F5;
    this.state = t;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** 生成指定範圍的整數 [min, max) */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min)) + min;
  }

  /** 擲骰子 */
  rollDice(count: number): DiceRoll {
    const results: number[] = [];
    for (let i = 0; i < count; i++) {
      const faceIndex = this.nextInt(0, 6);
      results.push(DICE_FACES[faceIndex]);
    }
    return {
      count,
      results,
      total: results.reduce((a, b) => a + b, 0),
    };
  }

  /** 洗牌（Fisher-Yates） */
  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i + 1);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  /** 從陣列中隨機選擇一個元素 */
  pickOne<T>(array: T[]): T {
    return array[this.nextInt(0, array.length)];
  }

  /** 獲取當前 RNG 狀態（用於序列化） */
  getState(): RngState {
    return {
      seed: this.initialSeed,
      count: this.count,
      internalState: [this.state],
    };
  }

  /** 從狀態恢復 RNG */
  static fromState(state: RngState): SeededRng {
    const rng = new SeededRng(state.seed);
    // 直接恢復內部狀態
    if (state.internalState.length > 0) {
      rng.state = state.internalState[0];
    }
    rng.count = state.count;
    return rng;
  }
}

// ==================== 地圖初始化 ====================

/**
 * 建立空的樓層地圖（15x15）
 */
function createEmptyFloorMap(floor: Floor): FloorMap {
  const map: FloorMap = [];
  for (let y = 0; y < MAP_SIZE; y++) {
    const row: Tile[] = [];
    for (let x = 0; x < MAP_SIZE; x++) {
      row.push({
        x,
        y,
        floor,
        room: null,
        discovered: false,
        rotation: 0,
        placementOrder: -1,
      });
    }
    map.push(row);
  }
  return map;
}

/**
 * 初始化遊戲地圖
 */
function initializeGameMap(): GameMap {
  return {
    ground: createEmptyFloorMap('ground'),
    upper: createEmptyFloorMap('upper'),
    basement: createEmptyFloorMap('basement'),
    roof: createEmptyFloorMap('roof'),
    placedRoomCount: 0,
  };
}

/**
 * 放置起始房間
 */
function placeStartingRooms(map: GameMap, rooms: Room[]): GameMap {
  const newMap = deepClone(map);
  const roomMap = new Map(rooms.map(r => [r.id, r]));

  // 入口大廳（地面層中心）
  const entranceHall = roomMap.get('entrance_hall');
  if (entranceHall) {
    newMap.ground[MAP_CENTER][MAP_CENTER] = {
      ...newMap.ground[MAP_CENTER][MAP_CENTER],
      room: entranceHall,
      discovered: true,
      rotation: 0,
      placementOrder: 0,
    };
  }

  // 上層大廳
  const upperLanding = roomMap.get('upper_landing');
  if (upperLanding) {
    newMap.upper[MAP_CENTER][MAP_CENTER] = {
      ...newMap.upper[MAP_CENTER][MAP_CENTER],
      room: upperLanding,
      discovered: true,
      rotation: 0,
      placementOrder: 0,
    };
  }

  // 地下室大廳
  const basementLanding = roomMap.get('basement_landing');
  if (basementLanding) {
    newMap.basement[MAP_CENTER][MAP_CENTER] = {
      ...newMap.basement[MAP_CENTER][MAP_CENTER],
      room: basementLanding,
      discovered: true,
      rotation: 0,
      placementOrder: 0,
    };
  }

  newMap.placedRoomCount = 3;
  return newMap;
}

// ==================== 牌堆初始化 ====================

/**
 * 初始化房間牌堆
 * Issue #72: 所有房間都在主牌堆，單門房間也包含在內
 * Issue #182: 使用新的 floors 陣列系統
 */
function initializeRoomDeck(rng: SeededRng): RoomDeckState {
  // 過濾掉起始房間
  const excludeIds = new Set(['entrance_hall', 'upper_landing', 'basement_landing']);
  
  // 從 ALL_ROOMS 過濾出非起始房間，然後按樓層分類
  const allRooms = ALL_ROOMS.filter(r => !excludeIds.has(r.id));
  
  const groundRooms = allRooms.filter(r => r.floors?.includes('ground'));
  const upperRooms = allRooms.filter(r => r.floors?.includes('upper'));
  const basementRooms = allRooms.filter(r => r.floors?.includes('basement'));
  const roofRooms = allRooms.filter(r => r.floors?.includes('roof'));
  
  console.log('[initializeRoomDeck] Ground:', groundRooms.length, '(including single-door rooms)');
  console.log('[initializeRoomDeck] Upper:', upperRooms.length, '(including single-door rooms)');
  console.log('[initializeRoomDeck] Basement:', basementRooms.length, '(including single-door rooms)');
  console.log('[initializeRoomDeck] Roof:', roofRooms.length, '(including single-door rooms)');
  
  return {
    ground: rng.shuffle(groundRooms),
    upper: rng.shuffle(upperRooms),
    basement: rng.shuffle(basementRooms),
    roof: rng.shuffle(roofRooms),
    drawn: new Set(),
  };
}

/**
 * 初始化卡牌堆 (Issue #188)
 * 使用 string[] 存儲卡牌 ID，確保可序列化和跨組件共享
 */
function initializeCardDecks(rng: SeededRng): CardDecks {
  const createDeck = (cards: Card[]): { remaining: string[]; drawn: string[]; discarded: string[] } => ({
    remaining: rng.shuffle([...cards]).map(c => c.id),
    drawn: [],
    discarded: [],
  });

  return {
    event: createDeck(EVENT_CARDS),
    item: createDeck(ITEM_CARDS),
    omen: createDeck(OMEN_CARDS),
  };
}

// ==================== 玩家初始化 ====================

/**
 * 建立玩家
 */
function createPlayer(
  id: string,
  name: string,
  character: Character,
  position: Position3D
): Player {
  return {
    id,
    name,
    character,
    position,
    currentStats: {
      speed: character.stats.speed[1],
      might: character.stats.might[1],
      sanity: character.stats.sanity[1],
      knowledge: character.stats.knowledge[1],
    },
    items: [],
    omens: [],
    isTraitor: false,
    isDead: false,
    usedItemsThisTurn: [],
  };
}

// ==================== 回合初始化 ====================

/**
 * 初始化回合狀態
 */
function initializeTurnState(currentPlayerId: string): TurnState {
  return {
    currentPlayerId,
    turnNumber: 1,
    movesRemaining: 0, // 將在開始回合時根據 Speed 設定
    hasDiscoveredRoom: false,
    hasDrawnCard: false,
    hasEnded: false,
    usedSpecialActions: [],
    usedItems: [],
  };
}

// ==================== 其他狀態初始化 ====================

/**
 * 初始化作祟狀態
 */
function initializeHauntState(): HauntState {
  return {
    isActive: false,
    type: 'none',
    hauntNumber: null,
    traitorPlayerId: null,
    omenCount: 0,
    heroObjective: null,
    traitorObjective: null,
  };
}

/**
 * 初始化戰鬥狀態
 */
function initializeCombatState(): CombatState {
  return {
    isActive: false,
    attackerId: null,
    defenderId: null,
    usedStat: null,
    attackerRoll: null,
    defenderRoll: null,
    damage: null,
  };
}

// ==================== 輔助函數 ====================

/**
 * 深拷貝（支援 Set 和 Date）
 */
function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Set) {
    return new Set(obj) as unknown as T;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item)) as unknown as T;
  }

  const cloned = {} as T;
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  return cloned;
}

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 生成 Action ID
 */
function generateActionId(): string {
  return `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 取得當前時間戳
 */
function now(): number {
  return Date.now();
}

/**
 * 新增日誌項目
 */
function addLogEntry(
  state: GameState,
  playerId: string,
  actionType: string,
  description: string,
  data?: Record<string, unknown>
): GameState {
  const entry: GameLogEntry = {
    timestamp: now(),
    turn: state.turn.turnNumber,
    playerId,
    actionType,
    description,
    data,
  };
  return {
    ...state,
    log: [...state.log, entry],
    updatedAt: now(),
  };
}

// ==================== GameState 類別 ====================

export class GameStateManager {
  private state: GameState;
  private rng: SeededRng;

  constructor(state?: GameState) {
    if (state) {
      this.state = deepClone(state);
      this.rng = SeededRng.fromState(state.rngState);
    } else {
      throw new Error('Use GameStateManager.createNew() to create a new game');
    }
  }

  /**
   * 建立新遊戲
   */
  static createNew(config: GameConfig, characters: Character[]): GameStateManager {
    const rng = new SeededRng(config.seed);
    const gameId = `game-${now()}-${Math.random().toString(36).substr(2, 9)}`;

    // 初始化地圖並放置起始房間
    let map = initializeGameMap();
    map = placeStartingRooms(map, OFFICIAL_ROOMS);

    // 建立玩家（從入口大廳開始）
    const startingPosition: Position3D = { x: MAP_CENTER, y: MAP_CENTER, floor: 'ground' };
    const players = characters.map((char, index) =>
      createPlayer(
        `player-${index}`,
        `Player ${index + 1}`,
        char,
        startingPosition
      )
    );

    const playerOrder = players.map(p => p.id);

    // 初始化回合狀態
    const turn = initializeTurnState(playerOrder[0]);
    turn.movesRemaining = players[0].currentStats.speed;

    // 初始化已放置房間 ID 集合（包含起始房間）
    const placedRoomIds = new Set<string>([
      'entrance_hall',
      'upper_landing',
      'basement_landing'
    ]);

    const state: GameState = {
      gameId,
      version: '1.0.0',
      phase: 'exploration',
      result: 'ongoing',
      config,
      map,
      players,
      playerOrder,
      turn,
      cardDecks: initializeCardDecks(rng),
      roomDeck: initializeRoomDeck(rng),
      haunt: initializeHauntState(),
      combat: initializeCombatState(),
      log: [],
      createdAt: now(),
      updatedAt: now(),
      rngState: rng.getState(),
      placedRoomIds,
    };

    const manager = new GameStateManager(state);
    manager.rng = rng;
    return manager;
  }

  /**
   * 取得當前狀態
   */
  getState(): GameState {
    return deepClone(this.state);
  }

  /**
   * 序列化狀態為 JSON
   */
  serialize(): string {
    // 將 Set 轉換為陣列以便序列化
    const state = this.getState();
    const serialized = {
      ...state,
      roomDeck: {
        ...state.roomDeck,
        drawn: Array.from(state.roomDeck.drawn),
      },
      placedRoomIds: Array.from(state.placedRoomIds),
    };
    return JSON.stringify(serialized);
  }

  /**
   * 從 JSON 反序列化
   */
  static deserialize(json: string): GameStateManager {
    const parsed = JSON.parse(json);
    // 將陣列轉換回 Set
    const state: GameState = {
      ...parsed,
      roomDeck: {
        ground: parsed.roomDeck.ground || [],
        upper: parsed.roomDeck.upper || [],
        basement: parsed.roomDeck.basement || [],
        drawn: new Set(parsed.roomDeck.drawn || []),
      },
      placedRoomIds: new Set(parsed.placedRoomIds || []),
    };
    return new GameStateManager(state);
  }

  /**
   * 應用動作（核心狀態轉換函數）
   */
  applyAction(action: GameAction): GameState {
    // 更新動作 ID 和時間戳
    const fullAction = {
      ...action,
      actionId: generateActionId(),
      timestamp: now(),
    };

    let newState = this.state;

    switch (fullAction.type) {
      case 'MOVE':
        newState = this.handleMove(fullAction as MoveAction);
        break;
      case 'DISCOVER':
        newState = this.handleDiscover(fullAction as DiscoverAction);
        break;
      case 'DRAW_CARD':
        newState = this.handleDrawCard(fullAction as DrawCardAction);
        break;
      case 'USE_ITEM':
        newState = this.handleUseItem(fullAction as UseItemAction);
        break;
      case 'END_TURN':
        newState = this.handleEndTurn(fullAction as EndTurnAction);
        break;
      case 'STAT_CHECK':
        newState = this.handleStatCheck(fullAction as StatCheckAction);
        break;
      case 'HAUNT_CHECK':
        newState = this.handleHauntCheck(fullAction as HauntCheckAction);
        break;
      case 'COMBAT':
        newState = this.handleCombat(fullAction as CombatAction);
        break;
      default:
        throw new Error(`Unknown action type: ${(fullAction as GameAction).type}`);
    }

    // 更新 RNG 狀態
    newState = {
      ...newState,
      rngState: this.rng.getState(),
      updatedAt: now(),
    };

    this.state = newState;
    return this.getState();
  }

  // ==================== 動作處理器 ====================

  private handleMove(action: MoveAction): GameState {
    const player = this.state.players.find(p => p.id === action.playerId);
    if (!player) throw new Error(`Player not found: ${action.playerId}`);

    // 驗證移動合法性（簡化版，實際需要檢查路徑）
    const target = action.to;
    const floorMap = this.getFloorMap(target.floor);
    const tile = floorMap[target.y]?.[target.x];
    
    if (!tile || !tile.discovered) {
      throw new Error('Cannot move to undiscovered tile');
    }

    // 更新玩家位置
    const updatedPlayers = this.state.players.map(p =>
      p.id === action.playerId ? { ...p, position: target } : p
    );

    // 計算移動消耗
    const movesUsed = action.path.length;
    const newMovesRemaining = this.state.turn.movesRemaining - movesUsed;

    let newState: GameState = {
      ...this.state,
      players: updatedPlayers,
      turn: {
        ...this.state.turn,
        movesRemaining: Math.max(0, newMovesRemaining),
      },
    };

    // 新增日誌
    newState = addLogEntry(
      newState,
      action.playerId,
      'MOVE',
      `${player.name} 移動到 (${target.x}, ${target.y})`,
      { from: player.position, to: target }
    );

    return newState;
  }

  private handleDiscover(action: DiscoverAction): GameState {
    const player = this.state.players.find(p => p.id === action.playerId);
    if (!player) throw new Error(`Player not found: ${action.playerId}`);

    // 放置新房間
    const floorMap = this.getFloorMap(action.position.floor);
    const newTile: Tile = {
      x: action.position.x,
      y: action.position.y,
      floor: action.position.floor,
      room: action.room,
      discovered: true,
      rotation: action.rotation,
      placementOrder: this.state.map.placedRoomCount + 1,
    };

    // 更新地圖
    const newFloorMap = floorMap.map((row, y) =>
      row.map((tile, x) =>
        x === action.position.x && y === action.position.y ? newTile : tile
      )
    );

    const newMap = {
      ...this.state.map,
      [action.position.floor]: newFloorMap,
      placedRoomCount: this.state.map.placedRoomCount + 1,
    };

    // 更新玩家位置到新發現的房間
    const updatedPlayers = this.state.players.map(p =>
      p.id === action.playerId ? { ...p, position: action.position } : p
    );

    // 更新已放置房間 ID 集合
    // 注意：this.state 是通過 deepClone 取得的，placedRoomIds 已經是 Set
    const newPlacedRoomIds = new Set(this.state.placedRoomIds);
    newPlacedRoomIds.add(action.room.id);

    // 更新房間牌堆的已抽取集合
    const newRoomDeckDrawn = new Set(this.state.roomDeck.drawn);
    newRoomDeckDrawn.add(action.room.id);

    let newState: GameState = {
      ...this.state,
      map: newMap,
      players: updatedPlayers,
      turn: {
        ...this.state.turn,
        hasDiscoveredRoom: true,
        // 發現新房間後回合自動結束
        hasEnded: true,
      },
      placedRoomIds: newPlacedRoomIds,
      roomDeck: {
        ...this.state.roomDeck,
        drawn: newRoomDeckDrawn,
      },
    };

    // 新增日誌
    newState = addLogEntry(
      newState,
      action.playerId,
      'DISCOVER',
      `${player.name} 發現了 ${action.room.name}`,
      { room: action.room, position: action.position }
    );

    return newState;
  }

  private handleDrawCard(action: DrawCardAction): GameState {
    const player = this.state.players.find(p => p.id === action.playerId);
    if (!player) throw new Error(`Player not found: ${action.playerId}`);

    // 更新卡牌堆
    const deckType = action.cardType;
    const deck = this.state.cardDecks[deckType];
    
    const newRemaining = deck.remaining.slice(0, -1);
    const newDrawn = [...deck.drawn, action.card];

    const newCardDecks = {
      ...this.state.cardDecks,
      [deckType]: {
        ...deck,
        remaining: newRemaining,
        drawn: newDrawn,
      },
    };

    // 更新玩家持有的卡
    const updatedPlayers = this.state.players.map(p => {
      if (p.id !== action.playerId) return p;
      
      if (action.cardType === 'omen') {
        return { ...p, omens: [...p.omens, action.card] };
      } else if (action.cardType === 'item') {
        return { ...p, items: [...p.items, action.card] };
      }
      return p;
    });

    // 更新作祟計數（如果是預兆卡）
    let newHaunt = this.state.haunt;
    if (action.cardType === 'omen') {
      newHaunt = {
        ...newHaunt,
        omenCount: newHaunt.omenCount + 1,
      };
    }

    let newState: GameState = {
      ...this.state,
      players: updatedPlayers,
      cardDecks: newCardDecks,
      haunt: newHaunt,
      turn: {
        ...this.state.turn,
        hasDrawnCard: true,
      },
    };

    // 新增日誌
    newState = addLogEntry(
      newState,
      action.playerId,
      'DRAW_CARD',
      `${player.name} 抽了 ${action.cardType} 卡: ${action.card.name}`,
      { card: action.card }
    );

    return newState;
  }

  private handleUseItem(action: UseItemAction): GameState {
    const player = this.state.players.find(p => p.id === action.playerId);
    if (!player) throw new Error(`Player not found: ${action.playerId}`);

    // 檢查物品是否存在且本回合未使用
    const item = player.items.find(i => i.id === action.itemId) ||
                 player.omens.find(o => o.id === action.itemId);
    
    if (!item) throw new Error(`Item not found: ${action.itemId}`);
    if (player.usedItemsThisTurn.includes(action.itemId)) {
      throw new Error(`Item already used this turn: ${action.itemId}`);
    }

    // 更新玩家已使用物品列表
    const updatedPlayers = this.state.players.map(p =>
      p.id === action.playerId
        ? { ...p, usedItemsThisTurn: [...p.usedItemsThisTurn, action.itemId] }
        : p
    );

    let newState: GameState = {
      ...this.state,
      players: updatedPlayers,
      turn: {
        ...this.state.turn,
        usedItems: [...this.state.turn.usedItems, action.itemId],
      },
    };

    // 新增日誌
    newState = addLogEntry(
      newState,
      action.playerId,
      'USE_ITEM',
      `${player.name} 使用了 ${item.name}`,
      { itemId: action.itemId, target: action.target }
    );

    return newState;
  }

  private handleEndTurn(action: EndTurnAction): GameState {
    const player = this.state.players.find(p => p.id === action.playerId);
    if (!player) throw new Error(`Player not found: ${action.playerId}`);

    // 找到下一個玩家
    const currentIndex = this.state.playerOrder.indexOf(action.playerId);
    const nextIndex = (currentIndex + 1) % this.state.playerOrder.length;
    const nextPlayerId = this.state.playerOrder[nextIndex];
    const nextPlayer = this.state.players.find(p => p.id === nextPlayerId)!;

    // 計算新回合數
    const isNewRound = nextIndex === 0;
    const newTurnNumber = isNewRound
      ? this.state.turn.turnNumber + 1
      : this.state.turn.turnNumber;

    let newState: GameState = {
      ...this.state,
      turn: {
        currentPlayerId: nextPlayerId,
        turnNumber: newTurnNumber,
        movesRemaining: nextPlayer.currentStats.speed,
        hasDiscoveredRoom: false,
        hasDrawnCard: false,
        hasEnded: false,
        usedSpecialActions: [],
        usedItems: [],
      },
      players: this.state.players.map(p =>
        p.id === action.playerId
          ? { ...p, usedItemsThisTurn: [] }
          : p
      ),
    };

    // 新增日誌
    newState = addLogEntry(
      newState,
      action.playerId,
      'END_TURN',
      `${player.name} 結束回合，輪到 ${nextPlayer.name}`,
      { nextPlayerId }
    );

    return newState;
  }

  private handleStatCheck(action: StatCheckAction): GameState {
    const player = this.state.players.find(p => p.id === action.playerId);
    if (!player) throw new Error(`Player not found: ${action.playerId}`);

    let newState = addLogEntry(
      this.state,
      action.playerId,
      'STAT_CHECK',
      `${player.name} 進行 ${action.stat} 檢定: 擲出 ${action.roll.total} (${action.success ? '成功' : '失敗'})`,
      { stat: action.stat, target: action.target, roll: action.roll, success: action.success }
    );

    return newState;
  }

  private handleHauntCheck(action: HauntCheckAction): GameState {
    const player = this.state.players.find(p => p.id === action.playerId);
    if (!player) throw new Error(`Player not found: ${action.playerId}`);

    let newState = this.state;

    if (action.triggered) {
      // 觸發作祟
      newState = {
        ...newState,
        phase: 'haunt_reveal',
        haunt: {
          ...newState.haunt,
          isActive: true,
        },
      };
    }

    newState = addLogEntry(
      newState,
      action.playerId,
      'HAUNT_CHECK',
      action.triggered
        ? `${player.name} 的作祟檢定觸發了作祟！`
        : `${player.name} 的作祟檢定未觸發作祟（擲出 ${action.roll.total}）`,
      { roll: action.roll, triggered: action.triggered }
    );

    return newState;
  }

  private handleCombat(action: CombatAction): GameState {
    const player = this.state.players.find(p => p.id === action.playerId);
    if (!player) throw new Error(`Player not found: ${action.playerId}`);

    let newState = addLogEntry(
      this.state,
      action.playerId,
      'COMBAT',
      `${player.name} 進行戰鬥: ${action.combatType}`,
      { combatType: action.combatType, targetId: action.targetId, roll: action.roll }
    );

    return newState;
  }

  // ==================== 輔助方法 ====================

  private getFloorMap(floor: Floor): FloorMap {
    return this.state.map[floor];
  }

  /**
   * 從房間牌堆抽一張房間
   * Issue #72: 所有房間都在主牌堆
   * 
   * @param floor 樓層
   * @returns 抽取的房間，如果牌堆為空則返回 null
   */
  drawRoomFromDeck(floor: Floor): Room | null {
    const deck = this.state.roomDeck[floor];
    if (!deck) {
      console.error(`[drawRoomFromDeck] Invalid floor: ${floor}`);
      return null;
    }
    const availableRoom = deck.find((r: Room) => !this.state.roomDeck.drawn.has(r.id));
    
    if (availableRoom) {
      // 更新已抽出集合
      const newDrawn = new Set(this.state.roomDeck.drawn);
      newDrawn.add(availableRoom.id);

      this.state = {
        ...this.state,
        roomDeck: {
          ...this.state.roomDeck,
          drawn: newDrawn,
        },
      };

      return availableRoom;
    }

    return null;
  }

  /**
   * 從卡牌堆抽一張卡 (Issue #188)
   * 現在 remaining 存儲的是卡牌 ID，需要查找對應的 Card 物件
   */
  drawCardFromDeck(type: CardType): Card | null {
    const deck = this.state.cardDecks[type];
    if (deck.remaining.length === 0) return null;

    const cardId = deck.remaining[deck.remaining.length - 1];

    // 根據卡牌類型查找對應的卡牌資料
    let card: Card | undefined;
    switch (type) {
      case 'event':
        card = EVENT_CARDS.find(c => c.id === cardId);
        break;
      case 'item':
        card = ITEM_CARDS.find(c => c.id === cardId);
        break;
      case 'omen':
        card = OMEN_CARDS.find(c => c.id === cardId);
        break;
    }

    if (!card) return null;

    this.state = {
      ...this.state,
      cardDecks: {
        ...this.state.cardDecks,
        [type]: {
          ...deck,
          remaining: deck.remaining.slice(0, -1),
          drawn: [...deck.drawn, cardId],
        },
      },
    };

    return card;
  }

  /**
   * 擲骰子
   */
  rollDice(count: number): DiceRoll {
    return this.rng.rollDice(count);
  }

  /**
   * 取得當前玩家
   */
  getCurrentPlayer(): Player | undefined {
    return this.state.players.find(p => p.id === this.state.turn.currentPlayerId);
  }

  /**
   * 取得指定位置的 Tile
   */
  getTileAt(position: Position3D): Tile | undefined {
    const floorMap = this.state.map[position.floor];
    return floorMap[position.y]?.[position.x];
  }

  /**
   * 檢查是否可以移動到指定位置
   */
  canMoveTo(from: Position3D, to: Position3D): boolean {
    const tile = this.getTileAt(to);
    return tile?.discovered ?? false;
  }

  // ==================== 房間發現輔助方法 ====================

  /**
   * 獲取已發現的房間列表
   * 用於追蹤遊戲中所有已發現的房間
   * 
   * @returns 已發現房間的列表
   */
  getDiscoveredRooms(): Room[] {
    const discovered: Room[] = [];
    const floors: Floor[] = ['ground', 'upper', 'basement'];
    
    for (const floor of floors) {
      const floorMap = this.state.map[floor];
      for (const row of floorMap) {
        for (const tile of row) {
          if (tile.discovered && tile.room) {
            discovered.push(tile.room);
          }
        }
      }
    }
    
    return discovered;
  }

  /**
   * 獲取指定樓層的房間牌堆
   * 
   * @param floor 樓層
   * @returns 該樓層的房間牌堆
   */
  getRoomDeck(floor: Floor): Room[] {
    return this.state.roomDeck[floor];
  }

  /**
   * 獲取房間牌堆統計
   * 
   * @returns 各樓層牌堆剩餘數量
   */
  getRoomDeckStats(): { ground: number; upper: number; basement: number; total: number } {
    const countRemaining = (floor: Floor): number => {
      return this.state.roomDeck[floor].filter(r => !this.state.roomDeck.drawn.has(r.id)).length;
    };

    const ground = countRemaining('ground');
    const upper = countRemaining('upper');
    const basement = countRemaining('basement');

    return { ground, upper, basement, total: ground + upper + basement };
  }

  /**
   * 檢查房間是否已被抽取
   * 
   * @param roomId 房間 ID
   * @returns 是否已被抽取
   */
  isRoomDrawn(roomId: string): boolean {
    return this.state.roomDeck.drawn.has(roomId);
  }

  /**
   * 標記房間為已抽取
   * 
   * @param roomId 房間 ID
   */
  markRoomAsDrawn(roomId: string): void {
    const newDrawn = new Set(this.state.roomDeck.drawn);
    newDrawn.add(roomId);
    this.state = {
      ...this.state,
      roomDeck: {
        ...this.state.roomDeck,
        drawn: newDrawn,
      },
    };
  }
}

// ==================== 匯出 ====================

export {
  initializeGameMap,
  placeStartingRooms,
  initializeRoomDeck,
  initializeCardDecks,
  createPlayer,
  initializeTurnState,
  initializeHauntState,
  initializeCombatState,
  deepClone,
  generateId,
  generateActionId,
  now,
};

export default GameStateManager;
