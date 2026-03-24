# AI Player System 設計文檔

## Issue #110: AI Players for Full Solo Game

## 概述

本系統實現了完整的 AI 玩家功能，讓 AI 可以從遊戲開始到結束全程參與遊戲，與人類玩家一起進行單人遊戲。

## 主要組件

### 1. AIPlayer.ts

核心 AI 玩家控制器，負責：
- 探索階段的決策（移動、發現房間、抽卡）
- 作祟階段的行為（使用 TraitorAI 或 HeroAI）
- 多種個性類型的行為差異
- 難度等級的決策品質調整

**主要類型：**
- `AIPersonality`: 'explorer' | 'cautious' | 'aggressive'
- `AIPlayerConfig`: AI 配置選項
- `TurnExecutionResult`: 回合執行結果

**個性特徵：**
- **Explorer (探索者)**: 優先發現新房間，探索優先級 2.0x
- **Cautious (謹慎者)**: 避免危險，安全優先級 2.0x
- **Aggressive (激進者)**: 願意冒險，戰鬥優先級 1.8x

### 2. AIExplorationEngine.ts

專門處理探索階段的 AI 邏輯：
- 房間發現策略分析
- 移動路徑規劃
- 卡牌處理決策
- 屬性檢定策略

**主要功能：**
- `analyzeExplorationOptions()`: 分析所有探索選項
- `planMovement()`: 規劃移動路徑
- `decideCardHandling()`: 決定如何處理抽到的卡牌
- `decideStatCheckStrategy()`: 決定屬性檢定策略

### 3. AIPlayerManager.ts

管理多個 AI 玩家：
- AI 玩家的創建和初始化
- 回合順序管理（人類 → AI1 → AI2 → AI3 → 下一輪）
- AI 玩家狀態同步
- 遊戲設置選項生成

**回合流程：**
```
Human Turn → AI Player 1 Turn → AI Player 2 Turn → AI Player 3 Turn → Next Round
```

## 使用方式

### 在單人遊戲中啟用 AI 玩家

1. **角色選擇頁面** (`/solo/select`):
   - 選擇 AI 玩家數量 (0-3)
   - 選擇遊戲難度 (Easy/Medium/Hard)
   - 為每個 AI 選擇個性

2. **遊戲頁面** (`/solo`):
   - AI 玩家會在人類回合後自動執行回合
   - AI 行動會顯示在遊戲日誌中
   - AI 玩家面板顯示所有 AI 的狀態

### 代碼示例

```typescript
// 創建 AI 玩家管理器
const aiManager = createAIPlayerManager(
  'human-player-id',
  2, // 2 個 AI 玩家
  'medium', // 中等難度
  'random-seed'
);

// 初始化 AI 玩家
const aiPlayers = aiManager.initializeAIPlayers(
  gameState,
  humanCharacter,
  ['explorer', 'cautious'] // AI 個性
);

// 執行 AI 回合
const result = await aiManager.executeNextAITurn(gameState);
```

## 難度等級

### Easy (簡單)
- 50% 機率選擇最佳決策，50% 隨機選擇
- AI 會犯錯，適合新手玩家

### Medium (中等)
- 80% 機率選擇最佳決策，20% 選擇次佳
- 平衡的挑戰

### Hard (困難)
- 總是選擇最佳決策
- 專家級挑戰

## 與現有系統的整合

### 探索階段
- 使用 `RoomDiscoveryManager` 進行房間發現
- 使用 `CardDrawingManager` 進行卡牌抽取
- 遵循所有探索階段規則

### 作祟階段
- 叛徒 AI 使用現有的 `TraitorAI`
- 英雄 AI 使用現有的 `HeroAI`
- 無縫切換到 Haunt 階段邏輯

## 測試

測試文件位於：`packages/game-engine/src/ai/__tests__/AIPlayer.test.ts`

運行測試：
```bash
npm test -- packages/game-engine/src/ai/__tests__/AIPlayer.test.ts
```

## 未來改進

1. **學習系統**: 讓 AI 從遊戲經驗中學習
2. **更複雜的策略**: 實現基於劇本的特定策略
3. **協作 AI**: 讓多個 AI 玩家之間可以協作
4. **自定義 AI**: 允許玩家自定義 AI 行為

## 檔案結構

```
packages/game-engine/src/ai/
├── AIPlayer.ts              # 主要 AI 玩家控制器
├── AIExplorationEngine.ts   # 探索階段引擎
├── AIPlayerManager.ts       # AI 玩家管理器
├── AIDecisionEngine.ts      # 決策引擎（現有）
├── HeroAI.ts                # 英雄 AI（現有）
├── TraitorAI.ts             # 叛徒 AI（現有）
├── index.ts                 # 模組入口
└── __tests__/
    ├── AIPlayer.test.ts     # AI 玩家測試
    ├── HeroAI.test.ts       # 英雄 AI 測試（現有）
    └── TraitorAI.test.ts    # 叛徒 AI 測試（現有）
```

## 依賴關係

- `@betrayal/shared`: 角色和房間數據
- `../types`: 遊戲狀態類型
- `../rules/movement`: 移動系統
- `../rules/roomDiscovery`: 房間發現系統
- `./AIDecisionEngine`: 決策引擎
- `./HeroAI`: 英雄 AI（作祟階段）
- `./TraitorAI`: 叛徒 AI（作祟階段）
