# Issue #158: Explored Rooms 問題分析報告

## 問題描述
- Explored rooms not always visible on board
- Rooms can potentially be explored multiple times
- No clear visual distinction for explored rooms

## 分析結果

### 1. 資料模型檢查 ✅

**Tile 介面** (`packages/game-engine/src/types/index.ts`):
```typescript
export interface Tile {
  x: number;
  y: number;
  floor: Floor;
  room: Room | null;
  discovered: boolean;  // ✅ 正確標記房間是否已被發現
  rotation: 0 | 90 | 180 | 270;
  placementOrder: number;
}
```

**GameState 介面**:
```typescript
export interface GameState {
  // ...
  placedRoomIds: Set<string>;  // ✅ 追蹤已放置的房間 ID
  // ...
}
```

**TurnState 介面**:
```typescript
export interface TurnState {
  // ...
  hasDiscoveredRoom: boolean;  // ✅ 追蹤當前回合是否已發現房間
  // ...
}
```

### 2. 房間探索邏輯檢查 ✅

**RoomDiscoveryManager.discoverRoom** (`packages/game-engine/src/rules/roomDiscovery.ts`):

1. ✅ 檢查是否為當前玩家回合
2. ✅ 檢查回合是否已結束
3. ✅ 檢查是否已發現過房間（每回合只能發現一次）
4. ✅ 檢查是否有足夠的移動點數
5. ✅ 檢查當前房間是否有門通往該方向
6. ✅ **檢查位置是否已被佔用**:
   ```typescript
   const existingTile = this.getTileAt(state, newPosition);
   if (existingTile && existingTile.room) {
     return { success: false, error: 'Position already has a room' };
   }
   ```

### 3. 房間抽取邏輯檢查 ✅

**RoomDiscoveryManager.drawRoomFromDeck**:
```typescript
const availableRoom = deck.find((r: Room) => {
  const isDrawn = state.roomDeck.drawn.has(r.id);
  const isPlaced = state.placedRoomIds.has(r.id);
  return !isDrawn && !isPlaced;  // ✅ 雙重檢查防止重複
});
```

### 4. 前端顯示邏輯檢查 ✅

**GameBoard.tsx** (`apps/web/src/components/game/GameBoard.tsx`):
```typescript
const exploredRooms = useMemo(() => {
  const rooms: { tile: Tile; x: number; y: number }[] = [];
  
  for (let y = 0; y < map.length; y++) {
    for (let x = 0; x < map[y].length; x++) {
      const tile = map[y][x];
      if (tile.discovered && tile.room) {  // ✅ 正確過濾已探索房間
        rooms.push({ tile, x, y });
      }
    }
  }
  
  return rooms;
}, [map]);
```

**RoomTile.tsx** (`apps/web/src/components/game/RoomTile.tsx`):
```typescript
// 如果房間未探索，顯示迷霧
if (!isExplored || !room) {
  return (
    <motion.div className="...">
      <span className="text-gray-600 text-xs">?</span>
    </motion.div>
  );
}
// ✅ 已探索房間顯示完整資訊
```

### 5. 測試驗證 ✅

已創建測試檔案 `packages/game-engine/src/rules/roomDiscovery.issue158.test.ts`，包含以下測試案例：

1. ✅ 應該正確標記新發現的房間為 discovered = true
2. ✅ 應該區分 discovered 和 undiscovered 的房間
3. ✅ 應該阻止在已有房間的位置放置新房間
4. ✅ 應該阻止重複探索同一個房間
5. ✅ 應該允許移動到已探索的房間（但不觸發重新探索）
6. ✅ 應該在回合間保持房間的 discovered 狀態
7. ✅ 應該在多個玩家回合間保持房間狀態
8. ✅ 應該正確追蹤已放置的房間 ID
9. ✅ 應該防止重複放置相同的房間 ID

**測試結果**: 9/9 測試通過 ✅

## 結論

### 規則引擎層面（Agent 2 負責範圍）

**所有檢查項目均正常運作**:
- ✅ Explored rooms tracked correctly in game state
- ✅ Cannot explore same room twice
- ✅ Room state persists across turns

### 可能的問題來源

根據分析，規則引擎的邏輯是正確的。如果仍然存在「已探索房間不可見」的問題，可能原因包括：

1. **UI 渲染問題**（Agent 3 負責範圍）:
   - `GameBoard` 組件是否正確接收 `map` 資料
   - `RoomTile` 組件是否正確顯示已探索房間
   - CSS 樣式是否導致房間不可見

2. **狀態同步問題**:
   - `solo/page.tsx` 中的 `multiFloorMap` 狀態是否正確更新
   - `setMultiFloorMap` 是否正確觸發重新渲染

3. **資料傳遞問題**:
   - `map` 變數（`multiFloorMap[currentFloor]`）是否正確傳遞給 `GameBoard`

## 建議

1. **Agent 3 (Frontend)** 應檢查：
   - `GameBoard` 組件的 `map` prop 是否正確接收
   - `exploredRooms` useMemo 是否正確計算
   - 房間的 `discovered` 和 `room` 欄位是否存在且正確

2. **如果需要進一步調試**，建議在以下位置添加日誌：
   - `GameBoard.tsx` 中的 `exploredRooms` useMemo
   - `RoomTile.tsx` 中的渲染邏輯
   - `solo/page.tsx` 中的 `moveToPosition` 函數

## 規則引擎狀態

- **狀態**: 🟢 正常運作
- **測試**: 9/9 通過
- **問題**: 無發現規則引擎層面的問題
