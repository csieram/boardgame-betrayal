# Core Game State Architecture API Contract

## 概述

本文檔定義了 Betrayal at House on the Hill 遊戲的核心狀態架構 API 契約。這是所有其他功能（Rules Engine、Frontend、AI）的基礎。

**版本**: 1.0.0  
**狀態**: 🟢 Pending Approval  
**作者**: Agent 1 (Core Architect)

---

## 核心設計原則

1. **Immutable** - 所有狀態更新都返回新物件，不修改原狀態
2. **Serializable** - 支援 JSON 序列化，實現 save/load 功能
3. **Deterministic** - 使用 seeded RNG，支援 replay 功能
4. **Multiplayer-ready** - 狀態設計支援多人同步

---

## 目錄

- [GameState](#gamestate)
- [Player](#player)
- [Map & Tile](#map--tile)
- [Actions](#actions)
- [RNG System](#rng-system)
- [Serialization](#serialization)

---

## GameState

### 介面定義

```typescript
interface GameState {
  gameId: string;              // 遊戲唯一 ID
  version: string;             // 狀態版本（用於 migration）
  phase: GamePhase;            // 當前遊戲階段
  result: GameResult;          // 遊戲結果
  config: GameConfig;          // 遊戲設定
  map: GameMap;                // 遊戲地圖
  players: Player[];           // 所有玩家
  playerOrder: string[];       // 玩家順序（ID 列表）
  turn: TurnState;             // 當前回合狀態
  cardDecks: CardDecks;        // 卡牌堆
  roomDeck: RoomDeckState;     // 房間牌堆
  haunt: HauntState;           // 作祟狀態
  combat: CombatState;         // 戰鬥狀態
  log: GameLogEntry[];         // 遊戲歷史
  createdAt: number;           // 建立時間戳
  updatedAt: number;           // 更新時間戳
  rngState: RngState;          // RNG 狀態（用於 replay）
}
```

### GamePhase

```typescript
type GamePhase =
  | 'setup'           // 遊戲設置中
  | 'character_select' // 選擇角色
  | 'exploration'     // 探索階段
  | 'haunt_reveal'    // 作祟揭示中
  | 'haunt'           // 作祟進行中
  | 'game_over';      // 遊戲結束
```

---

## Player

### 介面定義

```typescript
interface Player {
  id: string;                  // 玩家唯一 ID
  name: string;                // 玩家名稱
  character: Character;        // 使用的角色
  position: Position3D;        // 當前位置
  currentStats: CharacterStats; // 當前屬性值
  items: Card[];               // 持有的物品卡
  omens: Card[];               // 持有的預兆卡
  isTraitor: boolean;          // 是否為叛徒
  isDead: boolean;             // 是否死亡
  usedItemsThisTurn: string[]; // 本回合已使用的物品 ID
}
```

### CharacterStats

```typescript
interface CharacterStats {
  speed: number;      // 速度（影響移動）
  might: number;      // 力量（影響戰鬥）
  sanity: number;     // 理智（影響心智檢定）
  knowledge: number;  // 知識（影響知識檢定）
}
```

---

## Map & Tile

### 地圖結構

```typescript
interface GameMap {
  ground: FloorMap;   // 地面層（15x15）
  upper: FloorMap;    // 上層（15x15）
  basement: FloorMap; // 地下室（15x15）
  placedRoomCount: number; // 已放置房間數
}

type FloorMap = Tile[][];  // 15x15 網格
```

### Tile

```typescript
interface Tile {
  x: number;                    // X 座標 (0-14)
  y: number;                    // Y 座標 (0-14)
  floor: Floor;                 // 所屬樓層
  room: Room | null;            // 房間資料（null 表示未放置）
  discovered: boolean;          // 是否已被發現
  rotation: 0 | 90 | 180 | 270; // 房間旋轉角度
  placementOrder: number;       // 放置順序（用於 replay）
}
```

### 常數

```typescript
const MAP_SIZE = 15;      // 地圖大小
const MAP_CENTER = 7;     // 地圖中心點
```

---

## Actions

### Action 基礎介面

```typescript
interface GameAction {
  type: string;         // 動作類型
  playerId: string;     // 執行玩家 ID
  timestamp: number;    // 時間戳
  actionId: string;     // 動作 ID（唯一）
}
```

### 支援的動作類型

#### 1. MOVE - 移動

```typescript
interface MoveAction extends GameAction {
  type: 'MOVE';
  to: Position3D;       // 目標位置
  path: Position3D[];   // 移動路徑
}
```

#### 2. DISCOVER - 發現房間

```typescript
interface DiscoverAction extends GameAction {
  type: 'DISCOVER';
  direction: Direction; // 發現方向
  room: Room;           // 抽到的房間
  position: Position3D; // 放置位置
  rotation: 0 | 90 | 180 | 270; // 旋轉角度
}
```

**規則**: 發現新房間後，回合自動結束。

#### 3. DRAW_CARD - 抽卡

```typescript
interface DrawCardAction extends GameAction {
  type: 'DRAW_CARD';
  cardType: CardType;   // 卡牌類型
  card: Card;           // 抽到的卡牌
}
```

**規則**: 根據房間符號抽卡（E=事件, I=物品, O=預兆）。

#### 4. USE_ITEM - 使用物品

```typescript
interface UseItemAction extends GameAction {
  type: 'USE_ITEM';
  itemId: string;       // 物品 ID
  target?: string;      // 目標（如適用）
}
```

**規則**: 每回合每項物品只能使用一次。

#### 5. END_TURN - 結束回合

```typescript
interface EndTurnAction extends GameAction {
  type: 'END_TURN';
}
```

#### 6. STAT_CHECK - 屬性檢定

```typescript
interface StatCheckAction extends GameAction {
  type: 'STAT_CHECK';
  stat: StatType;       // 檢定屬性
  target: number;       // 目標值
  roll: DiceRoll;       // 擲骰結果
  success: boolean;     // 是否成功
}
```

#### 7. HAUNT_CHECK - 作祟檢定

```typescript
interface HauntCheckAction extends GameAction {
  type: 'HAUNT_CHECK';
  roll: DiceRoll;       // 擲骰結果
  triggered: boolean;   // 是否觸發作祟
}
```

**規則**: 擲骰數量 = 已發現預兆數，結果 ≥ 5 觸發。

#### 8. COMBAT - 戰鬥

```typescript
interface CombatAction extends GameAction {
  type: 'COMBAT';
  combatType: 'attack' | 'defend' | 'flee';
  targetId: string;     // 目標玩家 ID
  stat: StatType;       // 使用的屬性
  roll: DiceRoll;       // 擲骰結果
}
```

### 應用動作

```typescript
// 使用 GameStateManager
const manager = GameStateManager.createNew(config, characters);
const newState = manager.applyAction(action);
```

---

## RNG System

### SeededRng

```typescript
class SeededRng {
  constructor(seed: string);
  
  next(): number;                    // 生成 0-1 隨機數
  nextInt(min: number, max: number): number;  // 生成整數
  rollDice(count: number): DiceRoll; // 擲骰子
  shuffle<T>(array: T[]): T[];       // 洗牌
  pickOne<T>(array: T[]): T;         // 隨機選擇
  
  getState(): RngState;              // 取得狀態
  static fromState(state: RngState): SeededRng;  // 恢復狀態
}
```

### DiceRoll

```typescript
interface DiceRoll {
  count: number;      // 擲骰數量
  results: number[];  // 每個骰子的結果
  total: number;      // 總和
}
```

### 骰子面數

```typescript
const DICE_FACES = [0, 0, 1, 1, 2, 2];
```

---

## Serialization

### 序列化

```typescript
const manager = GameStateManager.createNew(config, characters);
const json = manager.serialize();
// 保存到 localStorage 或發送到伺服器
```

### 反序列化

```typescript
const restoredManager = GameStateManager.deserialize(json);
const state = restoredManager.getState();
```

### 狀態結構

序列化後的 JSON 包含所有遊戲狀態，包括：
- 地圖狀態
- 玩家狀態
- 牌堆狀態
- RNG 狀態（確保 replay 一致性）

---

## 使用範例

### 建立新遊戲

```typescript
import { GameStateManager } from '@betrayal/game-engine';
import { CHARACTERS } from '@betrayal/shared';

const config = {
  playerCount: 3,
  enableAI: false,
  seed: 'my-game-seed',  // 用於 deterministic replay
  maxTurns: 100,
};

const manager = GameStateManager.createNew(config, CHARACTERS.slice(0, 3));
const state = manager.getState();
```

### 執行移動

```typescript
const moveAction: MoveAction = {
  type: 'MOVE',
  playerId: state.turn.currentPlayerId,
  timestamp: Date.now(),
  actionId: '',  // 會自動生成
  to: { x: 7, y: 6, floor: 'ground' },
  path: [{ x: 7, y: 6, floor: 'ground' }],
};

const newState = manager.applyAction(moveAction);
```

### 發現新房間

```typescript
const room = manager.drawRoomFromDeck('ground');
if (room) {
  const discoverAction: DiscoverAction = {
    type: 'DISCOVER',
    playerId: state.turn.currentPlayerId,
    timestamp: Date.now(),
    actionId: '',
    direction: 'north',
    room,
    position: { x: 7, y: 6, floor: 'ground' },
    rotation: 0,
  };
  
  const newState = manager.applyAction(discoverAction);
}
```

---

## 對其他 Agent 的影響

### Agent 2 (Rules Engine)

- **輸入**: `GameState`, `GameAction` 類型
- **使用**: `applyAction()` 進行狀態轉換
- **注意**: 所有規則檢查應在呼叫 `applyAction()` 之前完成

### Agent 3 (Frontend)

- **輸入**: `GameState`, `Player`, `Tile`, `Room`
- **使用**: `getState()` 取得當前狀態渲染 UI
- **注意**: 狀態是 immutable，可以直接用於 React state

### Agent 4 (AI Player)

- **輸入**: `GameState`, 所有 Action 類型
- **使用**: 分析狀態，生成合法的 Action
- **注意**: 使用 `SeededRng` 確保 AI 行為可重現

### Agent 5 (Rule QA)

- **輸入**: 完整的狀態和動作歷史
- **使用**: `serialize()` / `deserialize()` 進行測試
- **注意**: 驗證所有狀態轉換符合規則書

---

## 檔案位置

```
packages/game-engine/
├── src/
│   ├── core/
│   │   └── GameState.ts      # 核心狀態管理
│   ├── types/
│   │   └── index.ts          # 所有類型定義
│   └── test/
│       └── GameState.test.ts # 單元測試
└── API_CONTRACT.md           # 本文檔
```

---

## 變更日誌

### v1.0.0 (2026-03-22)

- ✅ 建立 `GameState` 介面
- ✅ 實作 `Tile` grid system（15x15 map）
- ✅ 實作 `Player` state（position, items, omens, stats）
- ✅ 實作 `RoomDeck` deck management（依樓層抽牌）
- ✅ 實作 deterministic RNG foundation（支援 replay）
- ✅ 定義所有 Action types（Move, Discover, DrawCard, UseItem, EndTurn）
- ✅ 實作 `applyAction()` 狀態轉換函數
- ✅ 實作序列化/反序列化
- ✅ 新增 30 個單元測試

---

## 待辦事項

- [ ] 實作更複雜的移動路徑驗證
- [ ] 實作房間門連接驗證
- [ ] 實作作祟階段狀態轉換
- [ ] 實作戰鬥系統完整邏輯
- [ ] 實作角色死亡處理
- [ ] 實作勝利條件檢查

---

**狀態**: 🟢 Pending Approval  
**測試**: 30/30 passed  
**文件**: Complete
