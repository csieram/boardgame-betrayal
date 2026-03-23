// Core Game State
export { GameStateManager, SeededRng } from './core/GameState';
export type { GameStateManager as GameEngine } from './core/GameState';

// Types
export * from './types';

// Legacy exports (for backward compatibility)
export { GameEngine as GameEngineLegacy } from './core/GameEngine';
