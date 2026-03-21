'use client';

import { Button } from '@betrayal/ui';
import { CHARACTERS } from '@betrayal/shared';

export default function CharactersGalleryPage() {
  return (
    <main className="min-h-screen p-6">
      <h1 className="text-4xl font-bold mb-4 text-center">角色图鉴</h1>
      <p className="text-gray-400 text-center mb-8">共 {CHARACTERS.length} 个角色</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto">
        {CHARACTERS.map((character) => (
          <div key={character.id} className="p-6 bg-gray-800 rounded-xl">
            {/* 角色名称 */}
            <div className="mb-4">
              <h2 className="text-2xl font-bold">{character.name}</h2>
              <p className="text-gray-400">{character.nameEn}</p>
              <p className="text-sm text-gray-500">{character.age}岁</p>
            </div>
            
            {/* 肖像和全身图 */}
            <div className="flex gap-4 mb-4">
              {/* 肖像 */}
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-2 text-center">肖像</p>
                {character.portraitSvg ? (
                  <img 
                    src={`/betrayal${character.portraitSvg}`}
                    alt={`${character.name} 肖像`}
                    className="w-full h-48 object-contain bg-gray-700 rounded"
                  />
                ) : (
                  <div 
                    className="w-full h-48 flex items-center justify-center rounded"
                    style={{ backgroundColor: character.color + '40' }}
                  >
                    <span style={{ color: character.color }} className="text-4xl">{character.name[0]}</span>
                  </div>
                )}
              </div>
              
              {/* 全身图 */}
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-2 text-center">全身</p>
                {character.fullSvg ? (
                  <img 
                    src={`/betrayal${character.fullSvg}`}
                    alt={`${character.name} 全身`}
                    className="w-full h-48 object-contain bg-gray-700 rounded"
                  />
                ) : character.portraitSvg ? (
                  <img 
                    src={`/betrayal${character.portraitSvg}`}
                    alt={`${character.name}`}
                    className="w-full h-48 object-contain bg-gray-700 rounded"
                  />
                ) : (
                  <div 
                    className="w-full h-48 flex items-center justify-center rounded"
                    style={{ backgroundColor: character.color + '40' }}
                  >
                    <span style={{ color: character.color }} className="text-4xl">{character.name[0]}</span>
                  </div>
                )}
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
