import { Button } from '@betrayal/ui';

export default function SoloPage() {
  return (
    <main className="min-h-screen p-6">
      <h1 className="text-3xl font-bold mb-4">单人游戏</h1>
      <p className="text-gray-400 mb-8">选择角色开始游戏...</p>
      
      <div className="text-center">
        <a href="/betrayal/">
          <Button variant="secondary">← 返回大厅</Button>
        </a>
      </div>
    </main>
  );
}
