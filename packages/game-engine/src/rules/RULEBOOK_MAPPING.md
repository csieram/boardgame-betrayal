# Turn Flow & Movement System - Rulebook Mapping

## 規則書對照表

### 回合流程 (Turn Flow)

| 規則 | 規則書頁碼 | 實作檔案 | 測試檔案 |
|------|-----------|----------|----------|
| 回合順序輪轉 | Page 13 | `turn.ts` - `TurnOrderManager` | `turn.test.ts` |
| 回合開始設定移動點數 | Page 13 | `turn.ts` - `TurnManager.startTurn()` | `turn.test.ts` |
| 發現新房間後自動結束回合 | Page 12 | `turn.ts` - `TurnManager.markRoomDiscovered()` | `turn.test.ts` |
| 手動結束回合 | Page 13 | `turn.ts` - `TurnManager.endTurn()` | `turn.test.ts` |
| 玩家回合順序（左邊玩家） | Page 13 | `turn.ts` - `TurnOrderManager.getNextPlayer()` | `turn.test.ts` |

### 移動規則 (Movement Rules)

| 規則 | 規則書頁碼 | 實作檔案 | 測試檔案 |
|------|-----------|----------|----------|
| 基於 Speed 的移動限制 | Page 13 | `movement.ts` - `MovementValidator.validateMove()` | `movement.test.ts` |
| 只能移動到相鄰房間 | Page 12 | `movement.ts` - `MovementValidator.isAdjacent()` | `movement.test.ts` |
| 只能移動到已發現的房間 | Page 12 | `movement.ts` - `validateMove()` 檢查 `discovered` | `movement.test.ts` |
| 發現新房間時停止移動 | Page 12 | `movement.ts` - `MovementExecutor.discoverRoom()` | `movement.test.ts` |
| 門必須相連才能移動 | Page 12 | `movement.ts` - `hasConnectingDoor()` | `movement.test.ts` |
| 障礙物需要 2 點移動力 | Page 12 | `movement.ts` - `OBSTACLE_MOVE_COST` | `movement.test.ts` |

## 測試覆蓋率

### Turn System Tests (turn.test.ts)
- ✅ Movement within Speed limit
- ✅ Turn order rotation
- ✅ Auto-end turn after room discovery
- ✅ Manual end turn

### Movement System Tests (movement.test.ts)
- ✅ Movement within Speed limit
- ✅ Cannot exceed Speed
- ✅ Stop at new room discovery
- ✅ Blocked passage handling
- ✅ Cannot move to undiscovered room

## 規則書引用

### Page 11-13: Turn Flow
> "On your turn, you can move up to a number of spaces equal to your Speed."

### Page 12: Movement Rules
> "After you discover a new room, your turn ends. You cannot move any more this turn."

> "You can only move to discovered rooms."

> "Obstacles require 2 movement points."

### Page 13: Speed-based Movement
> "Your character can move a number of spaces up to his or her Speed."

> "End your turn. The player to your left takes the next turn."

## 實作細節

### 回合系統 (`turn.ts`)

1. **TurnManager**: 管理回合狀態和流程
   - `startTurn()`: 根據 Speed 設定移動點數
   - `endTurn()`: 結束回合並輪轉到下一個玩家
   - `markRoomDiscovered()`: 標記發現新房間並結束回合
   - `consumeMovement()`: 消耗移動點數

2. **TurnOrderManager**: 管理玩家順序
   - `getNextPlayer()`: 取得下一個玩家
   - `removePlayer()`: 移除死亡玩家
   - `isRoundComplete()`: 檢查是否完成一輪

3. **TurnPhaseManager**: 管理回合階段
   - `getCurrentPhase()`: 取得當前階段
   - `canPerformAction()`: 檢查是否可以執行動作

### 移動系統 (`movement.ts`)

1. **MovementValidator**: 驗證移動合法性
   - `validateMove()`: 驗證移動動作
   - `isAdjacent()`: 檢查是否相鄰
   - `hasConnectingDoor()`: 檢查門是否相連
   - `calculateMoveCost()`: 計算移動成本

2. **MovementExecutor**: 執行移動
   - `executeMove()`: 執行移動
   - `discoverRoom()`: 發現新房間

3. **PathFinder**: 路徑查找
   - `findPath()`: 查找路徑
   - `getReachablePositions()`: 取得可達位置
   - `getDiscoverableDirections()`: 取得可發現方向

4. **ObstacleManager**: 障礙物管理
   - `createLockedDoor()`: 建立鎖定的門
   - `createCollapsedPassage()`: 建立坍塌的通道
   - `createDifficultTerrain()`: 建立困難地形

## 已知限制

1. 障礙物系統目前為基礎實作，需要從遊戲狀態中讀取障礙物資訊
2. 跨樓層移動（樓梯、電梯）需要額外實作
3. 某些特殊房間效果（如坍塌房間）需要額外處理

## 使用範例

```typescript
// 開始新回合
const newState = TurnManager.startTurn(state, 'player-1');

// 驗證移動
const validation = MovementValidator.validateMove(state, 'player-1', targetPos);
if (validation.valid) {
  // 執行移動
  const result = MovementExecutor.executeMove(state, moveAction);
}

// 發現新房間
const discoverResult = MovementExecutor.discoverRoom(state, 'player-1', 'west', newRoom);
if (discoverResult.success) {
  // 發現成功，回合自動結束
}

// 結束回合
const endState = TurnManager.endTurn(state, endTurnAction);
```
