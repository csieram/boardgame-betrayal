'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Character, CHARACTERS, Room, Floor, Tile, Direction, Card, ALL_ROOMS, EVENT_CARDS, ITEM_CARDS, OMEN_CARDS } from '@betrayal/shared';
import { Button } from '@betrayal/ui';
import { GameBoard } from '@/components/game/GameBoard';
import { CardDisplay } from '@/components/game/CardDisplay';
import { InventoryPanel } from '@/components/game/InventoryPanel';
import { HauntRollModal } from '@/components/game/HauntRollModal';
import { HauntRevealScreen } from '@/components/game/HauntRevealScreen';
import { EventCheckModal, EventCheckResult } from '@/components/game/EventCheckModal';


import { CharacterTabs, PlayerInfo } from '@/components/game/CharacterTabs';
import { CharacterDetailPanel } from '@/components/game/CharacterDetailPanel';
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
  // Hero AI System (Issue #109)
  HeroAI,
  createHeroAIs,
  isAIControlledHero,
  AIDecision,
  // Full AI Player System (Issue #110)
  AIPlayerManager,
  createAIPlayerManager,
  AIPlayerInfo,
  AIActionLog,
  getPersonalityIcon,
  getPersonalityColor,
  AIPersonality,
  AIDifficulty,
} from '@betrayal/game-engine';

// 地圖大小
const MAP_SIZE = 15;
const MAP_CENTER = 7;

// 樓層名稱對照
const FLOOR_NAMES: Record<Floor, string> = {
  upper: '二樓',
  ground: '一樓',
  basement: '地下室',
  roof: '屋頂',
};

/** 單人模式遊戲狀態 */
interface SoloGameState {
  placedRoomIds: Set<string>;
  roomDecks: {
    ground: Room[];
    upper: Room[];
    basement: Room[];
    roof: Room[];
    drawn: Set<string>;
  };
  // 使用 ALL_ROOMS 和 drawn 集合來追蹤已抽取的房間
  drawn: Set<string>;
  seed: string;
  // Issue #188: 卡牌牌堆狀態
  cardDecks: {
    event: { remaining: string[]; drawn: string[]; discarded: string[] };
    item: { remaining: string[]; drawn: string[]; discarded: string[] };
    omen: { remaining: string[]; drawn: string[]; discarded: string[] };
  };
}

/** 抽卡結果狀態 */
interface CardDrawState {
  showCard: boolean;
  cardResult: CardDrawResult | null;
  isHauntRoll: boolean;
  hauntRollResult: { triggered: boolean; roll: number; threshold: number } | null;
  // Issue #190: 事件檢定結果
  eventCheckResult?: {
    success: boolean;
    roll: number;
    dice: number[];
    stat: 'speed' | 'might' | 'sanity' | 'knowledge';
    target: number;
    message: string;
    effectDescription: string;
  } | null;
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
  ],
  upper: [
    {
      roomId: 'upper_landing',
      position: { x: 7, y: 7 },
      rotation: 0,
    },
  ],
  basement: [
    {
      roomId: 'basement_landing',
      position: { x: 7, y: 7 },
      rotation: 0,
    },
  ],
  roof: [
    {
      roomId: 'roof_landing',
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
    placedRoomIds: new Set(['entrance_hall', 'upper_landing', 'basement_landing']),
    roomDecks: {
      ground: [],
      upper: [],
      basement: [],
      roof: [],
      drawn: new Set(),
    },
    drawn: new Set(),
    seed,
    // Issue #203-fix: 初始化卡牌牌堆狀態，包含所有卡牌ID
    cardDecks: {
      event: { remaining: EVENT_CARDS.map(c => c.id), drawn: [], discarded: [] },
      item: { remaining: ITEM_CARDS.map(c => c.id), drawn: [], discarded: [] },
      omen: { remaining: OMEN_CARDS.map(c => c.id), drawn: [], discarded: [] },
    },
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
  roof: Tile[][];
}

/**
 * 創建多樓層空地圖
 */
function createEmptyMultiFloorMap(): MultiFloorMap {
  return {
    ground: createEmptyMap(),
    upper: createEmptyMap(),
    basement: createEmptyMap(),
    roof: createEmptyMap(),
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
  
  // Issue #202-fix: 使用共享的卡牌抽牌系統
  // Issue #203-fix: 使用 useRef 保持單一實例，避免重新創建導致牌堆重置
  const cardManagerRef = useRef<CardDrawingManager | null>(null);
  if (!cardManagerRef.current) {
    cardManagerRef.current = new CardDrawingManager(gameState.seed, gameState.cardDecks);
    cardManagerRef.current.setDeckStateChangeCallback((newState) => {
      setGameState(prev => ({
        ...prev,
        cardDecks: newState,
      }));
    });
  }
  const cardManager = cardManagerRef.current;
  
  const [effectApplier] = useState(() => new CardEffectApplier(Date.now().toString()));
  const [cardDrawState, setCardDrawState] = useState<CardDrawState>({
    showCard: false,
    cardResult: null,
    isHauntRoll: false,
    hauntRollResult: null,
    eventCheckResult: null,
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

  // Hero AI 系統狀態 (Issue #109)
  const [heroAIs, setHeroAIs] = useState<Map<string, HeroAI>>(new Map());
  const [aiDifficulty, setAiDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [aiActionLog, setAiActionLog] = useState<string[]>([]);

  // Full AI Player System (Issue #110)
  const [aiManager, setAiManager] = useState<AIPlayerManager | null>(null);
  const [aiPlayers, setAiPlayers] = useState<AIPlayerInfo[]>([]);
  const [aiActionLogs, setAiActionLogs] = useState<AIActionLog[]>([]);
  // Issue #199-fix: 添加計數器強制重新渲染當 AI 屬性變化時
  const [aiStatUpdateCounter, setAiStatUpdateCounter] = useState(0);
  const [currentTurnPlayer, setCurrentTurnPlayer] = useState<string>('solo-player');
  const [isProcessingAITurn, setIsProcessingAITurn] = useState(false);
  const [gameSetup, setGameSetup] = useState<{
    aiCount: number;
    difficulty: AIDifficulty;
    personalities: AIPersonality[];
    includeWidowsWalk: boolean;
    disableHauntRoll: boolean;
    seed: string;
  } | null>(null);

  // AI 抽卡顯示狀態 (Issue #189)
  const [aiCardDrawState, setAiCardDrawState] = useState<{
    showCard: boolean;
    cardResult: CardDrawResult | null;
    aiPlayerName: string;
    // Issue #192: AI 事件卡檢定結果
    eventCheckResult?: {
      success: boolean;
      roll: number;
      dice: number[];
      stat: 'speed' | 'might' | 'sanity' | 'knowledge';
      target: number;
      message: string;
      effectDescription: string;
    } | null;
  }>({
    showCard: false,
    cardResult: null,
    aiPlayerName: '',
    eventCheckResult: null,
  });

  // Issue #119: Character Tabs 狀態
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('solo-player');
  const [aiPlayerPositions, setAiPlayerPositions] = useState<Map<string, { x: number; y: number; floor: Floor }>>(new Map());

  // Issue #127: 回合狀態管理（用於自動切換回合）
  const [turnState, setTurnState] = useState<{
    hasEnded: boolean;
    endedByDiscovery: boolean;
  }>({
    hasEnded: false,
    endedByDiscovery: false,
  });
  const [isProcessingTurnSwitch, setIsProcessingTurnSwitch] = useState(false);



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
  // Issue #160-debug: 添加調試日誌追蹤 map 變數
  const map = multiFloorMap[currentFloor];
  
  // Issue #160-debug: 追蹤 map 變數的變化
  useEffect(() => {
    console.log('[Debug #160] map variable updated:', {
      currentFloor,
      mapLength: map.length,
      discoveredRooms: map.flat().filter(t => t.discovered && t.room).length,
      timestamp: Date.now(),
    });
  }, [map, currentFloor]);

  // 從 sessionStorage 讀取選擇的角色和 AI 設置
  useEffect(() => {
    const storedSetup = sessionStorage.getItem('solo-game-setup');
    const storedCharacter = sessionStorage.getItem('solo-selected-character');

    if (storedSetup) {
      try {
        const setup = JSON.parse(storedSetup);
        setGameSetup({
          aiCount: setup.aiSetup?.count || 0,
          difficulty: setup.aiSetup?.difficulty || 'medium',
          personalities: setup.aiSetup?.personalities || [],
          includeWidowsWalk: setup.includeWidowsWalk || false,
          disableHauntRoll: setup.disableHauntRoll || false,
          seed: setup.seed || Date.now().toString(),
        });
        const character: Character = setup.character;
        startGame(character, setup.aiSetup);
      } catch (error) {
        console.error('Failed to parse game setup:', error);
        setIsLoading(false);
      }
    } else if (storedCharacter) {
      // 向後兼容：沒有 AI 設置的情況
      try {
        const character: Character = JSON.parse(storedCharacter);
        startGame(character, null);
      } catch (error) {
        console.error('Failed to parse stored character:', error);
        setIsLoading(false);
      }
    } else {
      router.push('/solo/select');
    }
  }, [router]);

  // 初始化遊戲
  const startGame = (character: Character, aiSetup: { count: number; difficulty: AIDifficulty; personalities: AIPersonality[] } | null) => {
    setPlayer(character);
    setMoves(character.stats.speed[0]);
    setPhase('play');

    // 生成隨機 seed
    const seed = Date.now().toString();
    console.log('Game start seed:', seed);
    console.log('AI Setup:', aiSetup);

    // 初始化多樓層地圖
    const initialMultiFloorMap = createEmptyMultiFloorMap();
    
    // 從 @betrayal/shared 獲取房間資料
    import('@betrayal/shared').then(({ ALL_ROOMS }) => {
      try {
        const rng = new SeededRng(seed);
        const newGameState = createInitialGameState(seed);

        // 標記起始房間為已抽取
        const startingRoomIds = ['entrance_hall', 'upper_landing', 'basement_landing', 'roof_landing'];
        startingRoomIds.forEach(id => newGameState.drawn.add(id));

        // 記錄房間統計資訊
        const groundRooms = ALL_ROOMS.filter(r => r.floors?.includes('ground') && !startingRoomIds.includes(r.id));
        const upperRooms = ALL_ROOMS.filter(r => r.floors?.includes('upper') && !startingRoomIds.includes(r.id));
        const basementRooms = ALL_ROOMS.filter(r => r.floors?.includes('basement') && !startingRoomIds.includes(r.id));
        const roofRooms = ALL_ROOMS.filter(r => r.floors?.includes('roof') && !startingRoomIds.includes(r.id));

        console.log('Total rooms:', ALL_ROOMS.length);
        console.log('Ground rooms available:', groundRooms.length);
        console.log('Upper rooms available:', upperRooms.length);
        console.log('Basement rooms available:', basementRooms.length);
        console.log('Roof rooms available:', roofRooms.length);

        // Issue #185-fix: Initialize roomDecks with shuffled rooms
        newGameState.roomDecks.ground = rng.shuffle(groundRooms);
        newGameState.roomDecks.upper = rng.shuffle(upperRooms);
        newGameState.roomDecks.basement = rng.shuffle(basementRooms);
        newGameState.roomDecks.roof = rng.shuffle(roofRooms);

        // Issue #188: Initialize card decks with shuffled card IDs
        const { EVENT_CARDS, ITEM_CARDS, OMEN_CARDS } = require('@betrayal/shared');
        const shuffledEventCards = rng.shuffle([...EVENT_CARDS]);
        const shuffledItemCards = rng.shuffle([...ITEM_CARDS]);
        const shuffledOmenCards = rng.shuffle([...OMEN_CARDS]);

        newGameState.cardDecks = {
          event: {
            remaining: shuffledEventCards.map((c: Card) => c.id),
            drawn: [],
            discarded: [],
          },
          item: {
            remaining: shuffledItemCards.map((c: Card) => c.id),
            drawn: [],
            discarded: [],
          },
          omen: {
            remaining: shuffledOmenCards.map((c: Card) => c.id),
            drawn: [],
            discarded: [],
          },
        };

        console.log('[Issue #188] Card decks initialized:', {
          event: newGameState.cardDecks.event.remaining.length,
          item: newGameState.cardDecks.item.remaining.length,
          omen: newGameState.cardDecks.omen.remaining.length,
        });

        setGameState(newGameState);

        // 放置起始房間
        // 使用 ALL_ROOMS 查找房間資料
        const getRoomById = (id: string) => ALL_ROOMS.find(r => r.id === id);

        // 1. 一樓：入口大廳
        STARTING_ROOMS.ground.forEach(({ roomId, position, rotation }) => {
          const room = getRoomById(roomId);
          if (room) {
            initialMultiFloorMap.ground[position.y][position.x] = {
              ...initialMultiFloorMap.ground[position.y][position.x],
              discovered: true,
              room: room,
              rotation: rotation,
            };
          }
        });

        // 2. 二樓：大廳
        STARTING_ROOMS.upper.forEach(({ roomId, position, rotation }) => {
          const room = getRoomById(roomId);
          if (room) {
            initialMultiFloorMap.upper[position.y][position.x] = {
              ...initialMultiFloorMap.upper[position.y][position.x],
              discovered: true,
              room: room,
              rotation: rotation,
            };
          }
        });

        // 3. 地下室：大廳
        STARTING_ROOMS.basement.forEach(({ roomId, position, rotation }) => {
          const room = getRoomById(roomId);
          if (room) {
            initialMultiFloorMap.basement[position.y][position.x] = {
              ...initialMultiFloorMap.basement[position.y][position.x],
              discovered: true,
              room: room,
              rotation: rotation,
            };
          }
        });

        // 4. 屋頂：大廳（可選，如果有 Widow's Walk 擴充）
        STARTING_ROOMS.roof?.forEach(({ roomId, position, rotation }) => {
          const room = getRoomById(roomId);
          if (room) {
            initialMultiFloorMap.roof[position.y][position.x] = {
              ...initialMultiFloorMap.roof[position.y][position.x],
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

        // Issue #110: 初始化 AI 玩家管理器
        // Issue #202-fix: 傳入共享的 cardManager 以確保所有玩家使用相同的牌堆
        if (aiSetup && aiSetup.count > 0) {
          const manager = createAIPlayerManager(
            'solo-player',
            aiSetup.count,
            aiSetup.difficulty,
            seed,
            cardManager // 傳入共享的 cardManager
          );
          setAiManager(manager);

          // 創建 AI 玩家
          const mockGameState = {
            players: [],
            map: {
              ground: initialMultiFloorMap.ground,
              upper: initialMultiFloorMap.upper,
              basement: initialMultiFloorMap.basement,
              placedRoomCount: 3,
            },
          } as any;

          const aiPlayerObjects = manager.initializeAIPlayers(
            mockGameState,
            character,
            aiSetup.personalities
          );

          const initialAIPlayers = manager.getAIPlayers();
          setAiPlayers(initialAIPlayers);
          
          // Issue #122: 初始化 AI 玩家位置到 aiPlayerPositions
          const initialPositions = new Map<string, { x: number; y: number; floor: Floor }>();
          initialAIPlayers.forEach(aiPlayer => {
            initialPositions.set(aiPlayer.id, aiPlayer.position || { x: 7, y: 7, floor: 'ground' });
          });
          setAiPlayerPositions(initialPositions);
          
          setLog(prev => [
            ...prev,
            `選擇了 ${character.name}`,
            `🤖 AI 玩家: ${aiSetup.count} 位 (${aiSetup.difficulty === 'easy' ? '簡單' : aiSetup.difficulty === 'medium' ? '中等' : '困難'})`,
            '從入口大廳開始',
            '回合 1'
          ]);
        } else {
          setLog([`選擇了 ${character.name}`, '從入口大廳開始', '回合 1']);
        }

        // 計算可達位置（從入口大廳開始）
        updateReachablePositions(initialMultiFloorMap.ground, { x: MAP_CENTER, y: MAP_CENTER }, character.stats.speed[0], false);
      } catch (error) {
        console.error('Error initializing game:', error);
        setLog(prev => [...prev, `錯誤：遊戲初始化失敗 - ${error instanceof Error ? error.message : '未知錯誤'}`]);
      } finally {
        // 確保無論成功或失敗，都關閉載入狀態
        setIsLoading(false);
      }
    }).catch((error) => {
      console.error('Failed to load ROOMS data:', error);
      setIsLoading(false);
      setLog(prev => [...prev, '錯誤：無法載入遊戲資料，請重新整理頁面']);
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
    
    // Issue #127: 標記回合結束，觸發自動切換
    setTurnState({
      hasEnded: true,
      endedByDiscovery: true,
    });
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
    
    // Issue #109: 初始化 Hero AI（如果玩家是叛徒）
    initializeHeroAIs();
  };

  // Issue #109: 初始化 Hero AI
  const initializeHeroAIs = useCallback(() => {
    // 檢查玩家是否為叛徒
    const isPlayerTraitor = hauntState.revelation?.traitorId === 'solo-player';
    
    if (!isPlayerTraitor) {
      // 玩家是英雄，不需要 Hero AI
      return;
    }

    // 建立遊戲狀態用於初始化 AI
    const gameStateForAI = createGameStateForAI();
    
    // 創建 Hero AI 控制器
    const seed = Date.now().toString();
    const ais = createHeroAIs(gameStateForAI, aiDifficulty, seed);
    
    setHeroAIs(ais);
    setLog(prev => [...prev, `🤖 Hero AI 已啟動（難度: ${aiDifficulty}）`]);
    
    // 記錄 AI 控制的英雄
    ais.forEach((ai, heroId) => {
      setAiActionLog(prev => [...prev, `Hero ${heroId} 由 AI 控制`]);
    });
  }, [hauntState.revelation, aiDifficulty]);

  // Issue #109: 建立 AI 用的遊戲狀態
  // Issue #150: 支持探索階段和作祟階段
  const createGameStateForAI = (isExplorationPhase: boolean = false): any => {
    // Issue #148-fix: 使用真實的 AI 玩家位置
    const aiPlayersList = aiPlayers.map(aiPlayer => {
      const aiPos = aiPlayerPositions.get(aiPlayer.id) || aiPlayer.position || { x: 7, y: 7, floor: 'ground' as Floor };
      return {
        id: aiPlayer.id,
        name: aiPlayer.name,
        position: aiPos,
        currentStats: {
          speed: aiPlayer.character?.stats?.speed?.[0] || 4,
          might: aiPlayer.character?.stats?.might?.[0] || 4,
          sanity: aiPlayer.character?.stats?.sanity?.[0] || 4,
          knowledge: aiPlayer.character?.stats?.knowledge?.[0] || 4,
        },
        items: [],
        omens: [],
        isTraitor: false,
        isDead: !aiPlayer.isAlive,
      };
    });

    // Issue #150: 根據階段設置正確的遊戲狀態
    const isHauntActive = !isExplorationPhase && hauntState.isActive;
    
    return {
      gameId: 'solo-game',
      version: '1.0.0',
      phase: isHauntActive ? 'haunt' : 'exploration',
      result: 'ongoing',
      config: { 
        playerCount: 2, 
        enableAI: true, 
        seed: gameState.seed, 
        maxTurns: 100 
      },
      map: {
        ground: multiFloorMap.ground,
        upper: multiFloorMap.upper,
        basement: multiFloorMap.basement,
        roof: multiFloorMap.roof,
        placedRoomCount: gameState.placedRoomIds.size,
      },
      players: [
        // 玩家
        {
          id: 'solo-player',
          name: player?.name || '玩家',
          position: { x: position.x, y: position.y, floor: currentFloor },
          currentStats: {
            speed: playerState?.stats.speed || 4,
            might: playerState?.stats.might || 4,
            sanity: playerState?.stats.sanity || 4,
            knowledge: playerState?.stats.knowledge || 4,
          },
          items: playerState?.items || [],
          omens: playerState?.omens || [],
          isTraitor: isHauntActive && hauntState.revelation?.traitorId === 'solo-player',
          isDead: false,
        },
        // AI 玩家 - 使用真實位置
        ...aiPlayersList,
      ],
      playerOrder: ['solo-player', ...aiPlayers.map(p => p.id)],
      turn: {
        currentPlayerId: 'solo-player', // Issue #150: 默認為 solo-player，AIPlayerManager 會更新為當前 AI
        turnNumber: turn,
        movesRemaining: 4,
        hasDiscoveredRoom: false,
        hasDrawnCard: false,
        hasEnded: false,
        usedSpecialActions: [],
        usedItems: [],
      },
      // Issue #188: 使用 gameState 中的共享牌堆狀態
      cardDecks: gameState.cardDecks || {
        event: { remaining: [], drawn: [], discarded: [] },
        item: { remaining: [], drawn: [], discarded: [] },
        omen: { remaining: [], drawn: [], discarded: [] },
      },
      roomDeck: {
        ground: gameState.roomDecks?.ground || [],
        upper: gameState.roomDecks?.upper || [],
        basement: gameState.roomDecks?.basement || [],
        roof: gameState.roomDecks?.roof || [],
        drawn: gameState.drawn,
      },
      haunt: {
        isActive: isHauntActive,
        type: isHauntActive ? 'single_traitor' : null,
        hauntNumber: isHauntActive ? hauntState.revelation?.scenario?.id || 1 : null,
        traitorPlayerId: isHauntActive ? hauntState.revelation?.traitorId || null : null,
        omenCount: cardManager.getDeckStatus().omenCount,
        heroObjective: isHauntActive ? hauntState.revelation?.scenario?.heroObjective || '擊敗叛徒' : null,
        traitorObjective: isHauntActive ? hauntState.revelation?.scenario?.traitorObjective || '消滅所有英雄' : null,
      },
      combat: {
        isActive: false,
        attackerId: null,
        defenderId: null,
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
  };

  // Issue #109: 執行 Hero AI 回合
  const executeHeroAITurn = useCallback(async (heroId: string) => {
    const ai = heroAIs.get(heroId);
    if (!ai) return;

    setIsAIThinking(true);
    setLog(prev => [...prev, `🤖 Hero ${heroId} 正在思考...`]);

    // 模擬 AI 思考時間
    await new Promise(resolve => setTimeout(resolve, 1500));

    // 建立當前遊戲狀態
    const gameStateForAI = createGameStateForAI();
    
    // 執行 AI 決策
    const decisions = ai.executeTurn(gameStateForAI);

    // 記錄 AI 行動
    for (const decision of decisions) {
      const actionText = formatAIDecision(decision);
      setLog(prev => [...prev, `  🤖 ${actionText}`]);
      setAiActionLog(prev => [...prev, `Hero ${heroId}: ${actionText}`]);
      
      // 如果 AI 決定攻擊玩家，觸發戰鬥
      if (decision.action === 'attack' && decision.targetPlayerId === 'solo-player') {
        setLog(prev => [...prev, `⚔️ Hero ${heroId} 發起攻擊！`]);
        // 這裡可以觸發戰鬥系統
      }
    }

    setIsAIThinking(false);
    setLog(prev => [...prev, `🤖 Hero ${heroId} 回合結束`]);
  }, [heroAIs]);

  // Issue #109: 格式化 AI 決策為可讀文字
  const formatAIDecision = (decision: AIDecision): string => {
    switch (decision.action) {
      case 'move':
        if (decision.targetPosition) {
          return `移動到 (${decision.targetPosition.x}, ${decision.targetPosition.y})`;
        }
        return '移動';
      case 'attack':
        return `攻擊 ${decision.targetPlayerId === 'solo-player' ? '玩家' : decision.targetPlayerId}`;
      case 'useItem':
        return `使用物品 ${decision.itemId}`;
      case 'explore':
        return `向 ${decision.exploreDirection} 探索`;
      case 'endTurn':
        return '結束回合';
      default:
        return '未知行動';
    }
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
        drawn: gameState.drawn,
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
            // Issue #115: 同步更新 player (Character) 的 stats
            // 注意：stats[0] 是當前值（UI 顯示用），stats[1] 是初始值
            setPlayer(prev => prev ? {
              ...prev,
              stats: {
                ...prev.stats,
                might: [newMight, prev.stats.might[1]],
              },
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

  // 繼續到下一回合（保留用於其他情況）
  const continueToNextTurn = () => {
    setTurn(t => t + 1);
    setMoves(player!.stats.speed[0]);
    setDiscovered(false);
    setTurnState({
      hasEnded: false,
      endedByDiscovery: false,
    });
    setLog(prev => [...prev, `回合 ${turn + 1}`]);
    updateReachablePositions(multiFloorMap[currentFloor], position, player!.stats.speed[0], false);
  };

  // 從牌堆抽取房間（使用 ALL_ROOMS 和 floors 陣列過濾）
  // Issue #179: 支援新的 65 房間多樓層系統
  // Issue #191-fix: 同時檢查 drawn 和 placedRoomIds 以防止重複房間
  const drawRoomFromDeck = (
    floor: Floor, 
    entryDirection: Direction, 
    sourcePosition?: { x: number; y: number; floor: Floor }
  ): { room: Room; rotation: number; wasModified: boolean } | null => {
    console.log('[RoomDiscovery] Drawing room for exploration, floor:', floor, 'entryDirection:', entryDirection);
    console.log('[Issue #191] Current placedRoomIds:', Array.from(gameState.placedRoomIds));
    console.log('[Issue #191] Current drawn:', Array.from(gameState.drawn));
    
    // 使用提供的位置或默認使用人類玩家位置
    const playerPos = sourcePosition || { x: position.x, y: position.y, floor: currentFloor };
    
    // 從 @betrayal/shared 導入 ALL_ROOMS
    const { ALL_ROOMS } = require('@betrayal/shared');
    
    // 過濾可用房間：
    // 1. 房間的 floors 陣列包含目標樓層
    // 2. 房間未被抽取過 (drawn)
    // 3. 房間未被放置過 (placedRoomIds) - Issue #191-fix
    // 4. 排除 landing 類型房間（起始房間）
    const availableRooms = ALL_ROOMS.filter((room: Room) => {
      const roomFloors = room.floors || [room.floor];
      const isDrawn = gameState.drawn.has(room.id);
      const isPlaced = gameState.placedRoomIds.has(room.id);
      const isAvailable = roomFloors.includes(floor) && 
             !isDrawn &&
             !isPlaced &&
             room.roomType !== 'landing';
      
      // Issue #191-debug: 記錄過濾結果
      if (!isAvailable && roomFloors.includes(floor) && room.roomType !== 'landing') {
        console.log(`[Issue #191] Room ${room.id} (${room.name}) filtered out: drawn=${isDrawn}, placed=${isPlaced}`);
      }
      
      return isAvailable;
    });
    
    console.log('[RoomDiscovery] Available rooms for', floor, ':', availableRooms.length);
    
    if (availableRooms.length === 0) {
      console.log('[RoomDiscovery] No available rooms for floor:', floor);
      return null;
    }
    
    // 使用 SeededRng 進行隨機選擇
    const rng = new SeededRng(gameState.seed + gameState.drawn.size);
    const randomIndex = Math.floor(rng.next() * availableRooms.length);
    const selectedRoom = availableRooms[randomIndex];
    
    // 計算旋轉角度以匹配進入方向
    const rotation = calculateRotationForEntry(selectedRoom, entryDirection);
    
    console.log('[RoomDiscovery] Selected room:', selectedRoom.name, 'rotation:', rotation);
    
    // 標記房間為已抽取
    setGameState(prev => {
      const newDrawn = new Set(prev.drawn);
      newDrawn.add(selectedRoom.id);
      return { ...prev, drawn: newDrawn };
    });
    
    return {
      room: selectedRoom,
      rotation,
      wasModified: false,
    };
  };
  
  // 輔助函數：計算房間旋轉角度以匹配進入方向
  const calculateRotationForEntry = (room: Room, entryDirection: Direction): number => {
    // 找到房間最適合的門來匹配進入方向
    const doors = room.doors;
    
    // 進入方向的相反方向是房間需要開門的方向
    const oppositeMap: Record<Direction, Direction> = {
      north: 'south',
      south: 'north',
      east: 'west',
      west: 'east',
    };
    const neededDoor = oppositeMap[entryDirection];
    
    // 如果房間已經有所需的門，不需要旋轉
    if (doors.includes(neededDoor)) {
      return 0;
    }
    
    // 嘗試找到最佳旋轉角度
    const rotationMap: Record<string, Record<string, number>> = {
      north: { south: 0, west: 90, north: 180, east: 270 },
      south: { north: 0, east: 90, south: 180, west: 270 },
      east: { west: 0, north: 90, east: 180, south: 270 },
      west: { east: 0, south: 90, west: 180, north: 270 },
    };
    
    // 找到第一個可以旋轉到所需方向的門
    for (const door of doors) {
      const rotation = rotationMap[door][neededDoor];
      if (rotation !== undefined) {
        return rotation;
      }
    }
    
    return 0;
  };

  // 保留舊的 drawRoomFromDeck 函數作為向後兼容（實際使用上面的新實現）
  const drawRoomFromDeckLegacy = (
    floor: Floor, 
    entryDirection: Direction, 
    sourcePosition?: { x: number; y: number; floor: Floor }
  ): { room: Room; rotation: number; wasModified: boolean } | null => {
    console.log('[RoomDiscovery] Legacy draw called, delegating to new implementation');
    return drawRoomFromDeck(floor, entryDirection, sourcePosition);
  };

  /**
   * Issue #2-fix: 更新房間狀態
   * 
   * 統一處理房間更新的邏輯，包括：
   * 1. 更新多樓層地圖
   * 2. 更新已放置房間 ID
   * 3. 更新已抽取集合
   * 
   * @param floor 樓層
   * @param x X 座標
   * @param y Y 座標
   * @param room 房間資料
   * @param rotation 旋轉角度
   */
  const updateRoom = useCallback((
    floor: Floor,
    x: number,
    y: number,
    room: Room,
    rotation: 0 | 90 | 180 | 270
  ) => {
    // Issue #161-debug: 調試日誌 - updateRoom 被調用
    console.log('[Fix #161] updateRoom called with:', { floor, x, y, room, rotation });

    // 旋轉門方向（從房間座標系轉換到地圖座標系）
    const rotationMap: Record<number, Record<Direction, Direction>> = {
      0: { north: 'north', south: 'south', east: 'east', west: 'west' },
      90: { north: 'east', south: 'west', east: 'south', west: 'north' },
      180: { north: 'south', south: 'north', east: 'west', west: 'east' },
      270: { north: 'west', south: 'east', east: 'north', west: 'south' },
    };

    const rotatedDoors = room.doors.map((door: Direction) => rotationMap[rotation][door]);

    const placedRoom = {
      ...room,
      doors: rotatedDoors,
      rotation,
    };

    // 更新多樓層地圖 - 使用深拷貝確保 React 檢測到變化
    setMultiFloorMap(prev => {
      // Issue #161-debug: 調試日誌 - 更新前的地圖狀態
      console.log('[Fix #161] multiFloorMap before:', prev[floor][y][x]);

      const newMap: MultiFloorMap = {
        ground: prev.ground.map(row => row.map(tile => ({ ...tile }))),
        upper: prev.upper.map(row => row.map(tile => ({ ...tile }))),
        basement: prev.basement.map(row => row.map(tile => ({ ...tile }))),
        roof: prev.roof.map(row => row.map(tile => ({ ...tile }))),
      };

      newMap[floor][y][x] = {
        x,
        y,
        discovered: true,
        room: placedRoom,
        rotation: placedRoom.rotation,
      };

      // Issue #161-debug: 調試日誌 - 更新後的地圖狀態
      console.log('[Fix #161] multiFloorMap after:', newMap[floor][y][x]);

      return newMap;
    });
    
    // 更新已放置房間 ID 和已抽取集合
    setGameState(prev => {
      const newDrawn = new Set(prev.drawn);
      newDrawn.add(room.id);
      
      const newPlacedIds = new Set(prev.placedRoomIds);
      newPlacedIds.add(room.id);
      
      return {
        ...prev,
        placedRoomIds: newPlacedIds,
        drawn: newDrawn,
      };
    });

    return placedRoom;
  }, []);

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
      
      // Issue #2-fix: 使用 updateRoom 函數統一處理房間更新
      const placedRoom = updateRoom(currentFloor, x, y, room, rotation as 0 | 90 | 180 | 270);
      
      if (wasModified) {
        console.log('[RoomDiscovery] Room was modified to prevent board closure:', room.name);
      }
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

          // Issue #202-fix: 使用共享的 cardManager 實例，而不是創建新的
          // 這確保人類玩家和 AI 玩家使用相同的牌堆
          const drawResult = drawAndApplyCard(cardManager, effectApplier, cardType, playerState);
          
          if (drawResult.success && drawResult.card) {
            cardDrawn = true;
            
            // 更新玩家狀態（物品/預兆已添加到 playerState）
            setPlayerState({ ...playerState });
            
            // 添加到日誌 - 詳細記錄卡牌抽取
            const symbolName = roomSymbol === 'E' ? '事件' : roomSymbol === 'I' ? '物品' : '預兆';
            
            // Issue #202-fix: 使用共享 cardManager 的狀態獲取 omenCount
            const updatedOmenCount = cardManager.getDeckStatus().omenCount;

            // 記錄進入房間和抽卡
            setLog(prev => [...prev, `進入 ${placedRoom.name} (${roomSymbol}) → 抽到${symbolName}: "${drawResult.card!.name}"`]);

            // 如果是預兆卡，觸發 Haunt Roll 動畫（除非禁用作祟鑒定）
            if (cardType === 'omen') {
              // 檢查是否禁用了作祟鑒定
              const isHauntRollDisabled = gameSetup?.disableHauntRoll || false;

              if (isHauntRollDisabled) {
                // 禁用作祟鑒定模式：只顯示卡牌，不進行作祟檢定
                setLog(prev => [...prev, `預兆 ${updatedOmenCount} 🌙（作祟鑒定已禁用）`]);
                setCardDrawState({
                  showCard: true,
                  cardResult: drawResult,
                  isHauntRoll: false,
                  hauntRollResult: null,
                });
              } else {
                // 正常模式：進行作祟檢定
                setLog(prev => [...prev, `預兆 ${updatedOmenCount} 🌙（作祟檢定: ${updatedOmenCount} 顆骰）`]);

                // 延遲後顯示 Haunt Roll 模態框
                setTimeout(() => {
                  performHauntRoll(updatedOmenCount);
                }, 500);

                // 先顯示卡牌
                setCardDrawState({
                  showCard: true,
                  cardResult: drawResult,
                  isHauntRoll: false,
                  hauntRollResult: null,
                });
              }
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
      
      // Issue #127: 標記回合結束（由發現房間觸發）
      // 自動切換回合將由 useEffect 處理
      setTurnState({
        hasEnded: true,
        endedByDiscovery: true,
      });
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

  // Issue #138: 移除結束回合確認彈窗，直接執行結束回合
  const showEndTurnConfirmation = (isAI: boolean, aiPlayerName?: string) => {
    console.log('[EndTurn] showEndTurnConfirmation called');
    // 直接執行結束回合，不顯示確認彈窗
    executeEndTurn();
  };

  // Issue #127 & #134: 實際執行結束回合
  const executeEndTurn = async () => {
    console.log('[EndTurn] executeEndTurn called, player:', player?.name);
    if (!player) {
      console.log('[EndTurn] No player, returning');
      return;
    }

    // 防止重複點擊
    if (isProcessingTurnSwitch || isProcessingAITurn) {
      console.log('[EndTurn] Already processing, returning');
      return;
    }

    // 設置處理中狀態
    setIsProcessingTurnSwitch(true);

    // Issue #144: 記錄人類玩家回合結束
    setLog(prev => [...prev, '回合結束']);

    // 重置回合狀態
    setDiscovered(false);
    setTurnState({
      hasEnded: false,
      endedByDiscovery: false,
    });

    // Issue #147: 使用 executeAllAITurns 統一管理 AI 回合，避免雙重回合推進
    if (aiManager && aiPlayers.length > 0) {
      setIsProcessingAITurn(true);

      setLog(prev => [...prev, '🤖 AI 玩家回合開始...']);

      // Issue #150: 創建遊戲狀態供 AI 使用
      // 根據當前階段創建正確的 gameState
      const isExplorationPhase = !hauntState.isActive;
      const mockGameState = createGameStateForAI(isExplorationPhase);
      console.log('[AI Debug] Created gameState for phase:', isExplorationPhase ? 'exploration' : 'haunt');

      // Issue #147: 使用 executeAllAITurns 執行所有 AI 回合（順序執行，統一管理回合計數）
      // Issue #148: 添加調試日誌
      console.log('[AI Debug] Starting executeAllAITurns, aiPlayers count:', aiPlayers.length);
      
      // Issue #150-fix: 清除之前的 AI 行動日誌，只顯示當前回合
      setAiActionLogs([]);
      
      const results = await aiManager.executeAllAITurns(
        mockGameState,
        (aiName) => {
          // onTurnStart: AI 回合開始回調
          console.log('[AI Debug] onTurnStart:', aiName);
          const aiPlayer = aiPlayers.find(p => p.name === aiName);
          if (aiPlayer) {
            setCurrentTurnPlayer(aiPlayer.id);
            setSelectedPlayerId(aiPlayer.id);

            // 添加回合開始日誌
            const turnStartLog: AIActionLog = {
              timestamp: Date.now(),
              turn: turn,
              playerId: aiPlayer.id,
              playerName: aiName,
              action: '開始回合',
            };
            setAiActionLogs(prev => [...prev, turnStartLog]);
            setLog(prev => [...prev, `🤖 ${aiName}: 開始回合`]);
          }
        },
        (result) => {
          // onTurnEnd: AI 回合結束回調
          // Issue #148: 添加調試日誌
          console.log('[AI Debug] onTurnEnd, result:', result);
          
          // Issue #150-fix: 使用 result.playerId 而不是 currentTurnPlayer
          // 因為 currentTurnPlayer 可能已經被更新為下一個玩家
          const aiPlayer = aiPlayers.find(p => p.id === result?.playerId);
          if (aiPlayer && result) {
            // Issue #148: 記錄 AI 行動詳情
            console.log('[AI Debug] AI actions:', result.logs);
            console.log('[AI Debug] New position:', result.newPosition);
            console.log('[AI Debug] Discovered room:', result.discoveredRoom);
            
            // Issue #2-fix & #151-fix: 處理 AI 房間發現並更新地圖
            // AI 已經在 game-engine 中抽取了房間，使用 updateRoom 統一更新地圖
            // Issue #161-debug: 添加調試日誌
            console.log('[Fix #161] discoveredRoomData:', result.discoveredRoomData);
            console.log('[Fix #161] discoveredRoom flag:', result.discoveredRoom);
            if (result.discoveredRoom && result.discoveredRoomData) {
              const { room, position: roomPosition, rotation, floor } = result.discoveredRoomData;

              // Issue #161-debug: 調試日誌 - 調用 updateRoom 前
              console.log('[Fix #161] About to call updateRoom with:', {
                floor,
                x: roomPosition.x,
                y: roomPosition.y,
                roomName: room.name,
                roomId: room.id,
                rotation
              });

              // Issue #2-fix: 使用 updateRoom 函數統一處理房間更新
              const placedRoom = updateRoom(floor, roomPosition.x, roomPosition.y, room, rotation as 0 | 90 | 180 | 270);
              
              // Issue #160-debug: 添加詳細調試日誌
              console.log('[Debug #160] AI Room Discovery - updateRoom called:', {
                floor,
                position: roomPosition,
                roomName: placedRoom.name,
                roomId: placedRoom.id,
                timestamp: Date.now(),
              });
              
              // Issue #184-fix: 同步更新 mockGameState.map，以便後續 AI 可以看到新房間
              // Issue #191-fix: 同時更新 mockGameState.placedRoomIds，防止重複房間
              // 創建新的 tile 並更新 gameState.map
              const newTile = {
                x: roomPosition.x,
                y: roomPosition.y,
                discovered: true,
                room: placedRoom,
                rotation: rotation,
              };
              
              // 更新 mockGameState 中的地圖引用
              if (floor === 'ground' || floor === 'upper' || floor === 'basement' || floor === 'roof') {
                // 創建新的地圖行數組
                const updatedRow = [...mockGameState.map[floor][roomPosition.y]];
                updatedRow[roomPosition.x] = newTile;
                
                // 創建新的地圖樓層數組
                const updatedFloor = [...mockGameState.map[floor]];
                updatedFloor[roomPosition.y] = updatedRow;
                
                // 更新 mockGameState.map
                mockGameState.map[floor] = updatedFloor;
                mockGameState.map.placedRoomCount++;
                
                console.log('[Fix #184] Updated mockGameState.map with new room:', placedRoom.name);
              }
              
              // Issue #191-fix: 更新 mockGameState.placedRoomIds，確保後續 AI 不會抽到已放置的房間
              if (!mockGameState.placedRoomIds.has(room.id)) {
                mockGameState.placedRoomIds.add(room.id);
                console.log('[Issue #191] Updated mockGameState.placedRoomIds with room:', room.id);
              }
              
              // 記錄房間發現
              const timeStr = new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
              setLog(prev => [...prev, `[${timeStr}] 🤖 ${aiPlayer.name} 發現新房間: ${placedRoom.name}`]);
            }
            
            // 將 AI 行動轉換為結構化日誌
            for (const logEntry of result.logs) {
              const actionLog: AIActionLog = {
                timestamp: Date.now(),
                turn: turn,
                playerId: aiPlayer.id,
                playerName: aiPlayer.name,
                action: logEntry,
                details: result.discoveredRoom && result.newPosition ? `位置: (${result.newPosition.x}, ${result.newPosition.y})` : undefined,
              };
              setAiActionLogs(prev => [...prev, actionLog]);

              // 同時添加到主遊戲日誌
              const timeStr = new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
              setLog(prev => [...prev, `[${timeStr}] 🤖 ${aiPlayer.name} ${logEntry}`]);
            }

            // Issue #119: 更新 AI 玩家位置
            if (result.newPosition) {
              console.log('[AI Debug] Updating AI position:', aiPlayer.id, result.newPosition);
              updateAIPlayerPosition(aiPlayer.id, result.newPosition);
            }

            // Issue #196: 應用事件檢定效果到 AI 玩家屬性
            // Issue #197-fix: 添加詳細除錯日誌追蹤事件檢定結果
            // Issue #199: 添加更詳細的調試日誌
            console.log('[Frontend] Received AI turn result:', result);
            console.log('[Frontend] Checking eventCheckResult:', {
              hasEventCheckResult: !!result.eventCheckResult,
              eventCheckResult: result.eventCheckResult,
              hasStatChanges: !!result.eventCheckResult?.statChanges,
              statChanges: result.eventCheckResult?.statChanges,
              statChangesKeys: result.eventCheckResult?.statChanges ? Object.keys(result.eventCheckResult.statChanges) : [],
              statChangesType: typeof result.eventCheckResult?.statChanges,
            });
            
            if (result.eventCheckResult?.statChanges) {
              const changes = result.eventCheckResult.statChanges;
              console.log('[AI Debug] Applying stat changes to AI:', aiPlayer.id, changes);
              
              // Issue #197: 驗證 changes 物件格式
              if (typeof changes !== 'object' || changes === null) {
                console.error('[AI Debug] ERROR: statChanges is not an object:', changes);
              } else {
                // 更新 AI 玩家屬性
                updateAIPlayerStats(aiPlayer.id, changes);
                
                // 記錄屬性變化到日誌（顯示舊值 -> 新值）
                const statNames: Record<string, string> = {
                  speed: '速度',
                  might: '力量',
                  sanity: '理智',
                  knowledge: '知識',
                };
                
                // 獲取當前屬性值（更新前）
                const currentStats = {
                  speed: aiPlayer.character?.stats?.speed?.[0] ?? 4,
                  might: aiPlayer.character?.stats?.might?.[0] ?? 4,
                  sanity: aiPlayer.character?.stats?.sanity?.[0] ?? 4,
                  knowledge: aiPlayer.character?.stats?.knowledge?.[0] ?? 4,
                };
                
                Object.entries(changes).forEach(([stat, value]) => {
                  if (value !== 0) {
                    const oldValue = currentStats[stat as keyof typeof currentStats];
                    const newValue = Math.max(0, Math.min(8, oldValue + value));
                    const timeStr = new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
                    // 顯示格式：力量 3 -> 4 (+1)
                    setLog(prev => [...prev, `[${timeStr}] ${aiPlayer.name} ${statNames[stat]} ${oldValue} -> ${newValue} (${value > 0 ? '+' : ''}${value})`]);
                  }
                });
              }
            } else {
              console.log('[AI Debug] No stat changes to apply for AI:', aiPlayer.id);
            }

            // Issue #151-fix: 移除重複的回合結束日誌
            // 回合結束日誌已經包含在 result.logs 中，不需要額外添加
          }
        }
      );

      // Issue #148: 添加調試日誌
      console.log('[AI Debug] executeAllAITurns completed, results count:', results.length);

      // Issue #189: 檢查 AI 是否有抽卡，如果有則顯示卡牌彈窗
      // Issue #192: 同時處理事件卡檢定結果
      // Issue #195: 將 AI 事件檢定結果記錄到遊戲日誌
      for (const result of results) {
        if (result.drawnCard) {
          const aiPlayer = aiPlayers.find(p => p.id === result.playerId);
          if (aiPlayer) {
            // Issue #195: 記錄 AI 抽卡到遊戲日誌
            const timeStr = new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
            setLog(prev => [...prev, `[${timeStr}] ${aiPlayer.name} 抽到 ${result.drawnCard!.type === 'event' ? '事件' : result.drawnCard!.type === 'item' ? '物品' : '預兆'}卡: ${result.drawnCard!.name}`]);

            // Issue #195: 如果有事件檢定結果，記錄到遊戲日誌
            if (result.eventCheckResult) {
              const { stat, target, roll, success, effect } = result.eventCheckResult;
              const status = success ? '成功' : '失敗';
              const statNames: Record<string, string> = {
                speed: '速度',
                might: '力量',
                sanity: '理智',
                knowledge: '知識',
              };
              setLog(prev => [...prev,
                `  檢定: ${statNames[stat]} ${target}+ → 擲出 ${roll} (${status}!)`,
                `  效果: ${effect}`
              ]);
            }

            // Issue #201-fix: 更新 AI 玩家物品到前端狀態
            if (result.drawnCard && (result.drawnCard.type === 'item' || result.drawnCard.type === 'omen')) {
              setAiPlayers(prev => prev.map(p => {
                if (p.id !== result.playerId) return p;
                const newItem = { id: result.drawnCard!.id, name: result.drawnCard!.name, type: result.drawnCard!.type };
                if (result.drawnCard!.type === 'item') {
                  return { ...p, items: [...(p.items || []), newItem] };
                } else {
                  return { ...p, omens: [...(p.omens || []), newItem] };
                }
              }));
            }

            setAiCardDrawState({
              showCard: true,
              cardResult: {
                success: true,
                card: result.drawnCard,
                message: `${aiPlayer.name} 抽到 ${result.drawnCard.type === 'event' ? '事件' : result.drawnCard.type === 'item' ? '物品' : '預兆'}卡`,
                type: result.drawnCard.type,
              },
              aiPlayerName: aiPlayer.name,
              // Issue #192: 如果有事件檢定結果，一併傳遞
              eventCheckResult: result.eventCheckResult ? {
                stat: result.eventCheckResult.stat as 'speed' | 'might' | 'sanity' | 'knowledge',
                target: result.eventCheckResult.target,
                roll: result.eventCheckResult.roll,
                dice: result.eventCheckResult.dice,
                success: result.eventCheckResult.success,
                effectDescription: result.eventCheckResult.effect,
                message: `${result.eventCheckResult.success ? '成功' : '失敗'}: ${result.eventCheckResult.effect}`,
              } : null,
            });
            // 只顯示第一張抽到的卡
            break;
          }
        }
      }

      console.log('[AI Debug] All results:', results);

      setCurrentTurnPlayer('solo-player');
      setIsProcessingAITurn(false);
      setLog(prev => [...prev, '👤 你的回合']);

      // Issue #143: 切換回人類玩家的 Character Tab
      setSelectedPlayerId('solo-player');

      // 進入下一回合
      setTurn(t => t + 1);
      setMoves(player.stats.speed[0]);
      // Issue #144: 記錄新回合開始
      setLog(prev => [...prev, `回合 ${turn + 1}`]);

      // Issue #157-fix: 延遲更新可達位置，確保 multiFloorMap 已更新
      setTimeout(() => {
        updateReachablePositions(multiFloorMap[currentFloor], position, player.stats.speed[0], false);
      }, 100);

      // 完成回合切換
      setIsProcessingTurnSwitch(false);
    } else {
      // 沒有 AI 玩家時，直接進入下一回合
      setTurn(t => t + 1);
      setMoves(player.stats.speed[0]);
      // Issue #144: 「回合結束」已在函數開始時記錄
      setLog(prev => [...prev, `回合 ${turn + 1}`]);
      updateReachablePositions(multiFloorMap[currentFloor], position, player.stats.speed[0], false);

      // 完成回合切換
      setIsProcessingTurnSwitch(false);
    }
  };

  // Issue #189: 處理 AI 卡牌顯示關閉
  const handleAICardDisplayClose = () => {
    setAiCardDrawState({
      showCard: false,
      cardResult: null,
      aiPlayerName: '',
      eventCheckResult: null,
    });
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

  // Issue #122: 創建帶有最新位置的 AI 玩家列表（用於 GameBoard）
  // Issue #155: 添加除錯日誌
  // 注意：這個 useMemo 必須在所有 early returns 之前調用，以符合 React Hooks 規則
  const aiPlayersWithLatestPositions = useMemo(() => {
    console.log('[aiPlayersWithLatestPositions] Recalculating, aiPlayers count:', aiPlayers.length);
    console.log('[aiPlayersWithLatestPositions] aiPlayerPositions:', Array.from(aiPlayerPositions.entries()));
    const result = aiPlayers.map(aiPlayer => {
      const position = aiPlayerPositions.get(aiPlayer.id) || aiPlayer.position || { x: 7, y: 7, floor: 'ground' as Floor };
      console.log('[aiPlayersWithLatestPositions] AI:', aiPlayer.id, 'position:', position);
      return {
        ...aiPlayer,
        position,
      };
    });
    console.log('[aiPlayersWithLatestPositions] Result:', result.map(p => ({ id: p.id, position: p.position })));
    return result;
  }, [aiPlayers, aiPlayerPositions]);

  // Issue #127 & #134 & #141: 監聽回合結束，顯示確認後切換到下一個玩家
  // 注意：這個 useEffect 必須在所有 early returns 之前調用，以符合 React Hooks 規則
  // Issue #141: 只有當前玩家是 AI 時才自動切換回合，避免人類玩家的回合被自動跳過
  // Issue #144: 使用 ref 來避免無限循環和閉包問題
  // Issue #146-fix: 修復 useEffect 和 executeEndTurn 之間的競態條件
  const executeEndTurnRef = useRef(executeEndTurn);
  executeEndTurnRef.current = executeEndTurn;

  useEffect(() => {
    // 只有當前是 AI 玩家回合時才自動切換
    // 人類玩家回合（包括發現房間後）需要手動點擊 End Turn 按鈕
    if (turnState.hasEnded && !isProcessingTurnSwitch && !isProcessingAITurn && currentTurnPlayer !== 'solo-player') {
      // 注意：不要在此處設置 isProcessingTurnSwitch，讓 executeEndTurn 內部處理
      // Issue #138: 直接執行結束回合（無確認彈窗）
      // Issue #144: 使用 setTimeout 避免在渲染過程中調用 setState
      setTimeout(() => executeEndTurnRef.current(), 0);
    }
  }, [turnState.hasEnded, isProcessingTurnSwitch, isProcessingAITurn, currentTurnPlayer]);

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
    
    // Issue #190: 如果卡牌已經有檢定結果顯示，直接關閉並結束回合
    if (cardDrawState.eventCheckResult) {
      setCardDrawState({
        showCard: false,
        cardResult: null,
        isHauntRoll: false,
        hauntRollResult: null,
        eventCheckResult: null,
      });
      
      // Issue #127: 標記回合結束，觸發自動切換
      setTurnState({
        hasEnded: true,
        endedByDiscovery: true,
      });
      return;
    }
    
    setCardDrawState({
      showCard: false,
      cardResult: null,
      isHauntRoll: false,
      hauntRollResult: null,
      eventCheckResult: null,
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
    
    // Issue #127: 標記回合結束，觸發自動切換
    setTurnState({
      hasEnded: true,
      endedByDiscovery: true,
    });
  };

  // Issue #104: 處理事件卡檢定擲骰
  const handleEventCheckRoll = () => {
    if (!eventCheckState.card || !playerState) return;

    setEventCheckState(prev => ({ ...prev, isRolling: true }));

    // 執行檢定
    const result = effectApplier.performEventCheck(eventCheckState.card, playerState);

    // Issue #113: Debug logging for dice sum calculation
    console.log('[EventCheck] Dice roll result:', {
      dice: result.dice,
      sum: result.roll,
      target: result.target,
      success: result.success,
      calculatedSum: result.dice.reduce((a, b) => a + b, 0),
    });
    
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

      // Issue #115: 同步更新 player (Character) 的 stats
      // 注意：stats[0] 是當前值（UI 顯示用），stats[1] 是初始值
      setPlayer(prev => {
        if (!prev) return prev;
        const speedChange = result.statChanges?.speed || 0;
        const mightChange = result.statChanges?.might || 0;
        const sanityChange = result.statChanges?.sanity || 0;
        const knowledgeChange = result.statChanges?.knowledge || 0;
        return {
          ...prev,
          stats: {
            speed: [prev.stats.speed[0] + speedChange, prev.stats.speed[1]],
            might: [prev.stats.might[0] + mightChange, prev.stats.might[1]],
            sanity: [prev.stats.sanity[0] + sanityChange, prev.stats.sanity[1]],
            knowledge: [prev.stats.knowledge[0] + knowledgeChange, prev.stats.knowledge[1]],
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

    // Issue #190: 檢定完成後，關閉 EventCheckModal 並在 CardDisplay 中顯示結果
    // 延遲一下讓玩家看到檢定動畫
    setTimeout(() => {
      // 關閉 EventCheckModal
      setEventCheckState({
        showModal: false,
        card: null,
        isRolling: false,
        result: null,
      });

      // 重新顯示卡牌彈窗，並帶上檢定結果
      setCardDrawState(prev => ({
        ...prev,
        showCard: true,
        eventCheckResult: {
          success: result.success,
          roll: result.roll,
          dice: result.dice,
          stat: result.stat,
          target: result.target,
          message: result.message,
          effectDescription: result.effectDescription,
        },
      }));
    }, 2000); // 給玩家 2 秒時間看到檢定結果
  };

  // Issue #104: 處理關閉事件卡檢定模態框
  const handleCloseEventCheck = () => {
    setEventCheckState({
      showModal: false,
      card: null,
      isRolling: false,
      result: null,
    });
    
    // Issue #127: 標記回合結束，觸發自動切換
    setTurnState({
      hasEnded: true,
      endedByDiscovery: true,
    });
  };

  // Issue #119: 構建所有玩家列表（人類 + AI）
  // Issue #197: 添加除錯日誌追蹤 AI 玩家屬性
  // Issue #198-fix: 添加 useMemo 依賴項確保正確重新計算
  const buildAllPlayers = (): PlayerInfo[] => {
    // Issue #198-debug: 添加調試日誌追蹤重新渲染
    console.log('[buildAllPlayers] Called at:', Date.now());
    
    const players: PlayerInfo[] = [];

    // 添加人類玩家
    if (player && playerState) {
      players.push({
        id: 'solo-player',
        name: 'You',
        type: 'human',
        character: player,
        position: {
          x: position.x,
          y: position.y,
          floor: currentFloor,
        },
        stats: {
          speed: playerState.stats.speed,
          might: playerState.stats.might,
          sanity: playerState.stats.sanity,
          knowledge: playerState.stats.knowledge,
        },
        items: playerState.items.map(item => ({ id: item.id, name: item.name, type: item.type })),
        omens: playerState.omens.map(omen => ({ id: omen.id, name: omen.name, type: omen.type })),
        isAlive: true,
        isTraitor: hauntState.revelation?.traitorId === 'solo-player',
      });
    }

    // 添加 AI 玩家 - 使用最新的 aiPlayerPositions
    // Issue #197: 添加除錯日誌
    console.log('[buildAllPlayers] Building players, aiPlayers count:', aiPlayers.length);
    
    aiPlayers.forEach(aiPlayer => {
      // Issue #122: 優先使用 aiPlayerPositions 中的位置，確保顯示最新位置
      const aiPos = aiPlayerPositions.get(aiPlayer.id) || aiPlayer.position || { x: 7, y: 7, floor: 'ground' as Floor };
      
      // Issue #197: 檢查 character 和 stats 是否存在
      if (!aiPlayer.character || !aiPlayer.character.stats) {
        console.error('[buildAllPlayers] ERROR: AI player missing character or stats:', aiPlayer);
      }
      
      // Issue #198-fix: 確保讀取最新的 stats 值
      const stats = {
        speed: aiPlayer.character?.stats?.speed?.[0] ?? 0,
        might: aiPlayer.character?.stats?.might?.[0] ?? 0,
        sanity: aiPlayer.character?.stats?.sanity?.[0] ?? 0,
        knowledge: aiPlayer.character?.stats?.knowledge?.[0] ?? 0,
      };
      
      console.log('[buildAllPlayers] AI player stats:', {
        id: aiPlayer.id,
        name: aiPlayer.name,
        stats,
        rawStats: aiPlayer.character?.stats,
      });
      
      players.push({
        id: aiPlayer.id,
        name: aiPlayer.name,
        type: 'ai',
        character: aiPlayer.character,
        position: aiPos,
        stats,
        items: aiPlayer.items || [], // Issue #201-fix: Show AI player items
        omens: aiPlayer.omens || [],
        personality: aiPlayer.personality,
        isAlive: aiPlayer.isAlive,
        isTraitor: hauntState.revelation?.traitorId === aiPlayer.id,
      });
    });

    return players;
  };

  // Issue #119: 處理切換玩家 Tab
  const handleSelectPlayer = (playerId: string) => {
    setSelectedPlayerId(playerId);

    // 如果是 AI 玩家，將地圖置中到該 AI 的位置
    if (playerId !== 'solo-player') {
      const aiPlayer = aiPlayers.find(p => p.id === playerId);
      const aiPos = aiPlayerPositions.get(playerId) || aiPlayer?.position;
      
      if (aiPos) {
        // 切換到 AI 所在的樓層
        setCurrentFloor(aiPos.floor);
        
        // 更新日誌
        setLog(prev => [...prev, `👀 查看 ${aiPlayer?.name || 'AI'} 的位置`]);
      }
    } else {
      // 切換回人類玩家
      setLog(prev => [...prev, '👀 回到你的位置']);
    }
  };

  // Issue #119: 取得當前選中的玩家資訊
  // Issue #198-fix: 直接調用 buildAllPlayers 避免 hooks 問題
  const getSelectedPlayer = (): PlayerInfo | null => {
    const allPlayers = buildAllPlayers();
    return allPlayers.find(p => p.id === selectedPlayerId) || allPlayers[0] || null;
  };

  // Issue #119: 更新 AI 玩家位置（當 AI 行動時）
  // Issue #155: 添加除錯日誌追蹤 AI 位置更新
  const updateAIPlayerPosition = (playerId: string, newPosition: { x: number; y: number; floor: Floor }) => {
    console.log('[updateAIPlayerPosition] Called:', { playerId, newPosition });
    setAiPlayerPositions(prev => {
      const oldPosition = prev.get(playerId);
      console.log('[updateAIPlayerPosition] Old position:', oldPosition);
      const newMap = new Map(prev);
      newMap.set(playerId, newPosition);
      console.log('[updateAIPlayerPosition] New aiPlayerPositions size:', newMap.size);
      return newMap;
    });
  };

  // Issue #196: 更新 AI 玩家屬性（當事件檢定有屬性變化時）
  // Issue #197-fix: 添加詳細除錯日誌並確保狀態正確更新
  // Issue #198-fix: 確保創建新的陣列引用以觸發重新渲染
  const updateAIPlayerStats = (playerId: string, changes: { [stat: string]: number }) => {
    console.log('[updateAIPlayerStats] Called:', { playerId, changes });
    
    // Issue #197: 檢查是否有任何變化
    const hasChanges = Object.values(changes).some(v => v !== 0);
    if (!hasChanges) {
      console.log('[updateAIPlayerStats] No stat changes to apply, skipping');
      return;
    }
    
    setAiPlayers(prev => {
      console.log('[updateAIPlayerStats] setAiPlayers callback, prev length:', prev.length);
      
      // Issue #198-fix: 創建全新的陣列引用
      const newPlayers = prev.map(p => {
        if (p.id !== playerId) return p;
        
        // Issue #197: 檢查 character 和 stats 是否存在
        if (!p.character || !p.character.stats) {
          console.error('[updateAIPlayerStats] ERROR: AI player missing character or stats:', p);
          return p;
        }
        
        // 計算新的屬性值
        const currentSpeed = p.character.stats.speed?.[0] ?? 4;
        const currentMight = p.character.stats.might?.[0] ?? 4;
        const currentSanity = p.character.stats.sanity?.[0] ?? 4;
        const currentKnowledge = p.character.stats.knowledge?.[0] ?? 4;
        
        const newSpeed = Math.max(0, Math.min(8, currentSpeed + (changes.speed || 0)));
        const newMight = Math.max(0, Math.min(8, currentMight + (changes.might || 0)));
        const newSanity = Math.max(0, Math.min(8, currentSanity + (changes.sanity || 0)));
        const newKnowledge = Math.max(0, Math.min(8, currentKnowledge + (changes.knowledge || 0)));
        
        console.log('[updateAIPlayerStats] Updating stats for', p.name, ':', {
          oldStats: { speed: currentSpeed, might: currentMight, sanity: currentSanity, knowledge: currentKnowledge },
          newStats: { speed: newSpeed, might: newMight, sanity: newSanity, knowledge: newKnowledge },
          changes,
        });
        
        // Issue #198-fix: 創建全新的物件引用，確保每層都是新物件
        const updatedPlayer = {
          ...p,
          character: {
            ...p.character,
            stats: {
              speed: [newSpeed, p.character.stats.speed?.[1] ?? newSpeed] as [number, number],
              might: [newMight, p.character.stats.might?.[1] ?? newMight] as [number, number],
              sanity: [newSanity, p.character.stats.sanity?.[1] ?? newSanity] as [number, number],
              knowledge: [newKnowledge, p.character.stats.knowledge?.[1] ?? newKnowledge] as [number, number],
            },
          },
        };
        
        console.log('[updateAIPlayerStats] Updated player object:', {
          id: updatedPlayer.id,
          name: updatedPlayer.name,
          newStats: updatedPlayer.character.stats,
        });
        
        return updatedPlayer;
      });
      
      // Issue #198-fix: 返回全新的陣列引用
      return [...newPlayers];
    });
    
    // Issue #199-fix: 增加計數器強制重新渲染
    setAiStatUpdateCounter(prev => prev + 1);
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
        {/* Issue #119: Character Tabs - 顯示所有玩家 */}
        {aiPlayers.length > 0 && (
          <div className="mb-4">
            <CharacterTabs
              players={buildAllPlayers()}
              selectedPlayerId={selectedPlayerId}
              onSelectPlayer={handleSelectPlayer}
              currentTurnPlayerId={currentTurnPlayer}
            />
          </div>
        )}

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
                      roof: multiFloorMap.roof.map(row => row.map(tile => ({
                        ...tile,
                        floor: 'roof' as const,
                      }))),
                    },
                    turn: {
                      currentPlayerId: 'solo-player',
                    },
                  }}
                  aiPlayers={aiPlayersWithLatestPositions}
                  currentTurnPlayerId={currentTurnPlayer}
                  onAIClick={(aiId) => {
                    const ai = aiPlayers.find(p => p.id === aiId);
                    if (ai?.position) {
                      setCurrentFloor(ai.position.floor);
                      setLog(prev => [...prev, `👀 查看 ${ai.name} 的位置`])
                    }
                  }}
                />
              </div>
            </div>

            {/* 移動控制 */}
            <div className="mt-4 bg-gray-800/50 rounded-xl p-3 sm:p-4 border border-gray-700">
              <div className="flex justify-center gap-3">
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
                
                {/* Hero AI 測試按鈕 (Issue #109) */}
                {hauntState.isActive && heroAIs.size > 0 && (
                  <Button
                    onClick={() => executeHeroAITurn('ai-hero-1')}
                    variant="secondary"
                    size="sm"
                    className="h-10 sm:h-12 text-xs sm:text-sm"
                    disabled={isAIThinking}
                  >
                    {isAIThinking ? '🤖 思考中...' : '🤖 AI 回合'}
                  </Button>
                )}
              </div>
              
              {/* 狀態訊息 */}
              {isProcessingTurnSwitch && (
                <motion.p 
                  className="text-blue-400 text-center mt-3 text-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  切換中...
                </motion.p>
              )}
              
              {discovered && (
                <motion.p 
                  className="text-yellow-500 text-center mt-3 text-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  已發現新房間，回合結束
                </motion.p>
              )}
              
              {/* End Turn Button (Issue #135) - 移至狀態訊息下方 */}
              {/* Issue #190: 當已發現房間或沒有可移動位置時，高亮結束回合按鈕 */}
              <div className="flex justify-center mt-3">
                <motion.div
                  animate={
                    discovered || reachablePositions.length === 0
                      ? {
                          scale: [1, 1.05, 1],
                          boxShadow: [
                            '0 0 0 0 rgba(59, 130, 246, 0)',
                            '0 0 0 10px rgba(59, 130, 246, 0.3)',
                            '0 0 0 0 rgba(59, 130, 246, 0)',
                          ],
                        }
                      : {}
                  }
                  transition={
                    discovered || reachablePositions.length === 0
                      ? {
                          duration: 1.5,
                          repeat: Infinity,
                          ease: 'easeInOut',
                        }
                      : {}
                  }
                >
                  <Button
                    onClick={() => {
                      console.log('[EndTurn] Button clicked!');
                      showEndTurnConfirmation(false);
                    }}
                    variant={discovered || reachablePositions.length === 0 ? 'primary' : 'secondary'}
                    size="sm"
                    className={`h-10 sm:h-12 text-xs sm:text-sm ${
                      discovered || reachablePositions.length === 0
                        ? 'bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-600/30 animate-pulse'
                        : ''
                    }`}
                    disabled={
                      isProcessingTurnSwitch ||
                      isProcessingAITurn ||
                      currentTurnPlayer !== 'solo-player'
                    }
                  >
                    {discovered ? '回合結束（已探索）' : '結束回合'}
                  </Button>
                </motion.div>
              </div>
            </div>
          </div>

          {/* 右側：玩家面板與日誌 */}
          <div className="space-y-4">
            {/* Issue #119: Character Detail Panel - 顯示選中玩家的詳細資訊 */}
            {/* Issue #198-fix: 添加 key 屬性強制重新渲染當屬性變化時 */}
            {aiPlayers.length > 0 ? (
              <>
                {(() => {
                  const selectedPlayer = getSelectedPlayer();
                  return (
                    <CharacterDetailPanel 
                      key={`${selectedPlayer?.id}-${aiStatUpdateCounter}`}
                      player={selectedPlayer} 
                    />
                  );
                })()}
                {/* Issue #201-fix: 背包與預兆面板 - 根據選中的玩家顯示對應的背包 */}
                {(() => {
                  const selectedPlayer = getSelectedPlayer();
                  if (!selectedPlayer) return null;
                  
                  // 人類玩家使用 playerState，AI 玩家使用 selectedPlayer
                  const items = selectedPlayer.type === 'human' 
                    ? playerState?.items || []
                    : (selectedPlayer.items as Card[]) || [];
                  const omens = selectedPlayer.type === 'human'
                    ? playerState?.omens || []
                    : (selectedPlayer.omens as Card[]) || [];
                  
                  return (
                    <InventoryPanel
                      items={items}
                      omens={omens}
                      omenCount={cardManager.getDeckStatus().omenCount}
                      hauntTriggered={cardManager.getDeckStatus().hauntTriggered}
                      defaultExpanded={false}
                    />
                  );
                })()}
              </>
            ) : (
              /* 沒有 AI 玩家時顯示原有人類玩家面板 */
              <>
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
                    defaultExpanded={false}
                  />
                )}
              </>
            )}

            {/* 遊戲日誌 */}
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
              <h3 className="text-lg font-bold mb-3">遊戲日誌</h3>
              <GameLog log={log} />
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



            {/* Hero AI 狀態面板 (Issue #109) */}
            {hauntState.isActive && heroAIs.size > 0 && (
              <motion.div 
                className="bg-gray-800/50 rounded-xl p-4 border border-gray-700"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold">🤖 Hero AI 狀態</h3>
                  <span className="text-xs bg-blue-900/50 px-2 py-1 rounded text-blue-300">
                    難度: {aiDifficulty === 'easy' ? '簡單' : aiDifficulty === 'medium' ? '中等' : '困難'}
                  </span>
                </div>
                
                {isAIThinking && (
                  <div className="flex items-center gap-2 text-yellow-400 mb-3">
                    <motion.div
                      className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    />
                    <span className="text-sm">AI 正在思考...</span>
                  </div>
                )}
                
                {aiActionLog.length > 0 && (
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    <p className="text-xs text-gray-400 mb-2">最近行動:</p>
                    {aiActionLog.slice(-5).map((action, i) => (
                      <p key={i} className="text-sm text-gray-300 bg-gray-700/30 px-2 py-1 rounded">
                        {action}
                      </p>
                    ))}
                  </div>
                )}
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
        eventCheckResult={cardDrawState.eventCheckResult}
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

      {/* Issue #189: AI 抽卡顯示 */}
      {/* Issue #192: 傳遞事件檢定結果給 CardDisplay */}
      <CardDisplay
        card={aiCardDrawState.showCard ? aiCardDrawState.cardResult?.card || null : null}
        onClose={handleAICardDisplayClose}
        animate={true}
        eventCheckResult={aiCardDrawState.eventCheckResult}
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

/**
 * 遊戲日誌組件 - 自動滾動到最新條目
 */
interface GameLogProps {
  log: string[];
}

function GameLog({ log }: GameLogProps) {
  const logContainerRef = useRef<HTMLDivElement>(null);

  // 自動滾動到最新日誌條目（只滾動容器，不滾動整個頁面）
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTo({
        top: logContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [log]);

  return (
    <div ref={logContainerRef} className="h-64 overflow-y-auto space-y-2 pr-2">
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
  );
}
