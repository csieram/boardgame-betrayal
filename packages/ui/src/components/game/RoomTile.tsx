'use client';

import { Room } from '@betrayal/shared';

interface RoomTileProps {
  room: Room;
  rotation?: number;
  isDiscovered?: boolean;
  onClick?: () => void;
}

export function RoomTile({ room, rotation = 0, isDiscovered = true, onClick }: RoomTileProps) {
  return (
    <div 
      className="relative w-24 h-24 cursor-pointer transition-transform hover:scale-105"
      onClick={onClick}
      style={{ 
        backgroundColor: isDiscovered ? room.color + '30' : '#1a1a2e',
        border: `2px solid ${isDiscovered ? room.color : '#333'}`
      }}
    >
      <svg 
        viewBox="0 0 100 100" 
        className="w-full h-full"
        style={{ 
          transform: `rotate(${rotation}deg)`,
          opacity: isDiscovered ? 1 : 0.3
        }}
      >
        <g dangerouslySetInnerHTML={{ __html: room.icon }}/>
      </svg>
      
      {/* Room name tooltip */}
      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-gray-400 whitespace-nowrap">
        {isDiscovered ? room.name : '???'}
      </div>
    </div>
  );
}
