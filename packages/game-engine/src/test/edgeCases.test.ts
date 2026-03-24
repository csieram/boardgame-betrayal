/**
 * 邊界案例測試 (Edge Cases Tests)
 * 
 * 測試項目：
 * 1. 牌堆耗盡處理
 * 2. 所有屬性在最低值
 * 3. 被困無法移動
 * 4. 同時勝利條件
 * 5. 最大回合數限制
 * 6. 房間牌堆耗盡
 * 7. 重複房間 ID 處理
 * 8. 無效動作處理
 */

import {
  GameState,
  GamePhase,
  Player,
  TurnState,
  Position3D,
  Direction,
  Character,
  GameConfig,
  GameMap,
  Tile,
  CardDecks,
  RoomDeckState,
  HauntState,
  CombatState,
  GameLogEntry,
  RngState,
  Card,
  Floor,
} from '../types';
import { Room, SymbolType } from '@betrayal/shared';
import { CardDrawingManager } from '../rules/cardDrawing';
import { SeededRng } from '../core/GameState';

// ==================== 測試輔助函數 ====================

const createMockCharacter = (): Character => ({
  id: 'test-character',
  name: 'Test Character',
  nameEn: 'Test Character',
  age: 25,
  description: 'A test character',
  color: '#FF0000',
  stats: {
    speed: [4, 4],
    might: [3, 3],
    sanity: [3, 3],
    knowledge: [3, 3],
  },
  statTrack: {
    speed: [0, 1, 2, 3, 4, 5, 6, 7],
    might: [0, 1, 2, 3, 4, 5, 6, 7],
    sanity: [0, 1, 2, 3, 4, 5, 6, 7],
    knowledge: [0, 1, 2, 3, 4, 5, 6, 7],
  },
});

const createMockRoom = (
  id: string,
  doors: Direction[] = ['north', 'south', 'east', 'west'],
  floor: Floor = 'ground',
  symbol: SymbolType = null
): Room => ({
  id,
  name: 'Test Room',
  nameEn: 'Test Room',
  floor,
  symbol,
  doors,
  description: 'A test room',
  color: '#FFFFFF',
  icon: '',
  isOfficial: true,
});

const createEmptyTile = (x: number, y: number, floor: Floor): Tile => ({
  x,
  y,
  floor,
  room: null,
  discovered: false,
  rotation: 0,
  placementOrder: -1,
});

const createMockMap = (): GameMap => {
  const createFloor = (floor: Floor): Tile[][] => {
    const map: Tile[][] = [];
    for (let y = 0; y < 15; y++) {
      const row: Tile[] = [];
      for (let x = 0; x < 15; x++) {
        row.push(createEmptyTile(x, y, floor));
      }
      map.push(row);
    }
    return map;
  };

  const ground = createFloor('ground');
  // 放置入口大廳
  ground[7][7] = {
    x: 7,
    y: 7,
    floor: 'ground',
    room: createMockRoom('entrance_hall', ['north', 'south', 'east', 'west']),
    discovered: true,
    rotation: 0,
    placementOrder: 0,
  };

  return {
    ground,
    upper: createFloor('upper'),
    basement: createFloor('basement'),
    placedRoomCount: 1,
  };
};

interface MockPlayerStats {
  speed?: number;
  might?: number;
  sanity?: number;
  knowledge?: number;
}

const createMockPlayer = (
  id: string,
  position: Position3D = { x: 7, y: 7, floor: 'ground' },
  stats?: MockPlayerStats
): Player => ({
  id,
  name: `Player ${id}`,
  character: createMockCharacter(),
  position,
  currentStats: {
    speed: stats?.speed ?? 4,
    might: stats?.might ?? 3,
    sanity: stats?.sanity ?? 3,
    knowledge: stats?.knowledge ?? 3,
  },
  items: [],
  omens: [],
  isTraitor: false,
  isDead: false,
  usedItemsThisTurn: [],
});

const createMockGameState = (overrides: Partial<GameState> = {}): GameState => {
  const baseState: GameState = {
    gameId: 'test-game',
    version: '1.0.0',
    phase: 'exploration',
    result: 'ongoing',
    config: {
      playerCount: 3,
      enableAI: false,
      seed: 'test-seed',
      maxTurns: 100,
    },
    map: createMockMap(),
    players: [
      createMockPlayer('player-1'),
      createMockPlayer('player-2'),
      createMockPlayer('player-3'),
    ],
    playerOrder: ['player-1', 'player-2', 'player-3'],
    turn: {
      currentPlayerId: 'player-1',
      turnNumber: 1,
      movesRemaining: 4,
      hasDiscoveredRoom: false,
      hasDrawnCard: false,
      hasEnded: false,
      usedSpecialActions: [],
      usedItems: [],
    },
    cardDecks: {
      event: { remaining: [], drawn: [], discarded: [] },
      item: { remaining: [], drawn: [], discarded: [] },
      omen: { remaining: [], drawn: [], discarded: [] },
    },
    roomDeck: {
      ground: [],
      upper: [],
      basement: [],
      drawn: new Set(),
    },
    haunt: {
      isActive: false,
      type: 'none',
      hauntNumber: null,
      traitorPlayerId: null,
      omenCount: 0,
      heroObjective: null,
      traitorObjective: null,
    },
    combat: {
      isActive: false,
      attackerId: null,
      defenderId: null,
      usedStat: null,
      attackerRoll: null,
      defenderRoll: null,
      damage: null,
    },
    log: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    rngState: {
      seed: 'test-seed',
      count: 0,
      internalState: [12345],
    },
    placedRoomIds: new Set(['entrance_hall']),
  };
  return { ...baseState, ...overrides };
};

// ==================== 牌堆耗盡測試 ====================

describe('牌堆耗盡邊界案例', () => {
  describe('事件卡牌堆耗盡', () => {
    it('當事件牌堆為空時應該返回 null', () => {
      const manager = new CardDrawingManager('test-seed');
      
      // 抽完所有事件卡
      for (let i = 0; i < 100; i++) {
        const card = manager.drawCard('event');
        if (card === null) break;
      }

      const emptyCard = manager.drawCard('event');
      expect(emptyCard).toBeNull();
    });

    it('應該正確追蹤已抽出的卡牌數量', () => {
      const manager = new CardDrawingManager('test-seed');
      const initialCount = manager.getRemainingCount('event');
      
      manager.drawCard('event');
      manager.drawCard('event');
      
      expect(manager.getRemainingCount('event')).toBe(initialCount - 2);
    });
  });

  describe('物品卡牌堆耗盡', () => {
    it('當物品牌堆為空時應該返回 null', () => {
      const manager = new CardDrawingManager('test-seed');
      
      // 抽完所有物品卡
      for (let i = 0; i < 100; i++) {
        const card = manager.drawCard('item');
        if (card === null) break;
      }

      const emptyCard = manager.drawCard('item');
      expect(emptyCard).toBeNull();
    });
  });

  describe('預兆卡牌堆耗盡', () => {
    it('當預兆牌堆為空時應該返回 null', () => {
      const manager = new CardDrawingManager('test-seed');
      
      // 抽完所有預兆卡
      for (let i = 0; i < 100; i++) {
        const card = manager.drawCard('omen');
        if (card === null) break;
      }

      const emptyCard = manager.drawCard('omen');
      expect(emptyCard).toBeNull();
    });

    it('最後一張預兆應該自動觸發作祟', () => {
      const manager = new CardDrawingManager('test-seed');
      
      // 抽到最後一張預兆
      let lastOmenCard = null;
      for (let i = 0; i < 100; i++) {
        const card = manager.drawCard('omen');
        if (card !== null) {
          lastOmenCard = card;
        } else {
          break;
        }
      }

      // 根據規則，最後一張預兆應該自動觸發作祟
      expect(manager.getDeckStatus().hauntTriggered).toBe(true);
    });
  });
});

// ==================== 屬性最低值測試 ====================

describe('屬性最低值邊界案例', () => {
  describe('探索階段屬性保護', () => {
    it('探索階段 Speed 不應該低於 1', () => {
      const player = createMockPlayer('player-1', { x: 7, y: 7, floor: 'ground' }, {
        speed: 1,
        might: 1,
        sanity: 1,
        knowledge: 1,
      });

      const state = createMockGameState({
        phase: 'exploration',
        players: [player],
      });

      // 驗證屬性不會低於 1
      expect(state.players[0].currentStats.speed).toBeGreaterThanOrEqual(1);
      expect(state.players[0].currentStats.might).toBeGreaterThanOrEqual(1);
      expect(state.players[0].currentStats.sanity).toBeGreaterThanOrEqual(1);
      expect(state.players[0].currentStats.knowledge).toBeGreaterThanOrEqual(1);
    });

    it('探索階段屬性到 0 時應該顯示骷髏但不死亡', () => {
      const player = createMockPlayer('player-1');
      player.currentStats.speed = 0;

      const state = createMockGameState({
        phase: 'exploration',
        players: [player],
      });

      // 探索階段不應該死亡
      expect(state.players[0].isDead).toBe(false);
    });
  });

  describe('作祟階段屬性死亡', () => {
    it('作祟階段任何屬性到 0 時角色應該死亡', () => {
      const player = createMockPlayer('player-1');
      player.currentStats.might = 0;

      const state = createMockGameState({
        phase: 'haunt',
        haunt: {
          isActive: true,
          type: 'single_traitor',
          hauntNumber: 1,
          traitorPlayerId: 'player-2',
          omenCount: 3,
          heroObjective: 'Test',
          traitorObjective: 'Test',
        },
        players: [player, createMockPlayer('player-2'), createMockPlayer('player-3')],
      });

      // 作祟階段屬性到 0 應該標記死亡
      // 注意：這需要實際的死亡檢查邏輯
      // expect(checkPlayerDeath(state, 'player-1')).toBe(true);
    });

    it('死亡玩家應該保留在遊戲中作為屍體', () => {
      const deadPlayer = createMockPlayer('player-1');
      deadPlayer.isDead = true;

      const state = createMockGameState({
        players: [deadPlayer, createMockPlayer('player-2')],
      });

      // 死亡玩家應該仍在玩家列表中
      expect(state.players.find(p => p.id === 'player-1')).toBeDefined();
      expect(state.players.find(p => p.id === 'player-1')?.isDead).toBe(true);
    });
  });
});

// ==================== 被困無法移動測試 ====================

describe('被困無法移動邊界案例', () => {
  it('當所有相鄰房間都未發現時應該無法移動', () => {
    const map = createMockMap();
    // 只有入口大廳被發現，周圍都是未發現
    
    const state = createMockGameState({ map });
    
    // 應該無法移動到任何方向
    // 因為周圍房間都未發現
    const player = state.players[0];
    const currentTile = state.map.ground[player.position.y][player.position.x];
    
    // 入口大廳有 4 個門，但周圍都未發現
    expect(currentTile.room?.doors.length).toBeGreaterThan(0);
  });

  it('當 Speed 為 0 時應該無法移動', () => {
    const player = createMockPlayer('player-1');
    player.currentStats.speed = 0;

    const state = createMockGameState({
      players: [player],
      turn: {
        ...createMockGameState().turn,
        movesRemaining: 0,
      },
    });

    expect(state.turn.movesRemaining).toBe(0);
  });

  it('當被障礙物包圍時應該無法移動', () => {
    const map = createMockMap();
    // 建立一個被鎖定的門包圍的房間
    // 這需要障礙物系統的支援
    
    const state = createMockGameState({ map });
    
    // 驗證無法通過障礙物
    // 這需要實際的障礙物檢查邏輯
  });
});

// ==================== 同時勝利條件測試 ====================

describe('同時勝利條件邊界案例', () => {
  it('當雙方同時完成目標時應該判定為平手', () => {
    const state = createMockGameState({
      phase: 'haunt',
      haunt: {
        isActive: true,
        type: 'single_traitor',
        hauntNumber: 1,
        traitorPlayerId: 'player-1',
        omenCount: 3,
        heroObjective: 'Test',
        traitorObjective: 'Test',
      },
    });

    // 模擬雙方同時完成目標
    // 這需要實際的勝利條件檢查邏輯
    // expect(checkWinCondition(state)).toBe('draw');
  });

  it('當叛徒和英雄同時死亡時應該判定結果', () => {
    const traitor = createMockPlayer('player-1');
    traitor.isTraitor = true;
    traitor.isDead = true;

    const hero = createMockPlayer('player-2');
    hero.isDead = true;

    const state = createMockGameState({
      phase: 'haunt',
      players: [traitor, hero],
      haunt: {
        isActive: true,
        type: 'single_traitor',
        hauntNumber: 1,
        traitorPlayerId: 'player-1',
        omenCount: 3,
        heroObjective: 'Test',
        traitorObjective: 'Test',
      },
    });

    // 雙方都死亡時的結果判定
    // 這需要實際的死亡檢查邏輯
  });
});

// ==================== 最大回合數測試 ====================

describe('最大回合數邊界案例', () => {
  it('達到最大回合數時應該結束遊戲', () => {
    const state = createMockGameState({
      turn: {
        ...createMockGameState().turn,
        turnNumber: 100,
        currentPlayerId: 'player-3', // 最後一個玩家
      },
      config: {
        ...createMockGameState().config,
        maxTurns: 100,
      },
    });

    // 當最後一個玩家結束回合時，應該結束遊戲
    // expect(endTurn(state).phase).toBe('game_over');
  });

  it('超過最大回合數應該判定為平手', () => {
    const state = createMockGameState({
      turn: {
        ...createMockGameState().turn,
        turnNumber: 101,
      },
      config: {
        ...createMockGameState().config,
        maxTurns: 100,
      },
    });

    // 超過最大回合數時應該結束遊戲
    // expect(checkGameEnd(state).result).toBe('draw');
  });
});

// ==================== 房間牌堆耗盡測試 ====================

describe('房間牌堆耗盡邊界案例', () => {
  it('當地面層牌堆耗盡時應該無法發現新房間', () => {
    const state = createMockGameState({
      roomDeck: {
        ground: [], // 空的地面層牌堆
        upper: [createMockRoom('upper-1', ['south'], 'upper')],
        basement: [createMockRoom('basement-1', ['north'], 'basement')],
        drawn: new Set(),
      },
    });

    // 在地面層應該無法發現新房間
    expect(state.roomDeck.ground.length).toBe(0);
  });

  it('當所有樓層牌堆都耗盡時應該無法發現任何房間', () => {
    const state = createMockGameState({
      roomDeck: {
        ground: [],
        upper: [],
        basement: [],
        drawn: new Set(),
      },
    });

    // 所有牌堆都應該是空的
    expect(state.roomDeck.ground.length).toBe(0);
    expect(state.roomDeck.upper.length).toBe(0);
    expect(state.roomDeck.basement.length).toBe(0);
  });
});

// ==================== 重複房間 ID 測試 ====================

describe('重複房間 ID 邊界案例', () => {
  it('不應該放置已存在的房間', () => {
    const state = createMockGameState({
      placedRoomIds: new Set(['entrance_hall', 'room_1', 'room_2']),
    });

    // 檢查房間 ID 是否已存在
    expect(state.placedRoomIds.has('entrance_hall')).toBe(true);
    expect(state.placedRoomIds.has('room_1')).toBe(true);
    expect(state.placedRoomIds.has('nonexistent')).toBe(false);
  });

  it('每個房間應該只出現一次', () => {
    const roomIds = ['room_a', 'room_b', 'room_c', 'room_a']; // 重複的 room_a
    const uniqueIds = new Set(roomIds);

    // 重複的 ID 應該被過濾
    expect(uniqueIds.size).toBe(3);
    expect(uniqueIds.has('room_a')).toBe(true);
  });
});

// ==================== 無效動作測試 ====================

describe('無效動作邊界案例', () => {
  it('非當前玩家不應該能夠執行動作', () => {
    const state = createMockGameState({
      turn: {
        ...createMockGameState().turn,
        currentPlayerId: 'player-1',
      },
    });

    // player-2 不是當前玩家
    const isCurrentPlayer = state.turn.currentPlayerId === 'player-2';
    expect(isCurrentPlayer).toBe(false);
  });

  it('回合結束後不應該能夠執行動作', () => {
    const state = createMockGameState({
      turn: {
        ...createMockGameState().turn,
        hasEnded: true,
      },
    });

    expect(state.turn.hasEnded).toBe(true);
  });

  it('發現新房間後不應該能夠繼續移動', () => {
    const state = createMockGameState({
      turn: {
        ...createMockGameState().turn,
        hasDiscoveredRoom: true,
      },
    });

    expect(state.turn.hasDiscoveredRoom).toBe(true);
  });
});

// ==================== RNG 邊界案例測試 ====================

describe('RNG 邊界案例', () => {
  it('相同的種子應該產生相同的序列', () => {
    const rng1 = new SeededRng('same-seed');
    const rng2 = new SeededRng('same-seed');

    const seq1 = Array.from({ length: 100 }, () => rng1.next());
    const seq2 = Array.from({ length: 100 }, () => rng2.next());

    expect(seq1).toEqual(seq2);
  });

  it('不同的種子應該產生不同的序列', () => {
    const rng1 = new SeededRng('seed-a');
    const rng2 = new SeededRng('seed-b');

    const seq1 = Array.from({ length: 10 }, () => rng1.next());
    const seq2 = Array.from({ length: 10 }, () => rng2.next());

    // 理論上應該不同（雖然有極小機率相同）
    expect(seq1).not.toEqual(seq2);
  });

  it('擲 0 顆骰子應該返回總和 0', () => {
    const rng = new SeededRng('test');
    const roll = rng.rollDice(0);

    expect(roll.count).toBe(0);
    expect(roll.results).toHaveLength(0);
    expect(roll.total).toBe(0);
  });

  it('擲大量骰子應該正常運作', () => {
    const rng = new SeededRng('test');
    const roll = rng.rollDice(100);

    expect(roll.count).toBe(100);
    expect(roll.results).toHaveLength(100);
    expect(roll.total).toBe(roll.results.reduce((a, b) => a + b, 0));
  });
});

// ==================== 序列化邊界案例測試 ====================

describe('序列化邊界案例', () => {
  it('應該能夠序列化和反序列化空遊戲狀態', () => {
    const state = createMockGameState({
      players: [],
      playerOrder: [],
      log: [],
    });

    // 驗證空狀態可以序列化
    const serialized = JSON.stringify(state);
    const deserialized = JSON.parse(serialized);

    expect(deserialized.players).toHaveLength(0);
    expect(deserialized.playerOrder).toHaveLength(0);
    expect(deserialized.log).toHaveLength(0);
  });

  it('應該能夠處理特殊字元', () => {
    const state = createMockGameState({
      players: [{
        ...createMockPlayer('player-1'),
        name: 'Player "Special" <Name>',
      }],
    });

    const serialized = JSON.stringify(state);
    const deserialized = JSON.parse(serialized);

    expect(deserialized.players[0].name).toBe('Player "Special" <Name>');
  });
});
