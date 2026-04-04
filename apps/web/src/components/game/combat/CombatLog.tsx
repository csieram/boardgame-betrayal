'use client';

import { motion } from 'framer-motion';

export interface CombatRound {
  round: number;
  attackerName: string;
  defenderName: string;
  attackerRoll: number[];
  defenderRoll: number[];
  attackerTotal: number;
  defenderTotal: number;
  winner: 'attacker' | 'defender' | 'tie';
  damage: number;
  attackerWeapon?: string;
}

interface CombatLogProps {
  rounds: CombatRound[];
  maxHeight?: string;
}

export function CombatLog({ rounds, maxHeight = '300px' }: CombatLogProps) {
  if (rounds.length === 0) {
    return (
      <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
        <h3 className="text-lg font-bold text-white mb-2">戰鬥記錄</h3>
        <p className="text-gray-400 text-center py-4">戰鬥尚未開始</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
      <h3 className="text-lg font-bold text-white mb-3">戰鬥記錄</h3>
      <div 
        className="space-y-3 overflow-y-auto pr-2"
        style={{ maxHeight }}
      >
        {rounds.map((round, index) => (
          <motion.div
            key={round.round}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-gray-700/50 rounded-lg p-3"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">第 {round.round} 回合</span>
              <span className={`
                text-xs px-2 py-1 rounded
                ${round.winner === 'attacker' 
                  ? 'bg-red-900/50 text-red-300' 
                  : round.winner === 'defender'
                  ? 'bg-blue-900/50 text-blue-300'
                  : 'bg-yellow-900/50 text-yellow-300'
                }
              `}>
                {round.winner === 'attacker' ? '攻擊者勝' : round.winner === 'defender' ? '防守者勝' : '平手'}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-gray-400">{round.attackerName}</p>
                <p className="text-white font-bold">
                  {round.attackerRoll.join(', ')} = {round.attackerTotal}
                </p>
              </div>
              <div>
                <p className="text-gray-400">{round.defenderName}</p>
                <p className="text-white font-bold">
                  {round.defenderRoll.join(', ')} = {round.defenderTotal}
                </p>
              </div>
            </div>
            
            {round.damage > 0 && (
              <p className="text-red-400 text-sm mt-2">
                造成 {round.damage} 點傷害
              </p>
            )}
            
            {round.attackerWeapon && (
              <p className="text-yellow-400 text-xs mt-1">
                使用: {round.attackerWeapon}
              </p>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// 緊湊版本用於小空間顯示
interface CombatLogCompactProps {
  rounds: CombatRound[];
}

export function CombatLogCompact({ rounds }: CombatLogCompactProps) {
  if (rounds.length === 0) return null;

  const lastRound = rounds[rounds.length - 1];

  return (
    <div className="bg-gray-800/50 rounded-lg p-2 border border-gray-700">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-400">第 {lastRound.round} 回合</span>
        <span className={`
          text-xs px-2 py-0.5 rounded
          ${lastRound.winner === 'attacker' 
            ? 'bg-red-900/50 text-red-300' 
            : lastRound.winner === 'defender'
            ? 'bg-blue-900/50 text-blue-300'
            : 'bg-yellow-900/50 text-yellow-300'
          }
        `}>
          {lastRound.winner === 'attacker' ? '攻擊者勝' : lastRound.winner === 'defender' ? '防守者勝' : '平手'}
        </span>
      </div>
      <div className="flex justify-between text-xs mt-1">
        <span className="text-gray-400">
          {lastRound.attackerName}: {lastRound.attackerTotal}
        </span>
        <span className="text-gray-400">
          {lastRound.defenderName}: {lastRound.defenderTotal}
        </span>
      </div>
    </div>
  );
}

export default CombatLog;
