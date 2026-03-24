/**
 * TraitorAI.ts - 叛徒 AI 控制器
 * 
 * 實作單人模式下的叛徒 AI，控制叛徒角色在作祟階段的行為。
 * 
 * 功能：
 * 1. 控制叛徒角色在作祟階段的行動
 * 2. 根據難度等級做出不同品質的決策
 * 3. 嘗試完成叛徒的勝利條件
 * 4. 對英雄玩家的行動做出反應
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
import { PathFinder } from '../rules/movement';
import { CombatManager } from '../rules/combat';
import { RoomDiscoveryManager } from '../rules/roomDiscovery';
import { TurnManager } from '../rules/turn';
import { getScenarioById } from '../data/hauntScenarios';

// ==================== 類型定義 ====================

/** 叛徒 AI 配置 */
export interface TraitorAIConfig {
  /** 難度等級 */
  difficulty: AIDifficulty;
  /** 隨機種子（用於可重播性） */
  seed?: string;
  /** 是否啟用日誌 */
  enableLogging?: boolean;
}

/** 叛徒目標類型 */
export type TraitorObjectiveType =
  | 'eliminate_heroes'      // 消滅所有英雄
  | 'collect_items'         // 收集特定物品
  | 'reach_location'        // 到達特定位置
  | 'survive_turns'         // 存活特定回合數
  | 'custom';               // 自定義目標

/** 叛徒目標狀態 */
export interface TraitorObjectiveState {
  /** 目標類型 */
  type: TraitorObjectiveType;
  /** 目標描述 */
  description: string;
  /** 完成進度 */
  progress: number;
  /** 目標值 */
  target: number;
  /** 是否已完成 */
  completed: boolean;
}

/** AI 行動歷史 */
export interface AIActionHistory {
  /** 回合數 */
  turn: number;
  /** 執行的決策 */
  decision: AIDecision;
  /** 決策前的狀態 */
  situation: GameSituation;
  /** 時間戳 */
  timestamp: number;
}

/** 叛徒 AI 狀態 */
export interface TraitorAIState {
  /** AI 配置 */
  config: TraitorAIConfig;
  /** 控制的玩家 ID */
  playerId: string;
  /** 當前目標 */
  currentObjective: TraitorObjectiveState;
  /** 行動歷史 */
  actionHistory: AIActionHistory[];
  /** 目標優先級列表 */
  objectivePriorities: TraitorObjectiveType[];
  /** 已知英雄位置 */
  knownHeroPositions: Map<string, Position3D>;
  /** 最後更新時間 */
  lastUpdate: number;
}

// ==================== 叛徒 AI 類 ====================

/**
 * 叛徒 AI 控制器
 * 負責在作祟階段控制叛徒角色的行動
 */
export class TraitorAI {
  private decisionEngine: AIDecisionEngine;
  private state: TraitorAIState;
  private combatManager: CombatManager;
  private rng: () => number;

  constructor(
    playerId: string,
    config: TraitorAIConfig = { difficulty: 'medium' }
  ) {
    this.decisionEngine = new AIDecisionEngine(
      config.difficulty,
      config.seed
    );
    this.rng = this.createSeededRng(config.seed || Date.now().toString());
    this.combatManager = new CombatManager({
      nextInt: (min: number, max: number) =>
        Math.floor(this.rng() * (max - min) + min),
      rollDice: (count: number) => ({
        count,
        results: Array(count).fill(0).map(() => Math.floor(this.rng() * 3)),
        total: 0,
      }),
    } as any);

    this.state = {
      config,
      playerId,
      currentObjective: {
        type: 'eliminate_heroes',
        description: '消滅所有英雄',
        progress: 0,
        target: 1,
        completed: false,
      },
      actionHistory: [],
      objectivePriorities: [
        'eliminate_heroes',
        'collect_items',
        'reach_location',
        'survive_turns',
      ],
      knownHeroPositions: new Map(),
      lastUpdate: Date.now(),
    };

    this.log('TraitorAI initialized', { playerId, config });
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
      console.log(`[TraitorAI][${this.state.playerId}] ${message}`, data || '');
    }
  }

  /**
   * 決定移動
   * 根據遊戲狀態選擇最佳的移動目標
   */
  decideMove(gameState: GameState): AIDecision {
    const legalActions = this.decisionEngine.getLegalActions(
      gameState,
      this.state.playerId
    );
    const situation = this.decisionEngine.evaluateSituation(
      gameState,
      this.state.playerId
    );

    this.log('Deciding move', { legalActions, situation });

    // 更新已知英雄位置
    this.updateKnownHeroPositions(gameState);

    const decisions: AIDecision[] = [];

    // 評估所有可能的移動
    for (const position of legalActions.movablePositions) {
      const score = this.decisionEngine.evaluateMove(
        gameState,
        this.state.playerId,
        position,
        situation
      );
      decisions.push({
        action: 'move',
        targetPosition: position,
        score,
        reason: `移動到 (${position.x}, ${position.y}, ${position.floor})`,
      });
    }

    // 評估探索選項
    for (const direction of legalActions.explorableDirections) {
      const score = this.decisionEngine.evaluateExplore(
        gameState,
        this.state.playerId,
        direction,
        situation
      );
      decisions.push({
        action: 'explore',
        exploreDirection: direction,
        score,
        reason: `向 ${direction} 探索新房間`,
      });
    }

    // 評估攻擊選項
    for (const targetId of legalActions.attackableTargets) {
      const score = this.decisionEngine.evaluateAttack(
        gameState,
        this.state.playerId,
        targetId,
        situation
      );
      decisions.push({
        action: 'attack',
        targetPlayerId: targetId,
        score,
        reason: `攻擊玩家 ${targetId}`,
      });
    }

    // 評估使用物品
    for (const item of legalActions.usableItems) {
      const score = this.decisionEngine.evaluateUseItem(
        gameState,
        this.state.playerId,
        item,
        situation
      );
      decisions.push({
        action: 'useItem',
        itemId: item.id,
        score,
        reason: `使用物品 ${item.name}`,
      });
    }

    // 評估結束回合
    const endTurnScore = this.decisionEngine.evaluateEndTurn(
      gameState,
      this.state.playerId,
      situation
    );
    decisions.push({
      action: 'endTurn',
      score: endTurnScore,
      reason: '結束回合',
    });

    // 根據難度選擇決策
    const selectedDecision = selectDecisionByDifficulty(
      decisions,
      this.state.config.difficulty,
      this.rng
    );

    if (selectedDecision) {
      this.recordAction(gameState.turn.turnNumber, selectedDecision, situation);
    }

    this.log('Decision made', selectedDecision);
    return selectedDecision || { action: 'endTurn', score: 0, reason: '預設結束回合' };
  }

  /**
   * 決定戰鬥行動
   * 當進入戰鬥時呼叫
   */
  decideCombat(gameState: GameState, target: Player): AIDecision {
    const situation = this.decisionEngine.evaluateSituation(
      gameState,
      this.state.playerId
    );

    this.log('Deciding combat action', { target: target.id });

    // 評估攻擊
    const attackScore = this.decisionEngine.evaluateAttack(
      gameState,
      this.state.playerId,
      target.id,
      situation
    );

    // 評估逃跑（簡單實現：危急時考慮逃跑）
    let fleeScore = -50;
    if (situation.healthStatus === 'critical') {
      fleeScore = 30;
    }

    const decisions: AIDecision[] = [
      {
        action: 'attack',
        targetPlayerId: target.id,
        score: attackScore,
        reason: `攻擊 ${target.name}`,
      },
    ];

    // 危急時添加逃跑選項
    if (fleeScore > 0) {
      decisions.push({
        action: 'move',
        score: fleeScore,
        reason: '危急狀態，嘗試逃跑',
      });
    }

    const selectedDecision = selectDecisionByDifficulty(
      decisions,
      this.state.config.difficulty,
      this.rng
    );

    this.log('Combat decision made', selectedDecision);
    return selectedDecision || { action: 'attack', targetPlayerId: target.id, score: 0, reason: '預設攻擊' };
  }

  /**
   * 決定物品使用
   * 在適當時機使用物品
   */
  decideItemUse(gameState: GameState): AIDecision {
    const legalActions = this.decisionEngine.getLegalActions(
      gameState,
      this.state.playerId
    );
    const situation = this.decisionEngine.evaluateSituation(
      gameState,
      this.state.playerId
    );

    this.log('Deciding item use', { availableItems: legalActions.usableItems });

    const decisions: AIDecision[] = [];

    for (const item of legalActions.usableItems) {
      const score = this.decisionEngine.evaluateUseItem(
        gameState,
        this.state.playerId,
        item,
        situation
      );
      decisions.push({
        action: 'useItem',
        itemId: item.id,
        score,
        reason: `使用 ${item.name}`,
      });
    }

    // 添加不使用物品的選項
    decisions.push({
      action: 'endTurn',
      score: 5,
      reason: '保留物品',
    });

    const selectedDecision = selectDecisionByDifficulty(
      decisions,
      this.state.config.difficulty,
      this.rng
    );

    this.log('Item use decision made', selectedDecision);
    return selectedDecision || { action: 'endTurn', score: 0, reason: '不使用物品' };
  }

  /**
   * 執行完整回合
   * 根據當前狀態執行一系列行動直到回合結束
   */
  executeTurn(gameState: GameState): AIDecision[] {
    const decisions: AIDecision[] = [];
    let currentState = gameState;

    this.log('Starting turn execution');

    // 持續做決策直到回合結束
    while (!currentState.turn.hasEnded) {
      const decision = this.decideMove(currentState);
      decisions.push(decision);

      this.log('Executing decision', decision);

      // 如果決定結束回合，跳出循環
      if (decision.action === 'endTurn') {
        break;
      }

      // 如果發現新房間，回合自動結束
      if (decision.action === 'explore') {
        break;
      }

      // 簡化處理：實際應用決策到狀態需要通過 Rules Engine
      // 這裡我們只記錄決策，實際狀態更新由外部處理

      // 防止無限循環
      if (decisions.length > 20) {
        this.log('Too many decisions, forcing end turn');
        break;
      }
    }

    this.log('Turn execution completed', { decisionCount: decisions.length });
    return decisions;
  }

  /**
   * 更新已知英雄位置
   */
  private updateKnownHeroPositions(gameState: GameState): void {
    for (const player of gameState.players) {
      if (!player.isTraitor && !player.isDead) {
        this.state.knownHeroPositions.set(player.id, player.position);
      }
    }
  }

  /**
   * 記錄行動
   */
  private recordAction(
    turn: number,
    decision: AIDecision,
    situation: GameSituation
  ): void {
    this.state.actionHistory.push({
      turn,
      decision,
      situation,
      timestamp: Date.now(),
    });
  }

  /**
   * 更新目標
   * 根據作祟劇本更新當前目標
   */
  updateObjective(gameState: GameState): void {
    if (!gameState.haunt.isActive) return;

    const scenario = gameState.haunt.hauntNumber
      ? getScenarioById(gameState.haunt.hauntNumber)
      : null;

    if (scenario?.traitorObjective) {
      this.state.currentObjective = {
        type: this.inferObjectiveType(scenario.traitorObjective),
        description: scenario.traitorObjective,
        progress: 0,
        target: 1,
        completed: false,
      };
    }

    this.log('Objective updated', this.state.currentObjective);
  }

  /**
   * 推斷目標類型
   */
  private inferObjectiveType(objectiveDescription: string): TraitorObjectiveType {
    const desc = objectiveDescription.toLowerCase();
    if (desc.includes('消滅') || desc.includes('殺死') || desc.includes('死亡')) {
      return 'eliminate_heroes';
    }
    if (desc.includes('收集') || desc.includes('找到')) {
      return 'collect_items';
    }
    if (desc.includes('到達') || desc.includes('前往')) {
      return 'reach_location';
    }
    if (desc.includes('存活') || desc.includes('生存')) {
      return 'survive_turns';
    }
    return 'custom';
  }

  /**
   * 取得最近的英雄
   */
  getNearestHero(gameState: GameState): Player | null {
    const traitor = gameState.players.find(
      p => p.id === this.state.playerId
    );
    if (!traitor) return null;

    let nearest: Player | null = null;
    let minDistance = Infinity;

    for (const player of gameState.players) {
      if (player.isTraitor || player.isDead) continue;

      const distance = this.calculateDistance(traitor.position, player.position);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = player;
      }
    }

    return nearest;
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
   * 檢查是否可以獲勝
   */
  checkWinCondition(gameState: GameState): boolean {
    const aliveHeroes = gameState.players.filter(
      p => !p.isTraitor && !p.isDead
    );
    return aliveHeroes.length === 0;
  }

  /**
   * 取得行動歷史
   */
  getActionHistory(): AIActionHistory[] {
    return [...this.state.actionHistory];
  }

  /**
   * 取得當前目標
   */
  getCurrentObjective(): TraitorObjectiveState {
    return { ...this.state.currentObjective };
  }

  /**
   * 設定難度
   */
  setDifficulty(difficulty: AIDifficulty): void {
    this.state.config.difficulty = difficulty;
    this.decisionEngine.setDifficulty(difficulty);
    this.log('Difficulty changed', { difficulty });
  }

  /**
   * 取得當前難度
   */
  getDifficulty(): AIDifficulty {
    return this.state.config.difficulty;
  }

  /**
   * 取得 AI 狀態
   */
  getState(): TraitorAIState {
    return {
      ...this.state,
      knownHeroPositions: new Map(this.state.knownHeroPositions),
    };
  }
}

// ==================== 輔助函數 ====================

/**
 * 建立叛徒 AI 實例
 */
export function createTraitorAI(
  playerId: string,
  difficulty: AIDifficulty = 'medium',
  seed?: string
): TraitorAI {
  return new TraitorAI(playerId, {
    difficulty,
    seed,
    enableLogging: true,
  });
}

/**
 * 檢查玩家是否為 AI 控制
 */
export function isAIControlled(
  gameState: GameState,
  playerId: string
): boolean {
  const player = gameState.players.find(p => p.id === playerId);
  if (!player) return false;

  // 在單人模式下，叛徒由 AI 控制
  return player.isTraitor && gameState.config.enableAI;
}

/**
 * 取得 AI 控制的玩家列表
 */
export function getAIControlledPlayers(gameState: GameState): string[] {
  return gameState.players
    .filter(p => p.isTraitor && !p.isDead)
    .map(p => p.id);
}

/**
 * 建立多個 AI 控制器
 * 用於支持多個叛徒的情況
 */
export function createTraitorAIs(
  gameState: GameState,
  difficulty: AIDifficulty = 'medium',
  seed?: string
): Map<string, TraitorAI> {
  const ais = new Map<string, TraitorAI>();

  for (const player of gameState.players) {
    if (player.isTraitor && !player.isDead) {
      const ai = createTraitorAI(player.id, difficulty, seed);
      ais.set(player.id, ai);
    }
  }

  return ais;
}

// ==================== 預設匯出 ====================

export default TraitorAI;
