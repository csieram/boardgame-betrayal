export const MAP_SIZE = 15;
export const DIRECTIONS = ['north', 'south', 'east', 'west'] as const;
export type Direction = typeof DIRECTIONS[number];
