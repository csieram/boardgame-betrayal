'use client';

import { useState } from 'react';
import { CHARACTERS } from '@betrayal/shared';
import { ROOMS } from '@betrayal/shared';
import { Button } from '@betrayal/ui';

export default function SoloGamePage() {
  const [phase, setPhase] = useState<'select' | 'play'>('select');
  const [player, setPlayer] = useState<any>(null);
  const [turn, setTurn] = useState(1);
  const [moves, setMoves] = useState(0);
  const [pos, setPos] = useState({ x: 7, y: 7 });
  const [roomName, setRoomName] = useState('入口大厅');
  const [log, setLog] = useState(['游戏开始']);
  const [discovered, setDiscovered] = useState(false);

  const startGame = (char: any) => {
    setPlayer(char);
    setMoves(char.stats.speed[0]);
    setPhase('play');
    setLog([`选择了 ${char.name}`, '从入口大厅开始', '回合 1']);
  };

  const move = (dir: string) => {
    if (discovered || moves <= 0) return;
    
    const delta: any = { north: { x: 0, y: -1 }, south: { x: 0, y: 1 }, east: { x: 1, y: 0 }, west: { x: -1, y: 0 } };
    const newPos = { x: pos.x + delta[dir].x, y: pos.y + delta[dir].y };
    
    if (Math.random() > 0.5) {
      const room = ROOMS[Math.floor(Math.random() * ROOMS.length)];
      setPos(newPos);
      setRoomName(room.name);
      setDiscovered(true);
      setLog(prev => [...prev, `发现新房间: ${room.name}`, '回合结束']);
      setTimeout(() => {
        setTurn(t => t + 1);
        setMoves(player.stats.speed[0]);
        setDiscovered(false);
        setLog(prev => [...prev, `回合 ${turn + 1}`]);
      }, 1000);
    } else {
      setPos(newPos);
      setMoves(m => m - 1);
      setLog(prev => [...prev, `移动到 (${newPos.x}, ${newPos.y})`]);
    }
  };

  const endTurn = () => {
    setTurn(t => t + 1);
    setMoves(player.stats.speed[0]);
    setDiscovered(false);
    setLog(prev => [...prev, '回合结束', `回合 ${turn + 1}`]);
  };

  if (phase === 'select') {
    return (
      <main className="min-h-screen p-6">
        <h1 className="text-3xl font-bold mb-8 text-center">选择角色</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {CHARACTERS.map(c => (
            <div key={c.id} className="p-4 bg-gray-800 rounded-xl cursor-pointer hover:bg-gray-700" 
                 style={{ borderLeft: `4px solid ${c.color}` }}
                 onClick={() => startGame(c)}>
              <div className="flex items-center gap-3 mb-3">
                {c.portraitSvg ? (
                  <img src={`/betrayal${c.portraitSvg}`} alt={c.name} className="w-14 h-14 rounded-full bg-gray-700" />
                ) : (
                  <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold"
                       style={{ background: c.color + '40', color: c.color }}>{c.name[0]}</div>
                )}
                <div>
                  <h3 className="font-bold">{c.name}</h3>
                  <p className="text-gray-400 text-sm">{c.nameEn}</p>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="bg-gray-900 rounded p-1"><div className="text-gray-400">速</div><div className="font-bold">{c.stats.speed[0]}</div></div>
                <div className="bg-gray-900 rounded p-1"><div className="text-gray-400">力</div><div className="font-bold">{c.stats.might[0]}</div></div>
                <div className="bg-gray-900 rounded p-1"><div className="text-gray-400">理</div><div className="font-bold">{c.stats.sanity[0]}</div></div>
                <div className="bg-gray-900 rounded p-1"><div className="text-gray-400">知</div><div className="font-bold">{c.stats.knowledge[0]}</div></div>
              </div>
            </div>
          ))}
        </div>
        <div className="text-center mt-8">
          <a href="/betrayal/"><Button variant="secondary">← 返回</Button></a>
        </div>
      </main>
    );
  }

  const currentRoom = ROOMS.find(r => r.name === roomName);

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">单人游戏 - 回合 {turn}</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4">
            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                {player.portraitSvg && <img src={`/betrayal${player.portraitSvg}`} className="w-10 h-10 rounded-full" />}
                <div>
                  <p className="font-bold">{player.name}</p>
                  <p className="text-gray-400 text-sm">剩余移动: {moves}</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 p-4 rounded-lg">
              <h3 className="font-bold mb-2">当前: {roomName}</h3>
              {currentRoom?.gallerySvg && (
                <img src={`/betrayal${currentRoom.gallerySvg}`} className="w-32 h-32 object-contain mx-auto bg-gray-900 rounded" />
              )}
            </div>

            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
                <div />
                <Button onClick={() => move('north')} disabled={discovered || moves <= 0}>北</Button>
                <div />
                <Button onClick={() => move('west')} disabled={discovered || moves <= 0}>西</Button>
                <Button onClick={endTurn} variant="secondary">结束</Button>
                <Button onClick={() => move('east')} disabled={discovered || moves <= 0}>东</Button>
                <div />
                <Button onClick={() => move('south')} disabled={discovered || moves <= 0}>南</Button>
                <div />
              </div>
              {discovered && <p className="text-yellow-500 text-center mt-2">已发现新房间</p>}
            </div>
          </div>

          <div className="bg-gray-800 p-4 rounded-lg h-96 overflow-y-auto">
            <h3 className="font-bold mb-2">日志</h3>
            {log.slice(-15).map((l, i) => <p key={i} className="text-sm text-gray-300 border-b border-gray-700 py-1">{l}</p>)}
          </div>
        </div>

        <div className="text-center mt-6">
          <a href="/betrayal/"><Button variant="secondary">← 返回大厅</Button></a>
        </div>
      </div>
    </main>
  );
}
