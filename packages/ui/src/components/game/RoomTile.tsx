'use client';

import { Room } from '@betrayal/shared';
import { useState, useEffect } from 'react';

interface RoomTileProps {
  room: Room;
  rotation?: number;
  isDiscovered?: boolean;
  onClick?: () => void;
}

export function RoomTile({ room, rotation = 0, isDiscovered = true, onClick }: RoomTileProps) {
  const [svgContent, setSvgContent] = useState<string>(room.icon);

  useEffect(() => {
    // 如果有 gallerySvg，加载正确的 SVG 文件
    if (room.gallerySvg) {
      // 添加 /betrayal 前缀
      const svgPath = room.gallerySvg.startsWith('/betrayal') 
        ? room.gallerySvg 
        : `/betrayal${room.gallerySvg}`;
      fetch(svgPath)
        .then(res => res.text())
        .then(svg => {
          // 提取 SVG 内容（去掉 xmlns 等属性）
          const match = svg.match(/<svg[^>]*>([\s\S]*)<\/svg>/);
          if (match) {
            setSvgContent(match[1]);
          }
        })
        .catch(() => {
          // 加载失败时使用默认 icon
          setSvgContent(room.icon);
        });
    }
  }, [room.gallerySvg, room.icon]);

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
        <g dangerouslySetInnerHTML={{ __html: svgContent }}/>
      </svg>
      
      {/* Room name tooltip */}
      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-gray-400 whitespace-nowrap">
        {isDiscovered ? room.name : '???'}
      </div>
    </div>
  );
}
