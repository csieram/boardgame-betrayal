'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@betrayal/shared';
import { 
  CombatResult, 
  CombatManager, 
  SeededRng,
  Player,
  GameState 
} from '@betrayal/game-engine';
import { CombatCard } from './CombatCard';
import { WeaponSelector } from './WeaponSelector';
import { Button } from '@betrayal/ui';

interface CombatModalProps {
  isOpen: boolean;
  onClose: () => void;
  attacker: Player;
  defender: Player;
  attackerWeapons: Card[];
  gameState: GameState;
  onCombatComplete: (result: CombatResult) => void;
}

/**
 * 戰鬥模態框組件
 * 
 * 顯示完整的戰鬥流程，包括武器選擇、擲骰、結果顯示
 */
export function CombatModal({
  isOpen,
  onClose,
  attacker,
  defender,
  attackerWeapons,
  gameState,
  onCombatComplete,
}: CombatModalProps) {
  const [selectedWeapon, setSelectedWeapon] = useState<Card | undefined>();
  const [combatResult, setCombatResult] = useState<CombatResult | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [attackerRoll, setAttackerRoll] = useState<number[]>([]);
  const [defenderRoll, setDefenderRoll] = useState<number[]>([]);

  // 重置狀態當模態框打開
  useEffect(() => {
    if (isOpen) {
      setSelectedWeapon(undefined);
      setCombatResult(null);
      setIsRolling(false);
      setAttackerRoll([]);
      setDefenderRoll([]);
    }
  }, [isOpen]);

  const handleStartCombat = () => {
    setIsRolling(true);
    
    // 模擬擲骰動畫
    const rollInterval = setInterval(() => {
      setAttackerRoll(Array.from({ length: 4 }, () => Math.floor(Math.random() * 3)));
      setDefenderRoll(Array.from({ length: 4 }, () => Math.floor(Math.random() * 3)));
    }, 100);

    // 2秒後停止動畫並顯示結果
    setTimeout(() => {
      clearInterval(rollInterval);
      
      // 使用真正的戰鬥引擎
      const combatManager = new CombatManager(SeededRng.fromState(gameState.rngState));
      const result = combatManager.initiateCombat(
        gameState,
        attacker.id,
        defender.id,
        selectedWeapon?.id
      );

      setCombatResult(result);
      setIsRolling(false);
      
      // 設置擲骰顯示結果
      if (result.attackerRoll) {
        setAttackerRoll(result.attackerRoll.dice || [result.attackerRoll.total || 0]);
      }
      if (result.defenderRoll) {
        setDefenderRoll(result.defenderRoll.dice || [result.defenderRoll.total || 0]);
      }
    }, 2000);
  };

  const handleConfirm = () => {
    if (combatResult) {
      onCombatComplete(combatResult);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="w-full max-w-2xl mx-4 bg-gray-900 rounded-2xl border border-gray-700 shadow-2xl overflow-hidden"
      >
        {/* 標題 */}
        <div className="bg-gradient-to-r from-red-900/50 to-blue-900/50 px-6 py-4 border-b border-gray-700">
          <h2 className="text-2xl font-bold text-center text-white">⚔️ 戰鬥</h2>
        </div>

        <div className="p-6 space-y-6">
          {/* 戰鬥雙方 */}
          <div className="grid grid-cols-2 gap-4">
            <CombatCard
              player={attacker}
              isAttacker={true}
              rollResult={attackerRoll}
              total={attackerRoll.reduce((a, b) => a + b, 0)}
              selectedWeapon={selectedWeapon}
            />
            <CombatCard
              player={defender}
              isAttacker={false}
              rollResult={defenderRoll}
              total={defenderRoll.reduce((a, b) => a + b, 0)}
            />
          </div>

          {/* 武器選擇 */}
          {!combatResult && !isRolling && (
            <WeaponSelector
              weapons={attackerWeapons}
              selectedWeapon={selectedWeapon}
              onSelect={setSelectedWeapon}
            />
          )}

          {/* 戰鬥結果 */}
          {combatResult && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-xl text-center ${
                combatResult.winnerType === 'attacker'
                  ? 'bg-green-900/30 border border-green-700'
                  : combatResult.winnerType === 'defender'
                  ? 'bg-red-900/30 border border-red-700'
                  : 'bg-yellow-900/30 border border-yellow-700'
              }`}
            >
              <h3 className="text-xl font-bold mb-2">
                {combatResult.winnerType === 'attacker'
                  ? '🏆 攻擊者勝利！'
                  : combatResult.winnerType === 'defender'
                  ? '🛡️ 防守者勝利！'
                  : '🤝 平手！'}
              </h3>
              <p className="text-gray-300">
                {combatResult.winnerType === 'attacker'
                  ? `${defender.name} 受到 ${combatResult.damage} 點物理傷害`
                  : combatResult.winnerType === 'defender'
                  ? `${attacker.name} 受到 ${combatResult.damage} 點物理傷害`
                  : combatResult.winnerType === 'tie'
                  ? '平手！雙方各受 1 點傷害'
                  : '戰鬥結束'}
              </p>
              {/* 顯示擲骰詳情 */}
              <div className="mt-3 text-sm text-gray-400">
                <p>攻擊者擲骰: {combatResult.attackerRoll?.total || 0} 
                  {combatResult.attackerRoll?.dice && ` (${combatResult.attackerRoll.dice.join(', ')})`}
                </p>
                <p>防守者擲骰: {combatResult.defenderRoll?.total || 0}
                  {combatResult.defenderRoll?.dice && ` (${combatResult.defenderRoll.dice.join(', ')})`}
                </p>
              </div>
            </motion.div>
          )}

          {/* 按鈕 */}
          <div className="flex gap-3 justify-center">
            {!combatResult && !isRolling && (
              <>
                <Button variant="secondary" onClick={onClose}>
                  取消
                </Button>
                <Button onClick={handleStartCombat} className="bg-red-600 hover:bg-red-700">
                  開始戰鬥
                </Button>
              </>
            )}
            {isRolling && (
              <Button disabled className="bg-gray-600">
                🎲 擲骰中...
              </Button>
            )}
            {combatResult && (
              <Button onClick={handleConfirm} className="bg-green-600 hover:bg-green-700">
                確認
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
