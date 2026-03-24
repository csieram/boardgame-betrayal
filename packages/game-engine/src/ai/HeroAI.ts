/**
 * HeroAI.ts - 英雄 AI 控制器
 * 
 * 實作單人模式下的英雄 AI，當玩家成為叛徒時控制英雄角色。
 * 
 * 功能：
 * 1. 控制英雄角色在作祟階段的行動
 * 2. 根據難度等級做出不同品質的決策
 * 3. 嘗試完成英雄的勝利條件
 * 4. 對叛徒玩家的行動做出反應
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

/** 英雄 AI 配置 */
export interface HeroAIConfig {
  /** 難度等級 */
  difficulty: AIDifficulty;
  /** 隨機種子（用於可重播性） */
  seed?: string;
  /** 是否啟用日誌 */
  enableLogging?: boolean;
}

/** 英雄目標類型 */
export type HeroObjectiveType =
  | 'defeat_traitor'        // 擊敗叛徒
  | 'collect_items'         // 收集特定物品
  | 'reach_location'        // 到達特定位置
  | 'survive_turns'         // 存活特定回合數
  | 'protect_heroes'        // 保護其他英雄
  | 'custom';               // 自定義目標

/** 英雄目標狀態 */
export interface HeroObjectiveState {
  /** 目標類型 */
  type: HeroObjectiveType;
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

/** 英雄 AI 狀態 */
export interface HeroAIState {
  /** AI 配置 */
  config: HeroAIConfig;
  /** 控制的玩家 ID */
  playerId: string;
  /** 當前目標 */
  currentObjective: HeroObjectiveState;
  /** 行動歷史 */
  actionHistory: AIActionHistory[];
  /** 目標優先級列表 */
  objectivePriorities: HeroObjectiveType[];
  /** 已知叛徒位置 */
  knownTraitorPosition: Position3D | null;
  /** 已知叛徒 ID */
  knownTraitorId: string | null;
  /** 最後更新時間 */
  lastUpdate: number;
  /** 協作目標（用於多英雄模式） */
  coordinationTarget?: Position3D;
  /** 是否需要治療 */
  needsHealing: boolean;
}

// ==================== 英雄 AI 類 ====================

/**
 * 英雄 AI 控制器
 * 負責在作祟階段控制英雄角色的行動
 */
export class HeroAI {
  private decisionEngine: AIDecisionEngine;
  private state: HeroAIState;
  private combatManager: CombatManager;
  private rng: () => number;

  constructor(
    playerId: string,
    config: HeroAIConfig = { difficulty: 'medium' }
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
        type: 'defeat_traitor',
        description: '擊敗叛徒',
        progress: 0,
        target: 1,
        completed: false,
      },
      actionHistory: [],
      objectivePriorities: [
        'defeat_traitor',
        'protect_heroes',
        'collect_items',
        'reach_location',
        'survive_turns',
      ],
      knownTraitorPosition: null,
      knownTraitorId: null,
      lastUpdate: Date.now(),
      needsHealing: false,
    };

    this.log('HeroAI initialized', { playerId, config });
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
      console.log(`[HeroAI][${this.state.playerId}] ${message}`, data || '');
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

    // 更新已知叛徒位置
    this.updateKnownTraitorInfo(gameState);

    // 檢查是否需要治療
    this.updateHealingStatus(situation);

    const decisions: AIDecision[] = [];

    // 評估所有可能的移動
    for (const position of legalActions.movablePositions) {
      const score = this.evaluateHeroMove(
        gameState,
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
      const score = this.evaluateHeroExplore(
        gameState,
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
      const score = this.evaluateHeroAttack(
        gameState,
        targetId,
        situation
      );
      decisions.push({
        action: 'attack',
        targetPlayerId: targetId,
        score,
        reason: `攻擊叛徒 ${targetId}`,
      });
    }

    // 評估使用物品
    for (const item of legalActions.usableItems) {
      const score = this.evaluateHeroUseItem(
        gameState,
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
    const endTurnScore = this.evaluateHeroEndTurn(
      gameState,
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
   * 評估英雄移動（英雄專用邏輯）
   */
  private evaluateHeroMove(
    gameState: GameState,
    position: Position3D,
    situation: GameSituation
  ): number {
    const player = gameState.players.find(p => p.id === this.state.playerId);
    if (!player) return -Infinity;

    let score = 0;

    // 基礎移動分數
    score += 10;

    // 獲取叛徒位置
    const traitor = this.getTraitor(gameState);
    
    if (traitor) {
      const currentDist = this.calculateDistance(player.position, traitor.position);
      const newDist = this.calculateDistance(position, traitor.position);
      
      // 根據健康狀態決定策略
      if (situation.healthStatus === 'critical') {
        // 危急時遠離叛徒
        if (newDist > currentDist) {
          score += 40;
        }
      } else if (situation.healthStatus === 'wounded') {
        // 受傷時保持距離或尋找治療
        if (newDist >= currentDist) {
          score += 20;
        }
      } else {
        // 健康時朝向叛徒移動（如果準備好戰鬥）
        const hasWeapon = player.items.some(item => 
          item.id.includes('weapon') || item.id.includes('axe') || item.id.includes('knife')
        );
        
        if (hasWeapon && newDist < currentDist) {
          score += 30;
        } else if (!hasWeapon && newDist > currentDist) {
          // 沒武器時先找武器
          score += 15;
        }
      }
    }

    // 檢查是否朝向目標位置移動
    const objectiveLocation = this.getObjectiveLocation(gameState);
    if (objectiveLocation) {
      const distToObjective = this.calculateDistance(position, objectiveLocation);
      score += Math.max(0, 30 - distToObjective * 2);
    }

    // 難度調整
    if (this.state.config.difficulty === 'easy') {
      score += (this.rng() - 0.5) * 20;
    }

    return score;
  }

  /**
   * 評估英雄探索
   */
  private evaluateHeroExplore(
    gameState: GameState,
    direction: Direction,
    situation: GameSituation
  ): number {
    let score = 0;

    // 基礎探索分數
    score += 8;

    // 探索階段更有價值（但作祟後探索價值降低）
    if (situation.phase === 'exploration') {
      score += 15;
    } else {
      // 作祟後，謹慎探索
      if (situation.healthStatus === 'critical') {
        score -= 10; // 危急時不建議探索
      }
    }

    // 根據持有物品數量調整
    if (situation.itemCount < 2) {
      score += 10; // 物品少時更傾向探索
    }

    // 難度調整
    if (this.state.config.difficulty === 'easy') {
      score += (this.rng() - 0.5) * 10;
    }

    return score;
  }

  /**
   * 評估英雄攻擊
   */
  private evaluateHeroAttack(
    gameState: GameState,
    targetId: string,
    situation: GameSituation
  ): number {
    const player = gameState.players.find(p => p.id === this.state.playerId);
    const target = gameState.players.find(p => p.id === targetId);
    if (!player || !target) return -Infinity;

    let score = 0;

    // 基礎攻擊分數
    score += 15;

    // 根據力量對比調整
    const mightAdvantage = player.currentStats.might - target.currentStats.might;
    score += mightAdvantage * 5;

    // 根據目標健康狀態調整
    if (target.currentStats.might <= 2) {
      score += 25; // 優先攻擊虛弱目標
    }

    // 根據自身健康狀態調整
    if (situation.healthStatus === 'critical') {
      score -= 30; // 危急時大幅減少攻擊傾向
    } else if (situation.healthStatus === 'wounded') {
      score -= 10; // 受傷時略微減少攻擊
    }

    // 檢查是否有武器加成
    const hasWeapon = player.items.some(item => 
      item.id.includes('weapon') || item.id.includes('axe') || item.id.includes('knife')
    );
    if (hasWeapon) {
      score += 15;
    }

    // 難度調整
    if (this.state.config.difficulty === 'easy') {
      score += (this.rng() - 0.5) * 15;
    }

    return score;
  }

  /**
   * 評估英雄使用物品
   */
  private evaluateHeroUseItem(
    gameState: GameState,
    item: Card,
    situation: GameSituation
  ): number {
    let score = 0;

    // 基礎使用分數
    score += 12;

    // 根據物品類型調整
    if (item.type === 'item') {
      // 檢查是否為武器
      if (item.id.includes('weapon') || item.id.includes('axe') || item.id.includes('knife')) {
        const traitor = this.getTraitor(gameState);
        if (traitor && situation.nearbyEnemies.length > 0) {
          score += 25; // 戰鬥前使用武器
        }
      }
      
      // 檢查是否為治療物品
      if (item.id.includes('heal') || item.id.includes('medical') || item.id.includes('potion')) {
        if (situation.healthStatus === 'critical') {
          score += 50; // 危急時優先使用治療
        } else if (situation.healthStatus === 'wounded') {
          score += 30;
        }
      }
    }

    // 根據健康狀態調整
    if (situation.healthStatus === 'critical') {
      score += 15; // 危急時更傾向使用物品
    }

    return score;
  }

  /**
   * 評估英雄結束回合
   */
  private evaluateHeroEndTurn(
    gameState: GameState,
    situation: GameSituation
  ): number {
    let score = 0;

    // 如果還有移動點數，傾向不結束
    if (gameState.turn.movesRemaining > 0) {
      score -= 10;
    }

    // 如果附近有叛徒且可以攻擊，傾向不結束
    const traitor = this.getTraitor(gameState);
    if (traitor && situation.nearbyEnemies.length > 0) {
      // 健康時傾向攻擊
      if (situation.healthStatus === 'healthy') {
        score -= 25;
      }
    }

    // 如果已經發現房間，必須結束
    if (gameState.turn.hasDiscoveredRoom) {
      score = 100;
    }

    return score;
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
    const attackScore = this.evaluateHeroAttack(
      gameState,
      target.id,
      situation
    );

    // 評估逃跑（危急時考慮逃跑）
    let fleeScore = -50;
    if (situation.healthStatus === 'critical') {
      fleeScore = 40; // 英雄比叛徒更傾向逃跑
    } else if (situation.healthStatus === 'wounded') {
      fleeScore = 10;
    }

    const decisions: AIDecision[] = [
      {
        action: 'attack',
        targetPlayerId: target.id,
        score: attackScore,
        reason: `攻擊叛徒 ${target.name}`,
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
      const score = this.evaluateHeroUseItem(
        gameState,
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
   * 更新已知叛徒資訊
   */
  private updateKnownTraitorInfo(gameState: GameState): void {
    for (const player of gameState.players) {
      if (player.isTraitor && !player.isDead) {
        this.state.knownTraitorId = player.id;
        this.state.knownTraitorPosition = player.position;
      }
    }
  }

  /**
   * 更新治療狀態
   */
  private updateHealingStatus(situation: GameSituation): void {
    this.state.needsHealing = situation.healthStatus === 'critical' || 
                               situation.healthStatus === 'wounded';
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

    if (scenario?.heroObjective) {
      this.state.currentObjective = {
        type: this.inferObjectiveType(scenario.heroObjective),
        description: scenario.heroObjective,
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
  private inferObjectiveType(objectiveDescription: string): HeroObjectiveType {
    const desc = objectiveDescription.toLowerCase();
    if (desc.includes('消滅') || desc.includes('殺死') || desc.includes('擊敗') || desc.includes('叛徒')) {
      return 'defeat_traitor';
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
    if (desc.includes('保護') || desc.includes('拯救')) {
      return 'protect_heroes';
    }
    return 'custom';
  }

  /**
   * 取得叛徒玩家
   */
  getTraitor(gameState: GameState): Player | null {
    return gameState.players.find(p => p.isTraitor && !p.isDead) || null;
  }

  /**
   * 取得目標位置（根據作祟劇本）
   */
  private getObjectiveLocation(gameState: GameState): Position3D | null {
    // 簡化實現：返回叛徒位置（如果目標是擊敗叛徒）
    if (this.state.currentObjective.type === 'defeat_traitor') {
      return this.state.knownTraitorPosition;
    }
    
    // 其他目標類型可以根據劇本擴展
    return null;
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
    const traitor = this.getTraitor(gameState);
    return traitor === null || traitor.isDead;
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
  getCurrentObjective(): HeroObjectiveState {
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
  getState(): HeroAIState {
    return {
      ...this.state,
    };
  }

  /**
   * 取得已知叛徒位置
   */
  getKnownTraitorPosition(): Position3D | null {
    return this.state.knownTraitorPosition;
  }

  /**
   * 檢查是否需要治療
   */
  getNeedsHealing(): boolean {
    return this.state.needsHealing;
  }
}

// ==================== 輔助函數 ====================

/**
 * 建立英雄 AI 實例
 */
export function createHeroAI(
  playerId: string,
  difficulty: AIDifficulty = 'medium',
  seed?: string
): HeroAI {
  return new HeroAI(playerId, {
    difficulty,
    seed,
    enableLogging: true,
  });
}

/**
 * 檢查玩家是否為 AI 控制的英雄
 */
export function isAIControlledHero(
  gameState: GameState,
  playerId: string
): boolean {
  const player = gameState.players.find(p => p.id === playerId);
  if (!player) return false;

  // 在單人模式下，非叛徒玩家由 AI 控制（當玩家是叛徒時）
  return !player.isTraitor && !player.isDead && gameState.config.enableAI;
}

/**
 * 取得 AI 控制的英雄列表
 */
export function getAIControlledHeroes(gameState: GameState): string[] {
  return gameState.players
    .filter(p => !p.isTraitor && !p.isDead)
    .map(p => p.id);
}

/**
 * 建立多個英雄 AI 控制器
 * 用於支持多個英雄的情況
 */
export function createHeroAIs(
  gameState: GameState,
  difficulty: AIDifficulty = 'medium',
  seed?: string
): Map<string, HeroAI> {
  const ais = new Map<string, HeroAI>();

  for (const player of gameState.players) {
    if (!player.isTraitor && !player.isDead) {
      const ai = createHeroAI(player.id, difficulty, seed);
      ais.set(player.id, ai);
    }
  }

  return ais;
}

/**
 * 協調多個英雄 AI 的行動
 * 用於多英雄模式下的協作
 */
export function coordinateHeroAIs(
  heroAIs: Map<string, HeroAI>,
  gameState: GameState
): void {
  // 簡單的協調策略：讓英雄們分散行動或集中攻擊
  const traitorPosition = heroAIs.values().next().value?.getKnownTraitorPosition();
  
  if (!traitorPosition) return;

  // 這裡可以實現更複雜的協調邏輯
  // 例如：分配不同的英雄從不同方向接近叛徒
}

// ==================== 預設匯出 ====================

export default HeroAI;
