/**
 * AIPlayerManager.ts - AI 玩家管理器
 * 
 * 管理多個 AI 玩家，處理：
 * 1. AI 玩家的創建和初始化
 * 2. 回合順序管理
 * 3. AI 玩家與人類玩家的協作
 * 4. 遊戲狀態同步
 * 
 * 設計原則：
 * - 集中管理所有 AI 玩家
 * - 清晰的回合流程控制
 * - 可擴展的 AI 數量（0-3 個）
 */

import {
  GameState,
  Player,
  Position3D,
  Character,
  GamePhase,
} from '../types';
import { CHARACTERS } from '@betrayal/shared';
import {
  AIPlayer,
  AIPlayerConfig,
  AIPersonality,
  TurnExecutionResult,
  AIExperience,
} from './AIPlayer';
import { AIDifficulty } from './AIDecisionEngine';
import { HeroAI } from './HeroAI';
import { TraitorAI } from './TraitorAI';

// ==================== 類型定義 ====================

/** AI 玩家管理配置 */
export interface AIPlayerManagerConfig {
  /** AI 玩家數量 (0-3) */
  aiCount: number;
  /** 難度等級 */
  difficulty: AIDifficulty;
  /** 是否隨機個性 */
  randomPersonalities: boolean;
  /** 指定個性（如果不隨機） */
  defaultPersonality?: AIPersonality;
  /** 隨機種子 */
  seed?: string;
}

/** AI 玩家資訊 */
export interface AIPlayerInfo {
  /** AI ID */
  id: string;
  /** 顯示名稱 */
  name: string;
  /** 使用的角色 */
  character: Character;
  /** 個性 */
  personality: AIPersonality;
  /** 是否為叛徒 */
  isTraitor: boolean;
  /** 當前位置 */
  position: Position3D;
  /** 經驗統計 */
  experience: AIExperience;
  /** 是否存活 */
  isAlive: boolean;
}

/** 回合順序 */
export interface TurnOrder {
  /** 玩家 ID 列表 */
  order: string[];
  /** 當前索引 */
  currentIndex: number;
  /** 當前玩家 ID */
  currentPlayerId: string;
  /** 回合數 */
  round: number;
}

/** AI 行動日誌 */
export interface AIActionLog {
  /** 時間戳 */
  timestamp: number;
  /** 回合數 */
  turn: number;
  /** AI 玩家 ID */
  playerId: string;
  /** AI 名稱 */
  playerName: string;
  /** 行動描述 */
  action: string;
  /** 詳細資訊 */
  details?: string;
}

/** 遊戲設置選項 */
export interface GameSetupOptions {
  /** 人類玩家角色 */
  humanCharacter: Character;
  /** AI 數量 */
  aiCount: number;
  /** 難度 */
  difficulty: AIDifficulty;
  /** AI 個性 */
  personalities: AIPersonality[];
  /** 是否包含 Widow's Walk 擴展 */
  includeWidowsWalk: boolean;
  /** 隨機種子 */
  seed?: string;
}

// ==================== AI 玩家管理器 ====================

/**
 * AI 玩家管理器
 * 負責管理所有 AI 玩家的生命週期
 */
export class AIPlayerManager {
  private aiPlayers: Map<string, AIPlayer>;
  private config: AIPlayerManagerConfig;
  private turnOrder: TurnOrder;
  private actionLogs: AIActionLog[];
  private rng: () => number;
  private humanPlayerId: string;
  private isProcessingTurn: boolean;

  constructor(
    humanPlayerId: string,
    config: AIPlayerManagerConfig
  ) {
    this.humanPlayerId = humanPlayerId;
    this.config = config;
    this.aiPlayers = new Map();
    this.actionLogs = [];
    this.isProcessingTurn = false;
    this.rng = this.createSeededRng(config.seed || Date.now().toString());

    this.turnOrder = {
      order: [humanPlayerId],
      currentIndex: 0,
      currentPlayerId: humanPlayerId,
      round: 1,
    };

    this.log('AIPlayerManager initialized', { humanPlayerId, config });
  }

  /**
   * 建立有種子的隨機數生成器
   */
  private createSeededRng(seed: string): () => number {
    let state = 0;
    for (let i = 0; i < seed.length; i++) {
      state = ((state << 5) - state) + seed.charCodeAt(i);
      state = state & state;
    }
    return () => {
      state = (state * 9301 + 49297) % 233280;
      return state / 233280;
    };
  }

  /**
   * 日誌輸出
   */
  private log(message: string, data?: unknown): void {
    console.log(`[AIPlayerManager] ${message}`, data || '');
  }

  /**
   * 初始化 AI 玩家
   * 在遊戲開始時調用
   */
  initializeAIPlayers(
    gameState: GameState,
    humanCharacter: Character,
    personalities?: AIPersonality[]
  ): Player[] {
    const aiPlayers: Player[] = [];
    const availableCharacters = this.getAvailableCharacters(humanCharacter);

    // 確保不超過可用角色數
    const aiCount = Math.min(this.config.aiCount, availableCharacters.length);

    for (let i = 0; i < aiCount; i++) {
      const aiId = `ai-player-${i + 1}`;
      const character = availableCharacters[i];
      
      // 決定個性
      const personality = personalities?.[i] || 
        (this.config.randomPersonalities 
          ? this.getRandomPersonality() 
          : (this.config.defaultPersonality || 'explorer'));

      // 創建 AI 玩家實例
      const aiPlayer = new AIPlayer(aiId, {
        difficulty: this.config.difficulty,
        personality,
        seed: this.config.seed ? `${this.config.seed}-${i}` : undefined,
        enableLogging: true,
        name: character.name,
      });

      aiPlayer.setCharacter(character);
      aiPlayer.setPosition({ x: 7, y: 7, floor: 'ground' }); // 從入口大廳開始

      this.aiPlayers.set(aiId, aiPlayer);

      // 創建 Player 對象
      const player: Player = {
        id: aiId,
        name: character.name,
        character,
        position: { x: 7, y: 7, floor: 'ground' },
        currentStats: {
          speed: character.stats.speed[0],
          might: character.stats.might[0],
          sanity: character.stats.sanity[0],
          knowledge: character.stats.knowledge[0],
        },
        items: [],
        omens: [],
        isTraitor: false,
        isDead: false,
        usedItemsThisTurn: [],
      };

      aiPlayers.push(player);

      this.log(`AI Player ${i + 1} created`, { 
        id: aiId, 
        character: character.name, 
        personality 
      });
    }

    // 更新回合順序
    this.updateTurnOrder();

    return aiPlayers;
  }

  /**
   * 獲取可用角色（排除人類玩家使用的）
   */
  private getAvailableCharacters(humanCharacter: Character): Character[] {
    return CHARACTERS.filter(c => c.id !== humanCharacter.id);
  }

  /**
   * 獲取隨機個性
   */
  private getRandomPersonality(): AIPersonality {
    const personalities: AIPersonality[] = ['explorer', 'cautious', 'aggressive'];
    return personalities[Math.floor(this.rng() * personalities.length)];
  }

  /**
   * 更新回合順序
   */
  private updateTurnOrder(): void {
    const aiIds = Array.from(this.aiPlayers.keys());
    this.turnOrder.order = [this.humanPlayerId, ...aiIds];
    this.log('Turn order updated', { order: this.turnOrder.order });
  }

  /**
   * 執行下一個 AI 回合
   */
  async executeNextAITurn(gameState: GameState): Promise<TurnExecutionResult | null> {
    if (this.isProcessingTurn) {
      this.log('Already processing a turn, skipping');
      return null;
    }

    const currentPlayerId = this.getCurrentPlayerId();
    const aiPlayer = this.aiPlayers.get(currentPlayerId);

    if (!aiPlayer) {
      this.log('No AI player found for current turn', { currentPlayerId });
      return null;
    }

    this.isProcessingTurn = true;
    this.log(`Executing turn for ${aiPlayer.getPlayerName()}`);

    try {
      // 更新 AI 位置
      const player = gameState.players.find(p => p.id === currentPlayerId);
      if (player) {
        aiPlayer.setPosition(player.position);
      }

      // 執行回合
      const result = aiPlayer.executeTurn(gameState);

      // 記錄日誌
      for (const log of result.logs) {
        this.addActionLog(currentPlayerId, aiPlayer.getPlayerName(), log);
      }

      // 移動到下一個玩家
      this.advanceTurn();

      return result;
    } catch (error) {
      this.log('Error executing AI turn', error);
      return null;
    } finally {
      this.isProcessingTurn = false;
    }
  }

  /**
   * 執行所有 AI 回合（人類回合後調用）
   * Issue #147: 修復雙重回合推進問題
   * - 確保順序執行（非平行）
   * - 正確管理回合計數器
   */
  async executeAllAITurns(
    gameState: GameState,
    onTurnStart?: (aiName: string) => void,
    onTurnEnd?: (result: TurnExecutionResult) => void
  ): Promise<TurnExecutionResult[]> {
    const results: TurnExecutionResult[] = [];

    // Issue #147: 使用 for...of 確保順序執行（非平行）
    for (const [aiId, aiPlayer] of Array.from(this.aiPlayers.entries())) {
      if (this.isAIAlive(gameState, aiId)) {
        onTurnStart?.(aiPlayer.getPlayerName());

        // Issue #147: 設置當前玩家為此 AI
        this.turnOrder.currentPlayerId = aiId;

        const result = await this.executeSingleAITurn(gameState, aiId);
        if (result) {
          results.push(result);
          onTurnEnd?.(result);
        }

        // 短暫延遲以便 UI 更新
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Issue #147: 所有 AI 回合完成後，才開始新一輪
    this.turnOrder.round++;
    this.turnOrder.currentIndex = 0;
    this.turnOrder.currentPlayerId = this.humanPlayerId;

    this.log('All AI turns completed, starting new round', { round: this.turnOrder.round });

    return results;
  }

  /**
   * 執行單個 AI 回合
   * 
   * Issue #150: 修復 AI 無法執行行動的問題
   * - 更新 gameState.turn.currentPlayerId 為當前 AI ID
   * - 這確保 getLegalActions 中的 TurnManager.isCurrentPlayer 檢查通過
   */
  private async executeSingleAITurn(
    gameState: GameState,
    aiId: string
  ): Promise<TurnExecutionResult | null> {
    const aiPlayer = this.aiPlayers.get(aiId);
    if (!aiPlayer) return null;

    // Issue #150: 更新 gameState 的 currentPlayerId 為當前 AI
    // 這是關鍵修復：確保 getLegalActions 中的 isCurrentPlayer 檢查通過
    const originalPlayerId = gameState.turn.currentPlayerId;
    gameState.turn.currentPlayerId = aiId;
    
    this.log(`Updated gameState.turn.currentPlayerId to ${aiId}`);

    // 更新位置
    const player = gameState.players.find(p => p.id === aiId);
    if (player) {
      aiPlayer.setPosition(player.position);
    }

    // 執行回合
    const result = aiPlayer.executeTurn(gameState);

    // Issue #199: Debug logging for statChanges serialization
    console.log('[AI Manager] AI turn result:', result);
    console.log('[AI Manager] eventCheckResult:', result.eventCheckResult);
    console.log('[AI Manager] statChanges:', result.eventCheckResult?.statChanges);

    // Issue #150: 恢復原來的 currentPlayerId（可選，取決於後續邏輯需求）
    gameState.turn.currentPlayerId = originalPlayerId;

    // 記錄日誌
    for (const log of result.logs) {
      this.addActionLog(aiId, aiPlayer.getPlayerName(), log);
    }

    return result;
  }

  /**
   * 檢查 AI 是否存活
   */
  private isAIAlive(gameState: GameState, aiId: string): boolean {
    const player = gameState.players.find(p => p.id === aiId);
    return player ? !player.isDead : false;
  }

  /**
   * 推進回合
   */
  private advanceTurn(): void {
    this.turnOrder.currentIndex++;
    
    if (this.turnOrder.currentIndex >= this.turnOrder.order.length) {
      // 一輪結束，重新開始
      this.turnOrder.currentIndex = 0;
      this.turnOrder.round++;
    }

    this.turnOrder.currentPlayerId = this.turnOrder.order[this.turnOrder.currentIndex];
  }

  /**
   * 添加行動日誌
   */
  private addActionLog(
    playerId: string,
    playerName: string,
    action: string,
    details?: string
  ): void {
    this.actionLogs.push({
      timestamp: Date.now(),
      turn: this.turnOrder.round,
      playerId,
      playerName,
      action,
      details,
    });
  }

  /**
   * 初始化 Haunt 階段
   */
  initializeHauntPhase(gameState: GameState, traitorIds: string[]): void {
    this.log('Initializing haunt phase', { traitorIds });

    this.aiPlayers.forEach((aiPlayer, aiId) => {
      const isTraitor = traitorIds.includes(aiId);
      aiPlayer.setTraitorStatus(isTraitor);
      aiPlayer.initializeHauntAI(gameState);
    });
  }

  /**
   * 更新 AI 玩家狀態
   */
  updateAIPlayerState(gameState: GameState): void {
    this.aiPlayers.forEach((aiPlayer, aiId) => {
      const player = gameState.players.find(p => p.id === aiId);
      if (player) {
        aiPlayer.setPosition(player.position);
      }
    });
  }

  // ==================== Getter 方法 ====================

  /**
   * 取得當前玩家 ID
   */
  getCurrentPlayerId(): string {
    return this.turnOrder.currentPlayerId;
  }

  /**
   * 檢查當前是否為 AI 回合
   */
  isAITurn(): boolean {
    return this.aiPlayers.has(this.turnOrder.currentPlayerId);
  }

  /**
   * 檢查是否為特定 AI 的回合
   */
  isSpecificAITurn(aiId: string): boolean {
    return this.turnOrder.currentPlayerId === aiId;
  }

  /**
   * 取得 AI 玩家列表
   */
  getAIPlayers(): AIPlayerInfo[] {
    const infos: AIPlayerInfo[] = [];
    
    this.aiPlayers.forEach((aiPlayer, id) => {
      const character = aiPlayer.getCharacter();
      infos.push({
        id,
        name: aiPlayer.getPlayerName(),
        character: character || CHARACTERS[0],
        personality: aiPlayer.getConfig().personality,
        isTraitor: false, // 需要在遊戲狀態中查詢
        position: aiPlayer.getPosition(),
        experience: aiPlayer.getExperience(),
        isAlive: true, // 需要在遊戲狀態中查詢
      });
    });

    return infos;
  }

  /**
   * 取得 AI 數量
   */
  getAICount(): number {
    return this.aiPlayers.size;
  }

  /**
   * 取得回合順序
   */
  getTurnOrder(): TurnOrder {
    return { ...this.turnOrder };
  }

  /**
   * 取得行動日誌
   */
  getActionLogs(limit?: number): AIActionLog[] {
    const logs = [...this.actionLogs];
    if (limit) {
      return logs.slice(-limit);
    }
    return logs;
  }

  /**
   * 取得特定 AI 的行動日誌
   */
  getAIActionLogs(aiId: string, limit?: number): AIActionLog[] {
    const logs = this.actionLogs.filter(log => log.playerId === aiId);
    if (limit) {
      return logs.slice(-limit);
    }
    return logs;
  }

  /**
   * 檢查是否正在處理回合
   */
  isProcessing(): boolean {
    return this.isProcessingTurn;
  }

  /**
   * 設定難度
   */
  setDifficulty(difficulty: AIDifficulty): void {
    this.config.difficulty = difficulty;
    this.aiPlayers.forEach((aiPlayer) => {
      aiPlayer.setDifficulty(difficulty);
    });
    this.log('Difficulty updated', { difficulty });
  }

  /**
   * 跳過當前 AI 回合（用於加速）
   */
  skipCurrentTurn(): void {
    if (this.isAITurn()) {
      this.advanceTurn();
      this.log('Current AI turn skipped');
    }
  }

  /**
   * 重置管理器
   */
  reset(): void {
    this.aiPlayers.clear();
    this.actionLogs = [];
    this.turnOrder = {
      order: [this.humanPlayerId],
      currentIndex: 0,
      currentPlayerId: this.humanPlayerId,
      round: 1,
    };
    this.isProcessingTurn = false;
    this.log('AIPlayerManager reset');
  }
}

// ==================== 輔助函數 ====================

/**
 * 建立 AI 玩家管理器
 */
export function createAIPlayerManager(
  humanPlayerId: string,
  aiCount: number,
  difficulty: AIDifficulty = 'medium',
  seed?: string
): AIPlayerManager {
  return new AIPlayerManager(humanPlayerId, {
    aiCount,
    difficulty,
    randomPersonalities: true,
    seed,
  });
}

/**
 * 生成遊戲設置選項
 */
export function generateGameSetupOptions(
  humanCharacter: Character,
  aiCount: number,
  difficulty: AIDifficulty,
  includeWidowsWalk: boolean = false,
  seed?: string
): GameSetupOptions {
  const personalities: AIPersonality[] = [];
  const personalityOptions: AIPersonality[] = ['explorer', 'cautious', 'aggressive'];

  const rng = seed ? createSeededRng(seed) : Math.random;

  for (let i = 0; i < aiCount; i++) {
    personalities.push(personalityOptions[Math.floor(rng() * personalityOptions.length)]);
  }

  return {
    humanCharacter,
    aiCount,
    difficulty,
    personalities,
    includeWidowsWalk,
    seed,
  };
}

/**
 * 建立有種子的隨機數生成器
 */
function createSeededRng(seed: string): () => number {
  let state = 0;
  for (let i = 0; i < seed.length; i++) {
    state = ((state << 5) - state) + seed.charCodeAt(i);
    state = state & state;
  }
  return () => {
    state = (state * 9301 + 49297) % 233280;
    return state / 233280;
  };
}

/**
 * 取得個性圖標
 */
export function getPersonalityIcon(personality: AIPersonality): string {
  const icons: Record<AIPersonality, string> = {
    explorer: '🔍',
    cautious: '🛡️',
    aggressive: '⚔️',
  };
  return icons[personality];
}

/**
 * 取得個性顏色
 */
export function getPersonalityColor(personality: AIPersonality): string {
  const colors: Record<AIPersonality, string> = {
    explorer: '#3B82F6', // blue
    cautious: '#10B981', // green
    aggressive: '#EF4444', // red
  };
  return colors[personality];
}

// ==================== 預設匯出 ====================

export default AIPlayerManager;
