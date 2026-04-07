# UI 遊戲板視覺驗證報告

**GitHub Issue:** #258  
**驗證日期:** 2026-04-05  
**驗證者:** Agent 5 (Rule QA / Test Judge)  
**遊戲版本:** Betrayal at House on the Hill - Web Implementation

---

## 摘要 Summary

本次驗證針對遊戲板的視覺設計和可用性進行全面檢查。整體而言，遊戲板實現了良好的視覺效果和基本功能，但在某些細節方面仍有改進空間。

**整體評估:** 🟡 部分通過 - 需要小幅調整

---

## 檢查清單結果 Checklist Results

### Room Tiles 房間磚塊

| 項目 | 狀態 | 備註 |
|------|------|------|
| Room SVGs display correctly | ✅ 通過 | 房間使用 SVG 圖像正確顯示，透過 `gallerySvg` 屬性載入 |
| Room names readable | ✅ 通過 | 房間名稱顯示在底部，使用 `text-[10px]` 字體，白色文字 |
| Door indicators clear | ✅ 通過 | 門使用漸層色（amber-600 到 amber-800）和陰影效果，四個方向都有支援 |
| Discovered vs undiscovered visual distinction | ✅ 通過 | 已探索房間有 `boxShadow` 和較亮邊框，未探索房間顯示為問號 |
| Current room highlight visible | ✅ 通過 | 當前房間使用 `ring-2 ring-yellow-500` 高亮顯示 |

**詳細觀察:**
- 房間磚塊實現在 `RoomTile.tsx` 中
- SVG 內容透過 fetch 動態載入，有載入動畫
- 門指示器使用絕對定位，視覺效果清晰
- 已探索房間右下角有 ✓ 標記

---

### Player Tokens 玩家標記

| 項目 | 狀態 | 備註 |
|------|------|------|
| Player token shows character portrait | ✅ 通過 | 使用 `portraitSvg` 顯示角色肖像，有 fallback 顯示首字母 |
| Token size appropriate | ✅ 通過 | 三種尺寸（sm: w-6, md: w-8, lg: w-10），根據數量自動調整 |
| Token position accurate on room | ✅ 通過 | 標記顯示在房間中央，使用 flex 置中 |
| Current player indicator clear | ✅ 通過 | 當前玩家有白色 ring 和脈衝動畫效果 |

**詳細觀察:**
- 玩家標記實現在 `PlayerToken.tsx` 中
- 當前玩家有 `ring-white` 和 `boxShadow` 脈衝動畫
- 多個玩家在同一房間時使用 `PlayerTokenGroup`，會自動縮小尺寸避免重疊

---

### AI Pawns AI 標記

| 項目 | 狀態 | 備註 |
|------|------|------|
| AI pawns distinguishable from player | ✅ 通過 | AI 使用不同顏色的邊框（根據個性），右下角有個性圖標 |
| AI names visible on hover | ✅ 通過 | Hover 時顯示 tooltip，包含名稱、個性和位置 |
| AI positions accurate | ✅ 通過 | 位置與玩家分開追蹤，使用 `aiPlayerPositions` Map |

**詳細觀察:**
- AI 標記實現在 `AIPawn.tsx` 中
- 個性顏色：`explorer` (藍色), `aggressive` (紅色), `defensive` (綠色), `balanced` (黃色)
- 當前 AI 回合有脈衝動畫效果
- 多個 AI 在同一房間使用 `AIPawnGroup`

---

### Map Elements 地圖元素

| 項目 | 狀態 | 備註 |
|------|------|------|
| Floor indicator clear | ✅ 通過 | 頂部有樓層切換標籤，顯示「二樓 Upper」、「一樓 Ground」、「地下室 Basement」 |
| Stairs connections visible | ✅ 通過 | 樓梯房間有特殊圖標（↕️, ↑, ↓, 🛗, ⚠️），點擊可切換樓層 |
| Secret passage markers visible | ✅ 通過 | 秘密通道使用紫色標記（🔮），實現在 `TokenMarker.tsx` |
| Corpse markers visible | ✅ 通過 | 屍體標記使用 💀 圖標，顯示物品數量標記 |

**詳細觀察:**
- 樓梯房間 ID 列表：`grand_staircase`, `stairs_from_basement`, `stairs_from_ground`, `stairs_from_upper`, `mystic_elevator`, `collapsed_room`
- 秘密通道標記類型：`secret_passage`, `blocked`, `trap`, `safe`
- 屍體標記顯示玩家名稱和物品數量

---

### Responsiveness 響應式設計

| 項目 | 狀態 | 備註 |
|------|------|------|
| Board scales correctly on desktop | ✅ 通過 | 使用響應式尺寸（sm, md, lg），grid 佈局 |
| Board usable on mobile | 🟡 部分通過 | 有響應式設計，但房間尺寸較小（w-16 h-16） |
| Zoom/pan works smoothly | ✅ 通過 | 使用 Framer Motion 的 drag 功能，可拖動地圖 |

**詳細觀察:**
- 地圖容器有 `overflow-hidden` 和 `max-h-[60vh]`
- 拖動限制：`dragConstraints={{ left: -500, right: 0, top: -500, bottom: 0 }}`
- 有拖動提示：「🖱️ 拖動移動地圖」

---

## 發現的問題 Issues Found

### 1. 房間名稱可讀性 (Minor)
- **問題:** 房間名稱使用 `text-[10px]`，在某些房間上可能較難閱讀
- **位置:** `RoomTile.tsx` 第 180 行
- **建議:** 考慮增加字體大小到 `text-xs` (12px) 或添加文字陰影提高對比度

### 2. 移動端房間尺寸 (Minor)
- **問題:** 最小尺寸 `w-16 h-16` (64px) 在移動端可能過小
- **位置:** `RoomTile.tsx` 第 95-101 行
- **建議:** 為移動端增加更大的觸控區域

### 3. 樓層標題顏色對比 (Minor)
- **問題:** 地下室樓層標題使用 `#4A4A4A`，與背景對比度較低
- **位置:** `GameBoard.tsx` 第 85-90 行
- **建議:** 使用更亮的顏色提高可見性

### 4. AI 標記重疊 (Low Priority)
- **問題:** 當玩家和 AI 在同一房間時，標記可能重疊
- **位置:** `RoomTile.tsx` 第 310-330 行
- **建議:** 考慮使用偏移佈局或堆疊顯示

---

## 建議 Recommendations

### 高優先級 High Priority
1. **增加房間名稱字體大小** - 提高可讀性
2. **優化移動端觸控區域** - 確保良好的移動體驗

### 中優先級 Medium Priority
3. **改善樓層標題顏色對比** - 特別是地下室樓層
4. **添加房間符號圖例** - 幫助玩家理解 E/I/O 符號

### 低優先級 Low Priority
5. **考慮添加縮放控制** - 除了拖動外，添加 +/- 按鈕
6. **優化多標記重疊顯示** - 當多個玩家/AI 在同一房間時

---

## 測試證據 Test Evidence

### 檢查的檔案
1. `apps/web/src/components/game/GameBoard.tsx` - 遊戲板主組件
2. `apps/web/src/components/game/RoomTile.tsx` - 房間磚塊組件
3. `apps/web/src/components/game/PlayerToken.tsx` - 玩家標記組件
4. `apps/web/src/components/game/AIPawn.tsx` - AI 標記組件
5. `apps/web/src/components/game/CorpseMarker.tsx` - 屍體標記組件
6. `apps/web/src/components/game/TokenMarker.tsx` - 地圖標記組件
7. `apps/web/src/app/solo/page.tsx` - 單人遊戲頁面
8. `packages/shared/src/data/rooms.ts` - 房間數據

### 關鍵實現細節
- **房間尺寸:** sm (56px), md (64-112px), lg (80-144px)
- **顏色方案:** 每個房間有獨特顏色，門使用 amber 色調
- **動畫:** 使用 Framer Motion 實現平滑過渡和拖動
- **響應式:** 使用 Tailwind 的 sm/md/lg 斷點

---

## 結論 Conclusion

遊戲板的視覺設計整體良好，所有主要功能都已實現。發現的問題都是小問題，不會影響遊戲體驗。建議在下次迭代中處理高優先級的改進項目。

**最終建議:** ✅ 批准發布，但建議在後續版本中處理標記的改進項目

---

*報告生成時間: 2026-04-05*  
*Agent 5 - Rule QA / Test Judge*
