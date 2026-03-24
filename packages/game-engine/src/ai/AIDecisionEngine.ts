/**
 * AIDecisionEngine.ts - AI 決策引擎
 * 
 * 負責管理 AI 的決策流程，根據遊戲狀態和難度等級選擇最佳行動。
 * 
 * 設計原則：
 * 1. 只使用 Rules Engine 暴露的合法 action interface
 * 2. 不得直接修改 state schema 或規則判定
 * 3. 優先建立 baseline bot，再逐步提高策略品質
 * 4. AI decision output 必須可解釋、可重播、可測試
 */

import {
  GameState,
  Player,
  Position3D,
  Card,
  CardType,
  Direction,
  StatType,
} from '../types';
import { Room } from '@betrayal/shared';
import { PathFinder } from '../rules/movement';
import { CombatManager } from '../rules/combat';
import { RoomDiscoveryManager } from '../rules/roomDiscovery';

// ==================== 類型定義 ====================

/** AI 難度等級 */
export type AIDifficulty = 'easy' | 'medium' | 'hard';

/** AI 行動類型 */
export type AIActionType = 
  | 'move' 
  | 'attack' 
  | 'useItem' 
  | 'explore' 
  | 'endTurn';

/** AI 決策結果 */
export interface AIDecision {
  /** 行動類型 */
  action: AIActionType;
  /** 目標位置（移動/探索時使用） */
  targetPosition?: Position3D;
  /** 目標玩家（攻擊時使用） */
  targetPlayerId?: string;
  /** 物品 ID（使用物品時使用） */
  itemId?: string;
  /** 探索方向 */
  exploreDirection?: Direction;
  /** 決策分數（用於評估決策品質） */
  score: number;
  /** 決策理由（用於可解釋性） */
  reason: string;
}

/** 合法行動列表 */
export interface LegalActions {
  /** 可移動的位置 */
  movablePositions: Position3D[];
  /** 可攻擊的目標 */
  attackableTargets: string[];
  /** 可使用的物品 */
  usableItems: Card[];
  /** 可探索的方向 */
  explorableDirections: Direction[];
  /** 是否可以結束回合 */
  canEndTurn: boolean;
}

/** 遊戲情境評估 */
export interface GameSituation {
  /** 是否為叛徒 */
  isTraitor: boolean;
  /** 當前階段 */
  phase: 'exploration' | 'haunt';
  /** 生命值狀態 */
  healthStatus: 'healthy' | 'wounded' | 'critical';
  /** 與目標的距離 */
  distanceToObjective: number;
  /** 附近敵人 */
  nearbyEnemies: Player[];
  /** 持有物品數量 */
  itemCount: number;
  /** 可達成的勝利條件 */
  achievableWinConditions: string[];
}

/** 權重配置 */
export interface AIWeights {
  /** 攻擊權重 */
  attackWeight: number;
  /** 移動權重 */
  moveWeight: number;
  /** 探索權重 */
  exploreWeight: number;
  /** 使用物品權重 */
  useItemWeight: number;
  /** 生存權重 */
  survivalWeight: number;
  /** 目標導向權重 */
  objectiveWeight: number;
}

// ==================== 常數 ====================

/** 預設權重配置 */
export const DEFAULT_WEIGHTS: AIWeights = {
  attackWeight: 1.0,
  moveWeight: 0.8,
  exploreWeight: 0.6,
  useItemWeight: 0.7,
  survivalWeight: 1.2,
  objectiveWeight: 1.5,
};

/** 難度特定權重 */
export const DIFFICULTY_WEIGHTS: Record<AIDifficulty, Partial<AIWeights>> = {
  easy: {
    attackWeight: 0.5,
    objectiveWeight: 0.8,
    survivalWeight: 0.6,
  },
  medium: {
    attackWeight: 1.0,
    objectiveWeight: 1.2,
    survivalWeight: 1.0,
  },
  hard: {
    attackWeight: 1.5,
    objectiveWeight: 2.0,
    survivalWeight: 1.3,
  },
};

/** 健康狀態閾值 */
const HEALTH_THRESHOLDS = {
  critical: 2,  // 2 點以下為危急
  wounded: 4,   // 4 點以下為受傷
};

// ==================== 決策引擎 ====================

/**
 * AI 決策引擎
 * 負責評估遊戲狀態並選擇最佳行動
 */
export class AIDecisionEngine {
  private difficulty: AIDifficulty;
  private weights: AIWeights;
  private rng: () => number;

  constructor(
    difficulty: AIDifficulty = 'medium',
    seed?: string
  ) {
    this.difficulty = difficulty;
    this.weights = this.calculateWeights(difficulty);
    this.rng = this.createSeededRng(seed || Date.now().toString());
  }

  /**
   * 建立有種子的隨機數生成器（用於可重播性）
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
   * 計算最終權重
   */
  private calculateWeights(difficulty: AIDifficulty): AIWeights {
    const difficultyMods = DIFFICULTY_WEIGHTS[difficulty];
    return {
      ...DEFAULT_WEIGHTS,
      ...difficultyMods,
    };
  }

  /**
   * 取得合法行動列表
   * 這是 AI 決策的基礎 - 只能從合法行動中選擇
   */
  getLegalActions(state: GameState, playerId: string): LegalActions {
    const player = state.players.find(p => p.id === playerId);
    if (!player) {
      return {
        movablePositions: [],
        attackableTargets: [],
        usableItems: [],
        explorableDirections: [],
        canEndTurn: false,
      };
    }

    // 取得可移動位置
    const movablePositions = PathFinder.getReachablePositions(state, playerId);

    // 取得可攻擊目標（僅在作祟階段）
    let attackableTargets: string[] = [];
    if (state.haunt.isActive) {
      const combatManager = new CombatManager({
        nextInt: (min: number, max: number) => 
          Math.floor(this.rng() * (max - min) + min),
        rollDice: (count: number) => ({
          count,
          results: Array(count).fill(0).map(() => Math.floor(this.rng() * 3)),
          total: 0,
        }),
      } as any);
      attackableTargets = combatManager.getValidTargets(state, playerId);
    }

    // 取得可使用的物品
    const usableItems = this.getUsableItems(state, playerId);

    // 取得可探索方向
    const explorableDirections = RoomDiscoveryManager.getDiscoverableDirections(
      state,
      playerId
    );

    // 是否可以結束回合
    const canEndTurn = state.turn.currentPlayerId === playerId && !state.turn.hasEnded;

    return {
      movablePositions,
      attackableTargets,
      usableItems,
      explorableDirections,
      canEndTurn,
    };
  }

  /**
   * 取得可使用的物品
   */
  private getUsableItems(state: GameState, playerId: string): Card[] {
    const player = state.players.find(p => p.id === playerId);
    if (!player) return [];

    // 檢查本回合是否已使用過
    const usedItems = state.turn.usedItems;
    
    return [
      ...player.items.filter(item => !usedItems.includes(item.id)),
      ...player.omens.filter(omen => !usedItems.includes(omen.id)),
    ];
  }

  /**
   * 評估遊戲情境
   */
  evaluateSituation(state: GameState, playerId: string): GameSituation {
    const player = state.players.find(p => p.id === playerId);
    if (!player) {
      return {
        isTraitor: false,
        phase: 'exploration',
        healthStatus: 'healthy',
        distanceToObjective: Infinity,
        nearbyEnemies: [],
        itemCount: 0,
        achievableWinConditions: [],
      };
    }

    // 評估健康狀態（基於力量值）
    const might = player.currentStats.might;
    let healthStatus: 'healthy' | 'wounded' | 'critical' = 'healthy';
    if (might <= HEALTH_THRESHOLDS.critical) {
      healthStatus = 'critical';
    } else if (might <= HEALTH_THRESHOLDS.wounded) {
      healthStatus = 'wounded';
    }

    // 尋找附近敵人
    const nearbyEnemies = state.players.filter(p => {
      if (p.id === playerId) return false;
      if (p.isDead) return false;
      // 在作祟階段，叛徒視英雄為敵人，英雄視叛徒為敵人
      if (state.haunt.isActive) {
        return p.isTraitor !== player.isTraitor;
      }
      return false;
    });

    return {
      isTraitor: player.isTraitor,
      phase: state.haunt.isActive ? 'haunt' : 'exploration',
      healthStatus,
      distanceToObjective: this.estimateDistanceToObjective(state, playerId),
      nearbyEnemies,
      itemCount: player.items.length + player.omens.length,
      achievableWinConditions: this.getAchievableWinConditions(state, playerId),
    };
  }

  /**
   * 估計與目標的距離
   * 這是一個啟發式估計，具體實現取決於作祟劇本
   */
  private estimateDistanceToObjective(state: GameState, playerId: string): number {
    const player = state.players.find(p => p.id === playerId);
    if (!player) return Infinity;

    // 簡單的啟發式：計算到入口大廳的距離
    // 實際實現應根據具體的作祟目標
    const entranceHall = this.findRoomPosition(state, 'entrance_hall');
    if (entranceHall) {
      return this.calculateManhattanDistance(player.position, entranceHall);
    }

    return Infinity;
  }

  /**
   * 尋找房間位置
   */
  private findRoomPosition(state: GameState, roomId: string): Position3D | null {
    for (const floor of ['ground', 'upper', 'basement'] as const) {
      const floorMap = state.map[floor];
      for (let y = 0; y < floorMap.length; y++) {
        for (let x = 0; x < floorMap[y].length; x++) {
          const tile = floorMap[y][x];
          if (tile.room?.id === roomId) {
            return { x, y, floor };
          }
        }
      }
    }
    return null;
  }

  /**
   * 計算曼哈頓距離
   */
  private calculateManhattanDistance(from: Position3D, to: Position3D): number {
    if (from.floor !== to.floor) {
      // 不同樓層，給予較大懲罰
      return Math.abs(from.x - to.x) + Math.abs(from.y - to.y) + 10;
    }
    return Math.abs(from.x - to.x) + Math.abs(from.y - to.y);
  }

  /**
   * 取得可達成的勝利條件
   */
  private getAchievableWinConditions(state: GameState, playerId: string): string[] {
    const conditions: string[] = [];
    const player = state.players.find(p => p.id === playerId);
    if (!player) return conditions;

    // 根據作祟狀態檢查條件
    if (state.haunt.isActive) {
      if (player.isTraitor) {
        // 叛徒的勝利條件
        const aliveHeroes = state.players.filter(
          p => !p.isTraitor && !p.isDead
        );
        if (aliveHeroes.length === 0) {
          conditions.push('all_heroes_dead');
        }
      } else {
        // 英雄的勝利條件
        const aliveTraitors = state.players.filter(
          p => p.isTraitor && !p.isDead
        );
        if (aliveTraitors.length === 0) {
          conditions.push('all_traitors_dead');
        }
      }
    }

    return conditions;
  }

  /**
   * 評估移動決策
   */
  evaluateMove(
    state: GameState,
    playerId: string,
    position: Position3D,
    situation: GameSituation
  ): number {
    const player = state.players.find(p => p.id === playerId);
    if (!player) return -Infinity;

    let score = 0;

    // 基礎移動分數
    score += 10;

    // 根據情境調整
    if (situation.phase === 'haunt') {
      if (situation.isTraitor) {
        // 叛徒：朝向英雄移動
        const nearestEnemy = situation.nearbyEnemies.length > 0
          ? situation.nearbyEnemies[0]
          : null;
        if (nearestEnemy) {
          const currentDist = this.calculateManhattanDistance(player.position, nearestEnemy.position);
          const newDist = this.calculateManhattanDistance(position, nearestEnemy.position);
          if (newDist < currentDist) {
            score += 20 * this.weights.attackWeight;
          }
        }
      } else {
        // 英雄：遠離叛徒或朝向目標
        const traitor = situation.nearbyEnemies.find(e => e.isTraitor);
        if (traitor && situation.healthStatus === 'critical') {
          // 危急時遠離叛徒
          const currentDist = this.calculateManhattanDistance(player.position, traitor.position);
          const newDist = this.calculateManhattanDistance(position, traitor.position);
          if (newDist > currentDist) {
            score += 30 * this.weights.survivalWeight;
          }
        }
      }
    }

    // 難度調整
    if (this.difficulty === 'easy') {
      // 簡單難度：隨機化分數
      score += (this.rng() - 0.5) * 20;
    }

    return score;
  }

  /**
   * 評估攻擊決策
   */
  evaluateAttack(
    state: GameState,
    playerId: string,
    targetId: string,
    situation: GameSituation
  ): number {
    const player = state.players.find(p => p.id === playerId);
    const target = state.players.find(p => p.id === targetId);
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
      score -= 20; // 危急時減少攻擊傾向
    }

    // 應用權重
    score *= this.weights.attackWeight;

    // 難度調整
    if (this.difficulty === 'easy') {
      score += (this.rng() - 0.5) * 15;
    }

    return score;
  }

  /**
   * 評估使用物品決策
   */
  evaluateUseItem(
    state: GameState,
    playerId: string,
    item: Card,
    situation: GameSituation
  ): number {
    let score = 0;

    // 基礎使用分數
    score += 12;

    // 根據物品類型調整
    if (item.type === 'item') {
      // 檢查是否為武器
      if (item.id.includes('weapon')) {
        if (situation.phase === 'haunt' && situation.nearbyEnemies.length > 0) {
          score += 20; // 戰鬥前使用武器
        }
      }
    }

    // 根據健康狀態調整
    if (situation.healthStatus === 'critical') {
      score += 15; // 危急時更傾向使用物品
    }

    // 應用權重
    score *= this.weights.useItemWeight;

    return score;
  }

  /**
   * 評估探索決策
   */
  evaluateExplore(
    state: GameState,
    playerId: string,
    direction: Direction,
    situation: GameSituation
  ): number {
    let score = 0;

    // 基礎探索分數
    score += 8;

    // 探索階段更有價值
    if (situation.phase === 'exploration') {
      score += 15;
    }

    // 根據持有物品數量調整
    if (situation.itemCount < 2) {
      score += 10; // 物品少時更傾向探索
    }

    // 應用權重
    score *= this.weights.exploreWeight;

    // 難度調整
    if (this.difficulty === 'easy') {
      score += (this.rng() - 0.5) * 10;
    }

    return score;
  }

  /**
   * 評估結束回合決策
   */
  evaluateEndTurn(
    state: GameState,
    playerId: string,
    situation: GameSituation
  ): number {
    let score = 0;

    // 如果還有移動點數，傾向不結束
    if (state.turn.movesRemaining > 0) {
      score -= 10;
    }

    // 如果附近有敵人且可以攻擊，傾向不結束
    if (situation.nearbyEnemies.length > 0 && situation.phase === 'haunt') {
      score -= 20;
    }

    // 如果已經發現房間，必須結束
    if (state.turn.hasDiscoveredRoom) {
      score = 100;
    }

    return score;
  }

  /**
   * 設定難度
   */
  setDifficulty(difficulty: AIDifficulty): void {
    this.difficulty = difficulty;
    this.weights = this.calculateWeights(difficulty);
  }

  /**
   * 取得當前難度
   */
  getDifficulty(): AIDifficulty {
    return this.difficulty;
  }

  /**
   * 取得當前權重
   */
  getWeights(): AIWeights {
    return { ...this.weights };
  }
}

// ==================== 輔助函數 ====================

/**
 * 建立決策引擎實例
 */
export function createDecisionEngine(
  difficulty: AIDifficulty = 'medium',
  seed?: string
): AIDecisionEngine {
  return new AIDecisionEngine(difficulty, seed);
}

/**
 * 比較兩個決策的分數
 */
export function compareDecisions(a: AIDecision, b: AIDecision): number {
  return b.score - a.score;
}

/**
 * 選擇最佳決策
 */
export function selectBestDecision(decisions: AIDecision[]): AIDecision | null {
  if (decisions.length === 0) return null;
  return decisions.sort(compareDecisions)[0];
}

/**
 * 根據難度選擇決策
 * - Easy: 有機率選擇次優決策
 * - Medium: 通常選擇最佳決策
 * - Hard: 總是選擇最佳決策
 */
export function selectDecisionByDifficulty(
  decisions: AIDecision[],
  difficulty: AIDifficulty,
  rng: () => number = Math.random
): AIDecision | null {
  if (decisions.length === 0) return null;

  // 按分數排序
  const sorted = [...decisions].sort(compareDecisions);

  switch (difficulty) {
    case 'easy':
      // 50% 機率選擇最佳，50% 隨機選擇
      if (rng() < 0.5) {
        return sorted[0];
      } else {
        const randomIndex = Math.floor(rng() * sorted.length);
        return sorted[randomIndex];
      }
    case 'medium':
      // 80% 機率選擇最佳，20% 選擇次佳
      if (rng() < 0.8 || sorted.length < 2) {
        return sorted[0];
      } else {
        return sorted[1];
      }
    case 'hard':
      // 總是選擇最佳
      return sorted[0];
    default:
      return sorted[0];
  }
}

// ==================== 預設匯出 ====================

export default AIDecisionEngine;
