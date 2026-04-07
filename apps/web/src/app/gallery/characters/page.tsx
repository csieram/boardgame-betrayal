'use client';

import { useState } from 'react';
import { Button } from '@betrayal/ui';
import { CHARACTERS } from '@betrayal/shared';

// 圖片元件，處理載入失敗時顯示 fallback
function CharacterImage({
  src,
  alt,
  fallbackInitial,
  color,
}: {
  src: string;
  alt: string;
  fallbackInitial: string;
  color: string;
}) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div
        className="w-full h-48 flex items-center justify-center rounded"
        style={{ backgroundColor: color + '40' }}
      >
        <span style={{ color }} className="text-4xl font-bold">
          {fallbackInitial}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className="w-full h-48 object-contain bg-gray-700 rounded"
      onError={() => setHasError(true)}
    />
  );
}

export default function CharactersGalleryPage() {
  return (
    <main className="min-h-screen p-6">
      <h1 className="text-4xl font-bold mb-4 text-center">角色圖鑑</h1>
      <p className="text-gray-400 text-center mb-8">共 {CHARACTERS.length} 個角色</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto">
        {CHARACTERS.map((character) => (
          <div key={character.id} className="p-6 bg-gray-800 rounded-xl">
            {/* 角色名稱 */}
            <div className="mb-4">
              <h2 className="text-2xl font-bold">{character.name}</h2>
              <p className="text-gray-400">{character.nameEn}</p>
              <p className="text-sm text-gray-500">{character.age}歲</p>
            </div>

            {/* 肖像 */}
            <div className="w-full mb-4">
              <p className="text-xs text-gray-500 mb-2 text-center">肖像</p>
              {character.portraitSvg ? (
                <CharacterImage
                  src={`/betrayal${character.portraitSvg}`}
                  alt={`${character.name} 肖像`}
                  fallbackInitial={character.name[0]}
                  color={character.color}
                />
              ) : (
                <div
                  className="w-full h-48 flex items-center justify-center rounded"
                  style={{ backgroundColor: character.color + '40' }}
                >
                  <span style={{ color: character.color }} className="text-4xl font-bold">
                    {character.name[0]}
                  </span>
                </div>
              )}
            </div>

            <p className="text-gray-300 text-sm mb-4">{character.description}</p>

            {/* 屬性軌道 */}
            <div className="space-y-2">
              {/* Might */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 w-16">Might:</span>
                <div className="flex gap-1">
                  {character.stats.might.values.map((value, idx) => (
                    <span
                      key={idx}
                      className={`px-1.5 py-0.5 rounded text-xs ${
                        idx === character.stats.might.startIndex
                          ? 'bg-yellow-500 text-black font-bold'
                          : idx === 0
                            ? 'bg-red-900 text-red-200'
                            : 'bg-gray-600'
                      }`}
                    >
                      {idx === 0 ? '💀' : ''}{value}{idx === character.stats.might.startIndex ? '⭐' : ''}
                    </span>
                  ))}
                </div>
              </div>
              {/* Speed */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 w-16">Speed:</span>
                <div className="flex gap-1">
                  {character.stats.speed.values.map((value, idx) => (
                    <span
                      key={idx}
                      className={`px-1.5 py-0.5 rounded text-xs ${
                        idx === character.stats.speed.startIndex
                          ? 'bg-yellow-500 text-black font-bold'
                          : idx === 0
                            ? 'bg-red-900 text-red-200'
                            : 'bg-gray-600'
                      }`}
                    >
                      {idx === 0 ? '💀' : ''}{value}{idx === character.stats.might.startIndex ? '⭐' : ''}
                    </span>
                  ))}
                </div>
              </div>
              {/* Sanity */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 w-16">Sanity:</span>
                <div className="flex gap-1">
                  {character.stats.sanity.values.map((value, idx) => (
                    <span
                      key={idx}
                      className={`px-1.5 py-0.5 rounded text-xs ${
                        idx === character.stats.sanity.startIndex
                          ? 'bg-yellow-500 text-black font-bold'
                          : idx === 0
                            ? 'bg-red-900 text-red-200'
                            : 'bg-gray-600'
                      }`}
                    >
                      {idx === 0 ? '💀' : ''}{value}{idx === character.stats.might.startIndex ? '⭐' : ''}
                    </span>
                  ))}
                </div>
              </div>
              {/* Knowledge */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 w-16">Knowledge:</span>
                <div className="flex gap-1">
                  {character.stats.knowledge.values.map((value, idx) => (
                    <span
                      key={idx}
                      className={`px-1.5 py-0.5 rounded text-xs ${
                        idx === character.stats.knowledge.startIndex
                          ? 'bg-yellow-500 text-black font-bold'
                          : idx === 0
                            ? 'bg-red-900 text-red-200'
                            : 'bg-gray-600'
                      }`}
                    >
                      {idx === 0 ? '💀' : ''}{value}{idx === character.stats.might.startIndex ? '⭐' : ''}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="text-center mt-8">
        <a href="/betrayal/gallery">
          <Button variant="secondary">← 返回畫廊</Button>
        </a>
      </div>
    </main>
  );
}
