import { Button } from '@betrayal/ui';

export default function GalleryPage() {
  return (
    <main className="min-h-screen p-6">
      <h1 className="text-4xl font-bold mb-8 text-center">素材画廊</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        <a href="/betrayal/gallery/rooms">
          <div className="p-8 bg-gray-800 rounded-xl hover:bg-gray-700 text-center transition-all hover:scale-105">
            <h2 className="text-2xl font-bold mb-2">🏠 房间</h2>
            <p className="text-gray-400">查看所有房间板块</p>
          </div>
        </a>
        
        <a href="/betrayal/gallery/characters">
          <div className="p-8 bg-gray-800 rounded-xl hover:bg-gray-700 text-center transition-all hover:scale-105">
            <h2 className="text-2xl font-bold mb-2">👤 角色</h2>
            <p className="text-gray-400">查看所有角色</p>
          </div>
        </a>
        
        <a href="/betrayal/gallery/items">
          <div className="p-8 bg-gray-800 rounded-xl hover:bg-gray-700 text-center transition-all hover:scale-105">
            <h2 className="text-2xl font-bold mb-2">📦 物品</h2>
            <p className="text-gray-400">查看所有物品卡牌</p>
          </div>
        </a>
        
        <a href="/betrayal/gallery/omens">
          <div className="p-8 bg-gray-800 rounded-xl hover:bg-gray-700 text-center transition-all hover:scale-105">
            <h2 className="text-2xl font-bold mb-2">🔮 预兆</h2>
            <p className="text-gray-400">查看所有预兆卡牌</p>
          </div>
        </a>
      </div>
      
      <div className="text-center mt-8">
        <a href="/betrayal/">
          <Button variant="secondary">← 返回大厅</Button>
        </a>
      </div>
    </main>
  );
}
