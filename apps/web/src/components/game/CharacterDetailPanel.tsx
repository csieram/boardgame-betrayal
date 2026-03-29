'use client';

import { motion } from 'framer-motion';
import { Character, Floor } from '@betrayal/shared';
import { PlayerInfo } from './CharacterTabs';

interface CharacterDetailPanelProps {
  /** 當前選中的玩家 */
  player: PlayerInfo | null;
  /** 是否顯示動畫 */
  animate?: boolean;
}

/**
 * 角色詳細資訊面板
 * 
 * 顯示選中角色的詳細資訊，包括：
 * - 角色資訊（名稱、頭像、描述）
 * - 當前屬性（Speed, Might, Sanity, Knowledge）
 * - 背包（物品、預兆）
 * - 當前位置
 * 
 * @example
 * <CharacterDetailPanel player={selectedPlayer} />
 */
export function CharacterDetailPanel({
  player,
  animate = true,
}: CharacterDetailPanelProps) {
  if (!player) {
    return (
      <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700 text-center text-gray-400">
        <p>請選擇一個角色查看詳細資訊</p>
      </div>
    );
  }

  const isHuman = player.type === 'human';
  const floorNames: Record<Floor, string> = {
    ground: '一樓',
    upper: '二樓',
    basement: '地下室',
  roof: '屋頂',
  };

  return (
    <motion.div
      className="bg-gray-800/50 rounded-xl p-4 border border-gray-700"
      initial={animate ? { opacity: 0, y: 20 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* 角色頭部資訊 */}
      <div className="flex items-start gap-4 mb-4">
        {/* 角色大頭貼 */}
        <motion.div
          className={`
            w-20 h-20 rounded-xl overflow-hidden border-3 shadow-lg
            ${isHuman ? 'border-blue-500' : 'border-purple-500'}
          `}
          style={{ backgroundColor: player.character.color }}
          initial={animate ? { scale: 0.8 } : false}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
        >
          {player.character.portraitSvg ? (
            <img
              src={`/betrayal${player.character.portraitSvg}`}
              alt={player.character.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white font-bold text-2xl">
              {player.character.name[0]}
            </div>
          )}
        </motion.div>

        {/* 角色名稱和描述 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-xl font-bold text-white truncate">
              {player.character.name}
            </h3>
            {player.isTraitor && (
              <span className="px-2 py-0.5 bg-red-600 text-white text-xs rounded-full">
                叛徒
              </span>
            )}
          </div>
          <p className="text-sm text-gray-400 mb-2">
            {isHuman ? '🏃 人類玩家' : '🤖 AI 玩家'}
          </p>
          {player.character.description && (
            <p className="text-xs text-gray-500 line-clamp-2">
              {player.character.description}
            </p>
          )}
        </div>
      </div>

      {/* 當前位置 */}
      <div className="mb-4 p-3 bg-gray-700/30 rounded-lg">
        <h4 className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
          <span>📍</span>
          <span>當前位置</span>
        </h4>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-white font-medium">
            {floorNames[player.position.floor]}
          </span>
          <span className="text-gray-400">
            ({player.position.x}, {player.position.y})
          </span>
        </div>
      </div>

      {/* 屬性面板 */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-300 mb-2">角色屬性</h4>
        <div className="grid grid-cols-2 gap-2">
          <StatCard
            label="速度"
            value={player.stats.speed}
            color="#3B82F6"
            icon="⚡"
            isHuman={isHuman}
          />
          <StatCard
            label="力量"
            value={player.stats.might}
            color="#EF4444"
            icon="💪"
            isHuman={isHuman}
          />
          <StatCard
            label="理智"
            value={player.stats.sanity}
            color="#8B5CF6"
            icon="🧠"
            isHuman={isHuman}
          />
          <StatCard
            label="知識"
            value={player.stats.knowledge}
            color="#10B981"
            icon="📚"
            isHuman={isHuman}
          />
        </div>
      </div>

      {/* 背包 */}
      <div>
        <h4 className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
          <span>🎒</span>
          <span>背包</span>
          <span className="text-xs text-gray-500 ml-auto">
            {player.items.length + player.omens.length} 個物品
          </span>
        </h4>

        {/* 物品列表 */}
        {player.items.length > 0 && (
          <div className="mb-2">
            <p className="text-xs text-gray-500 mb-1">物品</p>
            <div className="flex flex-wrap gap-1">
              {player.items.map((item, index) => (
                <motion.span
                  key={item.id}
                  className="px-2 py-1 bg-blue-900/50 border border-blue-500/30 rounded text-xs text-blue-200"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                >
                  {item.name}
                </motion.span>
              ))}
            </div>
          </div>
        )}

        {/* 預兆列表 */}
        {player.omens.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 mb-1">預兆</p>
            <div className="flex flex-wrap gap-1">
              {player.omens.map((omen, index) => (
                <motion.span
                  key={omen.id}
                  className="px-2 py-1 bg-purple-900/50 border border-purple-500/30 rounded text-xs text-purple-200"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                >
                  {omen.name}
                </motion.span>
              ))}
            </div>
          </div>
        )}

        {/* 空背包提示 */}
        {player.items.length === 0 && player.omens.length === 0 && (
          <p className="text-sm text-gray-500 italic">背包是空的</p>
        )}
      </div>

      {/* AI 個性資訊（僅 AI 玩家） */}
      {!isHuman && player.personality && (
        <div className="mt-4 pt-4 border-t border-gray-700/50">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-400">AI 個性:</span>
            <span
              className="font-medium"
              style={{ color: getPersonalityColor(player.personality) }}
            >
              {getPersonalityLabel(player.personality)}
            </span>
          </div>
        </div>
      )}
    </motion.div>
  );
}

/**
 * 屬性卡片組件
 */
interface StatCardProps {
  label: string;
  value: number;
  color: string;
  icon: string;
  isHuman: boolean;
}

function StatCard({ label, value, color, icon, isHuman }: StatCardProps) {
  return (
    <motion.div
      className={`
        bg-gray-700/50 rounded-lg p-2 flex items-center gap-2
        border ${isHuman ? 'border-gray-600/30' : 'border-purple-500/20'}
      `}
      whileHover={{ scale: 1.02 }}
    >
      <span className="text-lg">{icon}</span>
      <div>
        <div className="text-xs text-gray-400">{label}</div>
        <div className="font-bold text-lg" style={{ color }}>
          {value}
        </div>
      </div>
    </motion.div>
  );
}

/**
 * 取得個性標籤
 */
function getPersonalityLabel(personality: 'explorer' | 'cautious' | 'aggressive'): string {
  const labels: Record<string, string> = {
    explorer: '探索者',
    cautious: '謹慎者',
    aggressive: '激進者',
  };
  return labels[personality] || personality;
}

/**
 * 取得個性顏色
 */
function getPersonalityColor(personality: 'explorer' | 'cautious' | 'aggressive'): string {
  const colors: Record<string, string> = {
    explorer: '#3B82F6',
    cautious: '#10B981',
    aggressive: '#EF4444',
  };
  return colors[personality] || '#6B7280';
}

export default CharacterDetailPanel;
