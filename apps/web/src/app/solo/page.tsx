'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Character, CHARACTERS, ROOMS } from '@betrayal/shared';
import { Button } from '@betrayal/ui';

/**
 * 單人模式遊戲頁面
 * 
 * 這是單人遊戲的主要遊戲頁面
 * 
 * @route /solo
 */
export default function SoloGamePage() {
  const router = useRouter();
  const [phase, setPhase] = useState<'select' | 'play'>('select');
  const [player, setPlayer] = useState<any>(null);
  const [turn, setTurn] = useState(1);
  const [moves, setMoves] = useState(0);
  const [pos, setPos] = useState({ x: 7, y: 7 });
  const [roomName, setRoomName] = useState('入口大廳');
  const [log, setLog] = useState<string[]>(['遊戲開始']);
  const [discovered, setDiscovered] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 從 sessionStorage 讀取選擇的角色
  useEffect(() => {
    const storedCharacter = sessionStorage.getItem('solo-selected-character');
    
    if (storedCharacter) {
      try {
        const character: Character = JSON.parse(storedCharacter);
        startGame(character);
      } catch (error) {
        console.error('Failed to parse stored character:', error);
        // 如果解析失敗，留在選擇階段
        setIsLoading(false);
      }
    } else {
      // 如果沒有儲存的角色，導航到選擇頁面
      router.push('/betrayal/solo/select');
    }
  }, [router]);

  const startGame = (character: Character) => {
    setPlayer(character);
    setMoves(character.stats.speed[0]);
    setPhase('play');
    setLog([`選擇了 ${character.name}`, '從入口大廳開始', '回合 1']);
    setIsLoading(false);
  };

  const move = (dir: string) => {
    if (discovered || moves <= 0 || !player) return;
    
    const delta: Record<string, { x: number; y: number }> = { 
      north: { x: 0, y: -1 }, 
      south: { x: 0, y: 1 }, 
      east: { x: 1, y: 0 }, 
      west: { x: -1, y: 0 } 
    };
    const newPos = { x: pos.x + delta[dir].x, y: pos.y + delta[dir].y };
    
    if (Math.random() > 0.5) {
      const room = ROOMS[Math.floor(Math.random() * ROOMS.length)];
      setPos(newPos);
      setRoomName(room.name);
      setDiscovered(true);
      setLog(prev => [...prev, `發現新房間: ${room.name}`, '回合結束']);
      setTimeout(() => {
        setTurn(t => t + 1);
        setMoves(player.stats.speed[0]);
        setDiscovered(false);
        setLog(prev => [...prev, `回合 ${turn + 1}`]);
      }, 1000);
    } else {
      setPos(newPos);
      setMoves(m => m - 1);
      setLog(prev => [...prev, `移動到 (${newPos.x}, ${newPos.y})`]);
    }
  };

  const endTurn = () => {
    if (!player) return;
    setTurn(t => t + 1);
    setMoves(player.stats.speed[0]);
    setDiscovered(false);
    setLog(prev => [...prev, '回合結束', `回合 ${turn + 1}`]);
  };

  // 載入中顯示
  if (isLoading) {
    return (
      <main className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-gray-300">載入遊戲中...</p>
        </div>
      </main>
    );
  }

  // 角色選擇階段（理論上不會顯示，因為會自動導航）
  if (phase === 'select') {
    return (
      <main className="min-h-screen bg-gray-900 text-white p-6">
        <div className="text-center">
          <p className="text-gray-400 mb-4">正在導航到角色選擇...</p>
          <a href="/betrayal/solo/select">
            <Button>前往角色選擇</Button>
          </a>
        </div>
      </main>
    );
  }

  const currentRoom = ROOMS.find(r => r.name === roomName);

  return (
    <main className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">單人遊戲 - 回合 {turn}</h1>
          <a href="/betrayal/solo/select">
            <Button variant="secondary" size="sm">重新選擇角色</Button>
          </a>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 左側：玩家資訊與控制 */}
          <div className="space-y-4">
            {/* 玩家面板 */}
            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="flex items-center gap-3 mb-4">
                {player?.portraitSvg && (
                  <img 
                    src={`/betrayal${player.portraitSvg}`} 
                    className="w-14 h-14 rounded-full bg-gray-700" 
                    alt={player?.name}
                  />
                )}
                <div>
                  <p className="font-bold text-lg">{player?.name}</p>
                  <p className="text-gray-400 text-sm">剩餘移動: {moves}</p>
                </div>
              </div>
              
              {/* 屬性顯示 */}
              <div className="grid grid-cols-4 gap-2">
                <StatBox label="速度" value={player?.stats.speed[0]} color="#3B82F6" />
                <StatBox label="力量" value={player?.stats.might[0]} color="#EF4444" />
                <StatBox label="理智" value={player?.stats.sanity[0]} color="#8B5CF6" />
                <StatBox label="知識" value={player?.stats.knowledge[0]} color="#10B981" />
              </div>
            </div>

            {/* 當前房間 */}
            <div className="bg-gray-800 p-4 rounded-lg">
              <h3 className="font-bold mb-3">當前位置: {roomName}</h3>
              {currentRoom?.gallerySvg && (
                <img 
                  src={`/betrayal${currentRoom.gallerySvg}`} 
                  className="w-32 h-32 object-contain mx-auto bg-gray-700 rounded" 
                  alt={roomName}
                />
              )}
            </div>

            {/* 移動控制 */}
            <div className="bg-gray-800 p-4 rounded-lg">
              <h3 className="font-bold mb-3 text-center">移動控制</h3>
              <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
                <div />
                <Button 
                  onClick={() => move('north')} 
                  disabled={discovered || moves <= 0}
                  size="sm"
                >
                  北
                </Button>
                <div />
                <Button 
                  onClick={() => move('west')} 
                  disabled={discovered || moves <= 0}
                  size="sm"
                >
                  西
                </Button>
                <Button 
                  onClick={endTurn} 
                  variant="secondary"
                  size="sm"
                >
                  結束
                </Button>
                <Button 
                  onClick={() => move('east')} 
                  disabled={discovered || moves <= 0}
                  size="sm"
                >
                  東
                </Button>
                <div />
                <Button 
                  onClick={() => move('south')} 
                  disabled={discovered || moves <= 0}
                  size="sm"
                >
                  南
                </Button>
                <div />
              </div>
              {discovered && (
                <p className="text-yellow-500 text-center mt-3">已發現新房間，回合結束</p>
              )}
            </div>
          </div>

          {/* 右側：遊戲日誌 */}
          <div className="bg-gray-800 p-4 rounded-lg h-96 md:h-auto overflow-y-auto">
            <h3 className="font-bold mb-3">遊戲日誌</h3>
            <div className="space-y-1">
              {log.slice(-20).map((entry, i) => (
                <p 
                  key={i} 
                  className={`text-sm py-1 border-b border-gray-700 last:border-0 ${
                    entry.includes('發現') ? 'text-yellow-400' : 
                    entry.includes('回合') ? 'text-blue-400' : 
                    'text-gray-300'
                  }`}
                >
                  {entry}
                </p>
              ))}
            </div>
          </div>
        </div>

        {/* 底部返回按鈕 */}
        <div className="text-center mt-6">
          <a href="/betrayal/">
            <Button variant="secondary">← 返回大廳</Button>
          </a>
        </div>
      </div>
    </main>
  );
}

/**
 * 屬性方塊組件
 */
interface StatBoxProps {
  label: string;
  value: number;
  color: string;
}

function StatBox({ label, value, color }: StatBoxProps) {
  return (
    <div className="bg-gray-700 rounded p-2 text-center">
      <div className="text-xs text-gray-400">{label}</div>
      <div className="font-bold text-lg" style={{ color }}>{value}</div>
    </div>
  );
}
