'use client';

import { Button } from '@betrayal/ui';
import { CHARACTERS } from '@betrayal/shared';

export default function CharactersGalleryPage() {
  return (
    <main className="min-h-screen p-6">
      <h1 className="text-4xl font-bold mb-4 text-center">角色图鉴</h1>
      <p className="text-gray-400 text-center mb-8">共 {CHARACTERS.length} 个角色</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {CHARACTERS.map((character) => (
          <div key={character.id} className="p-6 bg-gray-800 rounded-xl">
            <div className="flex items-center gap-4 mb-4">
              {character.portraitSvg ? (
                <img 
                  src={character.portraitSvg}
                  alt={character.name}
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : (
                <div 
                  className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold"
                  style={{ backgroundColor: character.color + '40', color: character.color }}
                >
                  {character.name[0]}
                </div>
              )}
              <div>
                <h2 className="text-xl font-bold">{character.name}</h2>
                <p className="text-gray-400">{character.nameEn}</p>
                <p className="text-sm text-gray-500">{character.age}岁</p>
              </div>
            </div>
            
            <p className="text-gray-300 text-sm mb-4">{character.description}</p>
            
            {/* 属性 */}
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="bg-gray-700 rounded p-2">
                <div className="text-xs text-gray-400">速度</div>
                <div className="font-bold">{character.stats.speed[0]}</div>
              </div>
              <div className="bg-gray-700 rounded p-2">
                <div className="text-xs text-gray-400">力量</div>
                <div className="font-bold">{character.stats.might[0]}</div>
              </div>
              <div className="bg-gray-700 rounded p-2">
                <div className="text-xs text-gray-400">理智</div>
                <div className="font-bold">{character.stats.sanity[0]}</div>
              </div>
              <div className="bg-gray-700 rounded p-2">
                <div className="text-xs text-gray-400">知识</div>
                <div className="font-bold">{character.stats.knowledge[0]}</div>
              </div>
            </div>
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
