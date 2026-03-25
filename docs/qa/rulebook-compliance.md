# 規則書符合性檢查表 (Rulebook Compliance Checklist)

**文件版本**: 1.0  
**更新日期**: 2026-03-23  
**對應規則書**: Betrayal at House on the Hill - 3rd Edition

---

## 測試狀態圖例

| 符號 | 意義 |
|------|------|
| ✅ | 已實作並通過測試 |
| 🟡 | 部分實作或測試不完整 |
| ❌ | 未實作 |
| ⏳ | 進行中 |
| ⚠️ | 有已知問題 |

---

## 核心規則對照表

### 遊戲設置 (Page 7)

| 規則書頁碼 | 功能 | 狀態 | 測試檔案 | 備註 |
|-----------|------|------|----------|------|
| Page 7 | 3-6 名玩家 | ✅ | GameState.test.ts | 支援 3-6 人 |
| Page 7 | 角色選擇 | ✅ | GameState.test.ts | 6 個角色可用 |
| Page 7 | 起始房間放置 | ✅ | GameState.test.ts | 入口大廳、地下室入口、上層入口 |
| Page 7 | 所有角色從入口大廳開始 | ✅ | GameState.test.ts | 初始位置驗證 |

### 角色屬性 (Page 8-9)

| 規則書頁碼 | 功能 | 狀態 | 測試檔案 | 備註 |
|-----------|------|------|----------|------|
| Page 8 | 4 個屬性 (Speed/Might/Sanity/Knowledge) | ✅ | GameState.test.ts | 類型定義完整 |
| Page 8 | 8 格數值軌道 | ✅ | shared/characters.ts | 每個角色有 statTrack |
| Page 8 | 起始值標記 (*4) | ✅ | shared/characters.ts | 第4格為起始值 |
| Page 9 | 屬性不會低於臨界值 (探索階段) | 🟡 | - | 需補充測試 |
| Page 9 | 屬性到 0 時角色死亡 (作祟階段) | ❌ | - | 待實作 |

### 骰子系統 (Page 10)

| 規則書頁碼 | 功能 | 狀態 | 測試檔案 | 備註 |
|-----------|------|------|----------|------|
| Page 10 | 8 個骰子 | ✅ | GameState.test.ts | SeededRng.rollDice |
| Page 10 | 骰子面：0, 0, 1, 1, 2, 2 | ✅ | GameState.test.ts | DICE_FACES 驗證 |
| Page 10 | 屬性檢定：擲骰數量 = 當前屬性值 | 🟡 | cardDrawing.test.ts | 需更多測試 |
| Page 10 | 攻擊檢定：雙方擲相同屬性 | ❌ | - | 戰鬥系統待實作 |
| Page 10 | 作祟檢定：擲骰數量 = 已發現預兆數量 | ✅ | haunt.test.ts | HAUNT_ROLL_THRESHOLD |

### 回合流程 (Page 11-13)

| 規則書頁碼 | 功能 | 狀態 | 測試檔案 | 備註 |
|-----------|------|------|----------|------|
| Page 11 | 移動階段 | ✅ | turn.test.ts | startTurn 設定移動點數 |
| Page 11 | 最多移動 Speed 值個房間 | ✅ | movement.test.ts | validateMove 檢查 |
| Page 11 | 可以停在任何房間 | ✅ | movement.test.ts | 支援中途停止 |
| Page 11 | 障礙物需要 2 點移動力 | 🟡 | movement.test.ts | 有常數定義，需更多測試 |
| Page 12 | 發現新房間 | ✅ | roomDiscovery.test.ts | RoomDiscoveryManager |
| Page 12 | 從對應樓層牌堆抽房間 | ✅ | roomDiscovery.test.ts | drawRoomFromDeck |
| Page 12 | 自動旋轉匹配門位置 | ✅ | roomDiscovery.test.ts | calculateRotation |
| Page 12 | **發現新房間後回合自動結束** | ✅ | turn.test.ts | shouldAutoEndTurn |
| Page 12 | 根據房間符號抽卡 | ✅ | roomDiscovery.test.ts | getCardDrawRequirement |
| Page 12 | E 符號 → 事件卡 | ✅ | cardDrawing.test.ts | CardType 映射 |
| Page 12 | I 符號 → 物品卡 | ✅ | cardDrawing.test.ts | CardType 映射 |
| Page 12 | O 符號 → 預兆卡 + 作祟檢定 | ✅ | haunt.test.ts | makeHauntRoll |
| Page 12 | 無符號 → 不抽卡 | ✅ | roomDiscovery.test.ts | null 處理 |
| Page 13 | 使用物品/預兆 (每回合每項一次) | 🟡 | turn.test.ts | canUseItem 檢查 |
| Page 13 | 結束回合 | ✅ | turn.test.ts | endTurn 測試 |

### 作祟階段 (Page 14)

| 規則書頁碼 | 功能 | 狀態 | 測試檔案 | 備註 |
|-----------|------|------|----------|------|
| Page 14 | 抽預兆卡後進行作祟檢定 | ✅ | haunt.test.ts | shouldMakeHauntRoll |
| Page 14 | 擲骰子數量 = 已發現預兆數量 | ✅ | haunt.test.ts | makeHauntRoll |
| Page 14 | 結果 < 5 觸發作祟 | ✅ | haunt.test.ts | HAUNT_ROLL_THRESHOLD = 5 |
| Page 14 | 最後一張預兆自動觸發 | ✅ | haunt.test.ts | isLastOmen |
| Page 14 | 無叛徒模式 (合作) | ✅ | haunt.test.ts | cooperative 類型 |
| Page 14 | 單叛徒模式 | ✅ | haunt.test.ts | single_traitor 類型 |
| Page 14 | 隱藏叛徒模式 | 🟡 | haunt.test.ts | hidden_traitor 類型定義 |
| Page 14 | 大亂斗模式 | 🟡 | haunt.test.ts | free_for_all 類型定義 |

### 戰鬥系統 (Page 15)

| 規則書頁碼 | 功能 | 狀態 | 測試檔案 | 備註 |
|-----------|------|------|----------|------|
| Page 15 | 攻擊檢定 | ✅ | combat.test.ts | CombatManager.validateCombat |
| Page 15 | 雙方通常擲 Might | ✅ | combat.test.ts | 使用 COMBAT_STAT = 'might' |
| Page 15 | 點數高者獲勝 | ✅ | combat.test.ts | resolveCombat 函數 |
| Page 15 | 差值 = 傷害值 | ✅ | combat.test.ts | calculateDamage 函數 |
| Page 15 | 輸家降低屬性 | ✅ | combat.test.ts | applyDamage 函數 |
| Page 15 | 每次攻擊只能使用 1 個武器 | 🟡 | combat.test.ts | WEAPON_EFFECTS 定義，需 UI 限制 |
| Page 15 | 不能用於防禦 | 🟡 | combat.test.ts | 邏輯正確，需 UI 說明 |

### 角色死亡 (Page 9, 19)

| 規則書頁碼 | 功能 | 狀態 | 測試檔案 | 備註 |
|-----------|------|------|----------|------|
| Page 9 | 探索階段屬性不會低於臨界值 | 🟡 | - | 需補充測試 |
| Page 9 | 顯示骷髏符號但不死亡 | ❌ | - | 待實作 |
| Page 19 | 作祟階段屬性到 0 時角色死亡 | ❌ | - | 待實作 |
| Page 19 | 留下屍體在房間 | ❌ | - | 待實作 |
| Page 19 | 其他玩家可以搜刮屍體 | ❌ | - | 待實作 |

---

## 測試覆蓋率摘要

### 已測試功能 (✅)

1. **核心狀態管理** - GameState.test.ts
   - 狀態初始化
   - 序列化/反序列化
   - Deterministic RNG

2. **回合系統** - turn.test.ts
   - 回合開始/結束
   - 玩家順序輪轉
   - 自動結束回合

3. **移動系統** - movement.test.ts
   - 移動驗證
   - 門連接檢查
   - 路徑尋找

4. **房間發現** - roomDiscovery.test.ts
   - 房間抽取
   - 旋轉計算
   - 卡牌抽取要求

5. **作祟系統** - haunt.test.ts
   - 作祟檢定
   - 劇本選擇
   - 玩家陣營分配

6. **卡牌抽取** - cardDrawing.test.ts
   - 牌堆管理
   - 卡牌效果
   - 作祟檢定整合

7. **板塊放置** - tilePlacement.test.ts
   - 放置驗證
   - 旋轉驗證
   - 門匹配

### 待補充測試 (🟡/❌)

1. **邊界案例測試**
   - 牌堆耗盡
   - 所有屬性在最低值
   - 被困無法移動
   - 同時勝利條件

2. **整合測試**
   - 完整遊戲流程
   - 多玩家互動
   - 長時間遊戲穩定性

3. **戰鬥系統測試**
   - 攻擊/防禦
   - 武器使用
   - 傷害計算

4. **角色死亡測試**
   - 探索階段保護
   - 作祟階段死亡
   - 屍體搜刮

---

## 合規性評估

### 總體評分: 78/100

| 類別 | 完成度 | 狀態 |
|------|--------|------|
| 遊戲設置 | 100% | ✅ 優秀 |
| 角色屬性 | 80% | 🟡 良好 |
| 骰子系統 | 80% | 🟡 良好 |
| 回合流程 | 90% | ✅ 優秀 |
| 作祟系統 | 85% | 🟡 良好 |
| 戰鬥系統 | 95% | ✅ 優秀 |
| 角色死亡 | 40% | 🟡 需補充 |

### 阻擋合併的問題

1. ~~**戰鬥系統未實作** - Page 15 規則完全缺失~~ ✅ 已實作 (PR #103)
2. **角色死亡機制不完整** - Page 9, 19 規則部分缺失（屍體搜刮未實作）
3. **邊界案例測試不足** - 缺乏 robustness 測試
4. **事件卡效果未實作** - Issue #99, #104
5. **具體作祟劇本僅 3 個** - 規則書 Page 20-23 有 50 個劇本

### 建議優先順序

1. 🔴 **高優先**: 實作角色死亡機制 - 屍體搜刮 (Page 9, 19)
2. 🔴 **高優先**: 事件卡效果實作 (Issue #99, #104)
3. 🟡 **中優先**: 補充邊界案例測試
4. 🟡 **中優先**: 增加更多作祟劇本 (目前 3 個，目標 50 個)
5. 🟢 **低優先**: 完善隱藏叛徒和大亂斗模式
6. 🟢 **低優先**: 特殊房間效果實作 (樓梯、電梯、坍塌房間)

---

## 測試檔案索引

| 測試檔案 | 測試內容 | 對應規則 |
|----------|----------|----------|
| GameState.test.ts | 核心狀態、RNG、序列化 | Page 7, 10 |
| turn.test.ts | 回合流程、順序、結束 | Page 11-13 |
| movement.test.ts | 移動、門連接、障礙物 | Page 11 |
| roomDiscovery.test.ts | 房間發現、旋轉、抽卡 | Page 12 |
| haunt.test.ts | 作祟檢定、劇本、陣營 | Page 14 |
| cardDrawing.test.ts | 卡牌抽取、效果 | Page 12 |
| tilePlacement.test.ts | 板塊放置、驗證 | Page 12 |

---

*最後更新: Agent 5 (Rule QA) - 2026-03-23*  
*戰鬥系統已於 PR #103 完成*
