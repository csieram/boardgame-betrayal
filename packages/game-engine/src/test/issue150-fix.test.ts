/**
 * Issue #150 修復驗證測試
 * 
 * 這個測試驗證 AI 玩家能夠正確獲取合法行動並執行決策
 */

import { AIPlayerManager, createAIPlayerManager } from '../ai/AIPlayerManager';
import { GameState, Position3D } from '../types';
import { CHARACTERS } from '@betrayal/shared';
import { AIDecisionEngine } from '../ai/AIDecisionEngine';
import { TurnExecutionResult } from '../ai/AIPlayer';

// 創建測試用的 gameState
function createTestGameState(currentPlayerId: string, isExploration: boolean = true): GameState {
  return {
    gameId: 'test-game',
    version: '1.0.0',
    phase: isExploration ? 'exploration' : 'haunt',
    result: 'ongoing',
    config: { playerCount: 2, enableAI: true, seed: 'test-seed', maxTurns: 100 },
    map: {
      ground: Array(15).fill(null).map((_, y) =>
        Array(15).fill(null).map((_, x) => ({
          x,
          y,
          room: x === 7 && y === 7 ? {
            id: 'entrance_hall',
            name: '入口大廳',
            nameEn: 'Entrance Hall',
            floor: 'ground',
            doors: ['north', 'south', 'east', 'west'],
            symbol: null,
            description: 'Test room',
            gallerySvg: null,
          } : null,
          discovered: x === 7 && y === 7,
          rotation: 0,
          floor: 'ground',
        }))
      ),
      upper: Array(15).fill(null).map((_, y) =>
        Array(15).fill(null).map((_, x) => ({
          x,
          y,
          room: null,
          discovered: false,
          rotation: 0,
          floor: 'upper',
        }))
      ),
      basement: Array(15).fill(null).map((_, y) =>
        Array(15).fill(null).map((_, x) => ({
          x,
          y,
          room: null,
          discovered: false,
          rotation: 0,
          floor: 'basement',
        }))
      ),
      placedRoomCount: 1,
    },
    players: [
      {
        id: 'human-player',
        name: 'Human',
        character: CHARACTERS[0],
        position: { x: 7, y: 7, floor: 'ground' },
        currentStats: { speed: 4, might: 4, sanity: 4, knowledge: 4 },
        items: [],
        omens: [],
        isTraitor: false,
        isDead: false,
        usedItemsThisTurn: [],
      },
      {
        id: 'ai-player-1',
        name: 'AI Player 1',
        character: CHARACTERS[1],
        position: { x: 7, y: 7, floor: 'ground' },
        currentStats: { speed: 4, might: 4, sanity: 4, knowledge: 4 },
        items: [],
        omens: [],
        isTraitor: false,
        isDead: false,
        usedItemsThisTurn: [],
      },
    ],
    playerOrder: ['human-player', 'ai-player-1'],
    turn: {
      currentPlayerId,
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
      isActive: !isExploration,
      type: null,
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
    rngState: { seed: 'test-seed', count: 0, internalState: [] },
    placedRoomIds: new Set(['entrance_hall']),
  } as GameState;
}

// 測試 Issue #150 修復
async function testIssue150Fix() {
  console.log('=== Testing Issue #150 Fix ===\n');

  // 創建 AI 管理器
  const manager = createAIPlayerManager('human-player', 1, 'medium', 'test-seed');

  // 創建測試用的 gameState（探索階段）
  const gameState = createTestGameState('human-player', true);

  // 初始化 AI 玩家
  const aiPlayers = manager.initializeAIPlayers(gameState, CHARACTERS[0], ['explorer']);
  console.log(`Initialized ${aiPlayers.length} AI player(s)`);

  // 測試 1: 檢查 executeSingleAITurn 是否正確更新 currentPlayerId
  console.log('\n--- Test 1: executeSingleAITurn updates currentPlayerId ---');
  console.log('Initial currentPlayerId in gameState:', gameState.turn.currentPlayerId);

  // 執行 AI 回合
  const results = await manager.executeAllAITurns(
    gameState,
    (aiName: string) => {
      console.log(`onTurnStart: ${aiName}`);
      console.log('Current currentPlayerId in gameState during onTurnStart:', gameState.turn.currentPlayerId);
    },
    (result: TurnExecutionResult) => {
      console.log(`onTurnEnd: decisions count = ${result.decisions.length}`);
      console.log('Decisions:', result.decisions.map((d: { action: string; reason: string }) => ({ action: d.action, reason: d.reason })));
      console.log('Logs:', result.logs);
    }
  );

  console.log('\n--- Results ---');
  console.log(`Total AI turns executed: ${results.length}`);
  
  if (results.length > 0) {
    const firstResult = results[0];
    console.log(`First turn decisions: ${firstResult.decisions.length}`);
    console.log(`First turn completed: ${firstResult.completed}`);
    console.log(`First turn discovered room: ${firstResult.discoveredRoom}`);
    
    // 檢查是否有非結束回合的決策
    const nonEndTurnDecisions = firstResult.decisions.filter((d: { action: string }) => d.action !== 'endTurn');
    console.log(`Non-endTurn decisions: ${nonEndTurnDecisions.length}`);
    
    if (nonEndTurnDecisions.length > 0) {
      console.log('\n✅ SUCCESS: AI generated actual decisions (move/explore)!');
    } else {
      console.log('\n❌ FAILURE: AI only generated endTurn decisions');
    }
  } else {
    console.log('\n❌ FAILURE: No AI turns were executed');
  }

  // 測試 2: 檢查探索階段是否能正確獲取探索方向
  console.log('\n--- Test 2: Exploration phase legal actions ---');
  
  // 重置 gameState
  const gameState2 = createTestGameState('ai-player-1', true);
  gameState2.turn.currentPlayerId = 'ai-player-1'; // 設置為 AI 玩家
  
  // 檢查是否能獲取合法行動
  const engine = new AIDecisionEngine('medium', 'test-seed');
  const legalActions = engine.getLegalActions(gameState2, 'ai-player-1');
  
  console.log('Legal actions for AI player:');
  console.log(`  - Movable positions: ${legalActions.movablePositions.length}`);
  console.log(`  - Explorable directions: ${legalActions.explorableDirections.length} [${legalActions.explorableDirections.join(', ')}]`);
  console.log(`  - Usable items: ${legalActions.usableItems.length}`);
  console.log(`  - Can end turn: ${legalActions.canEndTurn}`);
  
  if (legalActions.explorableDirections.length > 0) {
    console.log('\n✅ SUCCESS: AI can explore in exploration phase!');
  } else {
    console.log('\n❌ FAILURE: AI cannot explore (explorableDirections is empty)');
  }
}

describe('Issue #150 Fix', () => {
  it('AI should generate actual decisions (move/explore) instead of empty actions', async () => {
    console.log('=== Testing Issue #150 Fix ===\n');

    // 創建 AI 管理器
    const manager = createAIPlayerManager('human-player', 1, 'medium', 'test-seed');

    // 創建測試用的 gameState（探索階段）
    const gameState = createTestGameState('human-player', true);

    // 初始化 AI 玩家
    const aiPlayers = manager.initializeAIPlayers(gameState, CHARACTERS[0], ['explorer']);
    console.log(`Initialized ${aiPlayers.length} AI player(s)`);
    expect(aiPlayers.length).toBe(1);

    // 執行 AI 回合
    const results = await manager.executeAllAITurns(
      gameState,
      (aiName: string) => {
        console.log(`onTurnStart: ${aiName}`);
      },
      (result: TurnExecutionResult) => {
        console.log(`onTurnEnd: decisions count = ${result.decisions.length}`);
        console.log('Decisions:', result.decisions.map((d: { action: string; reason: string }) => ({ action: d.action, reason: d.reason })));
      }
    );

    console.log(`\nTotal AI turns executed: ${results.length}`);
    expect(results.length).toBeGreaterThan(0);

    const firstResult = results[0];
    expect(firstResult.completed).toBe(true);

    // 檢查是否有非結束回合的決策
    const nonEndTurnDecisions = firstResult.decisions.filter((d: { action: string }) => d.action !== 'endTurn');
    console.log(`Non-endTurn decisions: ${nonEndTurnDecisions.length}`);
    
    // 這是關鍵斷言：AI 應該生成實際的決策（移動/探索）
    expect(nonEndTurnDecisions.length).toBeGreaterThan(0);
  });

  it('AI should get explorable directions in exploration phase', () => {
    // 創建測試用的 gameState（探索階段，AI 玩家回合）
    const gameState = createTestGameState('ai-player-1', true);
    gameState.turn.currentPlayerId = 'ai-player-1'; // 設置為 AI 玩家

    // 檢查是否能獲取合法行動
    const engine = new AIDecisionEngine('medium', 'test-seed');
    const legalActions = engine.getLegalActions(gameState, 'ai-player-1');

    console.log('Legal actions for AI player:');
    console.log(`  - Movable positions: ${legalActions.movablePositions.length}`);
    console.log(`  - Explorable directions: ${legalActions.explorableDirections.length} [${legalActions.explorableDirections.join(', ')}]`);
    console.log(`  - Usable items: ${legalActions.usableItems.length}`);
    console.log(`  - Can end turn: ${legalActions.canEndTurn}`);

    // 關鍵斷言：AI 應該能夠獲取探索方向
    expect(legalActions.explorableDirections.length).toBeGreaterThan(0);
    expect(legalActions.canEndTurn).toBe(true);
  });
});
