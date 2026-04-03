'use client';

import { motion } from 'framer-motion';
import { MapToken, TOKEN_TYPE_NAMES } from '@betrayal/game-engine';

/** 標記類型圖示 */
const TOKEN_ICONS: Record<string, string> = {
  secret_passage: '🔮',
  blocked: '🚫',
  trap: '💀',
  safe: '🛡️',
};

/** 標記類型顏色 */
const TOKEN_COLORS: Record<string, string> = {
  secret_passage: 'bg-purple-500',
  blocked: 'bg-red-500',
  trap: 'bg-orange-500',
  safe: 'bg-green-500',
};

interface TokenMarkerProps {
  /** 標記資料 */
  token: MapToken;
  /** 尺寸 */
  size?: 'sm' | 'md' | 'lg';
  /** 點擊回調 */
  onClick?: () => void;
}

/**
 * 地圖標記組件
 * 
 * 顯示地圖上的特殊標記（秘密通道、阻擋、陷阱、安全區域）
 * 
 * @example
 * <TokenMarker token={token} size="md" />
 */
export function TokenMarker({ token, size = 'md', onClick }: TokenMarkerProps) {
  const sizeClasses = {
    sm: 'w-5 h-5 text-xs',
    md: 'w-7 h-7 text-sm',
    lg: 'w-9 h-9 text-base',
  };

  const icon = TOKEN_ICONS[token.type] || '❓';
  const colorClass = TOKEN_COLORS[token.type] || 'bg-gray-500';
  const name = TOKEN_TYPE_NAMES[token.type] || token.type;

  return (
    <motion.div
      className={`
        ${sizeClasses[size]}
        ${colorClass}
        rounded-full flex items-center justify-center
        shadow-lg border-2 border-white/30
        cursor-pointer hover:scale-110
        transition-transform
      `}
      title={name}
      onClick={onClick}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
    >
      <span className="select-none">{icon}</span>
    </motion.div>
  );
}

export default TokenMarker;
