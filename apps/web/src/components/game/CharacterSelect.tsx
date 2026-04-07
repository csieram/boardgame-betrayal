'use client';

import { useState } from 'react';
import { Character, CHARACTERS } from '@betrayal/shared';
import { Button } from '@betrayal/ui';

interface CharacterSelectProps {
  /** 當前選中的角色 ID */
  selectedId?: string;
  /** 選擇角色時的回調 */
  onSelect?: (character: Character) => void;
  /** 確認選擇時的回調 */
  onConfirm?: (character: Character) => void;
  /** 是否顯示確認按鈕 */
  showConfirm?: boolean;
  /** 自定義標題 */
  title?: string;
  /** 是否禁用選擇 */
  disabled?: boolean;
}

/**
 * 角色選擇組件
 * 
 * 顯示所有 6 個角色，允許玩家選擇角色並查看詳細資訊
 * 
 * @example
 * <CharacterSelect 
 *   onSelect={(char) => console.log('Selected:', char.name)}
 *   onConfirm={(char) => startGame(char)}
 *   showConfirm
 * />
 */
export function CharacterSelect({
  selectedId,
  onSelect,
  onConfirm,
  showConfirm = false,
  title = '選擇角色',
  disabled = false,
}: CharacterSelectProps) {
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | undefined>(selectedId);
  
  const selectedCharacter = CHARACTERS.find(c => c.id === selectedCharacterId);

  const handleSelect = (character: Character) => {
    if (disabled) return;
    setSelectedCharacterId(character.id);
    onSelect?.(character);
  };

  const handleConfirm = () => {
    if (selectedCharacter && onConfirm) {
      onConfirm(selectedCharacter);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4">
      {/* 標題 */}
      <h1 className="text-3xl md:text-4xl font-bold mb-2 text-center">{title}</h1>
      <p className="text-gray-400 text-center mb-8">
        選擇你的探險者 • {CHARACTERS.length} 個角色可選
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左側：角色列表 */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {CHARACTERS.map((character) => (
              <CharacterSelectCard
                key={character.id}
                character={character}
                isSelected={selectedCharacterId === character.id}
                onClick={() => handleSelect(character)}
                disabled={disabled}
              />
            ))}
          </div>
        </div>

        {/* 右側：角色詳情 */}
        <div className="lg:col-span-1">
          <CharacterDetailPanel 
            character={selectedCharacter}
            showConfirm={showConfirm}
            onConfirm={handleConfirm}
            disabled={disabled || !selectedCharacter}
          />
        </div>
      </div>

      {/* 手機端固定底部確認按鈕 */}
      <MobileStickyConfirmButton
        character={selectedCharacter}
        onConfirm={handleConfirm}
        disabled={disabled || !selectedCharacter}
        show={showConfirm}
      />
    </div>
  );
}

/**
 * 角色選擇卡片
 */
interface CharacterSelectCardProps {
  character: Character;
  isSelected: boolean;
  onClick: () => void;
  disabled?: boolean;
}

function CharacterSelectCard({ 
  character, 
  isSelected, 
  onClick,
  disabled = false,
}: CharacterSelectCardProps) {
  return (
    <div
      onClick={disabled ? undefined : onClick}
      className={`
        relative p-4 rounded-xl cursor-pointer transition-all duration-200
        ${isSelected 
          ? 'bg-gray-700 ring-2 ring-white shadow-lg scale-[1.02]' 
          : 'bg-gray-800 hover:bg-gray-750 hover:shadow-md'
        }
        ${disabled ? 'opacity-60 cursor-not-allowed' : ''}
      `}
      style={{ borderLeft: `4px solid ${character.color}` }}
    >
      {/* 選中標記 */}
      {isSelected && (
        <div className="absolute top-2 right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-gray-900" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      )}

      <div className="flex items-start gap-4">
        {/* 角色肖像 */}
        <div className="flex-shrink-0">
          {character.portraitSvg ? (
            <img
              src={`/betrayal${character.portraitSvg}`}
              alt={character.name}
              className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover bg-gray-700"
            />
          ) : (
            <div
              className="w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center text-2xl font-bold"
              style={{ backgroundColor: character.color + '40', color: character.color }}
            >
              {character.name[0]}
            </div>
          )}
        </div>

        {/* 角色資訊 */}
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-lg text-white truncate">{character.name}</h3>
          <p className="text-gray-400 text-sm truncate">{character.nameEn}</p>
          <p className="text-gray-500 text-xs mt-1">{character.age} 歲</p>
          
          {/* 屬性預覽 */}
          <div className="grid grid-cols-4 gap-1 mt-3">
            <StatBadge label="速" value={character.stats.speed[0]} color="#3B82F6" />
            <StatBadge label="力" value={character.stats.might[0]} color="#EF4444" />
            <StatBadge label="理" value={character.stats.sanity[0]} color="#8B5CF6" />
            <StatBadge label="知" value={character.stats.knowledge[0]} color="#10B981" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 屬性徽章
 */
interface StatBadgeProps {
  label: string;
  value: number;
  color: string;
}

function StatBadge({ label, value, color }: StatBadgeProps) {
  return (
    <div className="text-center">
      <div className="text-[10px] text-gray-500">{label}</div>
      <div 
        className="text-sm font-bold"
        style={{ color }}
      >
        {value}
      </div>
    </div>
  );
}

/**
 * 角色詳情面板
 */
interface CharacterDetailPanelProps {
  character?: Character;
  showConfirm: boolean;
  onConfirm: () => void;
  disabled: boolean;
}

function CharacterDetailPanel({
  character,
  showConfirm,
  onConfirm,
  disabled,
}: CharacterDetailPanelProps) {
  if (!character) {
    return (
      <div className="bg-gray-800 rounded-xl p-6 h-full min-h-[400px] flex flex-col items-center justify-center text-center">
        <div className="w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center mb-4">
          <svg className="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <p className="text-gray-400">選擇一個角色查看詳情</p>
      </div>
    );
  }

  return (
    <div 
      className="bg-gray-800 rounded-xl p-6 h-full"
      style={{ borderTop: `4px solid ${character.color}` }}
    >
      {/* 角色名稱 */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white">{character.name}</h2>
        <p className="text-gray-400">{character.nameEn}</p>
        <p className="text-gray-500 text-sm mt-1">{character.age} 歲</p>
      </div>

      {/* 角色全身圖 */}
      <div className="flex justify-center mb-6">
        {character.fullSvg ? (
          <img
            src={`/betrayal${character.fullSvg}`}
            alt={character.name}
            className="w-40 h-48 object-contain bg-gray-700 rounded-lg"
          />
        ) : character.portraitSvg ? (
          <img
            src={`/betrayal${character.portraitSvg}`}
            alt={character.name}
            className="w-40 h-48 object-contain bg-gray-700 rounded-lg"
          />
        ) : (
          <div
            className="w-40 h-48 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: character.color + '40' }}
          >
            <span style={{ color: character.color }} className="text-6xl">
              {character.name[0]}
            </span>
          </div>
        )}
      </div>

      {/* 背景故事 */}
      <div className="mb-6">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">背景故事</h3>
        <p className="text-gray-300 text-sm leading-relaxed italic">
          "{character.description}"
        </p>
      </div>

      {/* 詳細屬性 */}
      <div className="mb-6">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">屬性數值</h3>
        <div className="space-y-3">
          <StatTrack 
            label="速度 Speed" 
            value={character.stats.speed.values[character.stats.speed.startIndex]} 
            track={character.stats.speed.values}
            startIndex={character.stats.speed.startIndex}
            color="#3B82F6"
          />
          <StatTrack 
            label="力量 Might" 
            value={character.stats.might.values[character.stats.might.startIndex]} 
            track={character.stats.might.values}
            startIndex={character.stats.might.startIndex}
            color="#EF4444"
          />
          <StatTrack 
            label="理智 Sanity" 
            value={character.stats.sanity.values[character.stats.sanity.startIndex]} 
            track={character.stats.sanity.values}
            startIndex={character.stats.sanity.startIndex}
            color="#8B5CF6"
          />
          <StatTrack 
            label="知識 Knowledge" 
            value={character.stats.knowledge.values[character.stats.knowledge.startIndex]} 
            track={character.stats.knowledge.values}
            startIndex={character.stats.knowledge.startIndex}
            color="#10B981"
          />
        </div>
      </div>

      {/* 起始物品提示 */}
      <div className="mb-6">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">起始裝備</h3>
        <div className="bg-gray-700 rounded-lg p-3 text-sm text-gray-300">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 001-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4zm-6 3a1 1 0 112 0 1 1 0 01-2 0zm7-1a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
            </svg>
            <span>探索時有機會獲得物品與預兆</span>
          </div>
        </div>
      </div>

      {/* 確認按鈕 */}
      {showConfirm && (
        <Button
          onClick={onConfirm}
          disabled={disabled}
          className="w-full"
          style={{ backgroundColor: disabled ? undefined : character.color }}
        >
          確認選擇 {character.name}
        </Button>
      )}
    </div>
  );
}

/**
 * 手機端固定底部確認按鈕
 */
interface MobileStickyConfirmButtonProps {
  character?: Character;
  onConfirm: () => void;
  disabled: boolean;
  show: boolean;
}

function MobileStickyConfirmButton({
  character,
  onConfirm,
  disabled,
  show,
}: MobileStickyConfirmButtonProps) {
  if (!show || !character) return null;

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-gray-900/95 backdrop-blur-sm border-t border-gray-700 z-50">
      <Button
        onClick={onConfirm}
        disabled={disabled}
        className="w-full"
        style={{ backgroundColor: disabled ? undefined : character.color }}
      >
        確認選擇 {character.name}
      </Button>
    </div>
  );
}

/**
 * 屬性軌道顯示
 */
interface StatTrackProps {
  label: string;
  value: number;
  track: number[];
  startIndex: number;
  color: string;
}

function StatTrack({ label, value, track, startIndex, color }: StatTrackProps) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-400">{label}</span>
        <span className="font-bold" style={{ color }}>{value}</span>
      </div>
      <div className="flex gap-1">
        {track.map((val, idx) => {
          const isCurrent = idx === startIndex;
          const isSkull = idx === 0; // 骷髏在 index 0（最低值）
          return (
            <div
              key={idx}
              className={`flex-1 h-2 rounded-sm ${
                isCurrent ? 'ring-2 ring-white' : ''
              }`}
              style={{
                backgroundColor: isSkull ? '#1a1a1a' : (isCurrent ? color : `${color}60`),
              }}
              title={`值: ${val}${isSkull ? ' (💀)' : ''}${isCurrent ? ' (⭐)' : ''}`}
            />
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-gray-500 mt-1">
        {track.map((val, idx) => (
          <span 
            key={idx} 
            className="flex-1 text-center"
            style={{ 
              opacity: idx === startIndex ? 1 : 0.5,
              fontWeight: idx === startIndex ? 'bold' : 'normal'
            }}
          >
            {idx === 0 ? '💀' : (idx === startIndex ? '⭐' : val)}
          </span>
        ))}
      </div>
    </div>
  );
}

export default CharacterSelect;
