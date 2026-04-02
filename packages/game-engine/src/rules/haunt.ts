/**
 * Haunt Roll 和 Haunt Revelation 系統
 * 
 * 實作作祟檢定和作祟揭示機制
 * Rulebook Reference: Page 14 - Haunt Roll
 */

import { 
  DiceRoll, 
  Player, 
  HauntState, 
  GamePhase,
  GameState,
  GameLogEntry,
} from '../types';
import { 
  HauntScenario, 
  HAUNT_SCENARIOS, 
  PlayerSide,
  getRandomScenario,
} from '../data/hauntScenarios';
import { SeededRng } from '../core/GameState';

// ==================== 常數 ====================

/** 作祟觸發閾值：擲骰總和 < 5 則觸發 */
export const HAUNT_ROLL_THRESHOLD = 5;

/** 預兆卡總數（當所有預兆都被發現時自動觸發作祟） */
export const TOTAL_OMEN_CARDS = 13;

// ==================== 類型定義 ====================

/** Haunt Roll 結果 */
export interface HauntRollResult {
  /** 擲出的骰子結果 */
  dice: number[];
  /** 總和 */
  total: number;
  /** 是否觸發作祟 */
  hauntBegins: boolean;
  /** 使用的骰子數量（等於預兆數量） */
  diceCount: number;
}

/** Haunt Revelation 結果 */
export interface HauntRevelationResult {
  /** 是否成功揭示 */
  success: boolean;
  /** 選中的劇本 */
  scenario: HauntScenario | null;
  /** 叛徒玩家 ID */
  traitorId: string | null;
  /** 英雄玩家 ID 列表 */
  heroIds: string[];
  /** 玩家陣營分配 */
  playerSides: Map<string, PlayerSide>;
  /** 錯誤訊息（如失敗） */
  error?: string;
}

/** 玩家分配結果 */
export interface PlayerAssignment {
  /** 玩家 ID */
  playerId: string;
  /** 玩家名稱 */
  playerName: string;
  /** 所屬陣營 */
  side: PlayerSide;
  /** 是否為叛徒 */
  isTraitor: boolean;
}

/** 作祟開始後的遊戲狀態更新 */
export interface HauntStartResult {
  /** 更新後的遊戲狀態 */
  newState: Partial<GameState>;
  /** 揭示結果 */
  revelation: HauntRevelationResult;
  /** 日誌項目 */
  logEntries: GameLogEntry[];
}

// ==================== Haunt Roll 核心邏輯 ====================

/**
 * 執行 Haunt Roll（作祟檢定）
 * 
 * Rulebook Page 14 (Issue #231):
 * - 擲骰數量 = 已發現的預兆數量
 * - 結果 < omenCount：作祟開始
 * - 結果 >= omenCount：無事發生
 * 
 * @param omenCount 已發現的預兆數量
 * @param rng 隨機數生成器
 * @returns HauntRollResult
 */
export function makeHauntRoll(
  omenCount: number,
  rng: SeededRng
): HauntRollResult {
  // 確保至少擲 1 顆骰子（即使還沒有預兆）
  const diceCount = Math.max(1, omenCount);
  
  // 擲骰子（使用遊戲標準骰子：0, 0, 1, 1, 2, 2）
  const diceRoll = rng.rollDice(diceCount);
  
  // 判斷是否觸發作祟：總和 < omenCount
  const hauntBegins = diceRoll.total < omenCount;
  
  return {
    dice: diceRoll.results,
    total: diceRoll.total,
    hauntBegins,
    diceCount,
  };
}

/**
 * 檢查是否為最後一張預兆卡
 * 
 * 當所有預兆卡都被發現時，作祟自動開始
 * 
 * @param omenCount 已發現的預兆數量
 * @returns 是否為最後一張
 */
export function isLastOmen(omenCount: number): boolean {
  return omenCount >= TOTAL_OMEN_CARDS;
}

/**
 * 決定是否應該進行 Haunt Roll
 * 
 * - 探索階段才需要檢定
 * - 已經觸發過作祟則不需要
 * - 抽到預兆卡後才需要
 * 
 * @param currentPhase 當前遊戲階段
 * @param hauntActive 作祟是否已激活
 * @returns 是否需要檢定
 */
export function shouldMakeHauntRoll(
  currentPhase: GamePhase,
  hauntActive: boolean
): boolean {
  // 只有在探索階段且尚未觸發作祟時才需要檢定
  return currentPhase === 'exploration' && !hauntActive;
}

// ==================== Haunt Revelation 核心邏輯 ====================

/**
 * 選擇 Haunt 劇本
 * 
 * 可以根據玩家數量、已發現的房間等因素選擇合適的劇本
 * 目前實作：隨機選擇
 * 
 * @param players 所有玩家
 * @param omenDiscovererId 發現預兆的玩家 ID
 * @param rng 隨機數生成器
 * @returns 選中的劇本
 */
export function selectHauntScenario(
  players: Player[],
  omenDiscovererId: string,
  rng: SeededRng
): HauntScenario {
  // TODO: 未來可以根據玩家數量、已發現房間等條件篩選
  // 目前隨機選擇
  return getRandomScenario(rng);
}

/**
 * 分配玩家陣營
 * 
 * 根據劇本類型決定玩家是英雄還是叛徒
 * 
 * @param players 所有玩家
 * @param scenario 選中的劇本
 * @param omenDiscovererId 發現預兆的玩家 ID（通常成為叛徒）
 * @returns 玩家分配結果
 */
export function assignPlayerSides(
  players: Player[],
  scenario: HauntScenario,
  omenDiscovererId: string
): PlayerAssignment[] {
  const assignments: PlayerAssignment[] = [];
  
  switch (scenario.type) {
    case 'single_traitor':
      // 單叛徒模式：發現預兆的玩家成為叛徒
      players.forEach(player => {
        const isTraitor = player.id === omenDiscovererId;
        assignments.push({
          playerId: player.id,
          playerName: player.name,
          side: isTraitor ? 'traitor' : 'hero',
          isTraitor,
        });
      });
      break;
      
    case 'cooperative':
      // 合作模式：所有人都是英雄
      players.forEach(player => {
        assignments.push({
          playerId: player.id,
          playerName: player.name,
          side: 'hero',
          isTraitor: false,
        });
      });
      break;
      
    case 'hidden_traitor':
      // 隱藏叛徒模式：隨機選擇叛徒（不包括發現者）
      // 暫時簡化：發現者成為叛徒
      players.forEach(player => {
        const isTraitor = player.id === omenDiscovererId;
        assignments.push({
          playerId: player.id,
          playerName: player.name,
          side: isTraitor ? 'traitor' : 'hero',
          isTraitor,
        });
      });
      break;
      
    case 'free_for_all':
      // 各自為戰：每個人都是自己的陣營
      players.forEach(player => {
        assignments.push({
          playerId: player.id,
          playerName: player.name,
          side: 'neutral',
          isTraitor: false,
        });
      });
      break;
      
    default:
      // 預設：單叛徒模式
      players.forEach(player => {
        const isTraitor = player.id === omenDiscovererId;
        assignments.push({
          playerId: player.id,
          playerName: player.name,
          side: isTraitor ? 'traitor' : 'hero',
          isTraitor,
        });
      });
  }
  
  return assignments;
}

/**
 * 執行 Haunt Revelation（作祟揭示）
 * 
 * 當 Haunt Roll 失敗（< 5）時觸發：
 * 1. 選擇劇本
 * 2. 確定叛徒
 * 3. 分配陣營
 * 4. 設定目標
 * 
 * @param gameState 當前遊戲狀態
 * @param omenDiscovererId 發現預兆的玩家 ID
 * @param rng 隨機數生成器
 * @returns HauntRevelationResult
 */
export function revealHaunt(
  gameState: GameState,
  omenDiscovererId: string,
  rng: SeededRng
): HauntRevelationResult {
  // 驗證遊戲狀態
  if (gameState.haunt.isActive) {
    return {
      success: false,
      scenario: null,
      traitorId: null,
      heroIds: [],
      playerSides: new Map(),
      error: 'Haunt 已經激活',
    };
  }
  
  // 選擇劇本
  const scenario = selectHauntScenario(
    gameState.players,
    omenDiscovererId,
    rng
  );
  
  // 分配玩家陣營
  const assignments = assignPlayerSides(
    gameState.players,
    scenario,
    omenDiscovererId
  );
  
  // 建立玩家陣營映射
  const playerSides = new Map<string, PlayerSide>();
  const heroIds: string[] = [];
  let traitorId: string | null = null;
  
  assignments.forEach(assignment => {
    playerSides.set(assignment.playerId, assignment.side);
    if (assignment.isTraitor) {
      traitorId = assignment.playerId;
    } else if (assignment.side === 'hero') {
      heroIds.push(assignment.playerId);
    }
  });
  
  return {
    success: true,
    scenario,
    traitorId,
    heroIds,
    playerSides,
  };
}

// ==================== 遊戲狀態更新 ====================

/**
 * 建立 Haunt 開始後的遊戲狀態更新
 * 
 * @param gameState 當前遊戲狀態
 * @param revelation Haunt Revelation 結果
 * @param hauntRoll Haunt Roll 結果
 * @returns HauntStartResult
 */
export function createHauntStartResult(
  gameState: GameState,
  revelation: HauntRevelationResult,
  hauntRoll: HauntRollResult
): HauntStartResult {
  const now = Date.now();
  const logEntries: GameLogEntry[] = [];
  
  // 建立玩家更新
  const updatedPlayers = gameState.players.map(player => {
    const side = revelation.playerSides.get(player.id);
    return {
      ...player,
      isTraitor: side === 'traitor',
    };
  });
  
  // 建立 Haunt 狀態更新
  const updatedHaunt: HauntState = {
    isActive: true,
    type: revelation.scenario?.type || 'single_traitor',
    hauntNumber: revelation.scenario?.id || null,
    traitorPlayerId: revelation.traitorId,
    omenCount: gameState.haunt.omenCount,
    heroObjective: revelation.scenario?.heroObjective || null,
    traitorObjective: revelation.scenario?.traitorObjective || null,
  };
  
  // 建立新狀態
  const newState: Partial<GameState> = {
    phase: 'haunt_reveal',
    players: updatedPlayers,
    haunt: updatedHaunt,
    updatedAt: now,
  };
  
  // 建立日誌項目
  // 1. Haunt Roll 結果
  logEntries.push({
    timestamp: now,
    turn: gameState.turn.turnNumber,
    playerId: gameState.turn.currentPlayerId,
    actionType: 'HAUNT_ROLL',
    description: `作祟檢定：擲出 ${hauntRoll.dice.join('+')} = ${hauntRoll.total}（閾值 ${HAUNT_ROLL_THRESHOLD}）- 作祟開始！`,
    data: {
      dice: hauntRoll.dice,
      total: hauntRoll.total,
      threshold: HAUNT_ROLL_THRESHOLD,
      hauntBegins: true,
    },
  });
  
  // 2. 劇本揭示
  if (revelation.scenario) {
    logEntries.push({
      timestamp: now,
      turn: gameState.turn.turnNumber,
      playerId: gameState.turn.currentPlayerId,
      actionType: 'HAUNT_REVEAL',
      description: `作祟揭示：${revelation.scenario.name}（${revelation.scenario.nameEn}）`,
      data: {
        scenarioId: revelation.scenario.id,
        scenarioName: revelation.scenario.name,
        scenarioType: revelation.scenario.type,
      },
    });
  }
  
  // 3. 叛徒揭示
  if (revelation.traitorId) {
    const traitor = gameState.players.find(p => p.id === revelation.traitorId);
    logEntries.push({
      timestamp: now,
      turn: gameState.turn.turnNumber,
      playerId: revelation.traitorId,
      actionType: 'TRAITOR_REVEAL',
      description: `${traitor?.name || '未知玩家'} 成為叛徒！`,
      data: {
        traitorId: revelation.traitorId,
        traitorName: traitor?.name,
      },
    });
  }
  
  // 4. 目標揭示
  logEntries.push({
    timestamp: now,
    turn: gameState.turn.turnNumber,
    playerId: 'system',
    actionType: 'OBJECTIVES_REVEAL',
    description: '雙方目標已揭示',
    data: {
      heroObjective: revelation.scenario?.heroObjective,
      traitorObjective: revelation.scenario?.traitorObjective,
    },
  });
  
  return {
    newState,
    revelation,
    logEntries,
  };
}

// ==================== 便捷函數 ====================

/**
 * 檢查玩家是否為叛徒
 * 
 * @param playerId 玩家 ID
 * @param hauntState Haunt 狀態
 * @returns 是否為叛徒
 */
export function isTraitor(playerId: string, hauntState: HauntState): boolean {
  return hauntState.traitorPlayerId === playerId;
}

/**
 * 檢查玩家是否為英雄
 * 
 * @param playerId 玩家 ID
 * @param hauntState Haunt 狀態
 * @returns 是否為英雄
 */
export function isHero(playerId: string, hauntState: HauntState): boolean {
  return hauntState.isActive && hauntState.traitorPlayerId !== playerId;
}

/**
 * 取得叛徒玩家
 * 
 * @param players 所有玩家
 * @param hauntState Haunt 狀態
 * @returns 叛徒玩家，如無則返回 undefined
 */
export function getTraitor(
  players: Player[],
  hauntState: HauntState
): Player | undefined {
  if (!hauntState.traitorPlayerId) return undefined;
  return players.find(p => p.id === hauntState.traitorPlayerId);
}

/**
 * 取得所有英雄玩家
 * 
 * @param players 所有玩家
 * @param hauntState Haunt 狀態
 * @returns 英雄玩家列表
 */
export function getHeroes(
  players: Player[],
  hauntState: HauntState
): Player[] {
  if (!hauntState.isActive) return [];
  return players.filter(p => p.id !== hauntState.traitorPlayerId && !p.isDead);
}

/**
 * 取得玩家陣營
 * 
 * @param playerId 玩家 ID
 * @param hauntState Haunt 狀態
 * @returns 玩家陣營
 */
export function getPlayerSide(
  playerId: string,
  hauntState: HauntState
): PlayerSide {
  if (!hauntState.isActive) return 'hero';
  if (hauntState.traitorPlayerId === playerId) return 'traitor';
  return 'hero';
}

// ==================== 匯出 ====================

export type { HauntScenario, PlayerSide } from '../data/hauntScenarios';
