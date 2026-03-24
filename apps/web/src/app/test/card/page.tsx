'use client';

import { useState } from 'react';
import { CardDisplay } from '@/components/game/CardDisplay';
import { Card, CardType } from '@betrayal/shared';
import { Button } from '@betrayal/ui';

// 測試用卡牌資料
const testCards: Record<CardType, Card> = {
  event: {
    id: 'test-event',
    name: '詭異的聲音',
    type: 'event',
    description: '你聽到牆壁後傳來低語聲，似乎有人在呼喚你的名字。',
    icon: `<rect x="20" y="20" width="60" height="60" fill="#4A3A4A"/>`,
    effect: '進行知識檢定，成功則發現秘密通道',
    rollRequired: {
      stat: 'knowledge',
      target: 4,
    },
    success: '發現通往地下室的秘密通道',
    failure: '什麼也沒發現，但感到一陣寒意',
  },
  item: {
    id: 'test-item',
    name: '古老的鑰匙',
    type: 'item',
    description: '一把生鏽的鑰匙，上面刻著奇怪的符號。',
    icon: `<rect x="20" y="20" width="60" height="60" fill="#3D7AB8"/>`,
    effect: '可以打開任何上鎖的門',
  },
  omen: {
    id: 'test-omen',
    name: '破碎的鏡子',
    type: 'omen',
    description: '鏡子裡映出的不是你的臉，而是某種可怕的東西。',
    icon: `<rect x="20" y="20" width="60" height="60" fill="#8B4DA8"/>`,
    effect: '抽到此卡後立即進行作祟檢定',
  },
};

export default function TestCardDisplayPage() {
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);

  return (
    <main className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">🃏 Card Display 測試頁面</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Event Card Button */}
          <div className="bg-gray-800 rounded-xl p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-600 flex items-center justify-center">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <h2 className="text-xl font-bold mb-2">事件卡 Event</h2>
            <p className="text-gray-400 text-sm mb-4">綠色卡牌，一次性效果</p>
            <Button 
              onClick={() => setSelectedCard(testCards.event)}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
            >
              顯示事件卡
            </Button>
          </div>

          {/* Item Card Button */}
          <div className="bg-gray-800 rounded-xl p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-600 flex items-center justify-center">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold mb-2">物品卡 Item</h2>
            <p className="text-gray-400 text-sm mb-4">藍色卡牌，可裝備</p>
            <Button 
              onClick={() => setSelectedCard(testCards.item)}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              顯示物品卡
            </Button>
          </div>

          {/* Omen Card Button */}
          <div className="bg-gray-800 rounded-xl p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-600 flex items-center justify-center">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707-.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.477.859h4z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold mb-2">預兆卡 Omen</h2>
            <p className="text-gray-400 text-sm mb-4">紫色卡牌，觸發作祟</p>
            <Button 
              onClick={() => setSelectedCard(testCards.omen)}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              顯示預兆卡
            </Button>
          </div>
        </div>

        {/* 說明 */}
        <div className="bg-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-bold mb-3">📝 測試說明</h3>
          <ul className="space-y-2 text-gray-300">
            <li>• 點擊上方按鈕顯示對應類型的卡牌</li>
            <li>• 卡牌會有動畫效果（旋轉+縮放）</li>
            <li>• 點擊背景或 X 按鈕關閉卡牌</li>
            <li>• 按 ESC 鍵也可以關閉</li>
          </ul>
        </div>

        {/* 返回按鈕 */}
        <div className="text-center mt-8">
          <a href="/betrayal/">
            <Button variant="secondary">← 返回大廳</Button>
          </a>
        </div>
      </div>

      {/* 卡牌顯示組件 */}
      <CardDisplay 
        card={selectedCard}
        onClose={() => setSelectedCard(null)}
        animate
      />
    </main>
  );
}
