'use client';

import { Button } from '@betrayal/ui';

export default function GalleryPage() {
  return (
    <main className="min-h-screen p-6">
      <h1 className="text-4xl font-bold mb-8 text-center">素材畫廊</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
        <a href="/betrayal/gallery/rooms">
          <div className="p-8 bg-gray-800 rounded-xl hover:bg-gray-700 text-center transition-all hover:scale-105">
            <h2 className="text-2xl font-bold mb-2">🏠 房間</h2>
            <p className="text-gray-400">查看所有房間板塊</p>
          </div>
        </a>
        
        <a href="/betrayal/gallery/characters">
          <div className="p-8 bg-gray-800 rounded-xl hover:bg-gray-700 text-center transition-all hover:scale-105">
            <h2 className="text-2xl font-bold mb-2">👤 角色</h2>
            <p className="text-gray-400">查看所有角色</p>
          </div>
        </a>
        
        <a href="/betrayal/gallery/cards">
          <div className="p-8 bg-gray-800 rounded-xl hover:bg-gray-700 text-center transition-all hover:scale-105">
            <h2 className="text-2xl font-bold mb-2">🃏 卡牌</h2>
            <p className="text-gray-400">查看事件、物品、預兆卡牌</p>
          </div>
        </a>
        
        <a href="/betrayal/">
          <div className="p-8 bg-red-900 rounded-xl hover:bg-red-800 text-center transition-all hover:scale-105">
            <h2 className="text-2xl font-bold mb-2">🎮 返回遊戲</h2>
            <p className="text-gray-300">回到大廳</p>
          </div>
        </a>
      </div>
    </main>
  );
}
