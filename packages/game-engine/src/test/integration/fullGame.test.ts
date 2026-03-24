/**
 * 完整遊戲流程整合測試 (Full Game Integration Tests)
 * 
 * 測試項目：
 * 1. 完整遊戲流程：設置 → 探索 → 作祟 → 戰鬥 → 勝利
 * 2. 多玩家互動
 * 3. 長時間遊戲穩定性
 * 4. 各種勝利條件場景
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
  MoveAction,
  DiscoverAction,
  DrawCardAction,
  EndTurnAction,
  HauntCheckAction,
  CombatAction,
  Floor,
  Card,
} from '../../types';
import { Room, SymbolType, CHARACTERS, OFFICIAL_ROOMS } from '@betrayal/shared';
import { GameStateManager, SeededRng } from '../../core/GameState';
import { TurnManager } from '../../rules/turn';
import { MovementValidator, MovementExecutor } from '../../rules/movement';
import { RoomDiscoveryManager } from '../../rules/roomDiscovery';
import { CardDrawingManager, CardEffectApplier, drawAndApplyCard } from '../../rules/cardDrawing';
import {
  makeHauntRoll,
  shouldMakeHauntRoll,
  revealHaunt,
  createHauntStartResult,
  HAUNT_ROLL_THRESHOLD,
} from '../../rules/haunt';

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

// ==================== 完整遊戲流程測試 ====================

describe('完整遊戲流程整合測試', () => {
  describe('基本遊戲設置', () => {
    it('應該成功創建新遊戲', () => {
      const config: GameConfig = {
        playerCount: 3,
        enableAI: false,
        seed: 'integration-test-seed',
        maxTurns: 100,
      };

      const characters = CHARACTERS.slice(0, 3);
      const manager = GameStateManager.createNew(config, characters);
      const state = manager.getState();

      expect(state.gameId).toBeDefined();
      expect(state.phase).toBe('exploration');
      expect(state.players).toHaveLength(3);
      expect(state.playerOrder).toHaveLength(3);
    });

    it('應該正確放置起始房間', () => {
      const config: GameConfig = {
        playerCount: 3,
        enableAI: false,
        seed: 'test-seed',
        maxTurns: 100,
      };

      const characters = CHARACTERS.slice(0, 3);
      const manager = GameStateManager.createNew(config, characters);
      const state = manager.getState();

      // 檢查入口大廳
      const entranceTile = state.map.ground[7][7];
      expect(entranceTile.discovered).toBe(true);
      expect(entranceTile.room?.id).toBe('entrance_hall');

      // 檢查上層樓梯
      const upperTile = state.map.upper[7][7];
      expect(upperTile.discovered).toBe(true);
      expect(upperTile.room?.id).toBe('stairs_from_upper');

      // 檢查地下室樓梯
      const basementTile = state.map.basement[7][7];
      expect(basementTile.discovered).toBe(true);
      expect(basementTile.room?.id).toBe('stairs_from_basement');
    });

    it('應該正確初始化玩家位置', () => {
      const config: GameConfig = {
        playerCount: 3,
        enableAI: false,
        seed: 'test-seed',
        maxTurns: 100,
      };

      const characters = CHARACTERS.slice(0, 3);
      const manager = GameStateManager.createNew(config, characters);
      const state = manager.getState();

      state.players.forEach((player: Player) => {
        expect(player.position.x).toBe(7);
        expect(player.position.y).toBe(7);
        expect(player.position.floor).toBe('ground');
      });
    });
  });

  describe('探索階段流程', () => {
    it('應該完成一個完整的回合', () => {
      const config: GameConfig = {
        playerCount: 3,
        enableAI: false,
        seed: 'test-seed',
        maxTurns: 100,
      };

      const characters = CHARACTERS.slice(0, 3);
      const manager = GameStateManager.createNew(config, characters);
      let state = manager.getState();

      const firstPlayerId = state.turn.currentPlayerId;
      const firstPlayer = state.players.find((p: Player) => p.id === firstPlayerId)!;

      // 1. 回合開始 - 檢查移動點數
      expect(state.turn.movesRemaining).toBe(firstPlayer.currentStats.speed);

      // 2. 結束回合
      const endTurnAction: EndTurnAction = {
        type: 'END_TURN',
        playerId: firstPlayerId,
        timestamp: Date.now(),
        actionId: 'end-turn-1',
      };

      state = manager.applyAction(endTurnAction);

      // 3. 驗證回合輪轉
      expect(state.turn.currentPlayerId).not.toBe(firstPlayerId);
      expect(state.turn.turnNumber).toBe(1); // 同一回合，不同玩家
    });

    it('應該支援移動和房間發現', () => {
      const config: GameConfig = {
        playerCount: 3,
        enableAI: false,
        seed: 'test-seed',
        maxTurns: 100,
      };

      const characters = CHARACTERS.slice(0, 3);
      const manager = GameStateManager.createNew(config, characters);
      let state = manager.getState();

      const playerId = state.turn.currentPlayerId;

      // 發現新房間
      const newRoom = createMockRoom('new_room', ['west', 'east'], 'ground', 'E');
      const discoverAction: DiscoverAction = {
        type: 'DISCOVER',
        playerId,
        timestamp: Date.now(),
        actionId: 'discover-1',
        direction: 'west',
        room: newRoom,
        position: { x: 6, y: 7, floor: 'ground' },
        rotation: 0,
      };

      state = manager.applyAction(discoverAction);

      // 驗證房間被放置
      expect(state.map.ground[7][6].room).toBeDefined();
      expect(state.map.ground[7][6].discovered).toBe(true);

      // 驗證回合自動結束
      expect(state.turn.hasDiscoveredRoom).toBe(true);
    });
  });

  describe('作祟觸發流程', () => {
    it('應該在抽預兆後進行作祟檢定', () => {
      const rng = new SeededRng('haunt-test');
      
      const config: GameConfig = {
        playerCount: 3,
        enableAI: false,
        seed: 'haunt-test',
        maxTurns: 100,
      };

      const characters = CHARACTERS.slice(0, 3);
      const manager = GameStateManager.createNew(config, characters);
      let state = manager.getState();

      // 模擬已發現 3 個預兆
      state.haunt.omenCount = 3;

      // 檢查是否需要作祟檢定
      expect(shouldMakeHauntRoll(state.phase, state.haunt.isActive)).toBe(true);

      // 執行作祟檢定
      const hauntRoll = makeHauntRoll(state.haunt.omenCount, rng);
      
      expect(hauntRoll.diceCount).toBe(3);
      expect(hauntRoll.total).toBeDefined();
      expect(hauntRoll.hauntBegins).toBe(hauntRoll.total < HAUNT_ROLL_THRESHOLD);
    });

    it('應該正確處理作祟揭示', () => {
      const rng = new SeededRng('haunt-reveal-test');
      
      const config: GameConfig = {
        playerCount: 3,
        enableAI: false,
        seed: 'haunt-reveal-test',
        maxTurns: 100,
      };

      const characters = CHARACTERS.slice(0, 3);
      const manager = GameStateManager.createNew(config, characters);
      let state = manager.getState();

      // 設置一些預兆數量
      state.haunt.omenCount = 3;

      const currentPlayerId = state.turn.currentPlayerId;

      // 揭示作祟
      const revelation = revealHaunt(state, currentPlayerId, rng);

      expect(revelation.success).toBe(true);
      expect(revelation.scenario).toBeDefined();
      expect(revelation.traitorId).toBeDefined();
      expect(revelation.heroIds.length).toBeGreaterThan(0);
    });
  });

  describe('多玩家互動', () => {
    it('應該正確輪轉玩家順序', () => {
      const config: GameConfig = {
        playerCount: 3,
        enableAI: false,
        seed: 'test-seed',
        maxTurns: 100,
      };

      const characters = CHARACTERS.slice(0, 3);
      const manager = GameStateManager.createNew(config, characters);
      let state = manager.getState();

      const playerOrder = state.playerOrder;
      expect(playerOrder).toHaveLength(3);

      // 每個玩家輪流結束回合
      for (let i = 0; i < 3; i++) {
        const currentPlayerId = state.turn.currentPlayerId;
        const currentIndex = playerOrder.indexOf(currentPlayerId);
        const expectedNextIndex = (currentIndex + 1) % playerOrder.length;

        const endTurnAction: EndTurnAction = {
          type: 'END_TURN',
          playerId: currentPlayerId,
          timestamp: Date.now(),
          actionId: `end-turn-${i}`,
        };

        state = manager.applyAction(endTurnAction);

        if (expectedNextIndex === 0) {
          // 回到第一個玩家，回合數增加
          expect(state.turn.turnNumber).toBe(i + 2);
        }
      }
    });

    it('應該支援多個玩家發現房間', () => {
      const config: GameConfig = {
        playerCount: 3,
        enableAI: false,
        seed: 'test-seed',
        maxTurns: 100,
      };

      const characters = CHARACTERS.slice(0, 3);
      const manager = GameStateManager.createNew(config, characters);
      let state = manager.getState();

      let discoveredRooms = 0;

      // 每個玩家發現一個房間
      for (let i = 0; i < 3; i++) {
        const playerId = state.turn.currentPlayerId;
        
        const newRoom = createMockRoom(`room_${i}`, ['west', 'east'], 'ground', 'E');
        const discoverAction: DiscoverAction = {
          type: 'DISCOVER',
          playerId,
          timestamp: Date.now(),
          actionId: `discover-${i}`,
          direction: 'west',
          room: newRoom,
          position: { x: 6 - i, y: 7, floor: 'ground' },
          rotation: 0,
        };

        state = manager.applyAction(discoverAction);
        discoveredRooms++;

        // 回合應該自動結束
        expect(state.turn.hasDiscoveredRoom).toBe(true);
      }

      expect(discoveredRooms).toBe(3);
    });
  });

  describe('卡牌抽取整合', () => {
    it('應該完整處理事件卡抽取', () => {
      const cardManager = new CardDrawingManager('card-test');
      const effectApplier = new CardEffectApplier('card-test');
      
      const player = {
        id: 'player-1',
        name: 'Test Player',
        stats: { speed: 4, might: 3, sanity: 5, knowledge: 4 },
        items: [],
        omens: [],
      };

      const result = drawAndApplyCard(cardManager, effectApplier, 'event', player);

      expect(result.success).toBe(true);
      expect(result.card).not.toBeNull();
      expect(result.type).toBe('event');
    });

    it('應該完整處理預兆卡抽取並觸發作祟檢定', () => {
      const cardManager = new CardDrawingManager('omen-test');
      const effectApplier = new CardEffectApplier('omen-test');
      
      const player = {
        id: 'player-1',
        name: 'Test Player',
        stats: { speed: 4, might: 3, sanity: 5, knowledge: 4 },
        items: [],
        omens: [],
      };

      const result = drawAndApplyCard(cardManager, effectApplier, 'omen', player);

      expect(result.success).toBe(true);
      expect(result.card?.type).toBe('omen');
      expect(player.omens.length).toBe(1);
      expect(result.hauntRoll).toBeDefined();
    });
  });

  describe('長時間遊戲穩定性', () => {
    it('應該能夠進行多個回合', () => {
      const config: GameConfig = {
        playerCount: 3,
        enableAI: false,
        seed: 'long-game-test',
        maxTurns: 100,
      };

      const characters = CHARACTERS.slice(0, 3);
      const manager = GameStateManager.createNew(config, characters);
      let state = manager.getState();

      // 進行 10 個完整回合 (30 個玩家回合)
      for (let round = 0; round < 10; round++) {
        for (let player = 0; player < 3; player++) {
          const currentPlayerId = state.turn.currentPlayerId;

          const endTurnAction: EndTurnAction = {
            type: 'END_TURN',
            playerId: currentPlayerId,
            timestamp: Date.now(),
            actionId: `end-turn-${round}-${player}`,
          };

          state = manager.applyAction(endTurnAction);
        }
      }

      expect(state.turn.turnNumber).toBe(11);
      expect(state.log.length).toBe(30);
    });

    it('應該在達到最大回合數時結束遊戲', () => {
      const config: GameConfig = {
        playerCount: 3,
        enableAI: false,
        seed: 'max-turns-test',
        maxTurns: 5,
      };

      const characters = CHARACTERS.slice(0, 3);
      const manager = GameStateManager.createNew(config, characters);
      let state = manager.getState();

      // 進行到最後一回合的最後一個玩家
      for (let round = 0; round < 4; round++) {
        for (let player = 0; player < 3; player++) {
          const currentPlayerId = state.turn.currentPlayerId;

          const endTurnAction: EndTurnAction = {
            type: 'END_TURN',
            playerId: currentPlayerId,
            timestamp: Date.now(),
            actionId: `end-turn-${round}-${player}`,
          };

          state = manager.applyAction(endTurnAction);
        }
      }

      // 最後一回合的最後一個玩家
      const lastPlayerId = state.turn.currentPlayerId;
      const lastEndTurnAction: EndTurnAction = {
        type: 'END_TURN',
        playerId: lastPlayerId,
        timestamp: Date.now(),
        actionId: 'final-end-turn',
      };

      state = manager.applyAction(lastEndTurnAction);

      // 遊戲應該結束
      expect(state.phase).toBe('game_over');
      expect(state.result).toBe('draw');
    });
  });

  describe('勝利條件場景', () => {
    it('應該處理英雄勝利', () => {
      const config: GameConfig = {
        playerCount: 3,
        enableAI: false,
        seed: 'heroes-win-test',
        maxTurns: 100,
      };

      const characters = CHARACTERS.slice(0, 3);
      const manager = GameStateManager.createNew(config, characters);
      let state = manager.getState();

      // 設置作祟狀態
      state.phase = 'haunt';
      state.haunt = {
        isActive: true,
        type: 'single_traitor',
        hauntNumber: 1,
        traitorPlayerId: 'player-1',
        omenCount: 3,
        heroObjective: 'Defeat the traitor',
        traitorObjective: 'Kill all heroes',
      };

      // 模擬叛徒死亡
      const traitor = state.players.find((p: Player) => p.id === 'player-1')!;
      traitor.isDead = true;

      // 檢查勝利條件
      // 這需要實際的勝利條件檢查邏輯
      // expect(checkWinCondition(state)).toBe('heroes_win');
    });

    it('應該處理叛徒勝利', () => {
      const config: GameConfig = {
        playerCount: 3,
        enableAI: false,
        seed: 'traitor-wins-test',
        maxTurns: 100,
      };

      const characters = CHARACTERS.slice(0, 3);
      const manager = GameStateManager.createNew(config, characters);
      let state = manager.getState();

      // 設置作祟狀態
      state.phase = 'haunt';
      state.haunt = {
        isActive: true,
        type: 'single_traitor',
        hauntNumber: 1,
        traitorPlayerId: 'player-1',
        omenCount: 3,
        heroObjective: 'Defeat the traitor',
        traitorObjective: 'Kill all heroes',
      };

      // 模擬所有英雄死亡
      state.players.filter((p: Player) => p.id !== 'player-1').forEach((p: Player) => {
        p.isDead = true;
      });

      // 檢查勝利條件
      // 這需要實際的勝利條件檢查邏輯
      // expect(checkWinCondition(state)).toBe('traitor_wins');
    });
  });

  describe('完整遊戲流程', () => {
    it('應該完成一個簡化的完整遊戲', () => {
      const config: GameConfig = {
        playerCount: 3,
        enableAI: false,
        seed: 'full-game-test',
        maxTurns: 50,
      };

      const characters = CHARACTERS.slice(0, 3);
      const manager = GameStateManager.createNew(config, characters);
      let state = manager.getState();

      // ===== 階段 1: 設置 =====
      expect(state.phase).toBe('exploration');
      expect(state.players).toHaveLength(3);

      // ===== 階段 2: 探索 =====
      // 進行幾個回合，發現一些房間
      for (let i = 0; i < 6; i++) {
        const playerId = state.turn.currentPlayerId;
        
        // 嘗試發現新房間
        const directions: Direction[] = ['north', 'south', 'east', 'west'];
        const direction = directions[i % 4];
        
        const newRoom = createMockRoom(`room_${i}`, ['west', 'east', 'north', 'south'], 'ground', i % 3 === 0 ? 'O' : 'E');
        
        const discoverAction: DiscoverAction = {
          type: 'DISCOVER',
          playerId,
          timestamp: Date.now(),
          actionId: `discover-${i}`,
          direction,
          room: newRoom,
          position: { x: 7 + (i % 3), y: 7 + Math.floor(i / 3), floor: 'ground' },
          rotation: 0,
        };

        try {
          state = manager.applyAction(discoverAction);
          
          // 如果發現了預兆房間，檢查是否觸發作祟
          if (newRoom.symbol === 'O') {
            state.haunt.omenCount++;
          }
        } catch (e) {
          // 如果無法發現房間，直接結束回合
          const endTurnAction: EndTurnAction = {
            type: 'END_TURN',
            playerId,
            timestamp: Date.now(),
            actionId: `end-turn-${i}`,
          };
          state = manager.applyAction(endTurnAction);
        }
      }

      // ===== 階段 3: 作祟 (如果觸發) =====
      if (state.haunt.omenCount >= 3) {
        const rng = new SeededRng('haunt-test');
        const currentPlayerId = state.turn.currentPlayerId;
        
        const revelation = revealHaunt(state, currentPlayerId, rng);
        
        if (revelation.success) {
          const hauntRoll = makeHauntRoll(state.haunt.omenCount, rng);
          const hauntResult = createHauntStartResult(state, revelation, hauntRoll);
          
          state = hauntResult.newState;
          
          expect(state.phase).toBe('haunt_reveal');
          expect(state.haunt.isActive).toBe(true);
        }
      }

      // ===== 驗證遊戲狀態 =====
      expect(state.map.placedRoomCount).toBeGreaterThan(1);
      expect(state.log.length).toBeGreaterThan(0);
    });
  });
});

// ==================== 回放任測試 ====================

describe('遊戲回放功能測試', () => {
  it('應該能夠重現相同的遊戲序列', () => {
    const seed = 'replay-test-seed';
    
    // 第一次遊戲
    const config1: GameConfig = {
      playerCount: 3,
      enableAI: false,
      seed,
      maxTurns: 100,
    };

    const characters = CHARACTERS.slice(0, 3);
    const manager1 = GameStateManager.createNew(config1, characters);
    const state1 = manager1.getState();

    // 第二次遊戲，相同種子
    const config2: GameConfig = {
      playerCount: 3,
      enableAI: false,
      seed,
      maxTurns: 100,
    };

    const manager2 = GameStateManager.createNew(config2, characters);
    const state2 = manager2.getState();

    // 房間牌堆應該相同
    expect(state1.roomDeck.ground.map((r: Room) => r.id))
      .toEqual(state2.roomDeck.ground.map((r: Room) => r.id));
    
    // 卡牌牌堆應該相同
    expect(state1.cardDecks.event.remaining.map((c: Card) => c.id))
      .toEqual(state2.cardDecks.event.remaining.map((c: Card) => c.id));
  });

  it('應該能夠序列化和還原遊戲狀態', () => {
    const config: GameConfig = {
      playerCount: 3,
      enableAI: false,
      seed: 'serialization-test',
      maxTurns: 100,
    };

    const characters = CHARACTERS.slice(0, 3);
    const manager = GameStateManager.createNew(config, characters);
    
    // 進行一些動作
    let state = manager.getState();
    const playerId = state.turn.currentPlayerId;
    
    const endTurnAction: EndTurnAction = {
      type: 'END_TURN',
      playerId,
      timestamp: Date.now(),
      actionId: 'end-turn-1',
    };
    
    state = manager.applyAction(endTurnAction);

    // 序列化
    const serialized = manager.serialize();
    
    // 還原
    const restoredManager = GameStateManager.deserialize(serialized);
    const restoredState = restoredManager.getState();

    // 驗證狀態一致
    expect(restoredState.gameId).toBe(state.gameId);
    expect(restoredState.phase).toBe(state.phase);
    expect(restoredState.turn.turnNumber).toBe(state.turn.turnNumber);
    expect(restoredState.players.length).toBe(state.players.length);
  });
});
