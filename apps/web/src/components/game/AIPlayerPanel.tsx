'use client';

import { motion } from 'framer-motion';
import { AIPlayerInfo, AIPersonality, getPersonalityIcon, getPersonalityColor } from '@betrayal/game-engine';
import { Floor } from '@betrayal/shared';

interface AIPlayerPanelProps {
  /** AI 玩家列表 */
  aiPlayers: AIPlayerInfo[];
  /** 當前回合玩家 ID */
  currentTurnPlayer: string;
  /** 是否正在處理 AI 回合 */
  isProcessing: boolean;
  /** 遊戲難度 */
  difficulty: 'easy' | 'medium' | 'hard';
  /** 當前正在行動的 AI 玩家 ID */
  actingPlayerId?: string | null;
}

/**
 * AI 玩家面板
 * 
 * 顯示所有 AI 玩家的狀態，包括：
 * - 角色名稱和個性
 * - 當前屬性（Speed, Might, Sanity, Knowledge）
 * - 當前位置（樓層、房間）
 * - 背包物品數量
 * - 回合狀態指示器
 * 
 * @example
 * <AIPlayerPanel
 *   aiPlayers={aiPlayers}
 *   currentTurnPlayer="ai-player-1"
 *   isProcessing={true}
 *   difficulty="medium"
 * />
 */
export function AIPlayerPanel({
  aiPlayers,
  currentTurnPlayer,
  isProcessing,
  difficulty,
  actingPlayerId,
}: AIPlayerPanelProps) {
  // Issue #197: 添加除錯日誌追蹤渲染時的屬性值
  console.log('[AIPlayerPanel] Render:', {
    aiPlayersCount: aiPlayers.length,
    currentTurnPlayer,
    isProcessing,
    aiPlayersStats: aiPlayers.map(p => ({
      id: p.id,
      name: p.name,
      speed: p.character?.stats?.speed?.[0],
      might: p.character?.stats?.might?.[0],
      sanity: p.character?.stats?.sanity?.[0],
      knowledge: p.character?.stats?.knowledge?.[0],
    })),
  });
  
  if (aiPlayers.length === 0) {
    return null;
  }

  const difficultyText = {
    easy: '簡單',
    medium: '中等',
    hard: '困難',
  };

  const personalityText: Record<AIPersonality, string> = {
    explorer: '探索者',
    cautious: '謹慎者',
    aggressive: '激進者',
  };

  const floorText: Record<Floor, string> = {
    ground: '一樓',
    upper: '二樓',
    basement: '地下室',
    roof: '屋頂',
  };

  return (
    <motion.div
      className="bg-gray-800/50 rounded-xl p-4 border border-gray-700"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* 標題列 */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <span>🤖</span>
          <span>AI 玩家</span>
        </h3>
        <span className="text-xs bg-blue-900/50 px-2 py-1 rounded text-blue-300">
          {difficultyText[difficulty]}
        </span>
      </div>

      {/* AI 回合指示器 */}
      {isProcessing && actingPlayerId && (
        <motion.div
          className="mb-4 p-3 bg-yellow-900/30 border border-yellow-500/50 rounded-lg"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="flex items-center gap-3">
            <motion.div
              className="w-5 h-5 border-2 border-yellow-400 border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-400">
                🤖 AI Turn: {aiPlayers.find(p => p.id === actingPlayerId)?.name || 'AI'}
              </p>
              <p className="text-xs text-yellow-500/70">思考中...</p>
            </div>
          </div>
          {/* 進度條 */}
          <div className="mt-2 h-1 bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-yellow-400"
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            />
          </div>
        </motion.div>
      )}

      {/* AI 玩家列表 */}
      <div className="space-y-3">
        {aiPlayers.map((aiPlayer, index) => {
          const isCurrentTurn = currentTurnPlayer === aiPlayer.id;
          const isActing = actingPlayerId === aiPlayer.id;
          const personalityColor = getPersonalityColor(aiPlayer.personality);
          const personalityIcon = getPersonalityIcon(aiPlayer.personality);

          return (
            <motion.div
              key={aiPlayer.id}
              className={`
                p-3 rounded-lg border transition-all
                ${isCurrentTurn
                  ? 'bg-blue-900/30 border-blue-500/50 ring-1 ring-blue-500/30'
                  : 'bg-gray-700/30 border-gray-600/30'
                }
                ${isActing ? 'ring-2 ring-yellow-400/50' : ''}
              `}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              {/* 頭部：名稱和個性 */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {/* 個性圖標 */}
                  <span
                    className="text-lg"
                    style={{ color: personalityColor }}
                    title={personalityText[aiPlayer.personality]}
                  >
                    {personalityIcon}
                  </span>
                  
                  {/* 角色名稱 */}
                  <span className="font-medium text-white">{aiPlayer.name}</span>
                  
                  {/* 回合指示器 */}
                  {isCurrentTurn && (
                    <motion.span
                      className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full"
                      animate={{ opacity: [1, 0.5, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      回合中
                    </motion.span>
                  )}
                </div>

                {/* 個性標籤 */}
                <span
                  className="text-xs px-2 py-0.5 rounded"
                  style={{
                    backgroundColor: `${personalityColor}20`,
                    color: personalityColor,
                  }}
                >
                  {personalityText[aiPlayer.personality]}
                </span>
              </div>

              {/* 屬性列 */}
              <div className="grid grid-cols-4 gap-2 mb-2">
                <StatBadge
                  icon="⚡"
                  value={aiPlayer.character?.stats?.speed?.[0] ?? 0}
                  color="#3B82F6"
                  label="速度"
                />
                <StatBadge
                  icon="💪"
                  value={aiPlayer.character?.stats?.might?.[0] ?? 0}
                  color="#EF4444"
                  label="力量"
                />
                <StatBadge
                  icon="🧠"
                  value={aiPlayer.character?.stats?.sanity?.[0] ?? 0}
                  color="#8B5CF6"
                  label="理智"
                />
                <StatBadge
                  icon="📚"
                  value={aiPlayer.character?.stats?.knowledge?.[0] ?? 0}
                  color="#10B981"
                  label="知識"
                />
              </div>

              {/* 位置和背包資訊 */}
              <div className="flex items-center justify-between text-xs text-gray-400">
                <div className="flex items-center gap-3">
                  {/* 位置 */}
                  <span className="flex items-center gap-1">
                    <span>📍</span>
                    <span>
                      {floorText[aiPlayer.position?.floor || 'ground']}
                      {aiPlayer.position && (
                        <span className="text-gray-500 ml-1">
                          ({aiPlayer.position.x}, {aiPlayer.position.y})
                        </span>
                      )}
                    </span>
                  </span>
                </div>

                {/* 背包數量 */}
                <span className="flex items-center gap-1">
                  <span>🎒</span>
                  <span>
                    {(aiPlayer.experience?.itemsCollected || 0)} 物品
                  </span>
                </span>
              </div>

              {/* 經驗統計 */}
              {aiPlayer.experience && (
                <div className="mt-2 pt-2 border-t border-gray-600/30 flex items-center gap-3 text-xs text-gray-500">
                  <span>發現 {aiPlayer.experience.roomsDiscovered || 0} 個房間</span>
                  {aiPlayer.experience.combatsParticipated > 0 && (
                    <span>參與 {aiPlayer.experience.combatsParticipated} 場戰鬥</span>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

/**
 * 屬性徽章組件
 */
interface StatBadgeProps {
  icon: string;
  value: number;
  color: string;
  label: string;
}

function StatBadge({ icon, value, color, label }: StatBadgeProps) {
  return (
    <div
      className="flex flex-col items-center p-1.5 rounded bg-gray-800/50"
      title={label}
    >
      <span className="text-sm">{icon}</span>
      <span
        className="text-sm font-bold"
        style={{ color }}
      >
        {value}
      </span>
    </div>
  );
}

export default AIPlayerPanel;
