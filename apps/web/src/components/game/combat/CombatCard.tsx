'use client';

import { motion } from 'framer-motion';
import { Player } from '@betrayal/shared';

interface CombatCardProps {
  player: Player;
  isAttacker: boolean;
  rollResult?: number[];
  total?: number;
  selectedWeapon?: { name: string };
}

export function CombatCard({ player, isAttacker, rollResult, total, selectedWeapon }: CombatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        rounded-xl p-4 border-2
        ${isAttacker 
          ? 'bg-red-900/20 border-red-500/50' 
          : 'bg-blue-900/20 border-blue-500/50'
        }
      `}
    >
      {/* 頭部 */}
      <div className="flex items-center gap-3 mb-4">
        <div 
          className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold"
          style={{ backgroundColor: player.character.color }}
        >
          {player.name[0]}
        </div>
        <div>
          <h3 className="font-bold text-white">{player.name}</h3>
          <p className="text-sm text-gray-400">
            {isAttacker ? '攻擊者' : '防守者'}
          </p>
        </div>
      </div>

      {/* 屬性 */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-gray-800/50 rounded-lg p-2 text-center">
          <p className="text-xs text-gray-400">力量</p>
          <p className="text-lg font-bold text-red-400">{player.currentStats.might}</p>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-2 text-center">
          <p className="text-xs text-gray-400">速度</p>
          <p className="text-lg font-bold text-blue-400">{player.currentStats.speed}</p>
        </div>
      </div>

      {/* 武器 */}
      {selectedWeapon && (
        <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-2 mb-3">
          <p className="text-xs text-yellow-400">裝備武器</p>
          <p className="text-sm font-medium text-white">{selectedWeapon.name}</p>
        </div>
      )}

      {/* 擲骰結果 */}
      {rollResult && rollResult.length > 0 && (
        <div className="bg-gray-800/50 rounded-lg p-3">
          <div className="flex flex-wrap gap-2 justify-center mb-2">
            {rollResult.map((value, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.1 }}
                className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-gray-900 font-bold text-lg shadow-lg"
              >
                {value}
              </motion.div>
            ))}
          </div>
          {total !== undefined && (
            <p className="text-center text-xl font-bold text-white">
              總和: {total}
            </p>
          )}
        </div>
      )}
    </motion.div>
  );
}

export default CombatCard;
