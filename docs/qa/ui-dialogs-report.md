# UI 對話框設計驗證報告

**GitHub Issue:** #261  
**驗證日期:** 2026-04-05  
**驗證者:** Agent 5 (Rule QA)  
**語言:** 繁體中文

---

## 摘要

本次驗證針對 Betrayal 桌遊專案中的所有對話框進行設計與可用性檢查。共檢查了 5 個主要對話框類型，整體設計品質良好，動畫效果豐富，但仍有一些改進空間。

**整體評分:** 8.5/10

---

## 檢查清單結果

### 1. Event Check Modal (事件檢定對話框)

**檔案位置:** `apps/web/src/components/game/EventCheckModal.tsx`

| 檢查項目 | 狀態 | 備註 |
|---------|------|------|
| Modal opens correctly | ✅ 通過 | 使用 `AnimatePresence` 實現平滑開啟動畫 |
| Dice animation visible | ✅ 通過 | 使用 Framer Motion 實現 360° 旋轉動畫，效果流暢 |
| Result clearly displayed | ✅ 通過 | 成功/失敗狀態以不同顏色區分（綠/紅），並顯示效果描述 |
| Close button works | ✅ 通過 | 「繼續」按鈕可正確關閉對話框 |
| Mobile-friendly size | ⚠️ 需改進 | `max-w-lg` 在部分小螢幕可能過寬，建議增加 `max-w-sm` 斷點 |

**優點:**
- 支援分層結果顯示 (Issue #234)
- 骰子動畫使用 spring 物理效果，視覺體驗佳
- 頂部裝飾條和背景光效增強視覺層次

**建議改進:**
- 在小螢幕設備上增加 `max-h-[90vh]` 確保內容可見
- 考慮在擲骰過程中禁用背景點擊關閉

---

### 2. Combat Modal (戰鬥對話框)

**檔案位置:** `apps/web/src/components/game/combat/CombatModal.tsx`

| 檢查項目 | 狀態 | 備註 |
|---------|------|------|
| Attacker/defender info clear | ✅ 通過 | `CombatCard` 組件清晰顯示雙方資訊，顏色區分明確（紅/藍） |
| Weapon selection visible | ✅ 通過 | `WeaponSelector` 組件顯示武器列表，含圖標和效果說明 |
| Dice roll animation works | ⚠️ 需改進 | 有動畫但使用 `setInterval` 模擬，建議改用 Framer Motion |
| Result display clear | ✅ 通過 | 勝利/失敗狀態以不同背景色和圖標區分 |
| Damage shown correctly | ✅ 通過 | 明確顯示傷害數值和類型 |

**優點:**
- 雙方資訊並排顯示，對比清晰
- 武器選擇含圖標和屬性加成標籤
- 無武器選項提供明確提示

**建議改進:**
- 擲骰動畫應統一使用 Framer Motion 的 `animate` 屬性，而非 `setInterval`
- 戰鬥結果應顯示更詳細的計算過程（如武器加成）
- 建議增加音效反饋

---

### 3. Damage Dialog (傷害分配對話框)

**檔案位置:** `apps/web/src/components/game/DamageDialog.tsx`

| 檢查項目 | 狀態 | 備註 |
|---------|------|------|
| Damage amount visible | ✅ 通過 | 標題區域明確顯示傷害數值和類型 |
| Trait selection clear | ✅ 通過 | 四個屬性以 2x2 網格顯示，含圖標和數值變化預覽 |
| Confirm button works | ✅ 通過 | 確認按鈕有載入狀態，禁用未選擇時 |
| Death notification if applicable | ✅ 通過 | 致命選項有紅色標記和警告訊息 |

**優點:**
- 屬性選擇區域設計優秀，顯示當前值 → 新值的變化
- 致命選項有明確的「💀 致命」標籤
- 安全選擇有綠色確認提示
- 符合規則書 Page 15 的傷害分配規則

**建議改進:**
- 建議增加屬性選擇的鍵盤快捷鍵支援
- 考慮增加傷害類型的視覺區分（物理/心智/一般）

---

### 4. Corpse Loot Dialog (屍體搜刮對話框)

**檔案位置:** `apps/web/src/components/game/CorpseLootDialog.tsx`

| 檢查項目 | 狀態 | 備註 |
|---------|------|------|
| Corpse info displayed | ✅ 通過 | 顯示死者名稱、位置（含樓層中文轉換） |
| Items list visible | ✅ 通過 | 物品和預兆分類顯示，含圖標和描述 |
| Take buttons work | ✅ 通過 | 「拿取」按鈕有 hover 和 tap 動畫效果 |
| Close button works | ✅ 通過 | 關閉按鈕位於底部，樣式一致 |

**優點:**
- 位置顯示包含樓層中文轉換（一樓/二樓/地下室）
- 物品類型以不同顏色區分（藍色=物品，紫色=預兆）
- 搜刮者資訊顯示頭像和名稱
- 空狀態有友善提示

**建議改進:**
- 建議增加「全部拿取」按鈕
- 物品列表在項目多時可滾動，但建議增加滾動條樣式

---

### 5. Haunt Modal (作祟檢定對話框)

**檔案位置:** `apps/web/src/components/game/HauntRollModal.tsx`

| 檢查項目 | 狀態 | 備註 |
|---------|------|------|
| Haunt roll animation visible | ✅ 通過 | 與 Event Check Modal 相同的高品質骰子動畫 |
| Result clearly shown | ✅ 通過 | 明確顯示總和與觸發條件比較 |
| Objective display clear | ✅ 通過 | 由 `HauntRevealScreen` 組件處理，目標顯示清晰 |

**優點:**
- 骰子動畫與 Event Check Modal 保持一致，維護性佳
- 結果顯示包含觸發條件說明（總和 < 預兆數觸發）
- 作祟觸發時使用紅色主題，未觸發使用綠色，視覺區分明確

**相關組件:** `HauntRevealScreen.tsx`
- 劇本資訊顯示完整（名稱、英文名、描述）
- 叛徒和英雄目標分卡顯示
- 當前玩家身份有明確標記（「就是你！」/「你的任務」）

**建議改進:**
- 建議在作祟揭示畫面增加「隱藏/顯示」功能，方便叛徒隱藏目標

---

## 額外發現

### Death Notification (死亡通知)

**檔案位置:** `apps/web/src/components/game/DeathNotification.tsx`

雖然不在原始檢查清單中，但此組件設計優秀：
- 符合規則書 Page 19 的死亡處理
- 顯示死因、最終屬性、遺留物品
- 動畫效果增強戲劇性

---

## 整體建議

### 高優先級
1. **統一動畫實現方式** - Combat Modal 應改用 Framer Motion 而非 `setInterval`
2. **響應式優化** - 所有對話框應在小螢幕上測試，確保 `max-h` 和 `max-w` 適當

### 中優先級
3. **鍵盤無障礙** - 增加鍵盤導航支援（Tab 切換、Enter 確認、Esc 關閉）
4. **音效反饋** - 重要互動（擲骰、勝利/失敗）增加音效

### 低優先級
5. **觸控優化** - 按鈕尺寸在觸控設備上應至少 44x44px
6. **深色模式** - 目前僅支援深色主題，未來可考慮淺色模式

---

## 結論

所有對話框在設計和可用性方面表現良好，符合遊戲需求。主要問題是 Combat Modal 的動畫實現方式不一致，以及部分響應式優化空間。

**建議狀態:** 🟢 可接受，建議進行中優先級改進

---

## 附件

### 檢查的檔案清單

| 檔案 | 行數 | 狀態 |
|------|------|------|
| `EventCheckModal.tsx` | ~500 | ✅ 已檢查 |
| `combat/CombatModal.tsx` | ~200 | ✅ 已檢查 |
| `combat/CombatCard.tsx` | ~100 | ✅ 已檢查 |
| `combat/WeaponSelector.tsx` | ~120 | ✅ 已檢查 |
| `DamageDialog.tsx` | ~280 | ✅ 已檢查 |
| `CorpseLootDialog.tsx` | ~180 | ✅ 已檢查 |
| `HauntRollModal.tsx` | ~280 | ✅ 已檢查 |
| `HauntRevealScreen.tsx` | ~350 | ✅ 已檢查 |
| `DeathNotification.tsx` | ~150 | ✅ 已檢查 |

---

*報告生成時間: 2026-04-05 17:40 PDT*
