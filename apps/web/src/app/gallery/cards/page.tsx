'use client';

import { Button } from '@betrayal/ui';
import { useState } from 'react';
import { OMEN_CARDS, EVENT_CARDS, ITEM_CARDS, type Card } from '@betrayal/shared';

export default function CardsGalleryPage() {
  const [filter, setFilter] = useState<'all' | 'event' | 'item' | 'omen'>('all');
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);

  // 合併所有卡牌
  const allCards: Card[] = [
    ...EVENT_CARDS.map(c => ({ ...c, type: 'event' as const })),
    ...ITEM_CARDS.map(c => ({ ...c, type: 'item' as const })),
    ...OMEN_CARDS.map(c => ({ ...c, type: 'omen' as const })),
  ];

  const filteredCards = filter === 'all' 
    ? allCards 
    : allCards.filter(c => c.type === filter);

  const typeColors = {
    event: 'bg-green-900',
    item: 'bg-blue-900',
    omen: 'bg-purple-900',
  };

  const typeNames = {
    event: '事件',
    item: '物品',
    omen: '預兆',
  };

  // 渲染 SVG 圖示
  const renderIcon = (iconSvg: string) => {
    return (
      <svg 
        viewBox="0 0 100 100" 
        className="w-full h-full"
        dangerouslySetInnerHTML={{ __html: iconSvg }}
      />
    );
  };

  return (
    <main className="min-h-screen p-6">
      <h1 className="text-4xl font-bold mb-4 text-center">卡牌圖鑑</h1>
      <p className="text-gray-400 text-center mb-4">共 {allCards.length} 張卡牌</p>
      
      {/* 過濾器 */}
      <div className="flex justify-center gap-2 mb-8">
        {(['all', 'event', 'item', 'omen'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-4 py-2 rounded-lg font-bold transition-all ${
              filter === type 
                ? 'bg-white text-gray-900' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {type === 'all' ? '全部' : typeNames[type]}
          </button>
        ))}
      </div>
      
      {/* 卡牌網格 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 max-w-7xl mx-auto">
        {filteredCards.map((card) => (
          <div 
            key={card.id} 
            onClick={() => setSelectedCard(card)}
            className={`p-4 rounded-lg ${typeColors[card.type]} cursor-pointer hover:scale-105 transition-transform flex flex-col items-center`}
          >
            <div className="w-24 h-24 mb-3 bg-gray-800/50 rounded-lg flex items-center justify-center overflow-hidden">
              {renderIcon(card.icon)}
            </div>
            <p className="text-sm font-bold text-center">{card.name}</p>
            {card.nameEn && (
              <p className="text-xs text-gray-400 text-center">{card.nameEn}</p>
            )}
            <p className="text-xs text-purple-300 mt-1">{typeNames[card.type]}</p>
          </div>
        ))}
      </div>

      {/* 卡牌詳情彈窗 */}
      {selectedCard && (
        <div 
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedCard(null)}
        >
          <div 
            className={`${typeColors[selectedCard.type]} rounded-xl p-6 max-w-md w-full`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div className="w-24 h-24 bg-gray-800/50 rounded-lg flex items-center justify-center flex-shrink-0">
                {renderIcon(selectedCard.icon)}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold">{selectedCard.name}</h2>
                {selectedCard.nameEn && (
                  <p className="text-sm text-gray-400">{selectedCard.nameEn}</p>
                )}
                <p className="text-xs text-purple-300 mt-1">{typeNames[selectedCard.type]}</p>
              </div>
            </div>
            
            <div className="mt-4 space-y-3">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">描述</p>
                <p className="text-sm mt-1">{selectedCard.description}</p>
              </div>
              
              {selectedCard.effect && (
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">效果</p>
                  <p className="text-sm mt-1 text-yellow-200">{selectedCard.effect}</p>
                </div>
              )}
              
              {selectedCard.rollRequired && (
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">檢定</p>
                  <p className="text-sm mt-1">
                    {selectedCard.rollRequired.stat === 'speed' && '速度'}
                    {selectedCard.rollRequired.stat === 'might' && '力量'}
                    {selectedCard.rollRequired.stat === 'sanity' && '理智'}
                    {selectedCard.rollRequired.stat === 'knowledge' && '知識'}
                    {' ≥ '}{selectedCard.rollRequired.target}
                  </p>
                </div>
              )}
              
              {selectedCard.success && (
                <div>
                  <p className="text-xs text-green-400 uppercase tracking-wide">成功</p>
                  <p className="text-sm mt-1">{selectedCard.success}</p>
                </div>
              )}
              
              {selectedCard.failure && (
                <div>
                  <p className="text-xs text-red-400 uppercase tracking-wide">失敗</p>
                  <p className="text-sm mt-1">{selectedCard.failure}</p>
                </div>
              )}
            </div>
            
            <button
              onClick={() => setSelectedCard(null)}
              className="mt-6 w-full py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-bold transition-colors"
            >
              關閉
            </button>
          </div>
        </div>
      )}
      
      <div className="text-center mt-8">
        <a href="/betrayal/gallery">
          <Button variant="secondary">← 返回畫廊</Button>
        </a>
      </div>
    </main>
  );
}
