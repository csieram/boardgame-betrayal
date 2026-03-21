'use client';

import { Button } from '@betrayal/ui';
import { useState, useEffect } from 'react';

interface Card {
  id: string;
  name: string;
  type: 'event' | 'item' | 'omen';
  svg: string;
}

export default function CardsGalleryPage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [filter, setFilter] = useState<'all' | 'event' | 'item' | 'omen'>('all');

  useEffect(() => {
    // 加载卡牌列表
    const cardFiles = [
      // 事件卡
      { id: 'event-bloodwall', name: '血墙', type: 'event' as const },
      { id: 'event-chill', name: '寒意', type: 'event' as const },
      { id: 'event-creature', name: '生物', type: 'event' as const },
      { id: 'event-door', name: '门', type: 'event' as const },
      { id: 'event-footprints', name: '脚印', type: 'event' as const },
      { id: 'event-hallucination', name: '幻觉', type: 'event' as const },
      { id: 'event-memory', name: '记忆', type: 'event' as const },
      { id: 'event-shadow', name: '阴影', type: 'event' as const },
      { id: 'event-shaking', name: '摇晃', type: 'event' as const },
      { id: 'event-space', name: '空间', type: 'event' as const },
      { id: 'event-time', name: '时间', type: 'event' as const },
      { id: 'event-voices', name: '声音', type: 'event' as const },
      // 物品卡
      { id: 'item-camera', name: '相机', type: 'item' as const },
      { id: 'item-candle', name: '蜡烛', type: 'item' as const },
      { id: 'item-compass', name: '指南针', type: 'item' as const },
      { id: 'item-cross', name: '十字架', type: 'item' as const },
      { id: 'item-food', name: '食物', type: 'item' as const },
      { id: 'item-holywater', name: '圣水', type: 'item' as const },
      { id: 'item-key', name: '钥匙', type: 'item' as const },
      { id: 'item-matches', name: '火柴', type: 'item' as const },
      // 预兆卡
      { id: 'omen-book', name: '书', type: 'omen' as const },
      { id: 'omen-crystal', name: '水晶', type: 'omen' as const },
      { id: 'omen-dagger', name: '匕首', type: 'omen' as const },
      { id: 'omen-dog', name: '狗', type: 'omen' as const },
      { id: 'omen-ghostcandle', name: '鬼烛', type: 'omen' as const },
      { id: 'omen-portrait', name: '肖像', type: 'omen' as const },
      { id: 'omen-ring', name: '戒指', type: 'omen' as const },
      { id: 'omen-talisman', name: '护身符', type: 'omen' as const },
    ];

    setCards(cardFiles.map(c => ({
      ...c,
      svg: `/gallery/cards/${c.id}.svg`
    })));
  }, []);

  const filteredCards = filter === 'all' 
    ? cards 
    : cards.filter(c => c.type === filter);

  const typeColors = {
    event: 'bg-green-900',
    item: 'bg-blue-900',
    omen: 'bg-purple-900',
  };

  const typeNames = {
    event: '事件',
    item: '物品',
    omen: '预兆',
  };

  return (
    <main className="min-h-screen p-6">
      <h1 className="text-4xl font-bold mb-4 text-center">卡牌图鉴</h1>
      <p className="text-gray-400 text-center mb-4">共 {cards.length} 张卡牌</p>
      
      {/* 过滤器 */}
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
      
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 max-w-6xl mx-auto">
        {filteredCards.map((card) => (
          <div 
            key={card.id} 
            className={`p-4 rounded-lg ${typeColors[card.type]} flex flex-col items-center`}
          >
            <div className="w-24 h-36 mb-2 bg-gray-800 rounded flex items-center justify-center overflow-hidden">
              <img 
                src={`/betrayal${card.svg}`}
                alt={card.name}
                className="w-full h-full object-contain"
              />
            </div>
            <p className="text-sm font-bold text-center">{card.name}</p>
            <p className="text-xs text-gray-400">{typeNames[card.type]}</p>
          </div>
        ))}
      </div>
      
      <div className="text-center mt-8">
        <a href="/betrayal/gallery">
          <Button variant="secondary">← 返回画廊</Button>
        </a>
      </div>
    </main>
  );
}
