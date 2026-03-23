'use client';

import { BASEMENT_ROOMS, GROUND_ROOMS, UPPER_ROOMS } from '@betrayal/shared';
import { Button } from '@betrayal/ui';

// 房間卡片組件 - 使用 img 標籤顯示 SVG
function RoomGalleryCard({ room }: { room: any }) {
  // 構建 SVG 路徑
  const svgPath = room.gallerySvg 
    ? (room.gallerySvg.startsWith('/betrayal') ? room.gallerySvg : `/betrayal${room.gallerySvg}`)
    : null;

  return (
    <div className="flex flex-col items-center p-4 bg-gray-800 rounded-lg">
      <div className="w-32 h-32 mb-2 bg-gray-700 rounded flex items-center justify-center overflow-hidden">
        {svgPath ? (
          <img 
            src={svgPath} 
            alt={room.name}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="text-gray-500 text-xs text-center">{room.name}</div>
        )}
      </div>
      <p className="text-sm text-gray-300 text-center font-bold">{room.name}</p>
      <p className="text-xs text-gray-500">{room.nameEn}</p>
      <p className="text-xs text-gray-600 mt-1">{room.doors.join(', ')}</p>
    </div>
  );
}

export default function RoomsGalleryPage() {
  const totalRooms = BASEMENT_ROOMS.length + GROUND_ROOMS.length + UPPER_ROOMS.length;
  
  return (
    <main className="min-h-screen p-6">
      <h1 className="text-4xl font-bold mb-4 text-center">房間圖鑑</h1>
      <p className="text-gray-400 text-center mb-8">共 {totalRooms} 個房間</p>
      
      {/* 地面層 */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-4 text-green-400">地面層 ({GROUND_ROOMS.length})</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {GROUND_ROOMS.map((room) => (
            <RoomGalleryCard key={room.id} room={room} />
          ))}
        </div>
      </section>
      
      {/* 上層 */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-4 text-blue-400">上層 ({UPPER_ROOMS.length})</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {UPPER_ROOMS.map((room) => (
            <RoomGalleryCard key={room.id} room={room} />
          ))}
        </div>
      </section>
      
      {/* 地下室 */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-4 text-red-400">地下室 ({BASEMENT_ROOMS.length})</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {BASEMENT_ROOMS.map((room) => (
            <RoomGalleryCard key={room.id} room={room} />
          ))}
        </div>
      </section>
      
      <div className="text-center">
        <a href="/gallery">
          <Button variant="secondary">← 返回畫廊</Button>
        </a>
      </div>
    </main>
  );
}
