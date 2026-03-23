'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Character } from '@betrayal/shared';
import { Button } from '@betrayal/ui';
import { CharacterSelect } from '@/components/game/CharacterSelect';

/**
 * 單人模式 - 角色選擇頁面
 * 
 * 這是單人遊戲的入口點，玩家在此選擇角色後進入遊戲
 * 
 * @route /solo/select
 */
export default function SoloCharacterSelectPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  /**
   * 處理角色確認選擇
   * 
   * 當玩家確認選擇角色時，將角色資訊傳遞給遊戲引擎並導航到遊戲頁面
   */
  const handleConfirm = async (character: Character) => {
    setIsLoading(true);
    
    try {
      // 將選擇的角色儲存到 sessionStorage（用於頁面間傳遞）
      sessionStorage.setItem('solo-selected-character', JSON.stringify(character));
      
      // 導航到遊戲頁面
      router.push('/betrayal/solo');
    } catch (error) {
      console.error('Failed to start game:', error);
      setIsLoading(false);
    }
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

      {/* 角色選擇組件 */}
      <CharacterSelect
        title="單人模式 - 選擇角色"
        showConfirm
        onConfirm={handleConfirm}
        disabled={isLoading}
      />

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
