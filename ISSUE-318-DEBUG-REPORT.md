# Issue #318 調試報告 - 房間旋轉選擇錯誤角度

## 問題描述
系統在選擇房間旋轉角度時選擇了錯誤的角度。具體來說，當從 Entrance Hall 的東門進入 Dining Room 時，系統選擇了 90° 旋轉，但這個旋轉沒有 west 門，導致無法連接到 Entrance Hall。

## 預期行為
- Entry direction: east
- Required door: west（因為從 Entrance Hall 的 east 門進入，需要 west 門來連接）
- Dining Room 原始門：north, east
- 有效旋轉（有 west 門）：180° (south, west) 或 270° (west, north)
- 應該選擇：180° 或 270°

## 實際行為
- 系統選擇了 90° 旋轉
- 90° 旋轉結果：east, south（沒有 west 門！）
- 無法連接到 Entrance Hall

## 調查結果

### 1. 旋轉映射分析
`DIRECTION_ROTATION_MAP` 實際上是**順時針**旋轉（與 CSS transform rotate 一致），雖然註釋錯誤地標記為「逆時針」。

對於 Dining Room（原始門：north, east）：
- 0°: north, east
- 90°: east, south
- 180°: south, west ✓
- 270°: west, north ✓

### 2. `findValidRotation` 邏輯分析
根據代碼邏輯：
- 0°: 沒有 west → 繼續
- 90°: 沒有 west → 繼續
- 180°: 有 west → 檢查 `wouldCloseBoardWithRotation`
- 270°: 有 west → 檢查 `wouldCloseBoardWithRotation`

除非 180° 和 270° 都被 `wouldCloseBoardWithRotation` 拒絕，否則不應該選擇 90°。

### 3. 可能的原因
- `wouldCloseBoardWithRotation` 可能錯誤地認為 180° 和 270° 會封閉棋盤
- 或者有其他代碼路徑導致了這個問題

## 已完成的調試工作
1. 在 `findValidRotation` 函數中添加了詳細的日誌輸出
2. 在 `wouldCloseBoardWithRotation` 函數中添加了詳細的日誌輸出
3. 更新了 `DIRECTION_ROTATION_MAP` 的註釋，澄清它是順時針旋轉

## 建議的下一步
1. 運行遊戲並檢查日誌輸出，確認哪個旋轉被選擇以及為什麼
2. 檢查 `wouldCloseBoardWithRotation` 的邏輯，確認它是否正確地判斷棋盤是否會封閉
3. 如果 `wouldCloseBoardWithRotation` 有問題，修復它的邏輯

## 修復方案
根據分析，問題可能是 `wouldCloseBoardWithRotation` 函數錯誤地認為 180° 和 270° 會封閉棋盤。需要進一步檢查日誌輸出來確認這個假設。

如果確認是這個問題，可以考慮以下修復方案：
1. 修復 `wouldCloseBoardWithRotation` 的邏輯
2. 或者修改 `findValidRotation` 的邏輯，優先選擇不會封閉棋盤的旋轉，但如果所有旋轉都會封閉，則選擇第一個有效的旋轉（而不是返回 null）

## 文件修改
- `packages/game-engine/src/rules/roomDiscovery.ts`: 添加了詳細的日誌輸出來調試問題

## GitHub Issue
https://github.com/csieram/boardgame-betrayal/issues/318