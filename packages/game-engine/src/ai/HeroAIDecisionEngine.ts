/**
 * HeroAIDecisionEngine.ts - 英雄 AI 決策引擎
 * 
 * 專門為英雄 AI 設計的決策引擎，處理英雄特有的決策邏輯。
 * 
 * 與通用 AIDecisionEngine 的區別：
 * 1. 英雄目標導向（擊敗叛徒 vs 叛徒消滅英雄）
 * 2. 更注重生存和協作
 * 3. 不同的權重配置
 */

import {
  GameState,
  Player,
  Position3D,
  Card,
  Direction,
} from '../types';
import {
  AIDecisionEngine,
  AIDecision,
  AIDifficulty,
  LegalActions,
  GameSituation,
  AIWeights,
  selectDecisionByDifficulty,
} from './AIDecisionEngine';

// ==================== 類型定義 ====================

/** 英雄特定情境 */
export interface HeroGameSituation extends GameSituation {
  /** 叛徒位置 */
  traitorPosition: Position3D | null;
  /** 叛徒健康狀態 */
  traitorHealth: 'healthy' | 'wounded' | 'critical' | 'unknown';
  /** 其他英雄位置 */
  otherHeroPositions: Position3D[];
  /** 最近的安全位置 */
  nearestSafePosition: Position3D | null;
  /** 是否有治療物品 */
  hasHealingItem: boolean;
  /** 是否有武器 */
  hasWeapon: boolean;
  /** 到叛徒的距離 */
  distanceToTraitor: number;
}

/** 英雄策略類型 */
export type HeroStrategy =
  | 'aggressive'      // 積極攻擊
  | 'defensive'       // 防守為主
  | 'evasive'         // 躲避為主
  | 'supportive'      // 支援隊友
  | 'objective';      // 目標導向

/** 英雄決策上下文 */
export interface HeroDecisionContext {
  /** 當前策略 */
  strategy: HeroStrategy;
  /** 優先目標 */
  priorityTarget: Position3D | null;
  /** 危險等級 */
  dangerLevel: 'low' | 'medium' | 'high';
  /** 建議行動 */
  recommendedActions: string[];
}

// ==================== 英雄權重配置 ====================

/** 英雄預設權重 */
export const HERO_DEFAULT_WEIGHTS: AIWeights = {
  attackWeight: 0.8,      // 英雄較不傾向攻擊
  moveWeight: 1.0,
  exploreWeight: 0.5,     // 作祟後較不探索
  useItemWeight: 1.0,
  survivalWeight: 1.8,    // 更重視生存
  objectiveWeight: 1.5,
};

/** 英雄難度特定權重 */
export const HERO_DIFFICULTY_WEIGHTS: Record<AIDifficulty, Partial<AIWeights>> = {
  easy: {
    attackWeight: 0.4,
    objectiveWeight: 0.8,
    survivalWeight: 1.2,
  },
  medium: {
    attackWeight: 0.8,
    objectiveWeight: 1.3,
    survivalWeight: 1.6,
  },
  hard: {
    attackWeight: 1.2,
    objectiveWeight: 1.8,
    survivalWeight: 2.0,
  },
};

/** 策略權重調整 */
export const STRATEGY_WEIGHT_MODIFIERS: Record<HeroStrategy, Partial<AIWeights>> = {
  aggressive: {
    attackWeight: 1.5,
    survivalWeight: 0.8,
    objectiveWeight: 1.2,
  },
  defensive: {
    attackWeight: 0.5,
    survivalWeight: 2.0,
    objectiveWeight: 1.0,
  },
  evasive: {
    attackWeight: 0.2,
    survivalWeight: 2.5,
    moveWeight: 1.5,
  },
  supportive: {
    attackWeight: 0.6,
    survivalWeight: 1.5,
    objectiveWeight: 1.2,
  },
  objective: {
    attackWeight: 0.7,
    survivalWeight: 1.2,
    objectiveWeight: 2.5,
  },
};

// ==================== 英雄決策引擎 ====================

/**
 * 英雄 AI 決策引擎
 * 專門處理英雄的決策邏輯
 */
export class HeroAIDecisionEngine extends AIDecisionEngine {
  private heroWeights: AIWeights;
  private currentStrategy: HeroStrategy;
  private heroRng: () => number;

  constructor(
    difficulty: AIDifficulty = 'medium',
    seed?: string
  ) {
    super(difficulty, seed);
    this.heroWeights = this.calculateHeroWeights(difficulty);
    this.currentStrategy = 'defensive';
    this.heroRng = this.createHeroSeededRng(seed || Date.now().toString());
  }

  /**
   * 建立有種子的隨機數生成器
   */
  private createHeroSeededRng(seed: string): () => number {
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
   * 計算英雄權重
   */
  private calculateHeroWeights(difficulty: AIDifficulty): AIWeights {
    const difficultyMods = HERO_DIFFICULTY_WEIGHTS[difficulty];
    return {
      ...HERO_DEFAULT_WEIGHTS,
      ...difficultyMods,
    };
  }

  /**
   * 評估英雄情境（擴展版）
   */
  evaluateHeroSituation(
    state: GameState,
    playerId: string
  ): HeroGameSituation {
    const baseSituation = this.evaluateSituation(state, playerId);
    const player = state.players.find(p => p.id === playerId);
    
    if (!player) {
      return {
        ...baseSituation,
        traitorPosition: null,
        traitorHealth: 'unknown',
        otherHeroPositions: [],
        nearestSafePosition: null,
        hasHealingItem: false,
        hasWeapon: false,
        distanceToTraitor: Infinity,
      };
    }

    // 尋找叛徒
    const traitor = state.players.find(p => p.isTraitor && !p.isDead);
    const traitorPosition = traitor ? traitor.position : null;
    
    // 評估叛徒健康
    let traitorHealth: 'healthy' | 'wounded' | 'critical' | 'unknown' = 'unknown';
    if (traitor) {
      if (traitor.currentStats.might <= 2) {
        traitorHealth = 'critical';
      } else if (traitor.currentStats.might <= 4) {
        traitorHealth = 'wounded';
      } else {
        traitorHealth = 'healthy';
      }
    }

    // 尋找其他英雄
    const otherHeroPositions = state.players
      .filter(p => !p.isTraitor && !p.isDead && p.id !== playerId)
      .map(p => p.position);

    // 計算到叛徒的距離
    const distanceToTraitor = traitorPosition
      ? this.calculateDistance(player.position, traitorPosition)
      : Infinity;

    // 檢查物品
    const hasHealingItem = player.items.some(item =>
      item.id.includes('heal') || item.id.includes('medical') || item.id.includes('potion')
    );
    const hasWeapon = player.items.some(item =>
      item.id.includes('weapon') || item.id.includes('axe') || item.id.includes('knife')
    );

    // 尋找最近的安全位置（遠離叛徒）
    const nearestSafePosition = this.findNearestSafePosition(
      state,
      player.position,
      traitorPosition
    );

    return {
      ...baseSituation,
      traitorPosition,
      traitorHealth,
      otherHeroPositions,
      nearestSafePosition,
      hasHealingItem,
      hasWeapon,
      distanceToTraitor,
    };
  }

  /**
   * 決定當前策略
   */
  determineStrategy(situation: HeroGameSituation): HeroStrategy {
    // 危急時優先逃跑
    if (situation.healthStatus === 'critical') {
      return 'evasive';
    }

    // 叛徒虛弱時積極攻擊
    if (situation.traitorHealth === 'critical' && situation.hasWeapon) {
      return 'aggressive';
    }

    // 受傷時防守
    if (situation.healthStatus === 'wounded') {
      return situation.hasHealingItem ? 'defensive' : 'evasive';
    }

    // 健康且有武器時可以積極
    if (situation.healthStatus === 'healthy' && situation.hasWeapon) {
      return 'aggressive';
    }

    // 默認防守
    return 'defensive';
  }

  /**
   * 建立決策上下文
   */
  createDecisionContext(
    state: GameState,
    playerId: string
  ): HeroDecisionContext {
    const situation = this.evaluateHeroSituation(state, playerId);
    const strategy = this.determineStrategy(situation);
    
    // 根據策略確定優先目標
    let priorityTarget: Position3D | null = null;
    switch (strategy) {
      case 'aggressive':
        priorityTarget = situation.traitorPosition;
        break;
      case 'evasive':
        priorityTarget = situation.nearestSafePosition;
        break;
      case 'objective':
        priorityTarget = this.findObjectiveLocation(state, playerId);
        break;
      default:
        priorityTarget = null;
    }

    // 評估危險等級
    let dangerLevel: 'low' | 'medium' | 'high' = 'low';
    if (situation.distanceToTraitor <= 2) {
      dangerLevel = situation.healthStatus === 'critical' ? 'high' : 'medium';
    } else if (situation.distanceToTraitor <= 4) {
      dangerLevel = 'medium';
    }

    // 生成建議行動
    const recommendedActions = this.generateRecommendations(strategy, situation);

    return {
      strategy,
      priorityTarget,
      dangerLevel,
      recommendedActions,
    };
  }

  /**
   * 生成建議行動
   */
  private generateRecommendations(
    strategy: HeroStrategy,
    situation: HeroGameSituation
  ): string[] {
    const recommendations: string[] = [];

    switch (strategy) {
      case 'aggressive':
        recommendations.push('尋找叛徒並攻擊');
        if (situation.hasWeapon) {
          recommendations.push('使用武器攻擊');
        }
        break;
      case 'defensive':
        recommendations.push('保持安全距離');
        if (situation.hasHealingItem) {
          recommendations.push('使用治療物品');
        }
        break;
      case 'evasive':
        recommendations.push('遠離叛徒');
        recommendations.push('尋找安全位置');
        break;
      case 'supportive':
        recommendations.push('協助其他英雄');
        recommendations.push('分散叛徒注意力');
        break;
      case 'objective':
        recommendations.push('專注完成目標');
        break;
    }

    return recommendations;
  }

  /**
   * 評估英雄移動（使用英雄權重）
   */
  evaluateHeroMove(
    state: GameState,
    playerId: string,
    position: Position3D,
    situation: HeroGameSituation
  ): number {
    const player = state.players.find(p => p.id === playerId);
    if (!player) return -Infinity;

    let score = 0;

    // 基礎移動分數
    score += 10;

    // 根據策略調整
    switch (this.currentStrategy) {
      case 'aggressive':
        // 朝向叛徒移動
        if (situation.traitorPosition) {
          const currentDist = this.calculateDistance(player.position, situation.traitorPosition);
          const newDist = this.calculateDistance(position, situation.traitorPosition);
          if (newDist < currentDist) {
            score += 30 * this.heroWeights.attackWeight;
          }
        }
        break;

      case 'evasive':
      case 'defensive':
        // 遠離叛徒
        if (situation.traitorPosition) {
          const currentDist = this.calculateDistance(player.position, situation.traitorPosition);
          const newDist = this.calculateDistance(position, situation.traitorPosition);
          if (newDist > currentDist) {
            score += 40 * this.heroWeights.survivalWeight;
          }
        }
        break;

      case 'objective':
        // 朝向目標移動
        const objective = this.findObjectiveLocation(state, playerId);
        if (objective) {
          const dist = this.calculateDistance(position, objective);
          score += Math.max(0, 30 - dist * 2) * this.heroWeights.objectiveWeight;
        }
        break;
    }

    // 與其他英雄保持適當距離（協作）
    if (situation.otherHeroPositions.length > 0) {
      const avgDist = situation.otherHeroPositions.reduce((sum, pos) =>
        sum + this.calculateDistance(position, pos), 0
      ) / situation.otherHeroPositions.length;
      
      // 不太近也不太遠
      if (avgDist >= 2 && avgDist <= 5) {
        score += 10;
      }
    }

    return score;
  }

  /**
   * 評估英雄攻擊
   */
  evaluateHeroAttack(
    state: GameState,
    playerId: string,
    targetId: string,
    situation: HeroGameSituation
  ): number {
    const player = state.players.find(p => p.id === playerId);
    const target = state.players.find(p => p.id === targetId);
    if (!player || !target) return -Infinity;

    let score = 0;

    // 基礎攻擊分數
    score += 15;

    // 根據策略調整
    if (this.currentStrategy === 'evasive') {
      score -= 50; // 逃跑策略時不攻擊
    }

    // 根據力量對比調整
    const mightAdvantage = player.currentStats.might - target.currentStats.might;
    score += mightAdvantage * 5;

    // 叛徒虛弱時優先攻擊
    if (situation.traitorHealth === 'critical') {
      score += 35;
    }

    // 根據自身健康狀態調整
    if (situation.healthStatus === 'critical') {
      score -= 40;
    } else if (situation.healthStatus === 'wounded') {
      score -= 15;
    }

    // 武器加成
    if (situation.hasWeapon) {
      score += 20;
    }

    // 應用權重
    score *= this.heroWeights.attackWeight;

    return score;
  }

  /**
   * 評估英雄使用物品
   */
  evaluateHeroUseItem(
    state: GameState,
    playerId: string,
    item: Card,
    situation: HeroGameSituation
  ): number {
    let score = 0;

    // 基礎使用分數
    score += 12;

    // 治療物品優先
    if (item.id.includes('heal') || item.id.includes('medical') || item.id.includes('potion')) {
      if (situation.healthStatus === 'critical') {
        score += 60; // 危急時最高優先
      } else if (situation.healthStatus === 'wounded') {
        score += 35;
      }
    }

    // 武器在戰鬥前使用
    if (item.id.includes('weapon') || item.id.includes('axe') || item.id.includes('knife')) {
      if (situation.distanceToTraitor <= 2) {
        score += 25;
      }
    }

    // 應用權重
    score *= this.heroWeights.useItemWeight;

    return score;
  }

  /**
   * 尋找最近的安全位置
   */
  private findNearestSafePosition(
    state: GameState,
    from: Position3D,
    dangerPosition: Position3D | null
  ): Position3D | null {
    if (!dangerPosition) return null;

    // 簡化實現：返回遠離危險的位置
    // 實際實現應該考慮地圖結構
    const dx = from.x - dangerPosition.x;
    const dy = from.y - dangerPosition.y;
    
    return {
      x: from.x + (dx > 0 ? 2 : -2),
      y: from.y + (dy > 0 ? 2 : -2),
      floor: from.floor,
    };
  }

  /**
   * 尋找目標位置
   */
  private findObjectiveLocation(
    state: GameState,
    playerId: string
  ): Position3D | null {
    // 簡化實現：返回叛徒位置
    const traitor = state.players.find(p => p.isTraitor && !p.isDead);
    return traitor ? traitor.position : null;
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
   * 設定策略
   */
  setStrategy(strategy: HeroStrategy): void {
    this.currentStrategy = strategy;
    
    // 根據策略調整權重
    const modifiers = STRATEGY_WEIGHT_MODIFIERS[strategy];
    this.heroWeights = {
      ...this.heroWeights,
      ...modifiers,
    };
  }

  /**
   * 取得當前策略
   */
  getStrategy(): HeroStrategy {
    return this.currentStrategy;
  }

  /**
   * 取得英雄權重
   */
  getHeroWeights(): AIWeights {
    return { ...this.heroWeights };
  }
}

// ==================== 輔助函數 ====================

/**
 * 建立英雄決策引擎
 */
export function createHeroDecisionEngine(
  difficulty: AIDifficulty = 'medium',
  seed?: string
): HeroAIDecisionEngine {
  return new HeroAIDecisionEngine(difficulty, seed);
}

/**
 * 評估多個英雄的協作策略
 */
export function evaluateTeamStrategy(
  heroStates: HeroGameSituation[]
): 'surround' | 'focus' | 'split' | 'retreat' {
  // 計算平均健康狀態
  const avgHealth = heroStates.reduce((sum, s) => {
    const healthValue = s.healthStatus === 'healthy' ? 3 : s.healthStatus === 'wounded' ? 2 : 1;
    return sum + healthValue;
  }, 0) / heroStates.length;

  // 計算是否有叛徒位置資訊
  const knowTraitorPosition = heroStates.some(s => s.traitorPosition !== null);

  if (avgHealth < 1.5) {
    return 'retreat'; // 健康不佳時撤退
  }

  if (knowTraitorPosition && avgHealth >= 2.5) {
    return 'surround'; // 健康良好且知道位置時包圍
  }

  if (heroStates.some(s => s.hasWeapon)) {
    return 'focus'; // 有武器時集中火力
  }

  return 'split'; // 默認分散行動
}

// ==================== 預設匯出 ====================

export default HeroAIDecisionEngine;
