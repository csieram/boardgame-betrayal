'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Floor, Tile } from '@betrayal/shared';
import { TokenType, MapToken, TOKEN_TYPE_NAMES, TOKEN_TYPE_DESCRIPTIONS } from '@betrayal/game-engine';

/** 樓層名稱對照 */
const FLOOR_NAMES: Record<Floor, string> = {
  upper: '二樓',
  ground: '一樓',
  basement: '地下室',
  roof: '屋頂',
};

/** 標記類型圖示 */
const TOKEN_ICONS: Record<TokenType, string> = {
  secret_passage: '🔮',
  blocked: '🚫',
  trap: '💀',
  safe: '🛡️',
};

/** 標記類型顏色 */
const TOKEN_COLORS: Record<TokenType, string> = {
  secret_passage: 'bg-purple-500',
  blocked: 'bg-red-500',
  trap: 'bg-orange-500',
  safe: 'bg-green-500',
};

interface Position3D {
  x: number;
  y: number;
  floor: Floor;
}

interface GameState {
  map: Record<Floor, Tile[][]>;
  players: Array<{
    id: string;
    position: Position3D;
  }>;
  mapTokens?: MapToken[];
}

interface TokenPlacementDialogProps {
  /** 是否開啟 */
  isOpen: boolean;
  /** 關閉回調 */
  onClose: () => void;
  /** 標記類型 */
  tokenType: TokenType;
  /** 放置回調 */
  onPlace: (position: Position3D, linkedPosition?: Position3D) => void;
  /** 遊戲狀態 */
  gameState: GameState;
  /** 當前玩家 ID */
  currentPlayerId: string;
  /** 是否需要選擇第二個位置（用於 secret_passage） */
  requireLinkedPosition?: boolean;
}

/**
 * 標記放置對話框組件
 * 
 * 用於在遊戲板上放置特殊標記（秘密通道、阻擋、陷阱、安全區域）
 * 
 * @example
 * <TokenPlacementDialog
 *   isOpen={showTokenDialog}
 *   onClose={() => setShowTokenDialog(false)}
 *   tokenType="secret_passage"
 *   onPlace={(pos, linkedPos) => handlePlaceToken(pos, linkedPos)}
 *   gameState={gameState}
 *   currentPlayerId="player-1"
 *   requireLinkedPosition={true}
 * />
 */
export function TokenPlacementDialog({
  isOpen,
  onClose,
  tokenType,
  onPlace,
  gameState,
  currentPlayerId,
  requireLinkedPosition = false,
}: TokenPlacementDialogProps) {
  const [selectedFloor, setSelectedFloor] = useState<Floor>('ground');
  const [selectedPosition, setSelectedPosition] = useState<Position3D | null>(null);
  const [linkedPosition, setLinkedPosition] = useState<Position3D | null>(null);
  const [step, setStep] = useState<1 | 2>(1);

  // 取得當前玩家位置
  const currentPlayer = gameState.players.find(p => p.id === currentPlayerId);
  const playerPosition = currentPlayer?.position;

  // 取得已探索的房間
  const exploredRooms = useMemo(() => {
    const rooms: { tile: Tile; x: number; y: number; floor: Floor }[] = [];
    const floors: Floor[] = ['ground', 'upper', 'basement', 'roof'];
    
    floors.forEach(floor => {
      const floorMap = gameState.map[floor];
      if (!floorMap) return;
      
      for (let y = 0; y < floorMap.length; y++) {
        for (let x = 0; x < floorMap[y].length; x++) {
          const tile = floorMap[y][x];
          if (tile.discovered && tile.room) {
            rooms.push({ tile, x, y, floor });
          }
        }
      }
    });
    
    return rooms;
  }, [gameState.map]);

  // 取得當前樓層的已探索房間
  const currentFloorRooms = useMemo(() => {
    return exploredRooms.filter(r => r.floor === selectedFloor);
  }, [exploredRooms, selectedFloor]);

  // 檢查位置是否已有標記
  const hasExistingToken = (x: number, y: number, floor: Floor): boolean => {
    return gameState.mapTokens?.some(
      token =>
        token.position.x === x &&
        token.position.y === y &&
        token.position.floor === floor
    ) ?? false;
  };

  // 檢查位置是否可選擇
  const isSelectable = (x: number, y: number, floor: Floor): boolean => {
    // 檢查是否已有相同類型的標記
    const hasToken = gameState.mapTokens?.some(
      token =>
        token.type === tokenType &&
        token.position.x === x &&
        token.position.y === y &&
        token.position.floor === floor
    ) ?? false;
    
    if (hasToken) return false;

    // 如果是第二步（選擇連接位置），不能選擇與第一個位置相同的位置
    if (step === 2 && selectedPosition) {
      if (selectedPosition.x === x && 
          selectedPosition.y === y && 
          selectedPosition.floor === floor) {
        return false;
      }
    }

    return true;
  };

  // 處理位置選擇
  const handlePositionSelect = (x: number, y: number, floor: Floor) => {
    if (!isSelectable(x, y, floor)) return;

    const position: Position3D = { x, y, floor };

    if (requireLinkedPosition) {
      if (step === 1) {
        setSelectedPosition(position);
        setStep(2);
      } else if (step === 2 && selectedPosition) {
        setLinkedPosition(position);
      }
    } else {
      setSelectedPosition(position);
    }
  };

  // 處理確認放置
  const handleConfirm = () => {
    if (!selectedPosition) return;
    
    if (requireLinkedPosition && !linkedPosition) return;
    
    onPlace(selectedPosition, linkedPosition || undefined);
    
    // 重置狀態
    setSelectedPosition(null);
    setLinkedPosition(null);
    setStep(1);
    onClose();
  };

  // 處理取消
  const handleCancel = () => {
    setSelectedPosition(null);
    setLinkedPosition(null);
    setStep(1);
    onClose();
  };

  // 處理返回上一步
  const handleBack = () => {
    if (step === 2) {
      setStep(1);
      setLinkedPosition(null);
    }
  };

  // 計算地圖邊界
  const mapBounds = useMemo(() => {
    if (currentFloorRooms.length === 0) {
      return { minX: 0, maxX: 14, minY: 0, maxY: 14 };
    }

    const xs = currentFloorRooms.map(r => r.x);
    const ys = currentFloorRooms.map(r => r.y);
    
    return {
      minX: Math.max(0, Math.min(...xs) - 1),
      maxX: Math.min(14, Math.max(...xs) + 1),
      minY: Math.max(0, Math.min(...ys) - 1),
      maxY: Math.min(14, Math.max(...ys) + 1),
    };
  }, [currentFloorRooms]);

  // 渲染地圖網格
  const renderMapGrid = () => {
    const rows: JSX.Element[] = [];
    
    for (let y = mapBounds.minY; y <= mapBounds.maxY; y++) {
      const cells: JSX.Element[] = [];
      
      for (let x = mapBounds.minX; x <= mapBounds.maxX; x++) {
        const room = currentFloorRooms.find(r => r.x === x && r.y === y);
        const isSelected = selectedPosition?.x === x && 
                          selectedPosition?.y === y && 
                          selectedPosition?.floor === selectedFloor;
        const isLinked = linkedPosition?.x === x && 
                        linkedPosition?.y === y && 
                        linkedPosition?.floor === selectedFloor;
        const selectable = isSelectable(x, y, selectedFloor);
        const hasToken = hasExistingToken(x, y, selectedFloor);

        cells.push(
          <div
            key={`${x}-${y}`}
            className={`
              w-10 h-10 border border-gray-600 flex items-center justify-center
              ${room ? 'bg-amber-100' : 'bg-gray-800'}
              ${isSelected ? 'ring-4 ring-blue-500' : ''}
              ${isLinked ? 'ring-4 ring-purple-500' : ''}
              ${selectable && room ? 'cursor-pointer hover:bg-amber-200' : ''}
              ${!selectable && room ? 'opacity-50' : ''}
              transition-all duration-200
            `}
            onClick={() => room && handlePositionSelect(x, y, selectedFloor)}
          >
            {room && (
              <div className="text-xs text-center">
                <div className="truncate w-full px-1">
                  {room.tile.room?.name.slice(0, 2)}
                </div>
                {hasToken && (
                  <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </div>
            )}
          </div>
        );
      }
      
      rows.push(
        <div key={y} className="flex">
          {cells}
        </div>
      );
    }
    
    return rows;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
        onClick={handleCancel}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-gray-900 rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* 標題 */}
          <div className="bg-gray-800 p-4 border-b border-gray-700">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{TOKEN_ICONS[tokenType]}</span>
              <div>
                <h2 className="text-xl font-bold text-white">
                  放置 {TOKEN_TYPE_NAMES[tokenType]}
                </h2>
                <p className="text-sm text-gray-400">
                  {TOKEN_TYPE_DESCRIPTIONS[tokenType]}
                </p>
              </div>
            </div>
          </div>

          {/* 步驟指示器 */}
          {requireLinkedPosition && (
            <div className="bg-gray-800 px-4 py-2 border-b border-gray-700">
              <div className="flex items-center gap-4">
                <div className={`flex items-center gap-2 ${step === 1 ? 'text-blue-400' : 'text-gray-500'}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold
                    ${step === 1 ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-400'}`}>
                    1
                  </div>
                  <span>選擇第一個位置</span>
                </div>
                <div className="text-gray-600">→</div>
                <div className={`flex items-center gap-2 ${step === 2 ? 'text-purple-400' : 'text-gray-500'}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold
                    ${step === 2 ? 'bg-purple-500 text-white' : 'bg-gray-700 text-gray-400'}`}>
                    2
                  </div>
                  <span>選擇連接位置</span>
                </div>
              </div>
            </div>
          )}

          {/* 樓層選擇 */}
          <div className="bg-gray-800 px-4 py-2 border-b border-gray-700">
            <div className="flex gap-2">
              {(['ground', 'upper', 'basement', 'roof'] as Floor[]).map(floor => (
                <button
                  key={floor}
                  onClick={() => setSelectedFloor(floor)}
                  className={`px-4 py-2 rounded text-sm font-medium transition-colors
                    ${selectedFloor === floor 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                >
                  {FLOOR_NAMES[floor]}
                </button>
              ))}
            </div>
          </div>

          {/* 地圖網格 */}
          <div className="p-4 overflow-auto max-h-[50vh]">
            <div className="inline-block bg-gray-800 p-2 rounded">
              {renderMapGrid()}
            </div>
          </div>

          {/* 選擇資訊 */}
          <div className="bg-gray-800 px-4 py-2 border-t border-gray-700">
            <div className="flex gap-4 text-sm">
              {selectedPosition && (
                <div className="flex items-center gap-2">
                  <span className="text-blue-400">位置 1:</span>
                  <span className="text-white">
                    ({selectedPosition.x}, {selectedPosition.y}) - {FLOOR_NAMES[selectedPosition.floor]}
                  </span>
                </div>
              )}
              {linkedPosition && (
                <div className="flex items-center gap-2">
                  <span className="text-purple-400">位置 2:</span>
                  <span className="text-white">
                    ({linkedPosition.x}, {linkedPosition.y}) - {FLOOR_NAMES[linkedPosition.floor]}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 按鈕 */}
          <div className="bg-gray-800 p-4 border-t border-gray-700 flex justify-between">
            <div>
              {step === 2 && (
                <button
                  onClick={handleBack}
                  className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
                >
                  ← 返回
                </button>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleConfirm}
                disabled={!selectedPosition || (requireLinkedPosition && !linkedPosition)}
                className={`px-4 py-2 rounded transition-colors
                  ${selectedPosition && (!requireLinkedPosition || linkedPosition)
                    ? 'bg-blue-600 text-white hover:bg-blue-500'
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'}`}
              >
                {requireLinkedPosition && step === 1 ? '下一步' : '確認放置'}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default TokenPlacementDialog;
