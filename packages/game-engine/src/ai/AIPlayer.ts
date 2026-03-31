/**
 * AIPlayer.ts - AI 玩家控制器
 * 
 * 實作完整的 AI 玩家，從遊戲開始到結束全程參與。
 * 
 * 功能：
 * 1. 探索階段：移動、發現房間、抽卡、處理事件
 * 2. 作祟階段：根據身份（叛徒/英雄）使用對應 AI
 * 3. 多種個性類型：Explorer、Cautious、Aggressive
 * 4. 難度等級：Easy、Medium、Hard
 * 
 * 設計原則：
 * - 只使用 Rules Engine 暴露的合法 action interface
 * - 不得直接修改 state schema 或規則判定
 * - AI decision output 必須可解釋、可重播、可測試
 */

import {
  GameState,
  Player,
  Position3D,
  Card,
  Direction,
  Character,
  StatType,
  Tile,
  Floor,
} from '../types';
import { Room } from '@betrayal/shared';
import {
  AIDecisionEngine,
  AIDecision,
  AIDifficulty,
  LegalActions,
  GameSituation,
  selectDecisionByDifficulty,
} from './AIDecisionEngine';
import { TraitorAI } from './TraitorAI';
import { HeroAI } from './HeroAI';
import { PathFinder } from '../rules/movement';
import { RoomDiscoveryManager, drawRoomForExploration, RoomDiscoveryResult } from '../rules/roomDiscovery';

// ==================== 類型定義 ====================

/** AI 個性類型 */
export type AIPersonality = 'explorer' | 'cautious' | 'aggressive';

/** AI 玩家配置 */
export interface AIPlayerConfig {
  /** 難度等級 */
  difficulty: AIDifficulty;
  /** 個性類型 */
  personality: AIPersonality;
  /** 隨機種子（用於可重播性） */
  seed?: string;
  /** 是否啟用日誌 */
  enableLogging?: boolean;
  /** AI 名稱 */
  name?: string;
}

/** AI 玩家狀態 */
export interface AIPlayerState {
  /** AI 配置 */
  config: AIPlayerConfig;
  /** 控制的玩家 ID */
  playerId: string;
  /** 控制的玩家名稱 */
  playerName: string;
  /** 使用的角色 */
  character: Character | null;
  /** 當前位置 */
  position: Position3D;
  /** 行動歷史 */
  actionHistory: AIActionHistory[];
  /** 探索過的房間 ID */
  exploredRooms: Set<string>;
  /** 已知物品位置 */
  knownItemLocations: Map<string, Position3D>;
  /** 回合計數 */
  turnCount: number;
  /** 是否為叛徒 */
  isTraitor: boolean;
  /** 最後更新時間 */
  lastUpdate: number;
  /** 當前目標位置（用於移動） */
  currentTarget: Position3D | null;
  /** 累積的經驗（用於學習） */
  experience: AIExperience;
}

/** AI 行動歷史 */
export interface AIActionHistory {
  /** 回合數 */
  turn: number;
  /** 遊戲階段 */
  phase: 'exploration' | 'haunt';
  /** 執行的決策 */
  decision: AIDecision;
  /** 決策前的狀態 */
  situation: GameSituation;
  /** 時間戳 */
  timestamp: number;
  /** 結果（成功/失敗） */
  result?: 'success' | 'failure' | 'neutral';
}

/** AI 經驗累積 */
export interface AIExperience {
  /** 發現的房間數 */
  roomsDiscovered: number;
  /** 收集的物品數 */
  itemsCollected: number;
  /** 參與的戰鬥數 */
  combatsParticipated: number;
  /** 勝利的戰鬥數 */
  combatsWon: number;
  /** 成功的事件檢定數 */
  successfulChecks: number;
  /** 失敗的事件檢定數 */
  failedChecks: number;
}

/** 探索決策結果 */
export interface ExplorationDecision {
  /** 決策類型 */
  type: 'move' | 'explore' | 'use_item' | 'end_turn';
  /** 目標位置 */
  targetPosition?: Position3D;
  /** 探索方向 */
  direction?: Direction;
  /** 使用的物品 */
  itemId?: string;
  /** 決策理由 */
  reason: string;
  /** 預期分數 */
  score: number;
}

/** 回合執行結果 */
export interface TurnExecutionResult {
  /** AI 玩家 ID */
  playerId: string;
  /** AI 玩家名稱 */
  playerName: string;
  /** 執行的決策列表 */
  decisions: AIDecision[];
  /** 是否完成回合 */
  completed: boolean;
  /** 日誌訊息 */
  logs: string[];
  /** 新位置 */
  newPosition?: Position3D;
  /** 是否發現新房間 */
  discoveredRoom: boolean;
  /** 抽到的卡牌 */
  drawnCard?: Card;
  /** 探索方向（Issue #148: 用於前端更新地圖） */
  exploreDirection?: Direction;
  /** Issue #151: 發現的新房間資料（用於前端更新地圖） */
  discoveredRoomData?: {
    room: Room;
    position: Position3D;
    rotation: 0 | 90 | 180 | 270;
    floor: Floor;
  };
}

// ==================== 個性權重配置 ====================

/** 個性權重類型 */
export interface PersonalityWeights {
  explorePriority: number;
  safetyPriority: number;
  combatPriority: number;
  itemPriority: number;
  riskTolerance: number;
}

/** 個性特定權重 */
export const PERSONALITY_WEIGHTS: Record<AIPersonality, PersonalityWeights> = {
  explorer: {
    explorePriority: 2.0,
    safetyPriority: 0.8,
    combatPriority: 0.6,
    itemPriority: 1.2,
    riskTolerance: 0.7,
  },
  cautious: {
    explorePriority: 0.8,
    safetyPriority: 2.0,
    combatPriority: 0.4,
    itemPriority: 1.0,
    riskTolerance: 0.3,
  },
  aggressive: {
    explorePriority: 1.0,
    safetyPriority: 0.5,
    combatPriority: 1.8,
    itemPriority: 0.8,
    riskTolerance: 0.9,
  },
};

// ==================== AI 玩家類 ====================

/**
 * AI 玩家控制器
 * 負責控制 AI 玩家從遊戲開始到結束的所有行動
 */
export class AIPlayer {
  private decisionEngine: AIDecisionEngine;
  private state: AIPlayerState;
  private traitorAI: TraitorAI | null = null;
  private heroAI: HeroAI | null = null;
  private rng: () => number;

  constructor(
    playerId: string,
    config: AIPlayerConfig = { difficulty: 'medium', personality: 'explorer' }
  ) {
    this.decisionEngine = new AIDecisionEngine(
      config.difficulty,
      config.seed
    );
    this.rng = this.createSeededRng(config.seed || Date.now().toString());

    this.state = {
      config,
      playerId,
      playerName: config.name || `AI-${playerId.slice(-4)}`,
      character: null,
      position: { x: 7, y: 7, floor: 'ground' },
      actionHistory: [],
      exploredRooms: new Set(),
      knownItemLocations: new Map(),
      turnCount: 0,
      isTraitor: false,
      lastUpdate: Date.now(),
      currentTarget: null,
      experience: {
        roomsDiscovered: 0,
        itemsCollected: 0,
        combatsParticipated: 0,
        combatsWon: 0,
        successfulChecks: 0,
        failedChecks: 0,
      },
    };

    this.log('AIPlayer initialized', { playerId, config });
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
    if (this.state.config.enableLogging) {
      console.log(`[AIPlayer][${this.state.playerName}] ${message}`, data || '');
    }
  }

  /**
   * 設定角色
   */
  setCharacter(character: Character): void {
    this.state.character = character;
    this.state.playerName = character.name;
    this.log('Character set', { character: character.name });
  }

  /**
   * 設定位置
   */
  setPosition(position: Position3D): void {
    this.state.position = position;
  }

  /**
   * 設定叛徒狀態
   */
  setTraitorStatus(isTraitor: boolean): void {
    this.state.isTraitor = isTraitor;
    this.log('Traitor status updated', { isTraitor });
  }

  /**
   * 初始化 Haunt 階段的 AI
   */
  initializeHauntAI(gameState: GameState): void {
    if (this.state.isTraitor) {
      this.traitorAI = new TraitorAI(this.state.playerId, {
        difficulty: this.state.config.difficulty,
        seed: this.state.config.seed,
        enableLogging: this.state.config.enableLogging,
      });
      this.log('TraitorAI initialized');
    } else {
      this.heroAI = new HeroAI(this.state.playerId, {
        difficulty: this.state.config.difficulty,
        seed: this.state.config.seed,
        enableLogging: this.state.config.enableLogging,
      });
      this.log('HeroAI initialized');
    }
  }

  /**
   * 執行完整回合
   * 根據當前遊戲階段選擇適當的行為
   * 
   * Issue #148: 添加 try-catch 包裝，確保始終返回有效的結果
   */
  executeTurn(gameState: GameState): TurnExecutionResult {
    this.state.turnCount++;
    const phase = gameState.haunt.isActive ? 'haunt' : 'exploration';
    
    this.log(`Starting turn ${this.state.turnCount} in ${phase} phase`);

    const result: TurnExecutionResult = {
      playerId: this.state.playerId,
      playerName: this.state.playerName,
      decisions: [],
      completed: false,
      logs: [],
      discoveredRoom: false,
    };

    try {
      if (phase === 'exploration') {
        // 探索階段：使用探索引擎
        const explorationResult = this.executeExplorationTurn(gameState);
        result.decisions = explorationResult.decisions;
        result.logs = explorationResult.logs;
        result.discoveredRoom = explorationResult.discoveredRoom;
        result.newPosition = explorationResult.newPosition;
        result.drawnCard = explorationResult.drawnCard;
        result.exploreDirection = explorationResult.exploreDirection;
        // Issue #161-fix: 複製 discoveredRoomData 到結果
        result.discoveredRoomData = explorationResult.discoveredRoomData;
      } else {
        // 作祟階段：使用對應的 Haunt AI
        const hauntResult = this.executeHauntTurn(gameState);
        result.decisions = hauntResult.decisions;
        result.logs = hauntResult.logs;
        result.discoveredRoom = false;
      }

      // Issue #148: 確保始終至少有一條日誌
      if (result.logs.length === 0) {
        result.logs.push(`${this.state.playerName} 完成回合`);
      }

      result.completed = true;
      this.log('Turn execution completed', { decisionCount: result.decisions.length });
    } catch (error) {
      // Issue #148: 捕獲異常，確保不會卡住
      const errorMessage = error instanceof Error ? error.message : '未知錯誤';
      this.log('Error executing turn', { error: errorMessage });
      
      result.logs.push(`${this.state.playerName} 回合執行出錯: ${errorMessage}`);
      result.decisions.push({
        action: 'endTurn',
        score: 0,
        reason: '因錯誤而結束回合',
      });
      result.completed = true;
    }
    
    return result;
  }

  /**
   * 執行探索階段回合
   * 
   * Issue #148: 改進錯誤處理，確保始終返回有效的結果
   */
  private executeExplorationTurn(gameState: GameState): TurnExecutionResult {
    const result: TurnExecutionResult = {
      playerId: this.state.playerId,
      playerName: this.state.playerName,
      decisions: [],
      completed: false,
      logs: [],
      discoveredRoom: false,
    };

    const player = this.getPlayer(gameState);
    if (!player) {
      // Issue #148: 確保返回錯誤日誌和結束決策
      result.logs.push(`錯誤：找不到玩家 ${this.state.playerId}`);
      result.decisions.push({
        action: 'endTurn',
        score: 0,
        reason: '找不到玩家，強制結束回合',
      });
      result.completed = true;
      return result;
    }

    // 更新位置
    this.state.position = player.position;

    // 獲取合法行動
    // Issue #150: 添加調試日誌
    this.log('Getting legal actions', { 
      playerId: this.state.playerId, 
      currentPlayerId: gameState.turn.currentPlayerId,
      position: player.position,
      movesRemaining: gameState.turn.movesRemaining,
      hasDiscoveredRoom: gameState.turn.hasDiscoveredRoom
    });
    
    const legalActions = this.decisionEngine.getLegalActions(
      gameState,
      this.state.playerId
    );

    // Issue #150: 添加詳細調試日誌
    this.log('Legal actions received', {
      explorableDirections: legalActions.explorableDirections,
      movablePositionsCount: legalActions.movablePositions.length,
      usableItemsCount: legalActions.usableItems.length,
      canEndTurn: legalActions.canEndTurn
    });

    // Issue #148: 檢查是否有任何可行動
    const hasAnyAction = legalActions.explorableDirections.length > 0 || 
                         legalActions.movablePositions.length > 0 ||
                         legalActions.usableItems.length > 0;
    
    if (!hasAnyAction && !gameState.turn.hasDiscoveredRoom) {
      // 沒有任何可行動，直接結束回合
      result.logs.push(`${this.state.playerName} 沒有可執行的行動`);
      result.decisions.push({
        action: 'endTurn',
        score: 0,
        reason: '沒有可執行的行動',
      });
      result.completed = true;
      return result;
    }

    // 執行回合直到結束
    let movesRemaining = gameState.turn.movesRemaining;
    let hasDiscoveredRoom = gameState.turn.hasDiscoveredRoom;
    const totalSpeed = player.currentStats.speed;
    const minMovesRequired = Math.max(1, Math.floor(totalSpeed * 0.5)); // 至少使用 50% 的 Speed

    while (movesRemaining > 0 && !hasDiscoveredRoom) {
      const decision = this.decideExplorationAction(
        gameState,
        legalActions,
        movesRemaining
      );

      // Issue #148: 確保決策有效
      if (!decision) {
        this.log('No valid decision returned, forcing end turn');
        result.decisions.push({
          action: 'endTurn',
          score: 0,
          reason: '無法做出有效決策',
        });
        result.logs.push(`${this.state.playerName} 無法做出決策，結束回合`);
        break;
      }

      result.decisions.push(decision);
      result.logs.push(this.formatDecisionLog(decision));

      // 記錄行動
      this.recordAction(gameState.turn.turnNumber, 'exploration', decision, {
        isTraitor: false,
        phase: 'exploration',
        healthStatus: this.evaluateHealthStatus(player),
        distanceToObjective: 0,
        nearbyEnemies: [],
        itemCount: player.items.length + player.omens.length,
        achievableWinConditions: [],
      });

      // 處理決策結果
      if (decision.action === 'endTurn') {
        // 檢查是否滿足最小移動要求
        const movesUsed = totalSpeed - movesRemaining;
        // 檢查是否還有可探索方向或可移動位置
        const hasAvailableActions = legalActions.explorableDirections.length > 0 || 
                                    legalActions.movablePositions.length > 0;
        if (movesUsed < minMovesRequired && hasAvailableActions) {
          // 還沒使用足夠的移動點數，繼續行動
          this.log(`Moves used (${movesUsed}) less than required (${minMovesRequired}), continuing turn`);
          continue;
        }
        break;
      } else if (decision.action === 'explore' && decision.exploreDirection) {
        hasDiscoveredRoom = true;
        result.discoveredRoom = true;
        this.state.experience.roomsDiscovered++;
        
        // Issue #148: 計算並設置新房間位置
        const newPosition = this.calculateNewPositionFromDirection(
          this.state.position,
          decision.exploreDirection
        );
        this.state.position = newPosition;
        result.newPosition = newPosition;
        result.exploreDirection = decision.exploreDirection; // 添加探索方向資訊
        
        // Issue #151: 抽取新房間並返回房間資訊給前端
        // 創建臨時 gameState，確保玩家位置正確
        const tempGameState = {
          ...gameState,
          players: gameState.players.map(p =>
            p.id === this.state.playerId
              ? { ...p, position: this.state.position }
              : p
          ),
        };
        const discoveryResult = drawRoomForExploration(
          tempGameState,
          this.state.position.floor,
          decision.exploreDirection,
          10
        );
        
        if (discoveryResult.success && discoveryResult.room) {
          result.discoveredRoomData = {
            room: discoveryResult.room,
            position: newPosition,
            rotation: discoveryResult.rotation || 0,
            floor: this.state.position.floor,
          };
          // Issue #185-fix: Set discoveredRoom flag to true
          result.discoveredRoom = true;
          this.log(`Discovered room: ${discoveryResult.room.name} at (${newPosition.x}, ${newPosition.y})`);
        } else {
          this.log(`Failed to discover room: ${discoveryResult.error}`);
        }
        
        break;
      } else if (decision.action === 'move' && decision.targetPosition) {
        movesRemaining--;
        this.state.position = decision.targetPosition;
        result.newPosition = decision.targetPosition;
      } else if (decision.action === 'useItem') {
        // 使用物品不消耗移動點數
      }

      // 防止無限循環
      if (result.decisions.length > 20) {
        this.log('Too many decisions, forcing end turn');
        break;
      }
    }

    // Issue #148: 確保始終有結束決策
    const lastDecision = result.decisions[result.decisions.length - 1];
    if (!lastDecision || lastDecision.action !== 'endTurn') {
      result.decisions.push({
        action: 'endTurn',
        score: 0,
        reason: '移動點數用完或無可行動',
      });
      result.logs.push(`${this.state.playerName} 結束回合`);
    }

    result.completed = true;
    return result;
  }

  /**
   * 決定探索階段的行動
   * 
   * Issue #148: 確保始終返回有效的決策，不會返回 null
   */
  private decideExplorationAction(
    gameState: GameState,
    legalActions: LegalActions,
    movesRemaining: number
  ): AIDecision {
    const player = this.getPlayer(gameState);
    if (!player) {
      return { action: 'endTurn', score: 0, reason: '找不到玩家' };
    }

    // Issue #148: 防禦性檢查 legalActions
    if (!legalActions) {
      this.log('Legal actions is null, returning end turn');
      return { action: 'endTurn', score: 0, reason: '無法獲取合法行動' };
    }

    const personality = PERSONALITY_WEIGHTS[this.state.config.personality];
    const decisions: AIDecision[] = [];

    // 評估探索選項（最高優先級）
    // 探索新房間是遊戲初期的主要目標
    for (const direction of legalActions.explorableDirections) {
      const score = this.evaluateExploration(
        gameState,
        direction,
        personality
      );
      decisions.push({
        action: 'explore',
        exploreDirection: direction,
        score,
        reason: `向 ${direction} 探索新房間`,
      });
    }

    // 評估移動選項
    for (const position of legalActions.movablePositions) {
      const score = this.evaluateExplorationMove(
        gameState,
        position,
        personality,
        movesRemaining
      );
      decisions.push({
        action: 'move',
        targetPosition: position,
        score,
        reason: `移動到 (${position.x}, ${position.y}, ${position.floor})`,
      });
    }

    // 評估使用物品
    for (const item of legalActions.usableItems) {
      const score = this.evaluateItemUseInExploration(
        gameState,
        item,
        personality
      );
      if (score > 0) {
        decisions.push({
          action: 'useItem',
          itemId: item.id,
          score,
          reason: `使用物品 ${item.name}`,
        });
      }
    }

    // 評估結束回合
    const endTurnScore = this.evaluateEndTurnInExploration(
      movesRemaining,
      legalActions,
      personality
    );
    decisions.push({
      action: 'endTurn',
      score: endTurnScore,
      reason: '結束回合',
    });

    // Issue #148: 確保至少有一個決策選項
    if (decisions.length === 0) {
      this.log('No decisions available, returning end turn');
      return { action: 'endTurn', score: 0, reason: '沒有可用的決策選項' };
    }

    // 根據難度選擇決策
    const selectedDecision = selectDecisionByDifficulty(
      decisions,
      this.state.config.difficulty,
      this.rng
    );

    // Issue #148: 確保始終返回有效的決策
    if (!selectedDecision) {
      this.log('selectDecisionByDifficulty returned null, using fallback');
      // 返回分數最高的決策，或預設結束回合
      const bestDecision = decisions.sort((a, b) => b.score - a.score)[0];
      return bestDecision || { action: 'endTurn', score: 0, reason: '預設結束回合' };
    }

    return selectedDecision;
  }

  /**
   * 評估探索行動
   */
  private evaluateExploration(
    gameState: GameState,
    direction: Direction,
    personality: typeof PERSONALITY_WEIGHTS['explorer']
  ): number {
    // 大幅提高基礎探索分數，確保探索始終是最高優先級
    let score = 100; // 基礎探索分數大幅提高

    // 根據個性調整
    score *= personality.explorePriority;

    // 探索者個性額外加成
    if (this.state.config.personality === 'explorer') {
      score += 50;
    }

    // 根據已探索房間數量調整（早期更傾向探索）
    if (this.state.experience.roomsDiscovered < 3) {
      score += 60; // 遊戲初期強烈傾向探索
    } else if (this.state.experience.roomsDiscovered < 5) {
      score += 30;
    }

    // 檢查該方向是否有更多未探索區域
    const player = this.getPlayer(gameState);
    if (player) {
      const unexploredCount = this.countUnexploredInDirection(gameState, player.position, direction);
      score += unexploredCount * 20;
    }

    // 謹慎個性在探索時考慮風險
    if (this.state.config.personality === 'cautious') {
      // 檢查是否會觸發事件
      score -= 5;
    }

    // 難度調整
    if (this.state.config.difficulty === 'easy') {
      score += (this.rng() - 0.5) * 10;
    }

    return score;
  }

  /**
   * 評估探索階段的移動
   */
  private evaluateExplorationMove(
    gameState: GameState,
    position: Position3D,
    personality: typeof PERSONALITY_WEIGHTS['explorer'],
    movesRemaining: number
  ): number {
    let score = 25; // 提高基礎移動分數

    // 檢查目標位置是否有未探索的相鄰房間
    const hasUnexploredNeighbor = this.hasUnexploredNeighbor(gameState, position);
    if (hasUnexploredNeighbor) {
      score += 40 * personality.explorePriority; // 大幅提高朝向未探索區域的移動分數
    }

    // 檢查該位置是否可以探索新房間
    const tile = this.getTileAt(gameState, position);
    if (tile && !tile.discovered) {
      score += 30; // 移動到未發現的房間有額外獎勵
    }

    // 謹慎個性：偏好已探索的區域
    if (this.state.config.personality === 'cautious') {
      if (tile?.discovered) {
        score += 15;
      }
    }

    // 激進個性：更願意冒險
    if (this.state.config.personality === 'aggressive') {
      score += 10;
    }

    // 遊戲初期更傾向移動
    if (this.state.experience.roomsDiscovered < 3) {
      score += 20;
    }

    // 距離懲罰（偏好短距離移動）
    const player = this.getPlayer(gameState);
    if (player) {
      const distance = this.calculateDistance(player.position, position);
      score -= distance * 2;
    }

    // 如果有移動點數但未使用，給予懲罰
    if (movesRemaining > 1) {
      score += 10; // 鼓勵使用多餘的移動點數
    }

    return score;
  }

  /**
   * 評估探索階段的物品使用
   */
  private evaluateItemUseInExploration(
    gameState: GameState,
    item: Card,
    personality: typeof PERSONALITY_WEIGHTS['explorer']
  ): number {
    let score = 0;

    const player = this.getPlayer(gameState);
    if (!player) return 0;

    // 治療物品在需要時使用
    if (this.isHealingItem(item)) {
      const healthStatus = this.evaluateHealthStatus(player);
      if (healthStatus === 'critical') {
        score = 100; // 危急時優先使用
      } else if (healthStatus === 'wounded') {
        score = 50;
      }
    }

    // 增益物品
    if (this.isBuffItem(item)) {
      score = 30;
    }

    // 謹慎個性更傾向保留物品
    if (this.state.config.personality === 'cautious') {
      score *= 0.8;
    }

    return score;
  }

  /**
   * 評估探索階段結束回合
   */
  private evaluateEndTurnInExploration(
    movesRemaining: number,
    legalActions: LegalActions,
    personality: typeof PERSONALITY_WEIGHTS['explorer']
  ): number {
    let score = 0;

    // 如果還有移動點數，強烈傾向不結束回合
    if (movesRemaining > 0) {
      if (legalActions.explorableDirections.length > 0) {
        // 有可探索方向時，結束回合的懲罰非常強烈
        // 確保探索分數（100+）始終高於結束回合分數
        score -= 200 * personality.explorePriority;
      } else if (legalActions.movablePositions.length > 0) {
        // 有可移動位置時，結束回合也有較強懲罰
        score -= 80;
      }
    }

    // 如果沒有可行動，傾向結束
    if (legalActions.explorableDirections.length === 0 && 
        legalActions.movablePositions.length === 0) {
      score = 100;
    }

    // 早期遊戲（探索房間少於 5 個），更傾向繼續行動
    if (this.state.experience.roomsDiscovered < 5 && movesRemaining > 0) {
      score -= 50;
    }

    // 確保結束回合的分數始終低於探索分數（當有可探索方向時）
    if (legalActions.explorableDirections.length > 0) {
      score = Math.min(score, -100);
    }

    return score;
  }

  /**
   * 執行作祟階段回合
   *
   * Issue #148: 改進錯誤處理，確保始終返回有效的結果
   */
  private executeHauntTurn(gameState: GameState): TurnExecutionResult {
    const result: TurnExecutionResult = {
      playerId: this.state.playerId,
      playerName: this.state.playerName,
      decisions: [],
      completed: false,
      logs: [],
      discoveredRoom: false,
    };

    try {
      // 使用對應的 Haunt AI
      if (this.state.isTraitor && this.traitorAI) {
        result.decisions = this.traitorAI.executeTurn(gameState);
        result.logs.push(`叛徒 AI 執行 ${result.decisions.length} 個決策`);
      } else if (!this.state.isTraitor && this.heroAI) {
        result.decisions = this.heroAI.executeTurn(gameState);
        result.logs.push(`英雄 AI 執行 ${result.decisions.length} 個決策`);
      } else {
        // 如果 Haunt AI 未初始化，使用基礎決策引擎
        result.logs.push('警告：Haunt AI 未初始化');
        result.decisions.push({
          action: 'endTurn',
          score: 0,
          reason: 'Haunt AI 未初始化',
        });
      }

      // Issue #148: 確保始終至少有一條日誌
      if (result.logs.length === 0) {
        result.logs.push(`${this.state.playerName} 完成作祟階段回合`);
      }

      // Issue #148: 確保始終有結束決策
      const lastDecision = result.decisions[result.decisions.length - 1];
      if (!lastDecision || lastDecision.action !== 'endTurn') {
        result.decisions.push({
          action: 'endTurn',
          score: 0,
          reason: '結束作祟階段回合',
        });
      }

      result.completed = true;
    } catch (error) {
      // Issue #148: 捕獲異常
      const errorMessage = error instanceof Error ? error.message : '未知錯誤';
      this.log('Error executing haunt turn', { error: errorMessage });

      result.logs.push(`${this.state.playerName} 作祟階段回合出錯: ${errorMessage}`);
      result.decisions.push({
        action: 'endTurn',
        score: 0,
        reason: '因錯誤而結束回合',
      });
      result.completed = true;
    }

    return result;
  }

  /**
   * 處理抽到的卡牌
   */
  handleDrawnCard(card: Card, gameState: GameState): AIDecision {
    this.log('Handling drawn card', { cardType: card.type, cardName: card.name });

    // 記錄抽卡
    if (card.type === 'item' || card.type === 'omen') {
      this.state.experience.itemsCollected++;
    }

    // 根據卡牌類型做出反應
    if (card.type === 'event' && card.rollRequired) {
      // 事件卡需要檢定
      return {
        action: 'useItem',
        itemId: '', // 這裡會由外部處理檢定
        score: 0,
        reason: `處理事件卡: ${card.name}`,
      };
    }

    return {
      action: 'endTurn',
      score: 0,
      reason: `處理卡牌: ${card.name}`,
    };
  }

  /**
   * 決定屬性檢定
   */
  decideStatCheck(
    stat: StatType,
    target: number,
    gameState: GameState
  ): { useItem: boolean; itemId?: string } {
    const player = this.getPlayer(gameState);
    if (!player) return { useItem: false };

    const currentValue = player.currentStats[stat];
    const neededBonus = Math.max(0, target - currentValue);

    // 如果差距太大，嘗試使用物品
    if (neededBonus > 2) {
      // 尋找可以增加該屬性的物品
      for (const item of player.items) {
        if (this.canItemBoostStat(item, stat)) {
          return { useItem: true, itemId: item.id };
        }
      }
    }

    return { useItem: false };
  }

  /**
   * 記錄行動
   */
  private recordAction(
    turn: number,
    phase: 'exploration' | 'haunt',
    decision: AIDecision,
    situation: GameSituation
  ): void {
    this.state.actionHistory.push({
      turn,
      phase,
      decision,
      situation,
      timestamp: Date.now(),
    });
  }

  /**
   * 格式化決策日誌
   */
  private formatDecisionLog(decision: AIDecision): string {
    switch (decision.action) {
      case 'move':
        return `移動到 (${decision.targetPosition?.x}, ${decision.targetPosition?.y})`;
      case 'explore':
        return `向 ${decision.exploreDirection} 探索新房間`;
      case 'useItem':
        return `使用物品 ${decision.itemId}`;
      case 'attack':
        return `攻擊 ${decision.targetPlayerId}`;
      case 'endTurn':
        return '結束回合';
      default:
        return '未知行動';
    }
  }

  // ==================== 輔助方法 ====================

  /**
   * 獲取玩家
   */
  private getPlayer(gameState: GameState): Player | null {
    return gameState.players.find(p => p.id === this.state.playerId) || null;
  }

  /**
   * 獲取指定位置的 Tile
   */
  private getTileAt(gameState: GameState, position: Position3D): Tile | null {
    const floorMap = gameState.map[position.floor];
    if (position.y >= 0 && position.y < floorMap.length &&
        position.x >= 0 && position.x < floorMap[position.y].length) {
      return floorMap[position.y][position.x];
    }
    return null;
  }

  /**
   * 檢查位置是否有未探索的相鄰房間
   */
  private hasUnexploredNeighbor(gameState: GameState, position: Position3D): boolean {
    const directions: Direction[] = ['north', 'south', 'east', 'west'];
    const deltas = { north: { x: 0, y: -1 }, south: { x: 0, y: 1 }, east: { x: 1, y: 0 }, west: { x: -1, y: 0 } };

    for (const dir of directions) {
      const newPos = {
        x: position.x + deltas[dir].x,
        y: position.y + deltas[dir].y,
        floor: position.floor,
      };
      const tile = this.getTileAt(gameState, newPos);
      if (tile && !tile.discovered) {
        return true;
      }
    }
    return false;
  }

  /**
   * 計算某方向的未探索數量
   */
  private countUnexploredInDirection(
    gameState: GameState,
    position: Position3D,
    direction: Direction
  ): number {
    const deltas = {
      north: { x: 0, y: -1 },
      south: { x: 0, y: 1 },
      east: { x: 1, y: 0 },
      west: { x: -1, y: 0 },
    };

    let count = 0;
    let currentPos = { ...position };

    // 檢查該方向最多 3 格
    for (let i = 0; i < 3; i++) {
      currentPos = {
        x: currentPos.x + deltas[direction].x,
        y: currentPos.y + deltas[direction].y,
        floor: currentPos.floor,
      };

      const tile = this.getTileAt(gameState, currentPos);
      if (tile && !tile.discovered) {
        count++;
      } else if (!tile) {
        break;
      }
    }

    return count;
  }

  /**
   * 計算距離
   */
  private calculateDistance(from: Position3D, to: Position3D): number {
    if (from.floor !== to.floor) {
      return Math.abs(from.x - to.x) + Math.abs(from.y - to.y) + 10;
    }
    return Math.abs(from.x - to.x) + Math.abs(from.y - to.y);
  }

  /**
   * 根據方向計算新位置
   * Issue #148: 用於計算探索新房間後的位置
   */
  private calculateNewPositionFromDirection(
    currentPosition: Position3D,
    direction: Direction
  ): Position3D {
    const deltas = {
      north: { x: 0, y: -1 },
      south: { x: 0, y: 1 },
      east: { x: 1, y: 0 },
      west: { x: -1, y: 0 },
    };

    return {
      x: currentPosition.x + deltas[direction].x,
      y: currentPosition.y + deltas[direction].y,
      floor: currentPosition.floor,
    };
  }

  /**
   * 評估健康狀態
   */
  private evaluateHealthStatus(player: Player): 'healthy' | 'wounded' | 'critical' {
    const might = player.currentStats.might;
    if (might <= 2) return 'critical';
    if (might <= 4) return 'wounded';
    return 'healthy';
  }

  /**
   * 檢查是否為治療物品
   */
  private isHealingItem(item: Card): boolean {
    const healingKeywords = ['heal', 'medical', 'potion', 'restore', '治療', '藥水'];
    return healingKeywords.some(kw => 
      item.name.toLowerCase().includes(kw) || 
      item.description.toLowerCase().includes(kw)
    );
  }

  /**
   * 檢查是否為增益物品
   */
  private isBuffItem(item: Card): boolean {
    const buffKeywords = ['boost', 'enhance', 'buff', '增益', '強化'];
    return buffKeywords.some(kw => 
      item.name.toLowerCase().includes(kw) || 
      item.description.toLowerCase().includes(kw)
    );
  }

  /**
   * 檢查物品是否可以提升屬性
   */
  private canItemBoostStat(item: Card, stat: StatType): boolean {
    // 簡化實現：檢查物品描述中是否提到該屬性
    const statNames: Record<StatType, string[]> = {
      speed: ['speed', '速度', '敏捷'],
      might: ['might', '力量', '強壯'],
      sanity: ['sanity', '理智', '精神'],
      knowledge: ['knowledge', '知識', '智慧'],
    };
    return statNames[stat].some(name => 
      item.description.toLowerCase().includes(name.toLowerCase())
    );
  }

  // ==================== Getter 方法 ====================

  /**
   * 取得玩家 ID
   */
  getPlayerId(): string {
    return this.state.playerId;
  }

  /**
   * 取得玩家名稱
   */
  getPlayerName(): string {
    return this.state.playerName;
  }

  /**
   * 取得當前位置
   */
  getPosition(): Position3D {
    return { ...this.state.position };
  }

  /**
   * 取得行動歷史
   */
  getActionHistory(): AIActionHistory[] {
    return [...this.state.actionHistory];
  }

  /**
   * 取得經驗統計
   */
  getExperience(): AIExperience {
    return { ...this.state.experience };
  }

  /**
   * 取得角色
   */
  getCharacter(): Character | null {
    return this.state.character;
  }

  /**
   * 取得配置
   */
  getConfig(): AIPlayerConfig {
    return { ...this.state.config };
  }

  /**
   * 設定難度
   */
  setDifficulty(difficulty: AIDifficulty): void {
    this.state.config.difficulty = difficulty;
    this.decisionEngine.setDifficulty(difficulty);
    if (this.traitorAI) this.traitorAI.setDifficulty(difficulty);
    if (this.heroAI) this.heroAI.setDifficulty(difficulty);
    this.log('Difficulty changed', { difficulty });
  }

  /**
   * 設定個性
   */
  setPersonality(personality: AIPersonality): void {
    this.state.config.personality = personality;
    this.log('Personality changed', { personality });
  }
}

// ==================== 輔助函數 ====================

/**
 * 建立 AI 玩家實例
 */
export function createAIPlayer(
  playerId: string,
  difficulty: AIDifficulty = 'medium',
  personality: AIPersonality = 'explorer',
  seed?: string,
  name?: string
): AIPlayer {
  return new AIPlayer(playerId, {
    difficulty,
    personality,
    seed,
    name,
    enableLogging: true,
  });
}

/**
 * 隨機選擇個性
 */
export function getRandomPersonality(rng: () => number = Math.random): AIPersonality {
  const personalities: AIPersonality[] = ['explorer', 'cautious', 'aggressive'];
  return personalities[Math.floor(rng() * personalities.length)];
}

/**
 * 取得個性描述
 */
export function getPersonalityDescription(personality: AIPersonality): string {
  const descriptions: Record<AIPersonality, string> = {
    explorer: '探索者：優先發現新房間，喜歡探索未知區域',
    cautious: '謹慎者：避免危險，優先保護自己',
    aggressive: '激進者：願意冒險，積極尋找戰鬥機會',
  };
  return descriptions[personality];
}

// ==================== 預設匯出 ====================

export default AIPlayer;
