import { Button } from '@betrayal/ui';

export default function MultiPage() {
  return (
    <main className="min-h-screen p-6">
      <h1 className="text-3xl font-bold mb-4">多人游戏</h1>
      <p className="text-gray-400 mb-8">多人游戏模式开发中...</p>
      
      <div className="text-center">
        <a href="/betrayal/">
          <Button variant="secondary">← 返回大厅</Button>
        </a>
      </div>
    </main>
  );
}
