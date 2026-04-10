'use client';

import { motion } from 'framer-motion';
import { Player } from '@betrayal/game-engine';

interface CombatCardProps {
  player: Player;
  isAttacker: boolean;
  rollResult?: number[];
  total?: number;
  selectedWeapon?: { name: string };
  /** Issue #325: 是否正在擲骰中（顯示問號） */
  isRolling?: boolean;
}

export function CombatCard({ player, isAttacker, rollResult, total, selectedWeapon, isRolling }: CombatCardProps) {
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

      {/* Issue #325: 擲骰結果 - 支援問號狀態 */}
      {(rollResult && rollResult.length > 0) || isRolling ? (
        <div className="bg-gray-800/50 rounded-lg p-3">
          <div className="flex flex-wrap gap-2 justify-center mb-2">
            {isRolling ? (
              // Issue #325: 擲骰中顯示問號
              <>
                {[0, 1, 2, 3].map((i) => (
                  <motion.div
                    key={i}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1, rotate: [0, 10, -10, 0] }}
                    transition={{
                      scale: { delay: i * 0.1 },
                      rotate: { repeat: Infinity, duration: 0.5, delay: i * 0.1 }
                    }}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg shadow-lg ${
                      isAttacker
                        ? 'bg-gradient-to-br from-red-400 to-red-600 border-2 border-red-300'
                        : 'bg-gradient-to-br from-blue-400 to-blue-600 border-2 border-blue-300'
                    }`}
                  >
                    <span className="text-white text-xl">?</span>
                  </motion.div>
                ))}
              </>
            ) : (
              // 擲骰完成顯示數值
              rollResult?.map((value, i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-gray-900 font-bold text-lg shadow-lg"
                >
                  {value}
                </motion.div>
              ))
            )}
          </div>
          {!isRolling && total !== undefined && (
            <p className="text-center text-xl font-bold text-white">
              總和: {total}
            </p>
          )}
        </div>
      ) : null}
    </motion.div>
  );
}

export default CombatCard;
