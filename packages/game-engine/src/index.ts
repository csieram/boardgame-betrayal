// Core Game State
export { GameStateManager, SeededRng } from './core/GameState';
export type { GameStateManager as GameEngine } from './core/GameState';

// Types
export * from './types';

// Rules Engine
export {
  TurnManager,
  TurnOrderManager,
  TurnPhaseManager,
} from './rules/turn';
export type {
  TurnPhase,
  TurnResult,
  TurnValidation,
} from './rules/turn';

export {
  MovementValidator,
  MovementExecutor,
  PathFinder,
  ObstacleManager,
  STANDARD_MOVE_COST,
  OBSTACLE_MOVE_COST,
  INFINITE_COST,
} from './rules/movement';
export type {
  MovementValidation,
  MovementResult,
  PathResult,
  ObstacleType,
  Obstacle,
  VisibleRoomInfo,
} from './rules/movement';

// Room Discovery System
export {
  RoomDiscoveryManager,
  VALID_ROTATIONS,
  getValidExploreDirections,
  validateDoorConnection,
  calculateConnectionRotation,
  OPPOSITE_DOOR,
  rotateRoomForConnection,
  rotateDoors,
  drawRoomForExploration,
  getUnconnectedDoors,
  addRandomDoor,
  // Stair System (Issue #80)
  StairManager,
  STAIR_ROOM_IDS,
  STAIR_CONNECTIONS,
  isStairRoom,
  canUseStairs,
  getStairConnections,
  getStairTargetPosition,
} from './rules/roomDiscovery';
export type {
  RoomDiscoveryResult,
  RotatedDoors,
  RoomDeckStats,
  StairConnection,
} from './rules/roomDiscovery';

// Tile Placement System
export {
  TilePlacementValidator,
  TilePlacementExecutor,
  TilePlacementManager,
  validateRotatedPlacement,
  getValidRotationsForPlacement,
} from './rules/tilePlacement';
export type {
  TilePlacementValidation,
  TileConflict,
  TilePlacementResult,
  ValidPlacement,
  DoorMatchResult,
} from './rules/tilePlacement';

// Card Drawing System (Issue #36, #104, #188)
export {
  CardDrawingManager,
  CardEffectApplier,
  drawAndApplyCard,
} from './rules/cardDrawing';
export type {
  CardDrawResult,
  CardEffectResult,
  PlayerState,
  EventCheckResult,
  DeckState,
} from './rules/cardDrawing';

// Haunt System (Issue #41)
export {
  // Core functions
  makeHauntRoll,
  isLastOmen,
  shouldMakeHauntRoll,
  selectHauntScenario,
  assignPlayerSides,
  revealHaunt,
  createHauntStartResult,
  // Helper functions
  isTraitor,
  isHero,
  getTraitor,
  getHeroes,
  getPlayerSide,
  // Constants
  HAUNT_ROLL_THRESHOLD,
  TOTAL_OMEN_CARDS,
} from './rules/haunt';
export type {
  HauntRollResult,
  HauntRevelationResult,
  PlayerAssignment,
  HauntStartResult,
} from './rules/haunt';

// Haunt Scenarios Data
export {
  HAUNT_SCENARIOS,
  getScenarioById,
  getRecommendedScenarios,
  getRandomScenario,
  getScenarioCount,
} from './data/hauntScenarios';
export type {
  HauntScenario,
  HauntScenarioType,
  PlayerSide,
} from './data/hauntScenarios';

// Combat System (Issue #103)
export {
  CombatManager,
  initiateCombat,
  resolveCombat,
  calculateDamage,
  applyDamage as applyCombatDamage,
  calculateWeaponBonus,
  WEAPON_EFFECTS,
} from './rules/combat';
export type {
  Combatant,
  CombatantType,
  CombatResult,
  CombatValidation,
  WeaponEffect,
} from './rules/combat';

// Damage System (Issue #229)
export {
  // Core functions
  getAvailableTraitsForDamage,
  isValidTraitForDamage,
  checkDeath,
  findFatalStat,
  calculateNewStatValue,
  calculateActualReduction,
  applyDamage,
  createDamageAllocation,
  createDeathResult,
  handlePlayerDeath,
  formatDeathNotification,
  getRecommendedTraitForDamage,
  willDamageCauseDeath,
  getFatalTraitChoices,
  getSafeTraitChoices,
  // Constants
  PHYSICAL_DAMAGE_TRAITS,
  MENTAL_DAMAGE_TRAITS,
  ALL_TRAITS,
  TRAIT_NAMES,
  TRAIT_NAMES_EN,
  DEATH_THRESHOLD,
  EXPLORATION_MIN_STAT,
} from './rules/damage';
export type {
  DamageType,
  PhysicalTrait,
  MentalTrait,
  AllTrait,
  DamageAllocation,
  DamageApplicationResult,
  DeathResult,
  DeathHandlingResult,
} from './rules/damage';

// Legacy exports (for backward compatibility)
export { GameEngine as GameEngineLegacy } from './core/GameEngine';

// AI System (Issue #95, #109, #110)
export {
  // Traitor AI
  TraitorAI,
  createTraitorAI,
  createTraitorAIs,
  isAIControlled,
  getAIControlledPlayers,
  // Hero AI
  HeroAI,
  createHeroAI,
  createHeroAIs,
  isAIControlledHero,
  getAIControlledHeroes,
  coordinateHeroAIs,
  // Decision Engine
  AIDecisionEngine,
  createDecisionEngine,
  selectBestDecision,
  selectDecisionByDifficulty,
  compareDecisions,
  DEFAULT_WEIGHTS,
  DIFFICULTY_WEIGHTS,
  // Full AI Player System (Issue #110)
  AIPlayer,
  createAIPlayer,
  getRandomPersonality,
  getPersonalityDescription,
  AIExplorationEngine,
  createExplorationEngine,
  analyzeExplorationProgress,
  AIPlayerManager,
  createAIPlayerManager,
  generateGameSetupOptions,
  getPersonalityIcon,
  getPersonalityColor,
} from './ai';
export type {
  // Traitor AI Types
  TraitorAIConfig,
  TraitorObjectiveType,
  TraitorObjectiveState,
  AIActionHistory,
  TraitorAIState,
  // Hero AI Types
  HeroAIConfig,
  HeroObjectiveType,
  HeroObjectiveState,
  HeroAIState,
  // Decision Engine Types
  AIDifficulty,
  AIActionType,
  AIDecision,
  LegalActions,
  GameSituation,
  AIWeights,
  // Full AI Player Types (Issue #110)
  AIPersonality,
  AIPlayerConfig,
  AIPlayerState,
  AIPlayerActionHistory,
  AIExperience,
  ExplorationDecision,
  TurnExecutionResult,
  ExplorationTargetType,
  ExplorationTarget,
  RoomEvaluation,
  MovementPlan,
  ExplorationStrategy,
  CardHandlingDecision,
  AIPlayerManagerConfig,
  AIPlayerInfo,
  TurnOrder,
  AIActionLog,
  GameSetupOptions,
} from './ai';
