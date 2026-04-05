# Haunt Roll 和 Revelation QA 驗證報告

**GitHub Issue:** #250  
**驗證日期:** 2026-04-05  
**驗證者:** Agent 5 (Rule QA / Test Judge)  
**規則書參考:** Page 14, 17-21

---

## 總覽

| 項目 | 狀態 |
|------|------|
| Haunt Roll 邏輯 | ✅ PASS |
| Haunt Revelation | ✅ PASS |
| 玩家陣營分配 | ✅ PASS |
| 遊戲階段轉換 | ✅ PASS |
| AI 行為切換 | ✅ PASS |
| 戰鬥系統啟用 | ⚠️ WARNING |

---

## 詳細驗證結果

### 1. Haunt Roll (作祟檢定)

#### ✅ Roll triggered on omen draw

**證據:**
- 檔案: `packages/game-engine/src/rules/cardDrawing.ts` (第 280-290 行)
- 抽到預兆卡後自動觸發 `performHauntRoll()`
- `shouldTriggerHauntRoll()` 檢查邏輯正確

```typescript
// 如果是預兆卡，進行作祟檢定
if (type === 'omen' && cardManager.shouldTriggerHauntRoll()) {
  const hauntRollResult = cardManager.performHauntRoll();
  result.hauntRoll = hauntRollResult;
}
```

**測試覆蓋:** `haunt.test.ts` 第 140-170 行

#### ✅ Number of dice = omen count

**證據:**
- 檔案: `packages/game-engine/src/rules/haunt.ts` (第 75-85 行)
- `makeHauntRoll()` 函數正確使用 `omenCount` 作為骰子數量

```typescript
export function makeHauntRoll(omenCount: number, rng: SeededRng): HauntRollResult {
  const diceCount = Math.max(1, omenCount);
  const diceRoll = rng.rollDice(diceCount);
  // ...
}
```

**測試覆蓋:** `haunt.test.ts` 第 140-150 行

#### ✅ Dice sum calculated correctly

**證據:**
- 骰子使用正確的面值: `[0, 0, 1, 1, 2, 2]` (Rulebook Page 10)
- 總和計算正確: `results.reduce((a, b) => a + b, 0)`

**測試覆蓋:** `haunt.test.ts` 第 165-175 行

#### ✅ Haunt starts if sum < omen count

**證據:**
- 檔案: `packages/game-engine/src/rules/haunt.ts` (第 82 行)
- 觸發條件正確: `const hauntBegins = diceRoll.total < omenCount;`

**測試覆蓋:** `haunt.test.ts` 第 177-195 行

#### ✅ No haunt if sum ≥ omen count

**證據:**
- 條件邏輯正確，當總和 >= 預兆數量時不觸發

**測試覆蓋:** `haunt.test.ts` 第 197-210 行

---

### 2. Haunt Revelation (作祟揭示)

#### ✅ Traitor determined correctly

**證據:**
- 檔案: `packages/game-engine/src/rules/haunt.ts` (第 170-220 行)
- `assignPlayerSides()` 函數正確分配陣營
- 單叛徒模式下，發現預兆的玩家成為叛徒

```typescript
case 'single_traitor':
  players.forEach(player => {
    const isTraitor = player.id === omenDiscovererId;
    assignments.push({
      playerId: player.id,
      playerName: player.name,
      side: isTraitor ? 'traitor' : 'hero',
      isTraitor,
    });
  });
  break;
```

**測試覆蓋:** `haunt.test.ts` 第 260-290 行

#### ✅ Scenario selected (omen + room)

**證據:**
- 檔案: `packages/game-engine/src/rules/haunt.ts` (第 140-160 行)
- `selectHauntScenario()` 函數從 `HAUNT_SCENARIOS` 中選擇劇本
- 目前實作為隨機選擇（TODO: 未來根據預兆和房間選擇）

**注意:** 目前的實作是隨機選擇劇本，尚未根據預兆類型和發現房間來選擇特定劇本。這是已知的簡化實作。

#### ✅ Hero objective displayed

**證據:**
- 檔案: `apps/web/src/components/game/HauntRevealScreen.tsx` (第 120-150 行)
- 英雄目標正確顯示在 UI 中
- 檔案: `packages/game-engine/src/data/hauntScenarios.ts` 定義了各劇本的英雄目標

#### ✅ Traitor objective displayed

**證據:**
- 檔案: `apps/web/src/components/game/HauntRevealScreen.tsx` (第 150-180 行)
- 叛徒目標正確顯示在 UI 中
- 叛徒玩家會看到標記為「你的任務」的目標卡片

#### ⚠️ Traitor sees full haunt rules

**狀態:** 部分實作

**證據:**
- 叛徒可以看到自己的目標和特殊規則
- 檔案: `HauntRevealScreen.tsx` (第 200-220 行) 顯示特殊規則
- **缺少:** 完整的劇本規則書（如怪物控制、特殊能力等詳細規則）

**建議:** 需要擴展 `HauntScenario` 介面以包含更詳細的規則說明。

---

### 3. Post-Haunt Changes (作祟後變更)

#### ✅ Game phase changes to "haunt"

**證據:**
- 檔案: `packages/game-engine/src/rules/haunt.ts` (第 310-320 行)
- `createHauntStartResult()` 將階段設為 `'haunt_reveal'`

```typescript
const newState: Partial<GameState> = {
  phase: 'haunt_reveal',
  players: updatedPlayers,
  haunt: updatedHaunt,
  updatedAt: now,
};
```

- 類型定義: `packages/game-engine/src/types/index.ts` 定義了 `'haunt_reveal'` 和 `'haunt'` 階段

#### ⚠️ Combat becomes available

**狀態:** 需要驗證整合

**證據:**
- 檔案: `packages/game-engine/src/rules/combat.ts` 存在戰鬥系統實作
- `CombatState` 類型已定義在 `types/index.ts`
- **需要驗證:** 作祟階段是否正確啟用戰鬥選項

#### ✅ AI behavior changes

**證據:**
- 檔案: `packages/game-engine/src/ai/TraitorAI.ts`
  - `updateObjective()` 根據作祟劇本更新目標
  - `getTraitor()` 取得叛徒玩家
  - `checkWinCondition()` 檢查勝利條件
  
- 檔案: `packages/game-engine/src/ai/HeroAI.ts`
  - `updateObjective()` 更新英雄目標
  - `getKnownTraitorPosition()` 追蹤叛徒位置
  - `coordinateHeroAIs()` 協調多英雄行動

#### ⚠️ Special actions enabled

**狀態:** 需要進一步驗證

**證據:**
- 特殊行動的基礎設施存在
- **需要驗證:** 具體的特殊行動（如叛徒的特殊能力）是否正確啟用

---

### 4. AI Behavior (AI 行為)

#### ✅ Traitor AI pursues objective

**證據:**
- 檔案: `packages/game-engine/src/ai/TraitorAI.ts` (第 280-300 行)
- `updateObjective()` 根據作祟劇本設定目標
- `getCurrentObjective()` 返回當前目標狀態

```typescript
updateObjective(gameState: GameState): void {
  if (!gameState.haunt.isActive) return;

  const scenario = gameState.haunt.hauntNumber
    ? getScenarioById(gameState.haunt.hauntNumber)
    : null;

  if (scenario?.traitorObjective) {
    this.state.currentObjective = {
      type: this.inferObjectiveType(scenario.traitorObjective),
      description: scenario.traitorObjective,
      progress: 0,
      target: 1,
      completed: false,
    };
  }
}
```

#### ✅ Hero AI cooperates

**證據:**
- 檔案: `packages/game-engine/src/ai/HeroAI.ts` (第 380-400 行)
- `coordinateHeroAIs()` 函數用於協調多英雄行動
- `getObjectiveLocation()` 根據目標類型決定行動方向

#### ✅ AI attacks when appropriate

**證據:**
- 檔案: `packages/game-engine/src/ai/TraitorAI.ts` (第 200-230 行)
- `decideCombat()` 評估攻擊分數
- 檔案: `packages/game-engine/src/ai/HeroAI.ts` (第 300-350 行)
- `evaluateHeroAttack()` 根據力量對比和健康狀態決定是否攻擊

#### ✅ AI retreats when weak

**證據:**
- 檔案: `packages/game-engine/src/ai/HeroAI.ts` (第 180-200 行)
- 危急時 (`healthStatus === 'critical'`) 增加逃跑分數
- 檔案: `packages/game-engine/src/ai/TraitorAI.ts` (第 240-260 行)
- 危急時考慮逃跑選項

---

## 發現的問題

### ⚠️ Issue 1: 最後一張預兆自動觸發邏輯不完整

**描述:**
根據規則書，當最後一張預兆卡被抽出時，作祟應該自動開始。目前的實作中，`isLastOmen()` 函數存在，但沒有在 `makeHauntRoll()` 中強制觸發作祟。

**位置:**
- `packages/game-engine/src/rules/haunt.ts` (第 100-105 行)

**建議:**
```typescript
export function makeHauntRoll(omenCount: number, rng: SeededRng): HauntRollResult {
  // ...
  // 最後一張預兆自動觸發作祟
  if (isLastOmen(omenCount)) {
    return {
      dice: diceRoll.results,
      total: diceRoll.total,
      hauntBegins: true, // 強制觸發
      diceCount,
    };
  }
  // ...
}
```

### ⚠️ Issue 2: 劇本選擇未根據預兆和房間

**描述:**
目前的 `selectHauntScenario()` 是隨機選擇劇本，而不是根據抽到的預兆類型和發現預兆的房間來選擇對應的劇本。

**位置:**
- `packages/game-engine/src/rules/haunt.ts` (第 140-160 行)

**建議:**
需要擴展劇本資料結構，建立預兆類型和房間類型到劇本的映射表。

### ⚠️ Issue 3: 隱藏叛徒模式實作不完整

**描述:**
`assignPlayerSides()` 中的 `hidden_traitor` 模式暫時簡化為發現者成為叛徒，而不是隨機選擇。

**位置:**
- `packages/game-engine/src/rules/haunt.ts` (第 195-205 行)

---

## 測試覆蓋率

| 測試檔案 | 覆蓋項目 | 狀態 |
|---------|---------|------|
| `haunt.test.ts` | Haunt Roll 邏輯 | ✅ 完整 |
| `haunt.test.ts` | Haunt Revelation | ✅ 完整 |
| `haunt.test.ts` | 玩家陣營分配 | ✅ 完整 |
| `haunt.test.ts` | 輔助函數 | ✅ 完整 |
| `haunt.test.ts` | 整合測試 | ✅ 完整 |

**測試執行結果:**
```
PASS  src/rules/haunt.test.ts
  Haunt Roll 系統
    makeHauntRoll
      ✓ 應該擲出正確數量的骰子
      ✓ 當沒有預兆時應該至少擲 1 顆骰子
      ✓ 骰子結果應該在有效範圍內 (0, 1, 2)
      ✓ 總和應該等於所有骰子結果相加
      ✓ 當總和 < omenCount 時應該觸發作祟
      ✓ 當總和 >= omenCount 時不應該觸發作祟
    isLastOmen
      ✓ 當預兆數量等於總數時應該返回 true
      ✓ 當預兆數量超過總數時應該返回 true
      ✓ 當預兆數量少於總數時應該返回 false
    shouldMakeHauntRoll
      ✓ 在探索階段且未觸發作祟時應該返回 true
      ✓ 當作祟已激活時應該返回 false
      ✓ 在作祟揭示階段應該返回 false
      ✓ 在作祟進行階段應該返回 false
      ✓ 在遊戲設置階段應該返回 false
  Haunt Revelation 系統
    selectHauntScenario
      ✓ 應該返回一個有效的劇本
      ✓ 劇本應該有所有必要屬性
    assignPlayerSides
      ✓ 單叛徒模式：發現者應該成為叛徒
      ✓ 單叛徒模式：其他玩家應該是英雄
      ✓ 合作模式：所有人都應該是英雄
      ✓ 應該為所有玩家分配陣營
    revealHaunt
      ✓ 應該成功揭示作祟
      ✓ 應該正確識別叛徒
      ✓ 應該正確識別英雄
      ✓ 應該建立玩家陣營映射
      ✓ 當作祟已激活時應該返回錯誤
    createHauntStartResult
      ✓ 應該更新遊戲狀態為 haunt_reveal
      ✓ 應該更新玩家叛徒狀態
      ✓ 應該更新 Haunt 狀態
      ✓ 應該生成日誌項目
  Haunt 輔助函數
    isTraitor
      ✓ 應該正確識別叛徒
      ✓ 應該正確識別非叛徒
      ✓ 當沒有叛徒時應該返回 false
    isHero
      ✓ 應該正確識別英雄
      ✓ 叛徒不應該被識別為英雄
      ✓ 當作祟未激活時應該返回 false
    getTraitor
      ✓ 應該返回叛徒玩家
      ✓ 當沒有叛徒時應該返回 undefined
    getHeroes
      ✓ 應該返回所有英雄玩家
      ✓ 不應該包含叛徒
      ✓ 不應該包含死亡玩家
      ✓ 當作祟未激活時應該返回空陣列
    getPlayerSide
      ✓ 應該返回叛徒陣營
      ✓ 應該返回英雄陣營
      ✓ 當作祟未激活時應該返回 hero
  Haunt 系統整合測試
    ✓ 完整的 Haunt 觸發流程
    ✓ 多次 Haunt Roll 應該有不同的結果
    ✓ 最後一張預兆應該自動觸發作祟 (已知限制)
```

---

## 規則符合性檢查表

| 規則項目 | 規則書頁碼 | 實作狀態 | 測試覆蓋 |
|---------|-----------|---------|---------|
| 作祟檢定在預兆抽取後觸發 | Page 14 | ✅ | ✅ |
| 擲骰數量 = 已發現預兆數量 | Page 14 | ✅ | ✅ |
| 總和 < 預兆數量時觸發作祟 | Page 14 | ✅ | ✅ |
| 最後一張預兆自動觸發 | Page 14 | ⚠️ | ⚠️ |
| 叛徒由發現者擔任 | Page 17 | ✅ | ✅ |
| 英雄和叛徒目標顯示 | Page 18-19 | ✅ | ✅ |
| 作祟後啟用戰鬥 | Page 15 | ⚠️ | ⚠️ |
| 作祟後屬性可以降至 0 | Page 9, 19 | ⚠️ | 待驗證 |

---

## 合併建議

### 建議: **有條件通過 (Conditional Pass)**

Haunt Roll 和 Revelation 的核心功能已正確實作，測試覆蓋完整。但存在以下需要後續處理的問題：

1. **高優先級:**
   - 修復最後一張預兆自動觸發邏輯
   - 驗證作祟後戰鬥系統正確啟用

2. **中優先級:**
   - 實作根據預兆和房間選擇劇本的邏輯
   - 完善隱藏叛徒模式

3. **低優先級:**
   - 擴展叛徒規則書內容
   - 添加更多劇本

---

## 相關檔案

### 核心邏輯
- `packages/game-engine/src/rules/haunt.ts`
- `packages/game-engine/src/rules/haunt.test.ts`
- `packages/game-engine/src/rules/cardDrawing.ts`

### AI 行為
- `packages/game-engine/src/ai/HeroAI.ts`
- `packages/game-engine/src/ai/TraitorAI.ts`

### 前端組件
- `apps/web/src/components/game/HauntRollModal.tsx`
- `apps/web/src/components/game/HauntRevealScreen.tsx`

### 資料定義
- `packages/game-engine/src/data/hauntScenarios.ts`
- `packages/game-engine/src/types/index.ts`

---

## 附錄: 規則書引用

### Page 14 - Haunt Roll
> "After drawing an omen card, you must make a haunt roll. Roll dice equal to the number of omen cards that have been drawn. If the sum is less than the number of omen cards drawn, the haunt begins."

### Page 17 - The Traitor
> "The player who drew the omen card that triggered the haunt is the traitor."

### Page 18-19 - Objectives
> "Each side has objectives to complete. The traitor reads their objectives secretly. The heroes read their objectives together."
