import { CHARACTERS } from '@betrayal/shared';
import { CharacterCard } from '@betrayal/ui';
import { Button } from '@betrayal/ui';

export default function CharactersGalleryPage() {
  return (
    <main className="min-h-screen p-6">
      <h1 className="text-4xl font-bold mb-4 text-center">角色图鉴</h1>
      <p className="text-gray-400 text-center mb-8">共 {CHARACTERS.length} 个角色</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
        {CHARACTERS.map((character) => (
          <CharacterCard 
            key={character.id} 
            character={character}
          />
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
