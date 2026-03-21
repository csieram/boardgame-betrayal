import { BASEMENT_ROOMS, GROUND_ROOMS, UPPER_ROOMS } from '@betrayal/shared';
import { RoomTile } from '@betrayal/ui';
import { Button } from '@betrayal/ui';

export default function RoomsGalleryPage() {
  const totalRooms = BASEMENT_ROOMS.length + GROUND_ROOMS.length + UPPER_ROOMS.length;
  
  return (
    <main className="min-h-screen p-6">
      <h1 className="text-4xl font-bold mb-4 text-center">房间图鉴</h1>
      <p className="text-gray-400 text-center mb-8">共 {totalRooms} 个房间</p>
      
      {/* 地面层 */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-4 text-green-400">地面层 ({GROUND_ROOMS.length})</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8">
          {GROUND_ROOMS.map((room) => (
            <div key={room.id} className="flex flex-col items-center">
              <RoomTile room={room} isDiscovered={true} />
              <p className="mt-2 text-sm text-gray-300 text-center">{room.name}</p>
              <p className="text-xs text-gray-500">{room.doors.join(', ')}</p>
            </div>
          ))}
        </div>
      </section>
      
      {/* 上层 */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-4 text-blue-400">上层 ({UPPER_ROOMS.length})</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8">
          {UPPER_ROOMS.map((room) => (
            <div key={room.id} className="flex flex-col items-center">
              <RoomTile room={room} isDiscovered={true} />
              <p className="mt-2 text-sm text-gray-300 text-center">{room.name}</p>
              <p className="text-xs text-gray-500">{room.doors.join(', ')}</p>
            </div>
          ))}
        </div>
      </section>
      
      {/* 地下室 */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-4 text-red-400">地下室 ({BASEMENT_ROOMS.length})</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8">
          {BASEMENT_ROOMS.map((room) => (
            <div key={room.id} className="flex flex-col items-center">
              <RoomTile room={room} isDiscovered={true} />
              <p className="mt-2 text-sm text-gray-300 text-center">{room.name}</p>
              <p className="text-xs text-gray-500">{room.doors.join(', ')}</p>
            </div>
          ))}
        </div>
      </section>
      
      <div className="text-center">
        <a href="/betrayal/gallery">
          <Button variant="secondary">← 返回画廊</Button>
        </a>
      </div>
    </main>
  );
}
