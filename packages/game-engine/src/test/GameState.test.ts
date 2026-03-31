/**
 * Game State Tests
 * 
 * 測試核心遊戲狀態功能：
 * 1. 狀態初始化
 * 2. 動作應用
 * 3. Deterministic RNG
 * 4. 序列化/反序列化
 */

import {
  GameStateManager,
  SeededRng,
  initializeGameMap,
  placeStartingRooms,
  createPlayer,
  initializeTurnState,
  initializeHauntState,
  initializeCombatState,
} from '../core/GameState';

import {
  GameState,
  GameConfig,
  Position3D,
  MoveAction,
  DiscoverAction,
  DrawCardAction,
  EndTurnAction,
  MAP_CENTER,
} from '../types';

import { CHARACTERS, OFFICIAL_ROOMS } from '@betrayal/shared';

// ==================== SeededRng Tests ====================

describe('SeededRng', () => {
  test('should generate same sequence with same seed', () => {
    const rng1 = new SeededRng('test-seed');
    const rng2 = new SeededRng('test-seed');

    const seq1 = Array.from({ length: 10 }, () => rng1.next());
    const seq2 = Array.from({ length: 10 }, () => rng2.next());

    expect(seq1).toEqual(seq2);
  });

  test('should generate different sequences with different seeds', () => {
    const rng1 = new SeededRng('seed-a');
    const rng2 = new SeededRng('seed-b');

    const seq1 = Array.from({ length: 10 }, () => rng1.next());
    const seq2 = Array.from({ length: 10 }, () => rng2.next());

    expect(seq1).not.toEqual(seq2);
  });

  test('should generate numbers in [0, 1) range', () => {
    const rng = new SeededRng('test');
    
    for (let i = 0; i < 100; i++) {
      const value = rng.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  test('should roll dice correctly', () => {
    const rng = new SeededRng('test');
    const roll = rng.rollDice(5);

    expect(roll.count).toBe(5);
    expect(roll.results).toHaveLength(5);
    expect(roll.results.every((r: number) => [0, 1, 2].includes(r))).toBe(true);
    expect(roll.total).toBe(roll.results.reduce((a: number, b: number) => a + b, 0));
  });

  test('should shuffle array', () => {
    const rng = new SeededRng('test');
    const original = [1, 2, 3, 4, 5];
    const shuffled = rng.shuffle(original);

    expect(shuffled).toHaveLength(original.length);
    expect(shuffled.sort()).toEqual(original.sort());
  });

  test('should serialize and restore state', () => {
    const seed = 'test-restore-seed';
    const rng1 = new SeededRng(seed);
    
    // 生成一些隨機數
    const values1 = Array.from({ length: 5 }, () => rng1.next());
    
    // 保存狀態
    const state = rng1.getState();
    
    // 創建新的 RNG 並前進到相同位置
    const rng2 = SeededRng.fromState(state);
    
    // rng2 應該從相同位置繼續
    const values2 = Array.from({ length: 5 }, () => rng2.next());
    
    // 創建全新的 RNG 並前進 5 步
    const rng3 = new SeededRng(seed);
    for (let i = 0; i < 5; i++) rng3.next();
    const values3 = Array.from({ length: 5 }, () => rng3.next());
    
    // rng2 和 rng3 應該產生相同的序列
    expect(values2).toEqual(values3);
    
    // 驗證狀態正確保存
    expect(state.seed).toBe(seed);
    expect(state.count).toBe(5);
  });
});

// ==================== GameStateManager Tests ====================

describe('GameStateManager', () => {
  const createTestConfig = (): GameConfig => ({
    playerCount: 3,
    enableAI: false,
    seed: 'test-game-seed',
    maxTurns: 100,
  });

  const createTestCharacters = () => CHARACTERS.slice(0, 3);

  test('should create new game', () => {
    const config = createTestConfig();
    const characters = createTestCharacters();
    
    const manager = GameStateManager.createNew(config, characters);
    const state = manager.getState();

    expect(state.gameId).toBeDefined();
    expect(state.version).toBe('1.0.0');
    expect(state.phase).toBe('exploration');
    expect(state.result).toBe('ongoing');
    expect(state.players).toHaveLength(3);
    expect(state.playerOrder).toHaveLength(3);
  });

  test('should place starting rooms', () => {
    const config = createTestConfig();
    const characters = createTestCharacters();
    
    const manager = GameStateManager.createNew(config, characters);
    const state = manager.getState();

    // 檢查入口大廳
    const entranceTile = state.map.ground[MAP_CENTER][MAP_CENTER];
    expect(entranceTile.discovered).toBe(true);
    expect(entranceTile.room).not.toBeNull();
    expect(entranceTile.room?.id).toBe('entrance_hall');

    // 檢查上層大廳
    const upperTile = state.map.upper[MAP_CENTER][MAP_CENTER];
    expect(upperTile.discovered).toBe(true);
    expect(upperTile.room?.id).toBe('upper_landing');

    // 檢查地下室大廳
    const basementTile = state.map.basement[MAP_CENTER][MAP_CENTER];
    expect(basementTile.discovered).toBe(true);
    expect(basementTile.room?.id).toBe('basement_landing');
  });

  test('should initialize players at starting position', () => {
    const config = createTestConfig();
    const characters = createTestCharacters();
    
    const manager = GameStateManager.createNew(config, characters);
    const state = manager.getState();

    state.players.forEach((player: any) => {
      expect(player.position.x).toBe(MAP_CENTER);
      expect(player.position.y).toBe(MAP_CENTER);
      expect(player.position.floor).toBe('ground');
      expect(player.items).toEqual([]);
      expect(player.omens).toEqual([]);
      expect(player.isTraitor).toBe(false);
      expect(player.isDead).toBe(false);
    });
  });

  test('should initialize turn state correctly', () => {
    const config = createTestConfig();
    const characters = createTestCharacters();
    
    const manager = GameStateManager.createNew(config, characters);
    const state = manager.getState();

    expect(state.turn.turnNumber).toBe(1);
    expect(state.turn.currentPlayerId).toBe(state.playerOrder[0]);
    expect(state.turn.movesRemaining).toBe(state.players[0].currentStats.speed);
    expect(state.turn.hasDiscoveredRoom).toBe(false);
    expect(state.turn.hasDrawnCard).toBe(false);
    expect(state.turn.hasEnded).toBe(false);
  });

  test('should serialize and deserialize state', () => {
    const config = createTestConfig();
    const characters = createTestCharacters();
    
    const manager = GameStateManager.createNew(config, characters);
    const serialized = manager.serialize();
    
    const restoredManager = GameStateManager.deserialize(serialized);
    const restoredState = restoredManager.getState();
    const originalState = manager.getState();

    // 比較關鍵欄位
    expect(restoredState.gameId).toBe(originalState.gameId);
    expect(restoredState.phase).toBe(originalState.phase);
    expect(restoredState.players).toHaveLength(originalState.players.length);
    expect(restoredState.map.placedRoomCount).toBe(originalState.map.placedRoomCount);
  });

  test('should handle MOVE action', () => {
    const config = createTestConfig();
    const characters = createTestCharacters();
    
    const manager = GameStateManager.createNew(config, characters);
    const initialState = manager.getState();
    
    // 先發現一個相鄰的房間
    const discoverAction: DiscoverAction = {
      type: 'DISCOVER',
      playerId: initialState.turn.currentPlayerId,
      timestamp: Date.now(),
      actionId: '',
      direction: 'north',
      room: OFFICIAL_ROOMS[10], // 使用一個真實的房間
      position: { x: MAP_CENTER, y: MAP_CENTER - 1, floor: 'ground' },
      rotation: 0,
    };

    manager.applyAction(discoverAction);
    
    // 現在可以移動到那個房間
    const moveAction: MoveAction = {
      type: 'MOVE',
      playerId: initialState.turn.currentPlayerId,
      timestamp: Date.now(),
      actionId: '',
      to: { x: MAP_CENTER, y: MAP_CENTER - 1, floor: 'ground' },
      path: [{ x: MAP_CENTER, y: MAP_CENTER - 1, floor: 'ground' }],
    };

    const newState = manager.applyAction(moveAction);
    const player = newState.players.find((p: any) => p.id === initialState.turn.currentPlayerId);
    
    expect(player?.position).toEqual({ x: MAP_CENTER, y: MAP_CENTER - 1, floor: 'ground' });
    expect(newState.log).toHaveLength(2); // DISCOVER + MOVE
  });

  test('should handle END_TURN action', () => {
    const config = createTestConfig();
    const characters = createTestCharacters();
    
    const manager = GameStateManager.createNew(config, characters);
    const initialState = manager.getState();
    
    const firstPlayerId = initialState.turn.currentPlayerId;
    const firstPlayer = initialState.players.find((p: any) => p.id === firstPlayerId)!;

    const endTurnAction: EndTurnAction = {
      type: 'END_TURN',
      playerId: firstPlayerId,
      timestamp: Date.now(),
      actionId: '',
    };

    const newState = manager.applyAction(endTurnAction);
    const nextPlayerId = newState.turn.currentPlayerId;
    const nextPlayer = newState.players.find((p: any) => p.id === nextPlayerId)!;

    expect(nextPlayerId).not.toBe(firstPlayerId);
    expect(newState.turn.movesRemaining).toBe(nextPlayer.currentStats.speed);
    expect(newState.turn.hasDiscoveredRoom).toBe(false);
    expect(newState.turn.hasEnded).toBe(false);
    expect(newState.log).toHaveLength(1);
  });

  test('should throw error for unknown action type', () => {
    const config = createTestConfig();
    const characters = createTestCharacters();
    
    const manager = GameStateManager.createNew(config, characters);
    
    expect(() => {
      manager.applyAction({
        type: 'UNKNOWN_ACTION',
        playerId: 'player-0',
        timestamp: Date.now(),
        actionId: '',
      } as any);
    }).toThrow('Unknown action type');
  });

  test('should be deterministic with same seed', () => {
    const config1 = createTestConfig();
    const config2 = { ...createTestConfig() };
    const characters = createTestCharacters();
    
    const manager1 = GameStateManager.createNew(config1, characters);
    const manager2 = GameStateManager.createNew(config2, characters);

    // 房間牌堆應該相同
    const state1 = manager1.getState();
    const state2 = manager2.getState();

    expect(state1.roomDeck.ground.map((r: any) => r.id))
      .toEqual(state2.roomDeck.ground.map((r: any) => r.id));
    expect(state1.cardDecks.event.remaining.map((c: any) => c.id))
      .toEqual(state2.cardDecks.event.remaining.map((c: any) => c.id));
  });
});

// ==================== Helper Functions Tests ====================

describe('Helper Functions', () => {
  test('createPlayer should create player with correct initial state', () => {
    const character = CHARACTERS[0];
    const position: Position3D = { x: 7, y: 7, floor: 'ground' };
    
    const player = createPlayer('p1', 'Test Player', character, position);

    expect(player.id).toBe('p1');
    expect(player.name).toBe('Test Player');
    expect(player.character).toBe(character);
    expect(player.position).toEqual(position);
    expect(player.currentStats.speed).toBe(character.stats.speed[1]);
    expect(player.items).toEqual([]);
    expect(player.omens).toEqual([]);
    expect(player.isTraitor).toBe(false);
    expect(player.isDead).toBe(false);
  });

  test('initializeTurnState should create correct initial turn', () => {
    const turn = initializeTurnState('player-1');

    expect(turn.currentPlayerId).toBe('player-1');
    expect(turn.turnNumber).toBe(1);
    expect(turn.movesRemaining).toBe(0);
    expect(turn.hasDiscoveredRoom).toBe(false);
    expect(turn.hasDrawnCard).toBe(false);
    expect(turn.hasEnded).toBe(false);
  });

  test('initializeHauntState should create inactive haunt', () => {
    const haunt = initializeHauntState();

    expect(haunt.isActive).toBe(false);
    expect(haunt.type).toBe('none');
    expect(haunt.hauntNumber).toBeNull();
    expect(haunt.traitorPlayerId).toBeNull();
    expect(haunt.omenCount).toBe(0);
  });

  test('initializeCombatState should create inactive combat', () => {
    const combat = initializeCombatState();

    expect(combat.isActive).toBe(false);
    expect(combat.attackerId).toBeNull();
    expect(combat.defenderId).toBeNull();
  });
});
