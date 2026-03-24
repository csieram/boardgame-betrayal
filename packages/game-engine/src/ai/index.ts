/**
 * AI Module Index - AI 模組入口
 * 
 * 匯出所有 AI 相關功能
 */

// AIDecisionEngine
export {
  AIDecisionEngine,
  createDecisionEngine,
  selectBestDecision,
  selectDecisionByDifficulty,
  compareDecisions,
  DEFAULT_WEIGHTS,
  DIFFICULTY_WEIGHTS,
} from './AIDecisionEngine';

export type {
  AIDifficulty,
  AIActionType,
  AIDecision,
  LegalActions,
  GameSituation,
  AIWeights,
} from './AIDecisionEngine';

// TraitorAI
export {
  TraitorAI,
  createTraitorAI,
  createTraitorAIs,
  isAIControlled,
  getAIControlledPlayers,
} from './TraitorAI';

export type {
  TraitorAIConfig,
  TraitorObjectiveType,
  TraitorObjectiveState,
  AIActionHistory,
  TraitorAIState,
} from './TraitorAI';

// HeroAI
export {
  HeroAI,
  createHeroAI,
  createHeroAIs,
  isAIControlledHero,
  getAIControlledHeroes,
  coordinateHeroAIs,
} from './HeroAI';

export type {
  HeroAIConfig,
  HeroObjectiveType,
  HeroObjectiveState,
  HeroAIState,
} from './HeroAI';

// HeroAIDecisionEngine
export {
  HeroAIDecisionEngine,
  createHeroDecisionEngine,
  evaluateTeamStrategy,
  HERO_DEFAULT_WEIGHTS,
  HERO_DIFFICULTY_WEIGHTS,
  STRATEGY_WEIGHT_MODIFIERS,
} from './HeroAIDecisionEngine';

export type {
  HeroGameSituation,
  HeroStrategy,
  HeroDecisionContext,
} from './HeroAIDecisionEngine';

// AIPlayer
export {
  AIPlayer,
  createAIPlayer,
  getRandomPersonality,
  getPersonalityDescription,
} from './AIPlayer';

export type {
  AIPersonality,
  AIPlayerConfig,
  AIPlayerState,
  AIActionHistory as AIPlayerActionHistory,
  AIExperience,
  ExplorationDecision,
  TurnExecutionResult,
} from './AIPlayer';

// AIExplorationEngine
export {
  AIExplorationEngine,
  createExplorationEngine,
  analyzeExplorationProgress,
} from './AIExplorationEngine';

export type {
  ExplorationTargetType,
  ExplorationTarget,
  RoomEvaluation,
  MovementPlan,
  ExplorationStrategy,
  CardHandlingDecision,
} from './AIExplorationEngine';

// AIPlayerManager
export {
  AIPlayerManager,
  createAIPlayerManager,
  generateGameSetupOptions,
  getPersonalityIcon,
  getPersonalityColor,
} from './AIPlayerManager';

export type {
  AIPlayerManagerConfig,
  AIPlayerInfo,
  TurnOrder,
  AIActionLog,
  GameSetupOptions,
} from './AIPlayerManager';
