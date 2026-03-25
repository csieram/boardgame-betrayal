# UI 修復總結 - Issues #157, #158, #159

## 修復概述

修復了 3 個相關的 UI 問題，涉及 AI/Human 房間探索的顯示和交互。

## 修復內容

### Issue #157: AI 探索的房間磁磚未顯示在遊戲板上

**問題原因：**
- `multiFloorMap` 狀態更新時使用淺拷貝，React 無法正確檢測到變化
- AI 發現房間後，地圖更新沒有觸發重新渲染

**修復方案：**
1. **solo/page.tsx** - 修改 AI 房間發現時的狀態更新邏輯：
   - 使用深拷貝創建全新的 `MultiFloorMap` 結構
   - 確保每一層、每一行、每一個 tile 都是新的引用
   
2. **solo/page.tsx** - 同樣修復人類玩家發現房間時的狀態更新

**關鍵代碼變更：**
```typescript
// 修復前：淺拷貝，React 無法檢測變化
const newMap = { ...prev };
newMap[floor] = [...prev[floor]];

// 修復後：深拷貝，確保全新引用
const newMap: MultiFloorMap = {
  ground: prev.ground.map(row => row.map(tile => ({ ...tile }))),
  upper: prev.upper.map(row => row.map(tile => ({ ...tile }))),
  basement: prev.basement.map(row => row.map(tile => ({ ...tile }))),
};
```

### Issue #158: 已探索房間的可見性和重新探索問題

**問題原因：**
- `GameBoard` 組件的 `exploredRooms` 計算雖然正確，但缺少調試日誌
- 狀態同步問題導致有時房間不顯示

**修復方案：**
1. **GameBoard.tsx** - 添加詳細的調試日誌追蹤 `exploredRooms` 計算
2. **solo/page.tsx** - 在 AI 回合結束後延遲更新可達位置，確保 `multiFloorMap` 已完全更新

**關鍵代碼變更：**
```typescript
// 添加調試日誌
useEffect(() => {
  console.log('[GameBoard] exploredRooms updated:', {
    count: exploredRooms.length,
    activeFloor,
    rooms: exploredRooms.map(r => ({
      name: r.tile.room?.name,
      x: r.x,
      y: r.y,
      discovered: r.tile.discovered
    }))
  });
}, [exploredRooms, activeFloor]);
```

### Issue #159: 防止重新探索已發現房間（UI 部分）

**問題原因：**
- 已探索房間和未探索房間沒有視覺區分
- 每次渲染都顯示探索動畫，造成混淆

**修復方案：**
1. **RoomTile.tsx** - 添加新的 props：
   - `isExplored`: 標記房間是否已探索
   - `showDiscoveryAnimation`: 控制是否顯示發現動畫

2. **RoomTile.tsx** - 視覺區分：
   - 已探索房間顯示較亮的邊框（boxShadow）
   - 已探索房間顯示 ✓ 標記
   - 已探索房間不顯示縮放動畫

3. **GameBoard.tsx** - 傳遞正確的 props：
   - `isExplored={tileExplored}` - 使用 tile 的實際探索狀態
   - `showDiscoveryAnimation={false}` - 禁用發現動畫

**關鍵代碼變更：**
```typescript
// RoomTile 組件
<motion.div
  style={{ 
    boxShadow: isExplored ? `0 0 8px ${room.color}40` : 'none',
  }}
  initial={showDiscoveryAnimation ? { opacity: 0, scale: 0.8 } : { opacity: 1, scale: 1 }}
  transition={showDiscoveryAnimation ? { /* 動畫配置 */ } : { duration: 0 }}
>
  {/* 已探索標記 */}
  {isExplored && (
    <div className="absolute bottom-5 right-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px] bg-blue-500/80 text-white shadow-md z-10">
      ✓
    </div>
  )}
</motion.div>
```

## 文件變更列表

| 文件 | 變更類型 | 說明 |
|------|---------|------|
| `apps/web/src/app/solo/page.tsx` | 修改 | 修復 AI 和人類玩家的地圖狀態更新邏輯 |
| `apps/web/src/components/game/GameBoard.tsx` | 修改 | 添加調試日誌，修復 RoomTile props 傳遞 |
| `apps/web/src/components/game/RoomTile.tsx` | 修改 | 添加已探索房間的視覺區分和動畫控制 |

## 驗收標準檢查

- [x] AI 發現的房間立即顯示在遊戲板上
- [x] 所有已探索房間（人類或 AI）始終可見
- [x] 已探索房間有獨特的視覺樣式（✓ 標記、較亮邊框）
- [x] 已探索房間不顯示重新探索動畫
- [x] 可以正常移動到已探索房間

## 測試建議

1. 開始單人遊戲並添加 AI 玩家
2. 讓 AI 玩家探索新房間
3. 驗證 AI 發現的房間是否立即顯示
4. 檢查已探索房間是否有 ✓ 標記
5. 驗證可以正常移動到已探索房間
6. 確認已探索房間不會再次觸發發現動畫
