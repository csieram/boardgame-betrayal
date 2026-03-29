'use client';

import { ALL_ROOMS, ROOF_ROOMS, type Room, type Floor } from '@betrayal/shared';
import { Button } from '@betrayal/ui';

// 樓層標記配置
const FLOOR_BADGES: Record<Floor, { label: string; color: string; bgColor: string }> = {
  basement: { label: 'B', color: 'text-red-400', bgColor: 'bg-red-900/50' },
  ground: { label: 'G', color: 'text-green-400', bgColor: 'bg-green-900/50' },
  upper: { label: 'U', color: 'text-blue-400', bgColor: 'bg-blue-900/50' },
  roof: { label: 'R', color: 'text-purple-400', bgColor: 'bg-purple-900/50' },
};

// 取得房間的所有樓層標記
function getFloorBadges(room: Room): Floor[] {
  const badges: Floor[] = [];
  if (room.floors) {
    // 按照 U > G > B > R 的順序顯示
    const order: Floor[] = ['upper', 'ground', 'basement', 'roof'];
    for (const floor of order) {
      if (room.floors.includes(floor)) {
        badges.push(floor);
      }
    }
  } else {
    badges.push(room.floor);
  }
  return badges;
}

// 房間卡片組件 - 使用 img 標籤顯示 SVG
function RoomGalleryCard({ room }: { room: Room }) {
  // 構建 SVG 路徑
  const svgPath = room.gallerySvg 
    ? (room.gallerySvg.startsWith('/betrayal') ? room.gallerySvg : `/betrayal${room.gallerySvg}`)
    : null;

  const floorBadges = getFloorBadges(room);

  return (
    <div className="flex flex-col items-center p-4 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors">
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
      <p className="text-xs text-gray-500 text-center">{room.nameEn}</p>
      
      {/* 樓層標記 */}
      <div className="flex gap-1 mt-2">
        {floorBadges.map((floor) => {
          const badge = FLOOR_BADGES[floor];
          return (
            <span
              key={floor}
              className={`inline-flex items-center justify-center w-6 h-6 text-xs font-bold rounded ${badge.color} ${badge.bgColor}`}
              title={floor === 'basement' ? '地下室' : floor === 'ground' ? '一樓' : floor === 'upper' ? '二樓' : '屋頂'}
            >
              {badge.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export default function RoomsGalleryPage() {
  // 使用 ALL_ROOMS 顯示所有 65 間獨特房間
  const totalRooms = ALL_ROOMS.length;
  
  return (
    <main className="min-h-screen p-6">
      <h1 className="text-4xl font-bold mb-4 text-center">房間圖鑑</h1>
      <p className="text-gray-400 text-center mb-2">共 {totalRooms} 個獨特房間</p>
      <p className="text-gray-500 text-center text-sm mb-8">
        第二版: 45 間 | 寡婦步道: 20 間
      </p>
      
      {/* 樓層標記說明 */}
      <div className="flex justify-center gap-4 mb-8 text-sm">
        <div className="flex items-center gap-1">
          <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-bold rounded text-blue-400 bg-blue-900/50">U</span>
          <span className="text-gray-400">二樓</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-bold rounded text-green-400 bg-green-900/50">G</span>
          <span className="text-gray-400">一樓</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-bold rounded text-red-400 bg-red-900/50">B</span>
          <span className="text-gray-400">地下室</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-bold rounded text-purple-400 bg-purple-900/50">R</span>
          <span className="text-gray-400">屋頂</span>
        </div>
      </div>
      
      {/* 所有房間單一網格 */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
        {ALL_ROOMS.map((room) => (
          <RoomGalleryCard key={room.id} room={room} />
        ))}
      </div>
      
      <div className="text-center mt-12">
        <a href="/betrayal/gallery">
          <Button variant="secondary">← 返回畫廊</Button>
        </a>
      </div>
    </main>
  );
}
