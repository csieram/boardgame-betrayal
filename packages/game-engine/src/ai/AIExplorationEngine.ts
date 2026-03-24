/**
 * AIExplorationEngine.ts - AI 探索引擎
 * 
 * 專門處理探索階段的 AI 邏輯，包含：
 * 1. 房間發現策略
 * 2. 移動路徑規劃
 * 3. 卡牌處理決策
 * 4. 屬性檢定策略
 * 
 * 設計原則：
 * - 只使用 Rules Engine 暴露的合法 action interface
 * - 探索優先但考慮風險
 * - 可解釋的決策邏輯
 */

import {
  GameState,
  Player,
  Position3D,
  Card,
  Direction,
  Tile,
  StatType,
  Floor,
} from '../types';
import { Room } from '@betrayal/shared';
import { AIPersonality, PERSONALITY_WEIGHTS, PersonalityWeights } from './AIPlayer';
import { AIDecision, AIDifficulty } from './AIDecisionEngine';
import { PathFinder } from '../rules/movement';

// ==================== 類型定義 ====================

/** 探索目標類型 */
export type ExplorationTargetType = 
  | 'undiscovered_room'  // 未發現的房間
  | 'item_room'          // 可能有物品的房間
  | 'omen_room'          // 可能有預兆的房間
  | 'stair_room'         // 樓梯房間
  | 'safe_room'          // 安全房間
  | 'specific_room';     // 特定房間

/** 探索目標 */
export interface ExplorationTarget {
  /** 目標類型 */
  type: ExplorationTargetType;
  /** 目標位置 */
  position: Position3D;
  /** 優先級分數 */
  priority: number;
  /** 預估距離 */
  distance: number;
  /** 理由 */
  reason: string;
}

/** 房間評估結果 */
export interface RoomEvaluation {
  /** 房間位置 */
  position: Position3D;
  /** 探索價值 */
  exploreValue: number;
  /** 風險等級 */
  riskLevel: number;
  /** 預期收益 */
  expectedReward: number;
  /** 是否可達 */
  reachable: boolean;
  /** 到達成本 */
  reachCost: number;
}

/** 移動計劃 */
export interface MovementPlan {
  /** 路徑 */
  path: Position3D[];
  /** 總成本 */
  totalCost: number;
  /** 目標 */
  target: ExplorationTarget;
  /** 預期回合數 */
  estimatedTurns: number;
}

/** 探索策略配置 */
export interface ExplorationStrategy {
  /** 探索閾值（低於此值不探索） */
  exploreThreshold: number;
  /** 最大探索深度 */
  maxExploreDepth: number;
  /** 偏好樓層 */
  preferredFloor?: Floor;
  /** 避免區域 */
  avoidPositions: Position3D[];
  /** 目標房間 ID */
  targetRoomIds: string[];
}

/** 卡牌處理決策 */
export interface CardHandlingDecision {
  /** 是否使用物品應對 */
  useItem: boolean;
  /** 使用的物品 ID */
  itemId?: string;
  /** 預期結果 */
  expectedOutcome: 'success' | 'failure' | 'neutral';
  /** 建議行動 */
  recommendedAction: 'draw' | 'avoid' | 'prepare';
  /** 理由 */
  reason: string;
}

// ==================== 探索引擎類 ====================

/**
 * AI 探索引擎
 * 專門處理探索階段的決策
 */
export class AIExplorationEngine {
  private personality: AIPersonality;
  private difficulty: AIDifficulty;
  private rng: () => number;
  private exploredRooms: Set<string>;
  private roomEvaluations: Map<string, RoomEvaluation>;

  constructor(
    personality: AIPersonality = 'explorer',
    difficulty: AIDifficulty = 'medium',
    seed?: string
  ) {
    this.personality = personality;
    this.difficulty = difficulty;
    this.rng = this.createSeededRng(seed || Date.now().toString());
    this.exploredRooms = new Set();
    this.roomEvaluations = new Map();
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
   * 分析探索選項
   * 評估所有可能的探索目標
   */
  analyzeExplorationOptions(
    gameState: GameState,
    playerId: string
  ): ExplorationTarget[] {
    const player = this.getPlayer(gameState, playerId);
    if (!player) return [];

    const targets: ExplorationTarget[] = [];
    const currentPos = player.position;

    // 尋找所有未發現的房間位置
    const undiscoveredPositions = this.findUndiscoveredPositions(gameState);

    for (const pos of undiscoveredPositions) {
      const evaluation = this.evaluateRoomForExploration(
        gameState,
        pos,
        currentPos,
        player
      );

      if (evaluation.reachable) {
        const targetType = this.inferTargetType(gameState, pos);
        targets.push({
          type: targetType,
          position: pos,
          priority: evaluation.exploreValue - evaluation.riskLevel,
          distance: evaluation.reachCost,
          reason: this.generateTargetReason(targetType, evaluation),
        });
      }
    }

    // 按優先級排序
    return targets.sort((a, b) => b.priority - a.priority);
  }

  /**
   * 評估房間的探索價值
   */
  private evaluateRoomForExploration(
    gameState: GameState,
    targetPos: Position3D,
    currentPos: Position3D,
    player: Player
  ): RoomEvaluation {
    const tile = this.getTileAt(gameState, targetPos);
    const personality = PERSONALITY_WEIGHTS[this.personality];

    // 計算距離
    const distance = this.calculateDistance(currentPos, targetPos);
    const speed = player.currentStats.speed;
    const reachable = distance <= speed;

    // 基礎探索價值
    let exploreValue = 50;

    // 根據個性調整
    exploreValue *= personality.explorePriority;

    // 距離懲罰
    const reachCost = distance;
    exploreValue -= distance * 3;

    // 風險評估
    let riskLevel = 0;

    // 預兆房間風險（可能觸發作祟）
    if (this.isOmenRoomLikely(gameState, targetPos)) {
      riskLevel += 20 * (1 - personality.riskTolerance);
      exploreValue += 10 * personality.riskTolerance; // 激進個性更願意冒險
    }

    // 事件房間風險
    if (this.isEventRoomLikely(gameState, targetPos)) {
      riskLevel += 15 * (1 - personality.riskTolerance);
    }

    // 謹慎個性對風險更敏感
    if (this.personality === 'cautious') {
      riskLevel *= 1.5;
    }

    // 預期收益
    let expectedReward = 30;
    if (this.isItemRoomLikely(gameState, targetPos)) {
      expectedReward += 20;
    }

    // 難度調整
    if (this.difficulty === 'easy') {
      exploreValue += (this.rng() - 0.5) * 15;
    }

    return {
      position: targetPos,
      exploreValue: Math.max(0, exploreValue),
      riskLevel: Math.max(0, riskLevel),
      expectedReward,
      reachable,
      reachCost,
    };
  }

  /**
   * 規劃移動路徑
   */
  planMovement(
    gameState: GameState,
    playerId: string,
    target: ExplorationTarget
  ): MovementPlan | null {
    const player = this.getPlayer(gameState, playerId);
    if (!player) return null;

    // 使用 PathFinder 找到最佳路徑
    const pathResult = PathFinder.findPath(
      gameState,
      player.position,
      target.position,
      player.currentStats.speed
    );

    if (!pathResult.valid || pathResult.path.length === 0) {
      return null;
    }

    const speed = player.currentStats.speed;
    const estimatedTurns = Math.ceil(pathResult.totalCost / speed);

    return {
      path: pathResult.path,
      totalCost: pathResult.totalCost,
      target,
      estimatedTurns,
    };
  }

  /**
   * 決定最佳探索方向
   */
  decideExploreDirection(
    gameState: GameState,
    playerId: string,
    availableDirections: Direction[]
  ): Direction | null {
    if (availableDirections.length === 0) return null;

    const player = this.getPlayer(gameState, playerId);
    if (!player) return null;

    const currentPos = player.position;
    const personality = PERSONALITY_WEIGHTS[this.personality];

    let bestDirection: Direction | null = null;
    let bestScore = -Infinity;

    for (const direction of availableDirections) {
      const score = this.evaluateDirection(
        gameState,
        currentPos,
        direction,
        personality
      );

      if (score > bestScore) {
        bestScore = score;
        bestDirection = direction;
      }
    }

    // 難度調整：簡單難度有機率選擇次優方向
    if (this.difficulty === 'easy' && availableDirections.length > 1 && this.rng() < 0.3) {
      const otherDirections = availableDirections.filter(d => d !== bestDirection);
      return otherDirections[Math.floor(this.rng() * otherDirections.length)];
    }

    return bestDirection;
  }

  /**
   * 評估方向
   */
  private evaluateDirection(
    gameState: GameState,
    currentPos: Position3D,
    direction: Direction,
    personality: PersonalityWeights
  ): number {
    const deltas = {
      north: { x: 0, y: -1 },
      south: { x: 0, y: 1 },
      east: { x: 1, y: 0 },
      west: { x: -1, y: 0 },
    };

    const newPos = {
      x: currentPos.x + deltas[direction].x,
      y: currentPos.y + deltas[direction].y,
      floor: currentPos.floor,
    };

    let score = 50; // 基礎分數

    // 檢查該方向是否有更多未探索區域
    const unexploredCount = this.countUnexploredInDirection(
      gameState,
      newPos,
      direction
    );
    score += unexploredCount * 10 * personality.explorePriority;

    // 檢查是否朝向地圖中心（通常有更多房間）
    const centerX = 7;
    const centerY = 7;
    const distToCenterBefore = Math.abs(currentPos.x - centerX) + Math.abs(currentPos.y - centerY);
    const distToCenterAfter = Math.abs(newPos.x - centerX) + Math.abs(newPos.y - centerY);
    
    if (distToCenterAfter < distToCenterBefore) {
      score += 5;
    }

    return score;
  }

  /**
   * 決定如何處理抽到的卡牌
   */
  decideCardHandling(
    card: Card,
    gameState: GameState,
    playerId: string
  ): CardHandlingDecision {
    const player = this.getPlayer(gameState, playerId);
    if (!player) {
      return {
        useItem: false,
        expectedOutcome: 'neutral',
        recommendedAction: 'draw',
        reason: '無法獲取玩家資訊',
      };
    }

    const personality = PERSONALITY_WEIGHTS[this.personality];

    // 根據卡牌類型決定策略
    switch (card.type) {
      case 'item':
        return {
          useItem: false,
          expectedOutcome: 'success',
          recommendedAction: 'draw',
          reason: '物品卡通常是有益的',
        };

      case 'omen':
        // 預兆卡風險較高
        const omenRisk = 30 * (1 - personality.riskTolerance);
        return {
          useItem: false,
          expectedOutcome: omenRisk > 15 ? 'failure' : 'neutral',
          recommendedAction: this.personality === 'cautious' ? 'prepare' : 'draw',
          reason: `預兆卡可能觸發作祟（風險: ${Math.round(omenRisk)}%）`,
        };

      case 'event':
        if (card.rollRequired) {
          // 需要檢定的事件
          const stat = card.rollRequired.stat;
          const currentValue = player.currentStats[stat];
          const target = card.rollRequired.target;
          const successChance = this.estimateSuccessChance(currentValue, target);

          const shouldPrepare = successChance < 0.5 && this.hasBoostItem(player, stat);

          return {
            useItem: shouldPrepare,
            itemId: shouldPrepare ? this.findBoostItem(player, stat) : undefined,
            expectedOutcome: successChance > 0.6 ? 'success' : successChance > 0.3 ? 'neutral' : 'failure',
            recommendedAction: shouldPrepare ? 'prepare' : successChance > 0.5 ? 'draw' : 'avoid',
            reason: `${stat} 檢定成功率約 ${Math.round(successChance * 100)}%`,
          };
        }
        return {
          useItem: false,
          expectedOutcome: 'neutral',
          recommendedAction: 'draw',
          reason: '無需檢定的事件',
        };

      default:
        return {
          useItem: false,
          expectedOutcome: 'neutral',
          recommendedAction: 'draw',
          reason: '未知卡牌類型',
        };
    }
  }

  /**
   * 決定屬性檢定策略
   */
  decideStatCheckStrategy(
    stat: StatType,
    target: number,
    gameState: GameState,
    playerId: string
  ): { shouldRoll: boolean; useItem?: string; expectedSuccess: number } {
    const player = this.getPlayer(gameState, playerId);
    if (!player) {
      return { shouldRoll: false, expectedSuccess: 0 };
    }

    const currentValue = player.currentStats[stat];
    const successChance = this.estimateSuccessChance(currentValue, target);

    // 尋找可以提升該屬性的物品
    let boostItem: string | undefined;
    if (successChance < 0.5) {
      boostItem = this.findBoostItem(player, stat);
    }

    // 根據個性和成功率決定是否進行檢定
    const personality = PERSONALITY_WEIGHTS[this.personality];
    let shouldRoll = true;

    if (this.personality === 'cautious' && successChance < 0.3) {
      shouldRoll = false; // 謹慎個性避免低成功率檢定
    }

    if (this.personality === 'aggressive') {
      shouldRoll = true; // 激進個性總是嘗試
    }

    return {
      shouldRoll,
      useItem: boostItem,
      expectedSuccess: successChance,
    };
  }

  /**
   * 評估是否應該繼續探索
   */
  shouldContinueExploring(
    gameState: GameState,
    playerId: string,
    movesRemaining: number
  ): boolean {
    const player = this.getPlayer(gameState, playerId);
    if (!player || movesRemaining <= 0) return false;

    const personality = PERSONALITY_WEIGHTS[this.personality];
    const totalSpeed = player.currentStats.speed;
    const movesUsed = totalSpeed - movesRemaining;
    const minMovesRequired = Math.max(1, Math.floor(totalSpeed * 0.5)); // 至少使用 50% 的 Speed

    // 檢查健康狀態
    const healthStatus = this.evaluateHealthStatus(player);
    if (healthStatus === 'critical') {
      return false; // 危急時停止探索
    }

    // 檢查是否有可行的探索方向
    const undiscoveredNearby = this.hasUndiscoveredNeighbors(gameState, player.position);
    
    // 如果還沒使用足夠的移動點數，繼續探索
    if (movesUsed < minMovesRequired) {
      return true;
    }

    // 如果附近還有未探索區域，根據個性決定是否繼續
    if (undiscoveredNearby) {
      // 根據個性決定
      if (this.personality === 'explorer') {
        return movesRemaining > 0;
      }

      if (this.personality === 'cautious') {
        // 謹慎個性保留至少 1 點移動
        return movesRemaining > 1 && healthStatus === 'healthy';
      }

      return movesRemaining > 0;
    }

    return false;
  }

  /**
   * 選擇最佳移動目標
   */
  selectBestMoveTarget(
    gameState: GameState,
    playerId: string,
    availablePositions: Position3D[]
  ): Position3D | null {
    if (availablePositions.length === 0) return null;

    const player = this.getPlayer(gameState, playerId);
    if (!player) return availablePositions[0];

    const personality = PERSONALITY_WEIGHTS[this.personality];
    let bestPosition = availablePositions[0];
    let bestScore = -Infinity;

    for (const pos of availablePositions) {
      let score = 10; // 基礎分數

      // 偏好有未探索鄰居的位置（大幅提高權重）
      if (this.hasUnexploredNeighbors(gameState, pos)) {
        score += 50 * personality.explorePriority;
      }

      // 如果該位置本身是未探索的，給予額外獎勵
      const tile = this.getTileAt(gameState, pos);
      if (tile && !tile.discovered) {
        score += 35;
      }

      // 距離懲罰
      const distance = this.calculateDistance(player.position, pos);
      score -= distance * 2;

      // 謹慎個性偏好已探索區域
      if (this.personality === 'cautious') {
        if (tile?.discovered) {
          score += 15;
        }
      }

      // 激進個性更願意移動到未探索區域
      if (this.personality === 'aggressive') {
        if (tile && !tile.discovered) {
          score += 15;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestPosition = pos;
      }
    }

    return bestPosition;
  }

  // ==================== 輔助方法 ====================

  /**
   * 獲取玩家
   */
  private getPlayer(gameState: GameState, playerId: string): Player | null {
    return gameState.players.find(p => p.id === playerId) || null;
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
   * 尋找所有未發現的位置
   */
  private findUndiscoveredPositions(gameState: GameState): Position3D[] {
    const positions: Position3D[] = [];
    const floors: Floor[] = ['ground', 'upper', 'basement'];

    for (const floor of floors) {
      const floorMap = gameState.map[floor];
      for (let y = 0; y < floorMap.length; y++) {
        for (let x = 0; x < floorMap[y].length; x++) {
          if (!floorMap[y][x].discovered) {
            positions.push({ x, y, floor });
          }
        }
      }
    }

    return positions;
  }

  /**
   * 推斷目標類型
   */
  private inferTargetType(gameState: GameState, position: Position3D): ExplorationTargetType {
    // 檢查是否為樓梯房間
    const stairRooms = ['grand_staircase', 'stairs_from_upper', 'stairs_from_ground', 'stairs_from_basement'];
    // 這裡簡化處理，實際應檢查該位置是否有樓梯房間

    // 根據位置推斷類型
    const tile = this.getTileAt(gameState, position);
    if (tile?.room) {
      if (tile.room.symbol === 'I') return 'item_room';
      if (tile.room.symbol === 'O') return 'omen_room';
      if (tile.room.symbol === 'E') return 'safe_room';
    }

    return 'undiscovered_room';
  }

  /**
   * 生成目標理由
   */
  private generateTargetReason(type: ExplorationTargetType, evaluation: RoomEvaluation): string {
    const reasons: Record<ExplorationTargetType, string> = {
      undiscovered_room: '發現新房間',
      item_room: '可能有物品',
      omen_room: '可能有預兆',
      stair_room: '樓梯房間',
      safe_room: '安全區域',
      specific_room: '特定目標',
    };

    return `${reasons[type]} (價值: ${Math.round(evaluation.exploreValue)}, 風險: ${Math.round(evaluation.riskLevel)})`;
  }

  /**
   * 檢查是否可能是預兆房間
   */
  private isOmenRoomLikely(gameState: GameState, position: Position3D): boolean {
    // 簡化：檢查周圍是否有預兆房間標記
    // 實際應根據房間符號判斷
    return false;
  }

  /**
   * 檢查是否可能是事件房間
   */
  private isEventRoomLikely(gameState: GameState, position: Position3D): boolean {
    return false;
  }

  /**
   * 檢查是否可能是物品房間
   */
  private isItemRoomLikely(gameState: GameState, position: Position3D): boolean {
    return false;
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
   * 評估健康狀態
   */
  private evaluateHealthStatus(player: Player): 'healthy' | 'wounded' | 'critical' {
    const might = player.currentStats.might;
    if (might <= 2) return 'critical';
    if (might <= 4) return 'wounded';
    return 'healthy';
  }

  /**
   * 檢查是否有未探索的鄰居
   */
  private hasUndiscoveredNeighbors(gameState: GameState, position: Position3D): boolean {
    const directions: Direction[] = ['north', 'south', 'east', 'west'];
    const deltas = {
      north: { x: 0, y: -1 },
      south: { x: 0, y: 1 },
      east: { x: 1, y: 0 },
      west: { x: -1, y: 0 },
    };

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
   * 檢查位置是否有未探索的鄰居
   */
  private hasUnexploredNeighbors(gameState: GameState, position: Position3D): boolean {
    return this.hasUndiscoveredNeighbors(gameState, position);
  }

  /**
   * 估計檢定成功率
   */
  private estimateSuccessChance(currentValue: number, target: number): number {
    // 簡化估計：每點屬性約 30% 成功率（骰子期望值）
    const expectedRoll = currentValue * 1.5; // 每顆骰子期望值約 1.5
    const variance = currentValue * 0.8; // 方差

    // 使用正態分布近似
    const z = (target - expectedRoll) / variance;
    // 簡化：線性近似
    const chance = Math.min(0.95, Math.max(0.05, 0.5 - z * 0.3));

    return chance;
  }

  /**
   * 檢查是否有提升屬性的物品
   */
  private hasBoostItem(player: Player, stat: StatType): boolean {
    return this.findBoostItem(player, stat) !== undefined;
  }

  /**
   * 尋找提升屬性的物品
   */
  private findBoostItem(player: Player, stat: StatType): string | undefined {
    const statKeywords: Record<StatType, string[]> = {
      speed: ['speed', '速度', '敏捷', 'quick'],
      might: ['might', '力量', '強壯', 'strength'],
      sanity: ['sanity', '理智', '精神', 'mind'],
      knowledge: ['knowledge', '知識', '智慧', 'wisdom'],
    };

    for (const item of player.items) {
      const keywords = statKeywords[stat];
      if (keywords.some(kw => 
        item.description.toLowerCase().includes(kw.toLowerCase()) ||
        item.name.toLowerCase().includes(kw.toLowerCase())
      )) {
        return item.id;
      }
    }

    return undefined;
  }

  // ==================== Getter 方法 ====================

  /**
   * 設定個性
   */
  setPersonality(personality: AIPersonality): void {
    this.personality = personality;
  }

  /**
   * 設定難度
   */
  setDifficulty(difficulty: AIDifficulty): void {
    this.difficulty = difficulty;
  }

  /**
   * 記錄已探索房間
   */
  recordExploredRoom(roomId: string): void {
    this.exploredRooms.add(roomId);
  }

  /**
   * 取得已探索房間數
   */
  getExploredRoomCount(): number {
    return this.exploredRooms.size;
  }
}

// ==================== 輔助函數 ====================

/**
 * 建立探索引擎
 */
export function createExplorationEngine(
  personality: AIPersonality = 'explorer',
  difficulty: AIDifficulty = 'medium',
  seed?: string
): AIExplorationEngine {
  return new AIExplorationEngine(personality, difficulty, seed);
}

/**
 * 分析地圖探索進度
 */
export function analyzeExplorationProgress(gameState: GameState): {
  totalRooms: number;
  discoveredRooms: number;
  explorationRate: number;
  remainingRooms: number;
} {
  let totalRooms = 0;
  let discoveredRooms = 0;
  const floors: Floor[] = ['ground', 'upper', 'basement'];

  for (const floor of floors) {
    const floorMap = gameState.map[floor];
    for (const row of floorMap) {
      for (const tile of row) {
        if (tile.room) {
          totalRooms++;
          if (tile.discovered) {
            discoveredRooms++;
          }
        }
      }
    }
  }

  return {
    totalRooms,
    discoveredRooms,
    explorationRate: totalRooms > 0 ? discoveredRooms / totalRooms : 0,
    remainingRooms: 46 - discoveredRooms, // 總共 46 個房間
  };
}

// ==================== 預設匯出 ====================

export default AIExplorationEngine;
