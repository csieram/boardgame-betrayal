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

// Card Drawing System (Issue #36)
export {
  CardDrawingManager,
  CardEffectApplier,
  drawAndApplyCard,
} from './rules/cardDrawing';
export type {
  CardDrawResult,
  CardEffectResult,
  PlayerState,
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
  applyDamage,
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

// Legacy exports (for backward compatibility)
export { GameEngine as GameEngineLegacy } from './core/GameEngine';
