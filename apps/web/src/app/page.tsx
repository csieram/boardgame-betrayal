import { Button } from '@betrayal/ui';

export default function LobbyPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="text-center max-w-2xl">
        <h1 className="text-5xl md:text-6xl font-bold text-red-700 mb-4">
          🏚️ Betrayal at House on the Hill
        </h1>
        <p className="text-xl text-gray-400 mb-2">山中小屋的背叛</p>
        <p className="text-gray-500 mb-8">选择游戏模式</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a href="/betrayal/solo">
            <Button variant="primary" size="lg" className="w-full">
              🎮 单人游戏
            </Button>
          </a>
          
          <a href="/betrayal/multi">
            <Button variant="secondary" size="lg" className="w-full">
              👥 多人游戏
            </Button>
          </a>
          
          <a href="/betrayal/gallery">
            <Button variant="primary" size="lg" className="w-full bg-purple-700 hover:bg-purple-600">
              🖼️ 素材画廊
            </Button>
          </a>
        </div>
      </div>
    </main>
  );
}
