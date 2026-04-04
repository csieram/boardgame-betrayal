'use client';

import { motion } from 'framer-motion';
import { Card } from '@betrayal/shared';
import { WEAPON_EFFECTS } from '@betrayal/game-engine';

interface WeaponSelectorProps {
  weapons: Card[];
  selectedWeapon?: Card;
  onSelect: (weapon: Card | undefined) => void;
}

export function WeaponSelector({ weapons, selectedWeapon, onSelect }: WeaponSelectorProps) {
  // 過濾出可用的武器
  const availableWeapons = weapons.filter(item => WEAPON_EFFECTS[item.id]);

  if (availableWeapons.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-gray-400">沒有可用的武器</p>
        <p className="text-sm text-gray-500 mt-1">使用基礎力量進行攻擊</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-lg font-bold text-white mb-3">選擇武器</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* 無武器選項 */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelect(undefined)}
          className={`
            p-3 rounded-lg border-2 text-left transition-colors
            ${!selectedWeapon
              ? 'border-blue-500 bg-blue-500/20'
              : 'border-gray-600 bg-gray-700/50 hover:border-gray-500'
            }
          `}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">👊</span>
            <div>
              <p className="font-medium text-white">無武器</p>
              <p className="text-xs text-gray-400">使用基礎力量</p>
            </div>
          </div>
        </motion.button>

        {/* 武器列表 */}
        {availableWeapons.map((weapon) => {
          const effect = WEAPON_EFFECTS[weapon.id];
          return (
            <motion.button
              key={weapon.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelect(weapon)}
              className={`
                p-3 rounded-lg border-2 text-left transition-colors
                ${selectedWeapon?.id === weapon.id
                  ? 'border-yellow-500 bg-yellow-500/20'
                  : 'border-gray-600 bg-gray-700/50 hover:border-gray-500'
                }
              `}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{getWeaponIcon(weapon.id)}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white truncate">{weapon.name}</p>
                  <p className="text-xs text-gray-400 truncate">{effect?.description}</p>
                  <div className="flex gap-1 mt-1">
                    {effect?.extraDice > 0 && (
                      <span className="text-xs bg-blue-900/50 text-blue-300 px-1.5 py-0.5 rounded">
                        +{effect.extraDice} 骰
                      </span>
                    )}
                    {effect?.rollBonus > 0 && (
                      <span className="text-xs bg-green-900/50 text-green-300 px-1.5 py-0.5 rounded">
                        +{effect.rollBonus} 加成
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

function getWeaponIcon(weaponId: string): string {
  const iconMap: Record<string, string> = {
    'weapon_machete': '🗡️',
    'weapon_dagger': '🔪',
    'weapon_chainsaw': '🔨',
    'weapon_crossbow': '🏹',
    'weapon_gun': '🔫',
    'weapon_knife': '🔪',
    'weapon_axe': '🪓',
    'omen_dagger': '🗡️',
    'omen_1': '🗡️',
    'omen_8': '🗡️',
    'item_pistol': '🔫',
  };
  return iconMap[weaponId] || '⚔️';
}

export default WeaponSelector;
