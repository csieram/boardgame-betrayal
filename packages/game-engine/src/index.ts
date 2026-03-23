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

// Legacy exports (for backward compatibility)
export { GameEngine as GameEngineLegacy } from './core/GameEngine';
