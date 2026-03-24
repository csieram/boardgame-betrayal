'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Character, Floor } from '@betrayal/shared';
import { AIPlayerInfo, getPersonalityIcon, getPersonalityColor } from '@betrayal/game-engine';

/** 玩家類型 */
type PlayerType = 'human' | 'ai';

/** 玩家資訊 */
export interface PlayerInfo {
  /** 玩家 ID */
  id: string;
  /** 玩家名稱 */
  name: string;
  /** 玩家類型 */
  type: PlayerType;
  /** 角色資訊 */
  character: Character;
  /** 當前位置 */
  position: {
    x: number;
    y: number;
    floor: Floor;
  };
  /** 當前屬性值 */
  stats: {
    speed: number;
    might: number;
    sanity: number;
    knowledge: number;
  };
  /** 物品列表 */
  items: { id: string; name: string; type: string }[];
  /** 預兆列表 */
  omens: { id: string; name: string; type: string }[];
  /** AI 個性（僅 AI 玩家） */
  personality?: 'explorer' | 'cautious' | 'aggressive';
  /** 是否存活 */
  isAlive: boolean;
  /** 是否為叛徒 */
  isTraitor?: boolean;
}

interface CharacterTabsProps {
  /** 所有玩家列表 */
  players: PlayerInfo[];
  /** 當前選中的玩家 ID */
  selectedPlayerId: string;
  /** 切換玩家回調 */
  onSelectPlayer: (playerId: string) => void;
  /** 當前回合玩家 ID */
  currentTurnPlayerId?: string;
  /** 是否顯示動畫 */
  animate?: boolean;
}

/**
 * 角色切換 Tabs 組件
 * 
 * 顯示所有玩家（人類 + AI）的標籤列，點擊可切換查看不同玩家的詳細資訊。
 * 切換時會自動將遊戲板置中到該角色的位置。
 * 
 * @example
 * <CharacterTabs
 *   players={[
 *     { id: 'human', name: 'You', type: 'human', character: missy, ... },
 *     { id: 'ai-1', name: 'Jenny', type: 'ai', character: jenny, personality: 'explorer', ... },
 *   ]}
 *   selectedPlayerId="human"
 *   onSelectPlayer={(id) => setSelectedPlayerId(id)}
 * />
 */
export function CharacterTabs({
  players,
  selectedPlayerId,
  onSelectPlayer,
  currentTurnPlayerId,
  animate = true,
}: CharacterTabsProps) {
  if (players.length === 0) {
    return null;
  }

  return (
    <div className="w-full">
      {/* Tabs 標籤列 */}
      <div className="flex items-center gap-1 p-1 bg-gray-800/50 rounded-xl border border-gray-700 overflow-x-auto">
        {players.map((player, index) => {
          const isSelected = selectedPlayerId === player.id;
          const isCurrentTurn = currentTurnPlayerId === player.id;
          const isHuman = player.type === 'human';

          return (
            <motion.button
              key={player.id}
              onClick={() => onSelectPlayer(player.id)}
              className={`
                relative flex items-center gap-2 px-3 py-2 rounded-lg
                transition-all duration-200 min-w-fit
                ${isSelected
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700 hover:text-white'
                }
                ${isCurrentTurn && !isSelected ? 'ring-1 ring-yellow-400/50' : ''}
                ${!player.isAlive ? 'opacity-50 grayscale' : ''}
              `}
              initial={animate ? { opacity: 0, y: -10 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {/* 玩家頭像 */}
              <div
                className={`
                  w-8 h-8 rounded-full overflow-hidden border-2
                  ${isSelected ? 'border-white' : 'border-gray-500'}
                `}
                style={{ backgroundColor: player.character.color }}
              >
                {player.character.portraitSvg ? (
                  <img
                    src={`/betrayal${player.character.portraitSvg}`}
                    alt={player.character.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white font-bold text-xs">
                    {player.character.name[0]}
                  </div>
                )}
              </div>

              {/* 玩家名稱和標籤 */}
              <div className="flex flex-col items-start">
                <span className="text-sm font-medium whitespace-nowrap">
                  {isHuman ? '🏃 ' : '🤖 '}
                  {player.name}
                </span>
                {isCurrentTurn && (
                  <span className="text-[10px] text-yellow-300">
                    回合中
                  </span>
                )}
              </div>

              {/* AI 個性圖標 */}
              {!isHuman && player.personality && (
                <span
                  className="text-sm ml-1"
                  style={{ color: getPersonalityColor(player.personality) }}
                  title={getPersonalityLabel(player.personality)}
                >
                  {getPersonalityIcon(player.personality)}
                </span>
              )}

              {/* 叛徒標記 */}
              {player.isTraitor && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[10px]">
                  😈
                </span>
              )}

              {/* 死亡標記 */}
              {!player.isAlive && (
                <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-lg">
                  💀
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
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

export default CharacterTabs;
