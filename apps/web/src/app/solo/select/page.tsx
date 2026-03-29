'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Character, CHARACTERS } from '@betrayal/shared';
import { Button } from '@betrayal/ui';
import { CharacterSelect } from '@/components/game/CharacterSelect';
import { motion } from 'framer-motion';
import {
  AIDifficulty,
  AIPersonality,
  getPersonalityIcon,
  getPersonalityColor,
  getPersonalityDescription,
} from '@betrayal/game-engine';

/**
 * AI 玩家配置
 */
interface AIPlayerSetup {
  count: number;
  difficulty: AIDifficulty;
  personalities: AIPersonality[];
}

/**
 * 單人模式 - 角色選擇頁面
 *
 * 這是單人遊戲的入口點，玩家在此選擇角色和 AI 設置後進入遊戲
 *
 * @route /solo/select
 */
export default function SoloCharacterSelectPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [aiSetup, setAiSetup] = useState<AIPlayerSetup>({
    count: 2,
    difficulty: 'medium',
    personalities: ['explorer', 'cautious'],
  });
  const [includeWidowsWalk, setIncludeWidowsWalk] = useState(false);
  const [showAISetup, setShowAISetup] = useState(false);

  /**
   * 處理角色選擇
   */
  const handleCharacterSelect = (character: Character) => {
    setSelectedCharacter(character);
    setShowAISetup(true);
  };

  /**
   * 處理開始遊戲
   */
  const handleStartGame = async () => {
    if (!selectedCharacter) return;

    setIsLoading(true);

    try {
      // 將選擇的角色和 AI 設置儲存到 sessionStorage
      const gameSetup = {
        character: selectedCharacter,
        aiSetup,
        includeWidowsWalk,
        seed: Date.now().toString(),
      };
      sessionStorage.setItem('solo-game-setup', JSON.stringify(gameSetup));
      sessionStorage.setItem('solo-selected-character', JSON.stringify(selectedCharacter));

      // 導航到遊戲頁面
      router.push('/solo');
    } catch (error) {
      console.error('Failed to start game:', error);
      setIsLoading(false);
    }
  };

  /**
   * 更新 AI 數量
   */
  const updateAICount = (count: number) => {
    const newCount = Math.max(0, Math.min(3, count));
    const newPersonalities = [...aiSetup.personalities];

    // 調整個性數組長度
    while (newPersonalities.length < newCount) {
      const personalities: AIPersonality[] = ['explorer', 'cautious', 'aggressive'];
      newPersonalities.push(personalities[Math.floor(Math.random() * personalities.length)]);
    }
    newPersonalities.splice(newCount);

    setAiSetup({
      ...aiSetup,
      count: newCount,
      personalities: newPersonalities,
    });
  };

  /**
   * 更新 AI 個性
   */
  const updateAIPersonality = (index: number, personality: AIPersonality) => {
    const newPersonalities = [...aiSetup.personalities];
    newPersonalities[index] = personality;
    setAiSetup({
      ...aiSetup,
      personalities: newPersonalities,
    });
  };

  /**
   * 隨機化所有個性
   */
  const randomizePersonalities = () => {
    const personalities: AIPersonality[] = ['explorer', 'cautious', 'aggressive'];
    const newPersonalities = aiSetup.personalities.map(() =>
      personalities[Math.floor(Math.random() * personalities.length)]
    );
    setAiSetup({
      ...aiSetup,
      personalities: newPersonalities,
    });
  };

  return (
    <main className="min-h-screen bg-gray-900 text-white py-8">
      {/* 返回按鈕 */}
      <div className="max-w-7xl mx-auto px-4 mb-6">
        <a href="/betrayal/">
          <Button variant="secondary" size="sm">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            返回大廳
          </Button>
        </a>
      </div>

      {!showAISetup ? (
        /* 角色選擇組件 */
        <CharacterSelect
          title="單人模式 - 選擇角色"
          showConfirm
          onConfirm={handleCharacterSelect}
          disabled={isLoading}
        />
      ) : (
        /* AI 設置 */
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto px-4"
        >
          <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700">
            <h2 className="text-2xl font-bold mb-6 text-center">🤖 AI 玩家設置</h2>

            {/* 已選角色顯示 */}
            {selectedCharacter && (
              <div className="bg-gray-700/50 rounded-xl p-4 mb-6">
                <p className="text-sm text-gray-400 mb-2">你選擇的角色</p>
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: selectedCharacter.color }}
                  >
                    {selectedCharacter.name[0]}
                  </div>
                  <div>
                    <p className="font-bold">{selectedCharacter.name}</p>
                    <p className="text-sm text-gray-400">{selectedCharacter.description}</p>
                  </div>
                </div>
              </div>
            )}

            {/* AI 數量選擇 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-3">
                AI 玩家數量 (0-3)
              </label>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => updateAICount(aiSetup.count - 1)}
                  className="w-10 h-10 rounded-lg bg-gray-700 hover:bg-gray-600 flex items-center justify-center text-xl"
                  disabled={aiSetup.count <= 0}
                >
                  -
                </button>
                <span className="text-2xl font-bold w-8 text-center">{aiSetup.count}</span>
                <button
                  onClick={() => updateAICount(aiSetup.count + 1)}
                  className="w-10 h-10 rounded-lg bg-gray-700 hover:bg-gray-600 flex items-center justify-center text-xl"
                  disabled={aiSetup.count >= 3}
                >
                  +
                </button>
              </div>
            </div>

            {/* 難度選擇 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-3">
                遊戲難度
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(['easy', 'medium', 'hard'] as AIDifficulty[]).map((diff) => (
                  <button
                    key={diff}
                    onClick={() => setAiSetup({ ...aiSetup, difficulty: diff })}
                    className={`py-3 px-4 rounded-lg border transition-all ${
                      aiSetup.difficulty === diff
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    <div className="font-bold">
                      {diff === 'easy' ? '簡單' : diff === 'medium' ? '中等' : '困難'}
                    </div>
                    <div className="text-xs opacity-75 mt-1">
                      {diff === 'easy' ? 'AI 會犯錯' : diff === 'medium' ? '平衡挑戰' : '專家級'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* AI 個性設置 */}
            {aiSetup.count > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-300">
                    AI 個性設置
                  </label>
                  <button
                    onClick={randomizePersonalities}
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    🎲 隨機化
                  </button>
                </div>
                <div className="space-y-3">
                  {aiSetup.personalities.map((personality, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-gray-700/50 rounded-lg p-3"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">AI 玩家 {index + 1}</span>
                        <span
                          className="text-lg"
                          style={{ color: getPersonalityColor(personality) }}
                        >
                          {getPersonalityIcon(personality)}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {(['explorer', 'cautious', 'aggressive'] as AIPersonality[]).map((p) => (
                          <button
                            key={p}
                            onClick={() => updateAIPersonality(index, p)}
                            className={`py-2 px-2 rounded text-sm transition-all ${
                              personality === p
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                            }`}
                          >
                            <span className="mr-1">{getPersonalityIcon(p)}</span>
                            {p === 'explorer' ? '探索者' : p === 'cautious' ? '謹慎者' : '激進者'}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-gray-400 mt-2">
                        {getPersonalityDescription(personality)}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Widow's Walk 擴展選項 */}
            <div className="mt-6">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeWidowsWalk}
                  onChange={(e) => setIncludeWidowsWalk(e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded"
                />
                <span className="text-lg">
                  Include Widow&apos;s Walk expansion (20 additional rooms)
                </span>
              </label>
            </div>

            {/* 按鈕 */}
            <div className="flex gap-4">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setShowAISetup(false)}
              >
                返回角色選擇
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                onClick={handleStartGame}
                disabled={isLoading}
              >
                {isLoading ? '載入中...' : '開始遊戲'}
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* 載入中遮罩 */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-gray-300">正在進入遊戲...</p>
          </div>
        </div>
      )}
    </main>
  );
}
