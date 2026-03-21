export function rollDice(count: number): number[] {
  return Array.from({ length: count }, () => Math.floor(Math.random() * 3));
}

export function rollDiceSum(count: number): number {
  return rollDice(count).reduce((sum, val) => sum + val, 0);
}
