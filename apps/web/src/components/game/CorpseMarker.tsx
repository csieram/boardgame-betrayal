'use client';

import { motion } from 'framer-motion';
import { Corpse } from '@betrayal/game-engine';

interface CorpseMarkerProps {
  corpse: Corpse;
  onClick: () => void;
}

/**
 * 屍體標記組件
 * 
 * 在遊戲板上顯示死亡玩家留下的屍體標記
 * 顯示骷髏圖標，並在 hover 時顯示玩家名稱
 * 
 * @example
 * <CorpseMarker 
 *   corpse={corpse}
 *   onClick={() => openLootDialog(corpse)}
 * />
 */
export function CorpseMarker({ corpse, onClick }: CorpseMarkerProps) {
  const itemCount = corpse.items.length + corpse.omens.length;

  return (
    <motion.button
      className="absolute bottom-1 left-1 z-20 group"
      onClick={onClick}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* 骷髏圖標容器 */}
      <div className="relative">
        {/* 骷髏圖標 */}
        <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center border-2 border-gray-600 shadow-lg group-hover:border-amber-500 transition-colors">
          <span className="text-lg">💀</span>
        </div>

        {/* 物品數量標記 */}
        {itemCount > 0 && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-600 rounded-full flex items-center justify-center text-xs font-bold text-white border border-gray-800">
            {itemCount}
          </div>
        )}

        {/* Hover 時顯示的玩家名稱提示 */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-30">
          <div className="bg-gray-900 text-white text-xs px-2 py-1 rounded border border-gray-700 shadow-lg">
            <span className="text-gray-400">屍體:</span> {corpse.playerName}
            {itemCount > 0 && (
              <span className="text-amber-400 ml-1">({itemCount} 物品)</span>
            )}
          </div>
          {/* 箭頭 */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </div>
      </div>
    </motion.button>
  );
}

export default CorpseMarker;
