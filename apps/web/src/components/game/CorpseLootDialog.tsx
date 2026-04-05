'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Corpse, Card } from '@betrayal/game-engine';
import { Character } from '@betrayal/shared';

interface CorpseLootDialogProps {
  isOpen: boolean;
  onClose: () => void;
  corpse: Corpse;
  looter: {
    id: string;
    name: string;
    character: Character;
  };
  onLootItem: (itemId: string, cardType: 'item' | 'omen') => void;
}

/**
 * 屍體搜刮對話框組件
 * 
 * 顯示屍體上的可搜刮物品，允許玩家選擇並拿走物品
 * 
 * @example
 * <CorpseLootDialog
 *   isOpen={showLootDialog}
 *   onClose={() => setShowLootDialog(false)}
 *   corpse={selectedCorpse}
 *   looter={currentPlayer}
 *   onLootItem={(itemId, type) => handleLoot(itemId, type)}
 * />
 */
export function CorpseLootDialog({
  isOpen,
  onClose,
  corpse,
  looter,
  onLootItem,
}: CorpseLootDialogProps) {
  const allItems: Array<{ card: Card; type: 'item' | 'omen' }> = [
    ...corpse.items.map(item => ({ card: item, type: 'item' as const })),
    ...corpse.omens.map(omen => ({ card: omen, type: 'omen' as const })),
  ];

  const handleLoot = (itemId: string, cardType: 'item' | 'omen') => {
    onLootItem(itemId, cardType);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="bg-gray-800 rounded-2xl p-6 max-w-md w-full mx-4 border border-gray-700 shadow-2xl"
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 標題區域 */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gray-700 flex items-center justify-center text-3xl border-2 border-gray-600">
                💀
              </div>
              <h3 className="text-xl font-bold text-white mb-1">
                {corpse.playerName} 的屍體
              </h3>
              <p className="text-gray-400 text-sm">
                位置: ({corpse.position.x}, {corpse.position.y}) · {' '}
                {corpse.position.floor === 'ground' ? '一樓' : 
                 corpse.position.floor === 'upper' ? '二樓' : 
                 corpse.position.floor === 'basement' ? '地下室' : '屋頂'}
              </p>
            </div>

            {/* 可搜刮物品列表 */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
                <span>可搜刮物品</span>
                <span className="bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full text-xs">
                  {allItems.length}
                </span>
              </h4>

              {allItems.length === 0 ? (
                <div className="text-center py-8 bg-gray-900/50 rounded-xl border border-gray-700">
                  <span className="text-4xl mb-2 block">🕸️</span>
                  <p className="text-gray-500">屍體上沒有物品</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {allItems.map(({ card, type }) => (
                    <motion.div
                      key={card.id}
                      className="bg-gray-700/50 rounded-xl p-3 border border-gray-600 hover:border-amber-500/50 transition-colors"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      whileHover={{ scale: 1.02 }}
                    >
                      <div className="flex items-center gap-3">
                        {/* 卡牌類型圖標 */}
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${
                            type === 'item'
                              ? 'bg-blue-600/20 border border-blue-500/30'
                              : 'bg-purple-600/20 border border-purple-500/30'
                          }`}
                        >
                          {type === 'item' ? '⚔️' : '🔮'}
                        </div>

                        {/* 卡牌資訊 */}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-white truncate">
                            {card.name}
                          </p>
                          <p className="text-xs text-gray-400">
                            {type === 'item' ? '物品' : '預兆'}
                          </p>
                        </div>

                        {/* 拿取按鈕 */}
                        <motion.button
                          onClick={() => handleLoot(card.id, type)}
                          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white text-sm font-medium rounded-lg transition-colors"
                          whileTap={{ scale: 0.95 }}
                        >
                          拿取
                        </motion.button>
                      </div>

                      {/* 卡牌描述 */}
                      {card.description && (
                        <p className="text-xs text-gray-400 mt-2 line-clamp-2">
                          {card.description}
                        </p>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* 搜刮者資訊 */}
            <div className="bg-gray-900/50 rounded-xl p-3 mb-6 border border-gray-700">
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full border border-gray-600 flex-shrink-0"
                  style={{ backgroundColor: looter.character.color }}
                >
                  {looter.character.portraitSvg ? (
                    <img
                      src={`/betrayal${looter.character.portraitSvg}`}
                      alt={looter.character.name}
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">
                      {looter.character.name[0]}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-400">搜刮者</p>
                  <p className="text-sm font-medium text-white">{looter.name}</p>
                </div>
              </div>
            </div>

            {/* 關閉按鈕 */}
            <button
              onClick={onClose}
              className="w-full py-3 px-4 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-xl font-medium transition-all"
            >
              關閉
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default CorpseLootDialog;
