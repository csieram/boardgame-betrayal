# Room Exploration QA Report - Issue #255

## Summary
- Date: 2025-04-05
- Tester: Agent 5 (Rule QA / Test Judge)
- Status: COMPLETE
- Rulebook Reference: Page 5-8 (Exploration rules)

## Test Methodology
1. 程式碼審查 (Code Review)
2. 單元測試分析 (Unit Test Analysis)
3. 規則符合性檢查 (Rule Compliance Check)
4. 整合測試驗證 (Integration Test Verification)

---

## Results

### Room Placement Rules (房間放置規則)

| Check | Status | Notes |
|-------|--------|-------|
| Door connection matching | ✅ PASS | `validateDoorConnection()` 正確實作門連接驗證。來源房間必須有門通往該方向，目標房間必須有相反方向的門。 |
| Room rotation | ✅ PASS | `calculateRotation()` 和 `rotateDoors()` 正確實作 0°/90°/180°/270° 旋轉。自動旋轉以匹配門位置。 |
| Invalid placement blocked | ✅ PASS | `TilePlacementValidator.canPlaceTile()` 會檢查位置是否已被佔用、門是否匹配。 |
| Dead ends handled | ✅ PASS | `wouldCloseBoard()` 檢查封閉棋盤情況，`addRandomDoor()` 在需要時添加門以保持開放。 |

**Evidence:**
- `packages/game-engine/src/rules/roomDiscovery.ts` (Lines 45-90): `findValidRotation()` 嘗試所有 4 個旋轉角度
- `packages/game-engine/src/rules/tilePlacement.ts` (Lines 45-120): `TilePlacementValidator.canPlaceTile()` 驗證放置合法性

---

### Floor Assignment (樓層分配)

| Check | Status | Notes |
|-------|--------|-------|
| Ground floor rooms | ✅ PASS | `GROUND_ROOMS` 陣列包含 12 個一樓房間，`drawRoomFromDeck()` 從對應樓層牌堆抽取。 |
| Upper floor rooms | ✅ PASS | `UPPER_ROOMS` 陣列包含 10 個二樓房間。 |
| Basement rooms | ✅ PASS | `BASEMENT_ROOMS` 陣列包含 18 個地下室房間。 |
| Stairs connect floors | ✅ PASS | `STAIR_ROOM_IDS` 和 `STAIR_CONNECTIONS` 正確定義樓梯連接規則。 |

**Evidence:**
- `shared-data/rooms/rooms.ts`: 房間按樓層分類定義
- `packages/game-engine/src/rules/roomDiscovery.ts` (Lines 580-650): `STAIR_CONNECTIONS` 定義樓梯連接

---

### Discovery Tracking (發現追蹤)

| Check | Status | Notes |
|-------|--------|-------|
| Room marked discovered | ✅ PASS | `Tile.discovered` 布林值正確標記。發現新房間時設為 `true`。 |
| Undiscovered rooms visually distinct | ✅ PASS | `GameBoard.tsx` 使用 `isExplored` 區分已探索/未探索，`EmptyRoomTile` 顯示不同視覺效果。 |
| Discovery affects game state | ✅ PASS | 發現新房間後，`turn.hasDiscoveredRoom = true` 且 `turn.hasEnded = true`（回合自動結束）。 |

**Evidence:**
- `packages/game-engine/src/rules/tilePlacement.ts` (Lines 280-320): 發現後自動結束回合
- `apps/web/src/components/game/GameBoard.tsx` (Lines 140-160): 視覺區分已探索房間

---

### Special Rooms (特殊房間)

| Room | Status | Notes |
|------|--------|-------|
| Entrance Hall | ✅ PASS | `entrance_hall` ID 正確定義，門方向為北/南，作為起始位置。 |
| Mystic Elevator | ✅ PASS | `mystic_elevator` ID 定義，可移動到任何樓層（Ground/Upper/Basement）。 |
| Coal Chute | ⚠️ WARNING | 規則書中的 Coal Chute（煤槽）未在代碼中找到。實際使用 `stairs_from_ground` 作為單向通往地下室的樓梯。 |
| Collapsed Room | ✅ PASS | `collapsed_room` ID 定義，從 Upper 掉到 Basement，可能需要 Speed 檢定。 |

**Evidence:**
- `packages/game-engine/src/rules/roomDiscovery.ts` (Lines 565-580): `STAIR_ROOM_IDS` 定義
- `packages/game-engine/src/rules/roomDiscovery.ts` (Lines 590-650): `STAIR_CONNECTIONS` 定義連接規則

---

## Issues Found

### Issue #1: Coal Chute Missing (煤槽房間缺失)
- **Severity:** Low
- **Status:** ⚠️ WARNING
- **Description:** 規則書中的 Coal Chute（煤槽，單向通往地下室）未在代碼中實作。目前使用 `stairs_from_ground` 作為替代。
- **Expected:** Coal Chute 房間應該存在，並且只能從一樓到地下室（單向）。
- **Actual:** 使用通用的樓梯房間 `stairs_from_ground`。
- **Suggested Fix:** 添加 `coal_chute` 房間到 `MULTI_FLOOR_ROOMS`，並設定為單向連接（Ground → Basement only）。

### Issue #2: Test Files Outdated (測試文件過期)
- **Severity:** Medium
- **Status:** ❌ FAIL
- **Description:** 多個測試文件因類型定義更新而無法編譯。`GameMap` 和 `RoomDeckState` 現需要 `roof` 屬性，但測試文件未更新。
- **Affected Files:**
  - `src/test/doorConnection.integration.test.ts`
  - `src/test/boardOpenPrevention.test.ts`
  - `src/rules/tilePlacement.test.ts`
- **Error:** `Property 'roof' is missing in type '{ ground: Tile[][]; upper: Tile[][]; basement: Tile[][]; placedRoomCount: number; }'`
- **Suggested Fix:** 更新所有測試文件中的 `createMockMap()` 和 `createMockGameState()` 函數，添加 `roof` 屬性。

---

## Rulebook Compliance Summary

| Rulebook Page | Rule | Implementation Status |
|---------------|------|----------------------|
| Page 5 | Room placement via matching doors | ✅ Implemented |
| Page 5 | Room can be rotated | ✅ Implemented |
| Page 5 | Cannot place if no valid connection | ✅ Implemented |
| Page 6 | Floor-specific room decks | ✅ Implemented |
| Page 6 | Stairs connect floors | ✅ Implemented |
| Page 12 | Discovery ends turn | ✅ Implemented |
| Page 12 | Draw card based on room symbol | ✅ Implemented |

---

## Code Quality Assessment

### Strengths
1. **完整的門連接驗證**: `validateDoorConnection()` 確保門位置匹配
2. **防止棋盤封閉**: `wouldCloseBoard()` 和 `addRandomDoor()` 確保遊戲可以繼續
3. **樓梯系統完整**: 支援多樓層移動，包括神秘電梯
4. **回合管理正確**: 發現新房間後自動結束回合

### Weaknesses
1. **測試覆蓋率不足**: 部分測試文件無法運行
2. **缺少 Coal Chute**: 特殊房間未完全實作
3. **類型定義變更未同步**: 測試文件未跟上類型更新

---

## Conclusion

**Overall Status: ⚠️ NEEDS_FIX**

房間探索機制的核心功能已正確實作，符合規則書要求：
- ✅ 門連接驗證正確
- ✅ 房間旋轉邏輯正確
- ✅ 樓層分配正確
- ✅ 發現追蹤正確
- ✅ 特殊房間（大部分）正確

但需要修復以下問題：
1. 更新測試文件以匹配新的類型定義
2. 考慮添加 Coal Chute 房間（如果這是必需的規則要求）

---

## Recommendations

1. **立即修復**: 更新測試文件中的 `createMockMap()` 和 `createMockRoomDeck()` 函數，添加 `roof: []` 屬性。

2. **考慮添加**: Coal Chute 房間（如果規則書要求）。

3. **持續監控**: 確保所有新類型定義變更都同步到測試文件。

---

## Files Reviewed

- `packages/game-engine/src/rules/roomDiscovery.ts` ✅
- `packages/game-engine/src/rules/tilePlacement.ts` ✅
- `packages/game-engine/src/rules/movement.ts` ✅
- `apps/web/src/components/game/GameBoard.tsx` ✅
- `shared-data/rooms/rooms.ts` ✅
- `shared-data/rulebook/rulebook-summary.md` ✅

## Test Files Status

| Test File | Status | Notes |
|-----------|--------|-------|
| doorConnection.integration.test.ts | ❌ FAIL | 缺少 `roof` 屬性 |
| boardOpenPrevention.test.ts | ❌ FAIL | 缺少 `roof` 屬性 |
| tilePlacement.test.ts | ❌ FAIL | 缺少 `roof` 屬性 |

---

*Report generated by Agent 5 (Rule QA / Test Judge)*
*Date: 2025-04-05*
