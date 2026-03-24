'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Character, CHARACTERS, Room, Floor, Tile, Direction, Card } from '@betrayal/shared';
import { Button } from '@betrayal/ui';
import { GameBoard } from '@/components/game/GameBoard';
import { CardDisplay } from '@/components/game/CardDisplay';
import { InventoryPanel } from '@/components/game/InventoryPanel';
import { HauntRollModal } from '@/components/game/HauntRollModal';
import { HauntRevealScreen } from '@/components/game/HauntRevealScreen';
import { EventCheckModal, EventCheckResult } from '@/components/game/EventCheckModal';
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
  CardDrawingManager,
  CardEffectApplier,
  drawAndApplyCard,
  CardDrawResult,
  PlayerState,
  makeHauntRoll,
  revealHaunt,
  HauntRollResult,
  HauntRevelationResult,
  // Combat System (Issue #103)
  CombatManager,
  CombatResult,
  calculateWeaponBonus,
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

/** 抽卡結果狀態 */
interface CardDrawState {
  showCard: boolean;
  cardResult: CardDrawResult | null;
  isHauntRoll: boolean;
  hauntRollResult: { triggered: boolean; roll: number; threshold: number } | null;
}

/** Haunt 狀態 */
interface HauntState {
  isActive: boolean;
  showRollModal: boolean;
  showRevealScreen: boolean;
  isRolling: boolean;
  rollResult: HauntRollResult | null;
  revelation: HauntRevelationResult | null;
}

/** 戰鬥狀態 (Issue #103) */
interface CombatUIState {
  showCombatModal: boolean;
  combatResult: CombatResult | null;
  isCombatAnimating: boolean;
  validTargets: string[];
  selectedTarget: string | null;
}

/**
 * 起始房間配置
 * Rulebook: 每個樓層都有固定的起始房間
 */
const STARTING_ROOMS: Record<string, Array<{ roomId: string; position: { x: number; y: number }; rotation: 0 | 90 | 180 | 270 }>> = {
  ground: [
    {
      roomId: 'entrance_hall',
      position: { x: 7, y: 7 },
      rotation: 0,
    },
    // stairs_from_ground removed - must be discovered
  ],
  upper: [
    {
      roomId: 'stairs_from_upper',
      position: { x: 7, y: 5 },
      rotation: 0,
    },
  ],
  basement: [
    {
      roomId: 'stairs_from_basement',
      position: { x: 7, y: 7 },
      rotation: 0,
    },
  ],
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
  
  // 卡牌抽牌系統
  const [cardManager] = useState(() => new CardDrawingManager(Date.now().toString()));
  const [effectApplier] = useState(() => new CardEffectApplier(Date.now().toString()));
  const [cardDrawState, setCardDrawState] = useState<CardDrawState>({
    showCard: false,
    cardResult: null,
    isHauntRoll: false,
    hauntRollResult: null,
  });
  
  // 玩家狀態（用於卡牌效果）
  const [playerState, setPlayerState] = useState<PlayerState | null>(null);

  // Haunt 狀態
  const [hauntState, setHauntState] = useState<HauntState>({
    isActive: false,
    showRollModal: false,
    showRevealScreen: false,
    isRolling: false,
    rollResult: null,
    revelation: null,
  });

  // 戰鬥系統狀態 (Issue #103)
  const [combatState, setCombatState] = useState<CombatUIState>({
    showCombatModal: false,
    combatResult: null,
    isCombatAnimating: false,
    validTargets: [],
    selectedTarget: null,
  });
  const [combatManager] = useState(() => new CombatManager(new SeededRng(Date.now().toString())));

  // 事件卡檢定狀態 (Issue #104)
  const [eventCheckState, setEventCheckState] = useState<{
    showModal: boolean;
    card: Card | null;
    isRolling: boolean;
    result: EventCheckResult | null;
  }>({
    showModal: false,
    card: null,
    isRolling: false,
    result: null,
  });

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
      const groundRooms = ROOMS.filter(r => r.floor === 'ground' && r.id !== 'entrance_hall');
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
      // 1. 一樓：入口大廳 (7,7) 和 通往地下室的樓梯 (7,9)
      STARTING_ROOMS.ground.forEach(({ roomId, position, rotation }) => {
        const room = ROOMS.find(r => r.id === roomId);
        if (room) {
          initialMultiFloorMap.ground[position.y][position.x] = {
            ...initialMultiFloorMap.ground[position.y][position.x],
            discovered: true,
            room: room,
            rotation: rotation,
          };
        }
      });

      // 2. 二樓：樓梯房間 (7,5)
      STARTING_ROOMS.upper.forEach(({ roomId, position, rotation }) => {
        const room = ROOMS.find(r => r.id === roomId);
        if (room) {
          initialMultiFloorMap.upper[position.y][position.x] = {
            ...initialMultiFloorMap.upper[position.y][position.x],
            discovered: true,
            room: room,
            rotation: rotation,
          };
        }
      });

      // 3. 地下室：樓梯房間 (7,7)
      STARTING_ROOMS.basement.forEach(({ roomId, position, rotation }) => {
        const room = ROOMS.find(r => r.id === roomId);
        if (room) {
          initialMultiFloorMap.basement[position.y][position.x] = {
            ...initialMultiFloorMap.basement[position.y][position.x],
            discovered: true,
            room: room,
            rotation: rotation,
          };
        }
      });

      setMultiFloorMap(initialMultiFloorMap);
      
      // 初始化玩家狀態（用於卡牌效果）
      const initialPlayerState: PlayerState = {
        id: 'solo-player',
        name: character.name,
        stats: {
          speed: character.stats.speed[0],
          might: character.stats.might[0],
          sanity: character.stats.sanity[0],
          knowledge: character.stats.knowledge[0],
        },
        items: [],
        omens: [],
      };
      setPlayerState(initialPlayerState);
      
      setLog([`選擇了 ${character.name}`, '從入口大廳開始', '回合 1']);
      setIsLoading(false);

      // 計算可達位置（從入口大廳開始）
      updateReachablePositions(initialMultiFloorMap.ground, { x: MAP_CENTER, y: MAP_CENTER }, character.stats.speed[0], false);
    });
  };

  // 計算可達位置
  const updateReachablePositions = (currentMap: Tile[][], pos: { x: number; y: number }, remainingMoves: number, isDiscovered: boolean) => {
    if (remainingMoves <= 0 || isDiscovered) {
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

  // 執行 Haunt Roll
  const performHauntRoll = (omenCount: number) => {
    // 顯示 Haunt Roll 模態框並開始擲骰動畫
    setHauntState(prev => ({
      ...prev,
      showRollModal: true,
      isRolling: true,
      rollResult: null,
    }));

    // 模擬擲骰延遲（2秒動畫）
    setTimeout(() => {
      const rng = new SeededRng(Date.now().toString());
      const result = makeHauntRoll(omenCount, rng);
      
      setHauntState(prev => ({
        ...prev,
        isRolling: false,
        rollResult: result,
      }));

      // 如果作祟觸發，記錄到日誌
      if (result.hauntBegins) {
        setLog(prev => [...prev, `⚠️ 作祟觸發！擲出 ${result.total} < 5`]);
      } else {
        setLog(prev => [...prev, `作祟未觸發，擲出 ${result.total} >= 5`]);
      }
    }, 2000);
  };

  // 處理 Haunt Roll 關閉（作祟未觸發）
  const handleHauntRollClose = () => {
    setHauntState(prev => ({
      ...prev,
      showRollModal: false,
      rollResult: null,
    }));
    
    // 繼續新回合
    continueToNextTurn();
  };

  // 處理進入 Haunt Reveal
  const handleProceedToReveal = () => {
    setHauntState(prev => ({
      ...prev,
      showRollModal: false,
    }));

    // 執行 Haunt Revelation
    const rng = new SeededRng(Date.now().toString());
    
    // 構建 gameState 用於 revealHaunt
    const gameStateForReveal = {
      players: [{
        id: 'solo-player',
        name: player?.name || '玩家',
        color: player?.color || '#000000',
        position: { x: position.x, y: position.y, floor: currentFloor },
        stats: {
          speed: player?.stats.speed || [0, 0, 0, 0, 0, 0, 0, 0],
          might: player?.stats.might || [0, 0, 0, 0, 0, 0, 0, 0],
          sanity: player?.stats.sanity || [0, 0, 0, 0, 0, 0, 0, 0],
          knowledge: player?.stats.knowledge || [0, 0, 0, 0, 0, 0, 0, 0],
        },
        items: playerState?.items || [],
        omens: playerState?.omens || [],
        isTraitor: false,
        isDead: false,
      }],
      haunt: {
        isActive: false,
        type: null,
        hauntNumber: null,
        traitorPlayerId: null,
        omenCount: cardManager.getDeckStatus().omenCount,
        heroObjective: null,
        traitorObjective: null,
      },
      turn: {
        currentPlayerId: 'solo-player',
        turnNumber: turn,
      },
    };

    const revelation = revealHaunt(gameStateForReveal as any, 'solo-player', rng);
    
    setHauntState(prev => ({
      ...prev,
      isActive: true,
      showRevealScreen: true,
      revelation,
    }));

    // 添加到日誌
    if (revelation.success && revelation.scenario) {
      setLog(prev => [...prev, `作祟揭示: ${revelation.scenario!.name}`]);
      if (revelation.traitorId) {
        const traitorName = player?.name || '玩家';
        setLog(prev => [...prev, `${traitorName} 成為叛徒！`]);
      }
    }
  };

  // 處理開始 Haunt 階段
  const handleStartHaunt = () => {
    setHauntState(prev => ({
      ...prev,
      showRevealScreen: false,
      isActive: true,
    }));
    
    setLog(prev => [...prev, '作祟階段開始！']);
  };

  // ==================== 戰鬥系統 (Issue #103) ====================

  // 檢查是否可以攻擊
  const canAttack = useCallback((): boolean => {
    if (!hauntState.isActive || !playerState) return false;
    
    // 構建 gameState 用於檢查
    const gameStateForCombat = {
      players: [{
        id: 'solo-player',
        name: player?.name || '玩家',
        position: { x: position.x, y: position.y, floor: currentFloor },
        currentStats: {
          speed: playerState.stats.speed,
          might: playerState.stats.might,
          sanity: playerState.stats.sanity,
          knowledge: playerState.stats.knowledge,
        },
        items: playerState.items,
        omens: playerState.omens,
        isTraitor: false,
        isDead: false,
      }],
      haunt: {
        isActive: hauntState.isActive,
      },
    };

    return combatManager.canAttack(gameStateForCombat as any, 'solo-player');
  }, [hauntState.isActive, playerState, player, position, currentFloor, combatManager]);

  // 取得有效攻擊目標
  const getValidTargets = useCallback((): string[] => {
    if (!hauntState.isActive || !playerState) return [];
    
    // 在單人模式下，這裡會返回 AI 敵人的 ID
    // 目前暫時返回空列表，等待 AI 系統整合
    return [];
  }, [hauntState.isActive, playerState]);

  // 發起戰鬥
  const initiateCombat = useCallback((targetId: string) => {
    if (!playerState || !hauntState.isActive) return;

    setCombatState(prev => ({
      ...prev,
      showCombatModal: true,
      isCombatAnimating: true,
      selectedTarget: targetId,
    }));

    // 構建 gameState
    const gameStateForCombat = {
      gameId: 'solo-game',
      version: '1.0.0',
      phase: 'haunt',
      result: 'ongoing',
      config: { playerCount: 1, enableAI: true, seed: gameState.seed, maxTurns: 100 },
      map: {
        ground: multiFloorMap.ground,
        upper: multiFloorMap.upper,
        basement: multiFloorMap.basement,
        placedRoomCount: gameState.placedRoomIds.size,
      },
      players: [{
        id: 'solo-player',
        name: player?.name || '玩家',
        character: {
          id: player?.id || '',
          name: player?.name || '',
          nameEn: player?.nameEn || '',
          age: player?.age || 30,
          description: player?.description || '',
          color: player?.color || '#000',
          stats: {
            speed: player?.stats.speed || [0, 0, 0, 0, 0, 0, 0, 0],
            might: player?.stats.might || [0, 0, 0, 0, 0, 0, 0, 0],
            sanity: player?.stats.sanity || [0, 0, 0, 0, 0, 0, 0, 0],
            knowledge: player?.stats.knowledge || [0, 0, 0, 0, 0, 0, 0, 0],
          },
          statTrack: player?.statTrack || { speed: [], might: [], sanity: [], knowledge: [] },
        },
        position: { x: position.x, y: position.y, floor: currentFloor },
        currentStats: {
          speed: playerState.stats.speed,
          might: playerState.stats.might,
          sanity: playerState.stats.sanity,
          knowledge: playerState.stats.knowledge,
        },
        items: playerState.items,
        omens: playerState.omens,
        isTraitor: false,
        isDead: false,
        usedItemsThisTurn: [],
      }],
      playerOrder: ['solo-player'],
      turn: {
        currentPlayerId: 'solo-player',
        turnNumber: turn,
        movesRemaining: moves,
        hasDiscoveredRoom: discovered,
        hasDrawnCard: false,
        hasEnded: false,
        usedSpecialActions: [],
        usedItems: [],
      },
      cardDecks: {
        event: { remaining: [], drawn: [], discarded: [] },
        item: { remaining: [], drawn: [], discarded: [] },
        omen: { remaining: [], drawn: [], discarded: [] },
      },
      roomDeck: {
        ground: gameState.roomDecks.ground,
        upper: gameState.roomDecks.upper,
        basement: gameState.roomDecks.basement,
        drawn: gameState.roomDecks.drawn,
      },
      haunt: {
        isActive: hauntState.isActive,
        type: 'single_traitor',
        hauntNumber: null,
        traitorPlayerId: null,
        omenCount: cardManager.getDeckStatus().omenCount,
        heroObjective: null,
        traitorObjective: null,
      },
      combat: {
        isActive: true,
        attackerId: 'solo-player',
        defenderId: targetId,
        usedStat: null,
        attackerRoll: null,
        defenderRoll: null,
        damage: null,
      },
      log: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      rngState: { seed: gameState.seed, count: 0, internalState: [] },
      placedRoomIds: gameState.placedRoomIds,
    };

    // 模擬戰鬥動畫延遲
    setTimeout(() => {
      // 執行戰鬥
      const result = combatManager.initiateCombat(gameStateForCombat as any, 'solo-player', targetId);
      
      setCombatState(prev => ({
        ...prev,
        combatResult: result,
        isCombatAnimating: false,
      }));

      // 更新日誌
      if (result.success) {
        const attackerTotal = result.attackerRoll?.total || 0;
        const defenderTotal = result.defenderRoll?.total || 0;
        
        if (result.winner) {
          const winnerName = result.winner.id === 'solo-player' ? '你' : '敵人';
          const damage = result.damage || 0;
          setLog(prev => [
            ...prev,
            `⚔️ 戰鬥結果: ${winnerName} 獲勝！`,
            `  你的擲骰: ${attackerTotal} | 敵人擲骰: ${defenderTotal}`,
            `  造成傷害: ${damage}`,
          ]);

          // 如果玩家受傷，更新狀態
          if (result.loser?.id === 'solo-player' && result.damage) {
            const newMight = Math.max(0, playerState.stats.might - result.damage);
            setPlayerState(prev => prev ? {
              ...prev,
              stats: { ...prev.stats, might: newMight },
            } : null);
            setLog(prev => [...prev, `💔 你的力量從 ${playerState.stats.might} 降至 ${newMight}`]);
          }
        } else {
          setLog(prev => [
            ...prev,
            `⚔️ 戰鬥平手！`,
            `  你的擲骰: ${attackerTotal} | 敵人擲骰: ${defenderTotal}`,
          ]);
        }
      } else {
        setLog(prev => [...prev, `❌ 戰鬥失敗: ${result.error}`]);
      }
    }, 2000);
  }, [playerState, hauntState.isActive, gameState, player, position, currentFloor, turn, moves, discovered, combatManager, cardManager]);

  // 關閉戰鬥模態框
  const handleCloseCombat = useCallback(() => {
    setCombatState(prev => ({
      ...prev,
      showCombatModal: false,
      combatResult: null,
      selectedTarget: null,
    }));
  }, []);

  // 繼續到下一回合
  const continueToNextTurn = () => {
    setTurn(t => t + 1);
    setMoves(player!.stats.speed[0]);
    setDiscovered(false);
    setLog(prev => [...prev, `回合 ${turn + 1}`]);
    updateReachablePositions(multiFloorMap[currentFloor], position, player!.stats.speed[0], false);
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
      
      // 檢查房間符號並抽牌 (Issue #36)
      const roomSymbol = placedRoom.symbol;
      let cardDrawn = false;
      
      if (roomSymbol && playerState) {
        const symbolToCardType: Record<string, 'event' | 'item' | 'omen'> = {
          'E': 'event',
          'I': 'item',
          'O': 'omen',
        };
        
        const cardType = symbolToCardType[roomSymbol];
        if (cardType) {
          console.log(`[CardDrawing] Room has symbol ${roomSymbol}, drawing ${cardType} card`);
          
          const drawResult = drawAndApplyCard(cardManager, effectApplier, cardType, playerState);
          
          if (drawResult.success && drawResult.card) {
            cardDrawn = true;
            
            // 更新玩家狀態（物品/預兆已添加到 playerState）
            setPlayerState({ ...playerState });
            
            // 添加到日誌 - 詳細記錄卡牌抽取
            const symbolName = roomSymbol === 'E' ? '事件' : roomSymbol === 'I' ? '物品' : '預兆';
            const currentOmenCount = cardManager.getDeckStatus().omenCount;
            
            // 記錄進入房間和抽卡
            setLog(prev => [...prev, `進入 ${placedRoom.name} (${roomSymbol}) → 抽到${symbolName}: "${drawResult.card!.name}"`]);
            
            // 如果是預兆卡，觸發 Haunt Roll 動畫
            if (cardType === 'omen') {
              setLog(prev => [...prev, `預兆 ${currentOmenCount} 🌙（作祟檢定: ${currentOmenCount} 顆骰）`]);
              
              // 延遲後顯示 Haunt Roll 模態框
              setTimeout(() => {
                performHauntRoll(currentOmenCount);
              }, 500);
              
              // 先顯示卡牌
              setCardDrawState({
                showCard: true,
                cardResult: drawResult,
                isHauntRoll: false,
                hauntRollResult: null,
              });
            } else {
              // 非預兆卡直接顯示
              setCardDrawState({
                showCard: true,
                cardResult: drawResult,
                isHauntRoll: false,
                hauntRollResult: null,
              });
            }
          } else {
            setLog(prev => [...prev, `發現新房間: ${placedRoom.name}（無法抽牌：${drawResult.message}）`]);
          }
        }
      }
      
      if (!cardDrawn) {
        setLog(prev => [...prev, `發現新房間: ${placedRoom.name}（旋轉 ${placedRoom.rotation}°）`]);
      }
      
      setLog(prev => [...prev, '回合結束']);
      setReachablePositions([]);
      
      // 延遲後開始新回合（如果沒有顯示卡牌）
      if (!cardDrawn) {
        setTimeout(() => {
          setTurn(t => t + 1);
          setMoves(player.stats.speed[0]);
          setDiscovered(false);
          setLog(prev => [...prev, `回合 ${turn + 1}`]);
          updateReachablePositions(newMultiFloorMap[currentFloor], { x, y }, player.stats.speed[0], false);
        }, 1500);
      }
    } else {
      // 移動到已探索的房間
      setPosition({ x, y });
      setMoves(m => {
        const newMoves = m - 1;
        setLog(prev => [...prev, `移動到 (${x}, ${y})，剩餘移動: ${newMoves}`]);
        updateReachablePositions(currentMap, { x, y }, newMoves, discovered);
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
    updateReachablePositions(multiFloorMap[currentFloor], position, player.stats.speed[0], false);
  };

  // 樓梯連接配置 - 定義每個樓梯房間對應的目標房間
  const STAIR_CONNECTIONS: Record<string, { targetRoom: string; targetFloor: Floor }> = {
    'grand_staircase': { targetRoom: 'stairs_from_upper', targetFloor: 'upper' },
    'stairs_from_upper': { targetRoom: 'grand_staircase', targetFloor: 'ground' },
    'stairs_from_ground': { targetRoom: 'stairs_from_basement', targetFloor: 'basement' },
    'stairs_from_basement': { targetRoom: 'stairs_from_ground', targetFloor: 'ground' },
  };

  // 輔助函數：在指定地圖中查找房間位置
  const findRoomPosition = (map: Tile[][], roomId: string): { x: number; y: number } | null => {
    for (let y = 0; y < map.length; y++) {
      for (let x = 0; x < map[y].length; x++) {
        if (map[y][x].room?.id === roomId) {
          return { x, y };
        }
      }
    }
    return null;
  };

  // 處理使用樓梯
  const handleUseStairs = useCallback((targetFloor: Floor) => {
    if (!player) return;

    // 獲取當前房間 ID
    const currentTile = multiFloorMap[currentFloor][position.y][position.x];
    const currentStairRoomId = currentTile.room?.id;

    if (!currentStairRoomId || !STAIR_CONNECTIONS[currentStairRoomId]) {
      console.log('[handleUseStairs] Not in a valid stair room:', currentStairRoomId);
      return;
    }

    // 根據樓梯連接配置找到目標房間
    const connection = STAIR_CONNECTIONS[currentStairRoomId];
    const targetRoomId = connection.targetRoom;

    // 在目標樓層地圖中查找目標房間位置
    const targetPosition = findRoomPosition(multiFloorMap[targetFloor], targetRoomId);

    if (!targetPosition) {
      console.log('[handleUseStairs] Target room not found:', targetRoomId);
      return;
    }

    console.log('[handleUseStairs] Using stairs from', currentStairRoomId, 'to', targetRoomId, 'at', targetPosition);

    // 先確保目標樓層的樓梯房間已探索
    const targetMap = multiFloorMap[targetFloor];
    const targetTile = targetMap[targetPosition.y][targetPosition.x];
    let updatedMultiFloorMap = multiFloorMap;

    if (!targetTile.discovered && targetTile.room) {
      // 標記目標樓梯房間為已探索
      updatedMultiFloorMap = { ...multiFloorMap };
      updatedMultiFloorMap[targetFloor] = [...targetMap];
      updatedMultiFloorMap[targetFloor][targetPosition.y] = [...targetMap[targetPosition.y]];
      updatedMultiFloorMap[targetFloor][targetPosition.y][targetPosition.x] = {
        ...targetTile,
        discovered: true,
      };
      setMultiFloorMap(updatedMultiFloorMap);
    }

    // 立即切換樓層（Issue #84: 確保 setCurrentFloor 被立即調用）
    setCurrentFloor(targetFloor);

    // 設置角色位置到目標樓梯房間（Issue #86: 正確的目標位置）
    setPosition({ x: targetPosition.x, y: targetPosition.y });

    // Issue #89: 重置移動點數和 discovered 狀態
    const resetMoves = player.stats.speed[0];
    setMoves(resetMoves);
    setDiscovered(false);

    // 更新日誌
    setLog(prev => [...prev, `使用樓梯從 ${FLOOR_NAMES[currentFloor]} 移動到 ${FLOOR_NAMES[targetFloor]}`]);

    // 更新可達位置（Issue #85: 使用正確的地圖和位置）
    // Issue #89: 使用重置後的移動點數來計算可達位置
    // Issue #90: 直接傳入 false 避免 async state 問題
    updateReachablePositions(updatedMultiFloorMap[targetFloor], { x: targetPosition.x, y: targetPosition.y }, resetMoves, false);
  }, [player, position, currentFloor, multiFloorMap]);

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

  // 處理關閉卡牌顯示並繼續遊戲
  const handleCloseCardDisplay = () => {
    const card = cardDrawState.cardResult?.card;
    
    setCardDrawState({
      showCard: false,
      cardResult: null,
      isHauntRoll: false,
      hauntRollResult: null,
    });
    
    // 如果 Haunt Roll 模態框即將顯示，不要立即開始新回合
    // Haunt Roll 處理函數會負責繼續遊戲
    if (card?.type === 'omen') {
      // 預兆卡會觸發 Haunt Roll，不立即開始新回合
      return;
    }
    
    // Issue #104: 檢查事件卡是否需要屬性檢定
    if (card?.type === 'event' && card.rollRequired && playerState) {
      // 顯示事件卡檢定模態框
      setEventCheckState({
        showModal: true,
        card: card,
        isRolling: false,
        result: null,
      });
      return;
    }
    
    // 繼續新回合
    continueToNextTurn();
  };

  // Issue #104: 處理事件卡檢定擲骰
  const handleEventCheckRoll = () => {
    if (!eventCheckState.card || !playerState) return;
    
    setEventCheckState(prev => ({ ...prev, isRolling: true }));
    
    // 執行檢定
    const result = effectApplier.performEventCheck(eventCheckState.card, playerState);
    
    // 應用屬性變化
    if (result.statChanges) {
      setPlayerState(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          stats: {
            speed: prev.stats.speed + (result.statChanges?.speed || 0),
            might: prev.stats.might + (result.statChanges?.might || 0),
            sanity: prev.stats.sanity + (result.statChanges?.sanity || 0),
            knowledge: prev.stats.knowledge + (result.statChanges?.knowledge || 0),
          },
        };
      });
      
      // 記錄到日誌
      const statNames: Record<string, string> = {
        speed: '速度',
        might: '力量',
        sanity: '理智',
        knowledge: '知識',
      };
      
      Object.entries(result.statChanges).forEach(([stat, change]) => {
        if (change !== 0) {
          setLog(prev => [...prev, `${statNames[stat]} ${change > 0 ? '+' : ''}${change}`]);
        }
      });
    }
    
    // 記錄檢定結果到日誌
    setLog(prev => [...prev, `事件檢定: ${result.success ? '成功' : '失敗'} (${result.roll} vs 目標 ${result.target})`]);
    
    setEventCheckState(prev => ({
      ...prev,
      isRolling: false,
      result,
    }));
  };

  // Issue #104: 處理關閉事件卡檢定模態框
  const handleCloseEventCheck = () => {
    setEventCheckState({
      showModal: false,
      card: null,
      isRolling: false,
      result: null,
    });
    
    // 繼續新回合
    continueToNextTurn();
  };

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
              <div className="flex justify-center gap-3">
                <Button
                  onClick={endTurn}
                  variant="secondary"
                  size="sm"
                  className="h-10 sm:h-12 text-xs sm:text-sm"
                >
                  結束回合
                </Button>
                
                {/* 戰鬥按鈕 (Issue #103) - 只在作祟階段顯示 */}
                {hauntState.isActive && (
                  <Button
                    onClick={() => initiateCombat('ai-enemy-1')}
                    variant="danger"
                    size="sm"
                    className="h-10 sm:h-12 text-xs sm:text-sm bg-red-600 hover:bg-red-700"
                    disabled={combatState.isCombatAnimating}
                  >
                    {combatState.isCombatAnimating ? '戰鬥中...' : '⚔️ 攻擊'}
                  </Button>
                )}
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

            {/* 背包與預兆面板 */}
            {playerState && (
              <InventoryPanel
                items={playerState.items}
                omens={playerState.omens}
                omenCount={cardManager.getDeckStatus().omenCount}
                hauntTriggered={cardManager.getDeckStatus().hauntTriggered}
              />
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
                        entry.includes('抽到物品') ? 'bg-blue-500/20 text-blue-400' :
                        entry.includes('抽到預兆') ? 'bg-purple-500/20 text-purple-400' :
                        entry.includes('抽到事件') ? 'bg-green-500/20 text-green-400' :
                        entry.includes('作祟觸發') ? 'bg-red-500/20 text-red-400 font-bold' :
                        entry.includes('作祟未觸發') ? 'bg-green-500/20 text-green-400' :
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

      {/* 卡牌抽牌顯示 (Issue #94) - 使用 CardDisplay 組件 */}
      <CardDisplay
        card={cardDrawState.showCard ? cardDrawState.cardResult?.card || null : null}
        onClose={handleCloseCardDisplay}
        animate={true}
      />

      {/* Haunt Roll 模態框 (Issue #97) */}
      <HauntRollModal
        isOpen={hauntState.showRollModal}
        omenCount={cardManager.getDeckStatus().omenCount}
        rollResult={hauntState.rollResult}
        isRolling={hauntState.isRolling}
        onClose={handleHauntRollClose}
        onProceedToReveal={handleProceedToReveal}
      />

      {/* Haunt Reveal 畫面 (Issue #97) */}
      <HauntRevealScreen
        isOpen={hauntState.showRevealScreen}
        revelation={hauntState.revelation}
        playerNames={{ 'solo-player': player?.name || '玩家' }}
        currentPlayerId="solo-player"
        onStartHaunt={handleStartHaunt}
      />

      {/* 事件卡檢定模態框 (Issue #104) */}
      <EventCheckModal
        isOpen={eventCheckState.showModal}
        card={eventCheckState.card}
        playerStatValue={eventCheckState.card?.rollRequired?.stat && playerState 
          ? playerState.stats[eventCheckState.card.rollRequired.stat] 
          : 0}
        checkResult={eventCheckState.result}
        isRolling={eventCheckState.isRolling}
        onClose={handleCloseEventCheck}
        onRoll={handleEventCheckRoll}
      />

      {/* 作祟檢定結果覆蓋層（舊版，保留用於非預兆卡情況） */}
      <AnimatePresence>
        {cardDrawState.showCard && cardDrawState.hauntRollResult && (
          <motion.div
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
          >
            <div className={`rounded-lg px-6 py-3 border shadow-lg ${
              cardDrawState.hauntRollResult.triggered 
                ? 'bg-red-900/90 border-red-500 text-red-100' 
                : 'bg-green-900/90 border-green-500 text-green-100'
            }`}>
              <p className="font-bold text-center">
                {cardDrawState.hauntRollResult.triggered 
                  ? `⚠️ 作祟觸發！擲出 ${cardDrawState.hauntRollResult.roll} < ${cardDrawState.hauntRollResult.threshold}` 
                  : `✅ 作祟未觸發，擲出 ${cardDrawState.hauntRollResult.roll} >= ${cardDrawState.hauntRollResult.threshold}`
                }
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 戰鬥模態框 (Issue #103) */}
      <AnimatePresence>
        {combatState.showCombatModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCloseCombat}
          >
            <motion.div
              className="bg-gray-800 rounded-xl p-6 max-w-md w-full border border-gray-600"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold text-center mb-6">⚔️ 戰鬥</h2>
              
              {combatState.isCombatAnimating ? (
                <div className="text-center py-8">
                  <motion.div
                    className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full mx-auto mb-4"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  />
                  <p className="text-gray-300">戰鬥進行中...</p>
                </div>
              ) : combatState.combatResult ? (
                <div className="space-y-4">
                  {/* 擲骰結果 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                      <p className="text-sm text-gray-400 mb-1">你的擲骰</p>
                      <p className="text-2xl font-bold text-blue-400">
                        {combatState.combatResult.attackerRoll?.total || 0}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        [{combatState.combatResult.attackerRoll?.results.join(', ') || ''}]
                      </p>
                    </div>
                    <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                      <p className="text-sm text-gray-400 mb-1">敵人擲骰</p>
                      <p className="text-2xl font-bold text-red-400">
                        {combatState.combatResult.defenderRoll?.total || 0}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        [{combatState.combatResult.defenderRoll?.results.join(', ') || ''}]
                      </p>
                    </div>
                  </div>

                  {/* 勝負結果 */}
                  {combatState.combatResult.winner ? (
                    <div className={`rounded-lg p-4 text-center ${
                      combatState.combatResult.winner.id === 'solo-player'
                        ? 'bg-green-900/50 border border-green-500'
                        : 'bg-red-900/50 border border-red-500'
                    }`}>
                      <p className="text-lg font-bold">
                        {combatState.combatResult.winner.id === 'solo-player' ? '🎉 你獲勝！' : '💀 你輸了！'}
                      </p>
                      {combatState.combatResult.damage && combatState.combatResult.damage > 0 && (
                        <p className="text-sm mt-2">
                          造成 <span className="font-bold text-yellow-400">{combatState.combatResult.damage}</span> 點傷害
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="bg-yellow-900/50 border border-yellow-500 rounded-lg p-4 text-center">
                      <p className="text-lg font-bold">🤝 平手！</p>
                      <p className="text-sm mt-2 text-gray-300">雙方勢均力敵，沒有傷害</p>
                    </div>
                  )}

                  {/* 武器加成顯示 */}
                  {playerState && (
                    <div className="bg-gray-700/30 rounded-lg p-3">
                      <p className="text-xs text-gray-400 mb-2">武器加成</p>
                      {(() => {
                        const bonus = calculateWeaponBonus(playerState.items, playerState.omens);
                        return bonus.weapons.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {bonus.weapons.map((weapon, i) => (
                              <span key={i} className="text-xs bg-blue-900/50 px-2 py-1 rounded">
                                {weapon} (+{bonus.mightBonus > 0 ? bonus.mightBonus : bonus.damageBonus})
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-500">無武器</p>
                        );
                      })()}
                    </div>
                  )}

                  <Button
                    onClick={handleCloseCombat}
                    variant="primary"
                    className="w-full mt-4"
                  >
                    確認
                  </Button>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-400">準備戰鬥...</p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
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
