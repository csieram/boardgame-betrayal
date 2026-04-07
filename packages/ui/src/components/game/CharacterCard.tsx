'use client';

import { Character, CharacterStat } from '@betrayal/shared';

// Issue #298: 本地輔助函數（避免循環依賴）
function getStatValue(stat: CharacterStat): number {
  return stat.values[stat.currentIndex];
}

interface CharacterCardProps {
  character: Character;
  isSelected?: boolean;
  onClick?: () => void;
}

export function CharacterCard({ character, isSelected, onClick }: CharacterCardProps) {
  return (
    <div 
      className={`p-4 rounded-xl cursor-pointer transition-all ${
        isSelected 
          ? 'bg-gray-700 ring-2 ring-white' 
          : 'bg-gray-800 hover:bg-gray-700'
      }`}
      onClick={onClick}
      style={{ borderLeft: `4px solid ${character.color}` }}
    >
      <div className="flex items-center gap-3 mb-2">
        {character.portraitSvg ? (
          <svg 
            viewBox="0 0 100 100" 
            className="w-12 h-12 rounded-full"
            dangerouslySetInnerHTML={{ __html: character.portraitSvg }}
          />
        ) : (
          <div 
            className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold"
            style={{ backgroundColor: character.color + '40', color: character.color }}
          >
            {character.name[0]}
          </div>
        )}
        <div>
          <h3 className="font-bold text-white">{character.name}</h3>
          <p className="text-xs text-gray-400">{character.age}岁</p>
        </div>
      </div>
      
      {/* Stats preview */}
      <div className="grid grid-cols-4 gap-1 text-xs">
        <div className="text-center">
          <div className="text-gray-400">速度</div>
          <div className="text-white font-bold">{getStatValue(character.stats.speed)}</div>
        </div>
        <div className="text-center">
          <div className="text-gray-400">力量</div>
          <div className="text-white font-bold">{getStatValue(character.stats.might)}</div>
        </div>
        <div className="text-center">
          <div className="text-gray-400">理智</div>
          <div className="text-white font-bold">{getStatValue(character.stats.sanity)}</div>
        </div>
        <div className="text-center">
          <div className="text-gray-400">知识</div>
          <div className="text-white font-bold">{getStatValue(character.stats.knowledge)}</div>
        </div>
      </div>
    </div>
  );
}
