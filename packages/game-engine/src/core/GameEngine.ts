import { rollDiceSum } from '@betrayal/shared';

export class GameEngine {
  private state: any;
  
  constructor(initialState: any) {
    this.state = initialState;
  }
  
  rollTraitDice(traitValue: number): number {
    return rollDiceSum(traitValue);
  }
  
  getState() {
    return this.state;
  }
  
  setState(newState: any) {
    this.state = { ...this.state, ...newState };
  }
}
