'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Character, CHARACTERS, Room, Floor, Tile, Direction } from '@betrayal/shared';
import { Button } from '@betrayal/ui';
import { GameBoard } from '@/components/game/GameBoard';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RoomDiscoveryManager,
  getValidExploreDirections,
  rotateRoomForConnection,
  drawRoomForExploration,
  OPPOSITE_DOOR,
  SeededRng,
  StairManager,
  STAIR_ROOM_IDS,
} from '@betrayal/game-engine';

// 地圖大小
const MAP_SIZE = 15;
const MAP_CENTER = 7;

// 樓層名稱對照
const FLOOR_NAMES: Record<Floor, string> = {
  upper: '二樓',
  ground: '一樓',
  basement: '地下室',
};

/** 單人模式遊戲狀態 */
interface SoloGameState {
  placedRoomIds: Set<string>;
  roomDecks: {
    ground: Room[];
    upper: Room[];
    basement: Room[];
    drawn: Set<string>;
  };
  seed: string;
}

/**
 * 起始房間配置
 * Rulebook: 每個樓層都有固定的起始房間
 */
const STARTING_ROOMS = {
  ground: {
    roomId: 'entrance_hall',
    position: { x: 7, y: 7 },
    rotation: 0,
  },
  upper: {
    roomId: 'stairs_from_upper',
    position: { x: 7, y: 5 },
    rotation: 0,
  },
  basement: {
    roomId: 'stairs_from_basement',
    position: { x: 7, y: 7 },
    rotation: 0,
  },
};

/**
 * 建立空的遊戲狀態
 */
function createInitialGameState(seed: string): SoloGameState {
  return {
    placedRoomIds: new Set(['entrance_hall', 'stairs_from_upper', 'stairs_from_basement']),
    roomDecks: {
      ground: [],
      upper: [],
      basement: [],
      drawn: new Set(),
    },
    seed,
  };
}

/**
 * 建立空的地圖
 */
function createEmptyMap(): Tile[][] {
  const map: Tile[][] = [];
  for (let y = 0; y < MAP_SIZE; y++) {
    const row: Tile[] = [];
    for (let x = 0; x < MAP_SIZE; x++) {
      row.push({
        x,
        y,
        room: null,
        discovered: false,
        rotation: 0,
      });
    }
    map.push(row);
  }
  return map;
}

/**
 * 多樓層地圖狀態
 */
interface MultiFloorMap {
  ground: Tile[][];
  upper: Tile[][];
  basement: Tile[][];
}

/**
 * 創建多樓層空地圖
 */
function createEmptyMultiFloorMap(): MultiFloorMap {
  return {
    ground: createEmptyMap(),
    upper: createEmptyMap(),
    basement: createEmptyMap(),
  };
}

/**
 * 單人模式遊戲頁面
 * 
 * 這是單人遊戲的主要遊戲頁面，整合 GameBoard 組件顯示探索的房間
 * 
 * @route /solo
 */
export default function SoloGamePage() {
  const router = useRouter();
  const [phase, setPhase] = useState<'select' | 'play'>('select');
  const [player, setPlayer] = useState<Character | null>(null);
  const [turn, setTurn] = useState(1);
  const [moves, setMoves] = useState(0);
  const [position, setPosition] = useState({ x: MAP_CENTER, y: MAP_CENTER });
  const [currentFloor, setCurrentFloor] = useState<Floor>('ground');
  const [multiFloorMap, setMultiFloorMap] = useState<MultiFloorMap>(createEmptyMultiFloorMap());
  const [log, setLog] = useState<string[]>(['遊戲開始']);
  const [discovered, setDiscovered] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState<{ room: Room | null; x: number; y: number } | null>(null);
  const [reachablePositions, setReachablePositions] = useState<{ x: number; y: number; isExplored?: boolean }[]>([]);
  const [validExploreDirections, setValidExploreDirections] = useState<Direction[]>([]);
  const [gameState, setGameState] = useState<SoloGameState>(() => createInitialGameState(Date.now().toString()));

  // 當前樓層的地圖（向後兼容）
  const map = multiFloorMap[currentFloor];

  // 從 sessionStorage 讀取選擇的角色
  useEffect(() => {
    const storedCharacter = sessionStorage.getItem('solo-selected-character');
    
    if (storedCharacter) {
      try {
        const character: Character = JSON.parse(storedCharacter);
        startGame(character);
      } catch (error) {
        console.error('Failed to parse stored character:', error);
        setIsLoading(false);
      }
    } else {
      router.push('/solo/select');
    }
  }, [router]);

  // 初始化遊戲
  const startGame = (character: Character) => {
    setPlayer(character);
    setMoves(character.stats.speed[0]);
    setPhase('play');

    // 生成隨機 seed
    const seed = Date.now().toString();
    console.log('Game start seed:', seed);

    // 初始化多樓層地圖
    const initialMultiFloorMap = createEmptyMultiFloorMap();
    
    // 從 ROOMS 獲取房間資料
    import('@betrayal/shared').then(({ ROOMS }) => {
      const rng = new SeededRng(seed);
      const newGameState = createInitialGameState(seed);

      // 過濾並洗牌各樓層牌堆（排除起始房間）
      const groundRooms = ROOMS.filter(r => r.floor === 'ground' && r.id !== 'entrance_hall' && r.id !== 'stairs_from_ground');
      const upperRooms = ROOMS.filter(r => r.floor === 'upper' && r.id !== 'stairs_from_upper');
      const basementRooms = ROOMS.filter(r => r.floor === 'basement' && r.id !== 'stairs_from_basement');

      newGameState.roomDecks.ground = rng.shuffle(groundRooms);
      newGameState.roomDecks.upper = rng.shuffle(upperRooms);
      newGameState.roomDecks.basement = rng.shuffle(basementRooms);

      // 記錄前 5 個房間 ID 用於除錯
      console.log('First 5 ground room IDs:', newGameState.roomDecks.ground.slice(0, 5).map(r => r.id));
      console.log('First 5 upper room IDs:', newGameState.roomDecks.upper.slice(0, 5).map(r => r.id));
      console.log('First 5 basement room IDs:', newGameState.roomDecks.basement.slice(0, 5).map(r => r.id));

      setGameState(newGameState);

      // 放置起始房間
      // 1. 一樓：入口大廳 (7,7)
      const entranceHall = ROOMS.find(r => r.id === 'entrance_hall');
      if (entranceHall) {
        initialMultiFloorMap.ground[STARTING_ROOMS.ground.position.y][STARTING_ROOMS.ground.position.x] = {
          ...initialMultiFloorMap.ground[STARTING_ROOMS.ground.position.y][STARTING_ROOMS.ground.position.x],
          discovered: true,
          room: entranceHall,
          rotation: 0,
        };
      }

      // 2. 二樓：樓梯房間 (7,5)
      const stairsFromUpper = ROOMS.find(r => r.id === 'stairs_from_upper');
      if (stairsFromUpper) {
        initialMultiFloorMap.upper[STARTING_ROOMS.upper.position.y][STARTING_ROOMS.upper.position.x] = {
          ...initialMultiFloorMap.upper[STARTING_ROOMS.upper.position.y][STARTING_ROOMS.upper.position.x],
          discovered: true,
          room: stairsFromUpper,
          rotation: 0,
        };
      }

      // 3. 地下室：樓梯房間 (7,7)
      const stairsFromBasement = ROOMS.find(r => r.id === 'stairs_from_basement');
      if (stairsFromBasement) {
        initialMultiFloorMap.basement[STARTING_ROOMS.basement.position.y][STARTING_ROOMS.basement.position.x] = {
          ...initialMultiFloorMap.basement[STARTING_ROOMS.basement.position.y][STARTING_ROOMS.basement.position.x],
          discovered: true,
          room: stairsFromBasement,
          rotation: 0,
        };
      }

      setMultiFloorMap(initialMultiFloorMap);
      setLog([`選擇了 ${character.name}`, '從入口大廳開始', '回合 1']);
      setIsLoading(false);

      // 計算可達位置（從入口大廳開始）
      updateReachablePositions(initialMultiFloorMap.ground, { x: MAP_CENTER, y: MAP_CENTER }, character.stats.speed[0]);
    });
  };

  // 計算可達位置
  const updateReachablePositions = (currentMap: Tile[][], pos: { x: number; y: number }, remainingMoves: number) => {
    if (remainingMoves <= 0 || discovered) {
      setReachablePositions([]);
      setValidExploreDirections([]);
      return;
    }

    const reachable: { x: number; y: number; isExplored: boolean }[] = [];
    const currentTile = currentMap[pos.y][pos.x];
    const currentRoom = currentTile.room;

    if (!currentRoom) {
      setReachablePositions([]);
      setValidExploreDirections([]);
      return;
    }

    // 使用規則引擎的 getValidExploreDirections 獲取有效探索方向
    const validDirections = getValidExploreDirections(currentRoom);
    const validExploreDirs: Direction[] = [];

    const directionMap: Record<Direction, { x: number; y: number }> = {
      north: { x: 0, y: -1 },
      south: { x: 0, y: 1 },
      east: { x: 1, y: 0 },
      west: { x: -1, y: 0 },
    };

    // 檢查每個有效方向（用於探索新房間）
    for (const direction of validDirections) {
      const delta = directionMap[direction];
      const newX = pos.x + delta.x;
      const newY = pos.y + delta.y;
      
      if (newX >= 0 && newX < MAP_SIZE && newY >= 0 && newY < MAP_SIZE) {
        const tile = currentMap[newY][newX];
        
        // 只將未探索的位置標記為可探索（用於高亮顯示）
        if (!tile.discovered) {
          reachable.push({ x: newX, y: newY, isExplored: false });
          validExploreDirs.push(direction);
        }
      }
    }

    // 另外檢查所有已探索的相鄰房間（用於返回移動）
    // 檢查四個方向
    const allDirections: Direction[] = ['north', 'south', 'east', 'west'];
    for (const direction of allDirections) {
      const delta = directionMap[direction];
      const newX = pos.x + delta.x;
      const newY = pos.y + delta.y;
      
      if (newX >= 0 && newX < MAP_SIZE && newY >= 0 && newY < MAP_SIZE) {
        const tile = currentMap[newY][newX];
        
        // 如果位置已探索，檢查是否有門可以進入
        if (tile.discovered && tile.room) {
          const oppositeDirection = OPPOSITE_DOOR[direction];
          // 檢查目標房間是否有門面向當前房間
          if (tile.room.doors.includes(oppositeDirection)) {
            // 避免重複添加
            if (!reachable.some(r => r.x === newX && r.y === newY)) {
              reachable.push({ x: newX, y: newY, isExplored: true });
            }
          }
        }
      }
    }

    setReachablePositions(reachable);
    setValidExploreDirections(validExploreDirs);
  };

  // 從牌堆抽取房間（使用 drawRoomForExploration 確保棋盤不會封閉）
  const drawRoomFromDeck = (floor: Floor, entryDirection: Direction): { room: Room; rotation: number; wasModified: boolean } | null => {
    console.log('[RoomDiscovery] Drawing room for exploration, floor:', floor, 'entryDirection:', entryDirection);
    
    // 構建符合 drawRoomForExploration 需要的 gameState 格式
    const explorationGameState = {
      map: {
        ground: multiFloorMap.ground.map(row => row.map(tile => ({
          ...tile,
          floor: 'ground' as const,
        }))),
        upper: multiFloorMap.upper.map(row => row.map(tile => ({
          ...tile,
          floor: 'upper' as const,
        }))),
        basement: multiFloorMap.basement.map(row => row.map(tile => ({
          ...tile,
          floor: 'basement' as const,
        }))),
        placedRoomCount: gameState.placedRoomIds.size,
      },
      roomDeck: {
        ground: gameState.roomDecks.ground,
        upper: gameState.roomDecks.upper,
        basement: gameState.roomDecks.basement,
        drawn: gameState.roomDecks.drawn,
      },
      placedRoomIds: gameState.placedRoomIds,
      players: [{
        id: 'solo-player',
        position: {
          x: position.x,
          y: position.y,
          floor: currentFloor,
        },
      }],
      turn: {
        currentPlayerId: 'solo-player',
        movesRemaining: moves,
        hasDiscoveredRoom: discovered,
        hasEnded: false,
      },
    };
    
    // 使用 drawRoomForExploration 確保棋盤不會封閉
    const result = drawRoomForExploration(explorationGameState as any, floor, entryDirection, 10);
    
    console.log('[RoomDiscovery] Result:', result);
    
    if (!result.success || !result.room) {
      console.log('[RoomDiscovery] Failed to draw room:', result.error);
      return null;
    }
    
    // 更新 gameState 中的 drawn 標記
    if (result.attempts && result.attempts > 1) {
      console.log('[RoomDiscovery] Room drawn after', result.attempts, 'attempts');
    }
    
    if (result.wasModified) {
      console.log('[RoomDiscovery] Room was modified to prevent board closure');
    }
    
    return {
      room: result.room,
      rotation: result.rotation || 0,
      wasModified: result.wasModified || false,
    };
  };

  // 移動到指定位置
  const moveToPosition = useCallback((x: number, y: number) => {
    if (discovered || moves <= 0 || !player) return;

    // 檢查目標位置是否可達
    const isReachable = reachablePositions.some(pos => pos.x === x && pos.y === y);
    if (!isReachable) {
      console.log('[moveToPosition] Position not reachable:', x, y);
      return;
    }

    const currentMap = multiFloorMap[currentFloor];
    const tile = currentMap[y][x];
    
    // 如果目標位置未探索，發現新房間
    if (!tile.discovered) {
      // 計算進入方向
      const deltaX = x - position.x;
      const deltaY = y - position.y;
      let entryDirection: Direction = 'north';
      
      if (deltaX === 1) entryDirection = 'east';
      else if (deltaX === -1) entryDirection = 'west';
      else if (deltaY === 1) entryDirection = 'south';
      else if (deltaY === -1) entryDirection = 'north';

      // 從牌堆抽取房間（使用 drawRoomForExploration 確保棋盤不會封閉）
      const drawResult = drawRoomFromDeck(currentFloor, entryDirection);
      
      if (!drawResult) {
        setLog(prev => [...prev, '沒有更多房間可以發現！']);
        return;
      }
      
      const { room, rotation, wasModified } = drawResult;
      
      console.log('[moveToPosition] Room from drawResult:', room.name, 'doors:', room.doors, 'wasModified:', wasModified);
      console.log('[moveToPosition] Rotation:', rotation);
      
      // 應用旋轉到房間
      const rotatedRoom = {
        ...room,
        rotation: rotation as 0 | 90 | 180 | 270,
      };
      
      // 旋轉門方向（從房間座標系轉換到地圖座標系）
      const rotationMap: Record<number, Record<Direction, Direction>> = {
        0: { north: 'north', south: 'south', east: 'east', west: 'west' },
        90: { north: 'east', south: 'west', east: 'south', west: 'north' },
        180: { north: 'south', south: 'north', east: 'west', west: 'east' },
        270: { north: 'west', south: 'east', east: 'north', west: 'south' },
      };
      
      const rotatedDoors = room.doors.map((door: Direction) => rotationMap[rotation][door]);
      console.log('[moveToPosition] Rotated doors:', rotatedDoors);
      
      const placedRoom = {
        ...rotatedRoom,
        doors: rotatedDoors,
      };
      
      console.log('[moveToPosition] Final placedRoom doors:', placedRoom.doors);
      
      if (wasModified) {
        console.log('[RoomDiscovery] Room was modified to prevent board closure:', room.name);
        console.log('[RoomDiscovery] Original doors would have been:', room.doors.filter((d: Direction) => !placedRoom.doors.includes(rotationMap[rotation][d])));
      }

      // 更新多樓層地圖
      const newMultiFloorMap = { ...multiFloorMap };
      newMultiFloorMap[currentFloor] = [...currentMap];
      newMultiFloorMap[currentFloor][y] = [...currentMap[y]];
      newMultiFloorMap[currentFloor][y][x] = {
        ...currentMap[y][x],
        discovered: true,
        room: placedRoom,
        rotation: placedRoom.rotation,
      };
      
      // 更新已放置房間 ID 和已抽取集合
      setGameState(prev => {
        const newDrawn = new Set(prev.roomDecks.drawn);
        newDrawn.add(room.id);
        
        const newPlacedIds = new Set(prev.placedRoomIds);
        newPlacedIds.add(room.id);
        
        return {
          ...prev,
          placedRoomIds: newPlacedIds,
          roomDecks: {
            ...prev.roomDecks,
            drawn: newDrawn,
          },
        };
      });
      
      setMultiFloorMap(newMultiFloorMap);
      setPosition({ x, y });
      setDiscovered(true);
      setLog(prev => [...prev, `發現新房間: ${placedRoom.name}（旋轉 ${placedRoom.rotation}°）`, '回合結束']);
      setReachablePositions([]);
      
      // 延遲後開始新回合
      setTimeout(() => {
        setTurn(t => t + 1);
        setMoves(player.stats.speed[0]);
        setDiscovered(false);
        setLog(prev => [...prev, `回合 ${turn + 1}`]);
        updateReachablePositions(newMultiFloorMap[currentFloor], { x, y }, player.stats.speed[0]);
      }, 1500);
    } else {
      // 移動到已探索的房間
      setPosition({ x, y });
      setMoves(m => {
        const newMoves = m - 1;
        setLog(prev => [...prev, `移動到 (${x}, ${y})，剩餘移動: ${newMoves}`]);
        updateReachablePositions(currentMap, { x, y }, newMoves);
        return newMoves;
      });
    }
  }, [multiFloorMap, player, moves, discovered, turn, currentFloor, position, gameState, reachablePositions]);

  // 處理房間點擊
  const handleRoomClick = (room: Room | null, x: number, y: number) => {
    setSelectedRoom({ room, x, y });
    
    // 如果點擊的是可達位置，移動過去
    const isReachable = reachablePositions.some(pos => pos.x === x && pos.y === y);
    if (isReachable && !discovered) {
      moveToPosition(x, y);
    }
  };

  // 結束回合
  const endTurn = () => {
    if (!player) return;
    setTurn(t => t + 1);
    setMoves(player.stats.speed[0]);
    setDiscovered(false);
    setLog(prev => [...prev, '回合結束', `回合 ${turn + 1}`]);
    updateReachablePositions(multiFloorMap[currentFloor], position, player.stats.speed[0]);
  };

  // 方向移動
  const moveDirection = (dir: Direction) => {
    const deltas: Record<Direction, { x: number; y: number }> = {
      north: { x: 0, y: -1 },
      south: { x: 0, y: 1 },
      east: { x: 1, y: 0 },
      west: { x: -1, y: 0 },
    };
    
    const delta = deltas[dir];
    const newX = position.x + delta.x;
    const newY = position.y + delta.y;
    
    if (newX >= 0 && newX < MAP_SIZE && newY >= 0 && newY < MAP_SIZE) {
      // 檢查目標位置是否可達（包括已探索和未探索的房間）
      const isReachable = reachablePositions.some(pos => pos.x === newX && pos.y === newY);
      if (isReachable) {
        moveToPosition(newX, newY);
      }
    }
  };

  // 處理使用樓梯
  const handleUseStairs = useCallback((targetFloor: Floor) => {
    if (!player) return;

    // 構建 gameState 供 StairManager 使用
    const gameStateForStairs = {
      players: [{
        id: 'solo-player',
        position: {
          x: position.x,
          y: position.y,
          floor: currentFloor,
        },
      }],
      map: {
        ground: multiFloorMap.ground.map(row => row.map(tile => ({
          ...tile,
          floor: 'ground' as const,
        }))),
        upper: multiFloorMap.upper.map(row => row.map(tile => ({
          ...tile,
          floor: 'upper' as const,
        }))),
        basement: multiFloorMap.basement.map(row => row.map(tile => ({
          ...tile,
          floor: 'basement' as const,
        }))),
      },
      turn: {
        currentPlayerId: 'solo-player',
        movesRemaining: moves,
        hasDiscoveredRoom: discovered,
        hasEnded: false,
      },
    };

    // 使用 StairManager 計算目標位置
    const newPosition = StairManager.useStairs(gameStateForStairs as any, 'solo-player', targetFloor);
    
    if (newPosition) {
      // 切換樓層和位置
      setCurrentFloor(targetFloor);
      setPosition({ x: newPosition.x, y: newPosition.y });
      
      // 確保目標樓層的樓梯房間已探索
      const targetMap = multiFloorMap[targetFloor];
      const targetTile = targetMap[newPosition.y][newPosition.x];
      
      if (!targetTile.discovered && targetTile.room) {
        // 標記目標樓梯房間為已探索
        const newMultiFloorMap = { ...multiFloorMap };
        newMultiFloorMap[targetFloor] = [...targetMap];
        newMultiFloorMap[targetFloor][newPosition.y] = [...targetMap[newPosition.y]];
        newMultiFloorMap[targetFloor][newPosition.y][newPosition.x] = {
          ...targetTile,
          discovered: true,
        };
        setMultiFloorMap(newMultiFloorMap);
      }
      
      // 更新日誌
      setLog(prev => [...prev, `使用樓梯從 ${FLOOR_NAMES[currentFloor]} 移動到 ${FLOOR_NAMES[targetFloor]}`]);
      
      // 更新可達位置
      updateReachablePositions(multiFloorMap[targetFloor], { x: newPosition.x, y: newPosition.y }, moves);
    }
  }, [player, position, currentFloor, multiFloorMap, moves, discovered]);

  // 載入中顯示
  if (isLoading) {
    return (
      <main className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <motion.div 
            className="w-12 h-12 border-b-2 border-white rounded-full mx-auto mb-4"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
          <p className="text-gray-300">載入遊戲中...</p>
        </div>
      </main>
    );
  }

  // 角色選擇階段
  if (phase === 'select') {
    return (
      <main className="min-h-screen bg-gray-900 text-white p-6">
        <div className="text-center">
          <p className="text-gray-400 mb-4">正在導航到角色選擇...</p>
          <a href="/betrayal/solo/select">
            <Button>前往角色選擇</Button>
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-900 text-white">
      {/* 頂部導航欄 */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold">單人遊戲</h1>
            <span className="text-gray-400">|</span>
            <span className="text-blue-400 font-medium">回合 {turn}</span>
          </div>
          
          <div className="flex items-center gap-4">
            {/* 玩家資訊 */}
            {player && (
              <div className="flex items-center gap-3">
                <PlayerToken character={player} size="sm" />
                <div className="hidden sm:block">
                  <p className="text-sm font-medium">{player.name}</p>
                  <p className="text-xs text-gray-400">剩餘移動: {moves}</p>
                </div>
              </div>
            )}
            
            <a href="/betrayal/solo/select">
              <Button variant="secondary" size="sm">重新選擇</Button>
            </a>
          </div>
        </div>
      </header>

      {/* 主要內容區 */}
      <div className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左側：遊戲板 */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">遊戲地圖</h2>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-400">當前樓層:</span>
                  <span className="text-white font-medium">
                    {currentFloor === 'ground' ? '一樓' : currentFloor === 'upper' ? '二樓' : '地下室'}
                  </span>
                </div>
              </div>
              
              {/* GameBoard 組件 */}
              <div className="h-[400px] sm:h-[450px] md:h-[500px] overflow-hidden">
                <GameBoard
                  map={map}
                  currentFloor={currentFloor}
                  playerPosition={position}
                  playerCharacter={player!}
                  onRoomClick={handleRoomClick}
                  onFloorChange={setCurrentFloor}
                  onUseStairs={handleUseStairs}
                  reachablePositions={reachablePositions}
                  showAllFloors={false}
                  gameState={{
                    players: [{
                      id: 'solo-player',
                      position: {
                        x: position.x,
                        y: position.y,
                        floor: currentFloor,
                      },
                    }],
                    map: {
                      ground: multiFloorMap.ground.map(row => row.map(tile => ({
                        ...tile,
                        floor: 'ground' as const,
                      }))),
                      upper: multiFloorMap.upper.map(row => row.map(tile => ({
                        ...tile,
                        floor: 'upper' as const,
                      }))),
                      basement: multiFloorMap.basement.map(row => row.map(tile => ({
                        ...tile,
                        floor: 'basement' as const,
                      }))),
                    },
                    turn: {
                      currentPlayerId: 'solo-player',
                    },
                  }}
                />
              </div>
            </div>

            {/* 移動控制 */}
            <div className="mt-4 bg-gray-800/50 rounded-xl p-3 sm:p-4 border border-gray-700">
              <h3 className="text-sm font-bold text-gray-400 mb-3 text-center">移動控制</h3>
              <div className="flex justify-center">
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  <div />
                  <DirectionButton
                    direction="north"
                    onClick={() => moveDirection('north')}
                    disabled={discovered || moves <= 0 || !validExploreDirections.includes('north')}
                  />
                  <div />
                  <DirectionButton
                    direction="west"
                    onClick={() => moveDirection('west')}
                    disabled={discovered || moves <= 0 || !validExploreDirections.includes('west')}
                  />
                  <Button
                    onClick={endTurn}
                    variant="secondary"
                    size="sm"
                    className="h-10 sm:h-12 text-xs sm:text-sm"
                  >
                    結束回合
                  </Button>
                  <DirectionButton
                    direction="east"
                    onClick={() => moveDirection('east')}
                    disabled={discovered || moves <= 0 || !validExploreDirections.includes('east')}
                  />
                  <div />
                  <DirectionButton
                    direction="south"
                    onClick={() => moveDirection('south')}
                    disabled={discovered || moves <= 0 || !validExploreDirections.includes('south')}
                  />
                  <div />
                </div>
              </div>
              
              {discovered && (
                <motion.p 
                  className="text-yellow-500 text-center mt-3 text-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  已發現新房間，回合結束
                </motion.p>
              )}
            </div>
          </div>

          {/* 右側：玩家面板與日誌 */}
          <div className="space-y-4">
            {/* 玩家屬性面板 */}
            {player && (
              <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                <h3 className="text-lg font-bold mb-4">角色屬性</h3>
                <div className="grid grid-cols-2 gap-3">
                  <StatCard 
                    label="速度" 
                    value={player.stats.speed[0]} 
                    color="#3B82F6"
                    icon="⚡"
                  />
                  <StatCard 
                    label="力量" 
                    value={player.stats.might[0]} 
                    color="#EF4444"
                    icon="💪"
                  />
                  <StatCard 
                    label="理智" 
                    value={player.stats.sanity[0]} 
                    color="#8B5CF6"
                    icon="🧠"
                  />
                  <StatCard 
                    label="知識" 
                    value={player.stats.knowledge[0]} 
                    color="#10B981"
                    icon="📚"
                  />
                </div>
              </div>
            )}

            {/* 遊戲日誌 */}
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
              <h3 className="text-lg font-bold mb-3">遊戲日誌</h3>
              <div className="h-64 overflow-y-auto space-y-2 pr-2">
                <AnimatePresence initial={false}>
                  {log.slice(-20).map((entry, i) => (
                    <motion.p 
                      key={i}
                      className={`text-sm py-2 px-3 rounded-lg ${
                        entry.includes('發現') ? 'bg-yellow-500/20 text-yellow-400' : 
                        entry.includes('回合') ? 'bg-blue-500/20 text-blue-400' : 
                        'bg-gray-700/50 text-gray-300'
                      }`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      {entry}
                    </motion.p>
                  ))}
                </AnimatePresence>
              </div>
            </div>

            {/* 當前房間資訊 */}
            {selectedRoom && selectedRoom.room && (
              <motion.div 
                className="bg-gray-800/50 rounded-xl p-4 border border-gray-700"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <h3 className="text-lg font-bold mb-2">房間資訊</h3>
                <div className="flex items-center gap-3">
                  {selectedRoom.room?.gallerySvg && (
                    <img 
                      src={`/betrayal${selectedRoom.room.gallerySvg}`}
                      alt={selectedRoom.room.name}
                      className="w-16 h-16 rounded-lg object-cover bg-gray-700"
                    />
                  )}
                  <div>
                    {selectedRoom.room?.name && (
                      <p className="font-medium">{selectedRoom.room.name}</p>
                    )}
                    {selectedRoom.room?.description && (
                      <p className="text-sm text-gray-400">{selectedRoom.room.description}</p>
                    )}
                    {(selectedRoom.room as Room & { rotation?: number }).rotation !== undefined && (
                      <p className="text-xs text-gray-500">旋轉: {(selectedRoom.room as Room & { rotation?: number }).rotation}°</p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* 底部返回按鈕 */}
        <div className="text-center mt-8">
          <a href="/betrayal/">
            <Button variant="secondary">← 返回大廳</Button>
          </a>
        </div>
      </div>
    </main>
  );
}

/**
 * 方向按鈕組件
 */
interface DirectionButtonProps {
  direction: Direction;
  onClick: () => void;
  disabled?: boolean;
}

function DirectionButton({ direction, onClick, disabled }: DirectionButtonProps) {
  const labels: Record<Direction, string> = {
    north: '北',
    south: '南',
    east: '東',
    west: '西',
  };

  // 箭頭圖標
  const arrows: Record<Direction, string> = {
    north: '↑',
    south: '↓',
    east: '→',
    west: '←',
  };

  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      size="sm"
      className="h-10 w-10 sm:h-12 sm:w-12 flex items-center justify-center text-base sm:text-lg font-bold"
    >
      {arrows[direction]}
    </Button>
  );
}

/**
 * 玩家標記組件（簡化版）
 */
interface PlayerTokenProps {
  character: Character;
  size?: 'sm' | 'md';
}

function PlayerToken({ character, size = 'md' }: PlayerTokenProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
  };

  return (
    <div 
      className={`${sizeClasses[size]} rounded-full overflow-hidden border-2 border-white shadow-lg`}
      style={{ backgroundColor: character.color }}
    >
      {character.portraitSvg ? (
        <img
          src={`/betrayal${character.portraitSvg}`}
          alt={character.name}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-white font-bold text-xs">
          {character.name[0]}
        </div>
      )}
    </div>
  );
}

/**
 * 屬性卡片組件
 */
interface StatCardProps {
  label: string;
  value: number;
  color: string;
  icon: string;
}

function StatCard({ label, value, color, icon }: StatCardProps) {
  return (
    <div className="bg-gray-700/50 rounded-lg p-3 flex items-center gap-3">
      <span className="text-2xl">{icon}</span>
      <div>
        <div className="text-xs text-gray-400">{label}</div>
        <div className="font-bold text-lg" style={{ color }}>{value}</div>
      </div>
    </div>
  );
}
