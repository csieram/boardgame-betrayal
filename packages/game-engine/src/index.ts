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

// Legacy exports (for backward compatibility)
export { GameEngine as GameEngineLegacy } from './core/GameEngine';
