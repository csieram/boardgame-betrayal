# 戰鬥機制 QA 驗證報告

**GitHub Issue:** #249  
**驗證日期:** 2026-04-05  
**驗證者:** Agent 5 (Rule QA / Test Judge)  
**語言:** 繁體中文

---

## 執行摘要

本次 QA 驗證針對 Betrayal at House on the Hill 桌遊的戰鬥系統進行全面檢查，驗證其是否符合官方規則書（Page 15-16）的規定。

**整體結果:** ⚠️ **WARNING** - 發現 2 個需要關注的問題

---

## 檢查清單驗證結果

### 1. 戰鬥啟動 (Combat Initiation)

| 檢查項目 | 狀態 | 證據 |
|---------|------|------|
| 戰鬥僅在作祟階段可用 | ✅ PASS | `combat.ts:validateCombat()` 檢查 `state.haunt.isActive` |
| 攻擊者必須與目標相鄰或在同一房間 | ✅ PASS | `combat.ts:isInSameRoom()` 和 `isAdjacent()` 檢查 |
| 遠程武器允許距離攻擊 | ✅ PASS | `combat.ts:validateCombat()` 遠程武器可攻擊相鄰房間 |
| 戰鬥按鈕正確顯示 | ⚠️ WARNING | `solo/page.tsx:canAttack()` 檢查，但 CombatModal 使用模擬數據 |

**詳細說明:**
- ✅ 戰鬥驗證正確檢查作祟階段狀態
- ✅ 近戰武器需要同一房間，遠程武器可以攻擊相鄰房間
- ⚠️ CombatModal.tsx 使用模擬擲骰結果而非真實戰鬥邏輯

---

### 2. 武器選擇 (Weapon Selection)

| 檢查項目 | 狀態 | 證據 |
|---------|------|------|
| 攻擊者可以選擇武器 | ✅ PASS | `CombatModal.tsx:WeaponSelector` 組件 |
| Machete: +1 擲骰加成 | ✅ PASS | `combat.ts:WEAPON_EFFECTS['weapon_machete']` |
| Dagger: +2 骰子, -1 Speed | ✅ PASS | `combat.ts:WEAPON_EFFECTS['weapon_dagger']` |
| Chainsaw: +1 骰子 | ✅ PASS | `combat.ts:WEAPON_EFFECTS['weapon_chainsaw']` |
| Crossbow/Gun: 使用 Speed | ✅ PASS | `combat.ts:WEAPON_EFFECTS['weapon_crossbow']` |
| 徒手使用 Might | ✅ PASS | `combat.ts:resolveCombat()` 預設使用 might |

**詳細說明:**
- ✅ 所有 Issue #239 要求的武器效果都已正確實作
- ✅ 武器副作用（Dagger 的 -1 Speed）正確應用
- ✅ 遠程武器正確使用 Speed 而非 Might

---

### 3. 戰鬥解析 (Combat Resolution)

| 檢查項目 | 狀態 | 證據 |
|---------|------|------|
| 攻擊者擲對應屬性 | ✅ PASS | `combat.ts:resolveCombat()` 使用 `attackerStat` |
| 防守者擲 Might | ✅ PASS | `combat.ts:resolveCombat()` 防守者固定使用 might |
| 較高總和獲勝 | ✅ PASS | `combat.ts:resolveCombat()` 比較總和 |
| 平手: 雙方各受 1 傷害 | ✅ PASS | `combat.ts:resolveTie()` 實作 |
| 傷害 = 總和差值 | ✅ PASS | `combat.ts:calculateDamage()` |

**詳細說明:**
- ✅ 戰鬥解析完全符合規則書 Page 15
- ✅ 平手處理正確：雙方各受 1 點傷害
- ✅ 傷害計算為贏家擲骰總和減去輸家擲骰總和

---

### 4. 傷害應用 (Damage Application)

| 檢查項目 | 狀態 | 證據 |
|---------|------|------|
| 輸家屬性正確降低 | ✅ PASS | `combat.ts:applyDamage()` 減少 might |
| 死亡檢查 | ✅ PASS | `combat.ts:applyDamage()` 檢查 `newMight <= 0` |
| 死亡時創建屍體 | ✅ PASS | `solo/page.tsx:createCorpseForDeadAI()` |
| 戰鬥日誌顯示結果 | ✅ PASS | `combat.ts:applyDamage()` 添加日誌 |

**詳細說明:**
- ✅ 傷害正確應用於輸家的 Might 屬性
- ✅ 屬性歸零時正確標記死亡狀態
- ✅ 屍體系統（Issue #243）正確整合

---

### 5. AI 戰鬥 (AI Combat)

| 檢查項目 | 狀態 | 證據 |
|---------|------|------|
| AI 選擇最佳武器 | ⚠️ WARNING | `HeroAI.ts:evaluateHeroAttack()` 有邏輯但簡化 |
| AI 在有利時攻擊 | ✅ PASS | `HeroAI.ts:evaluateHeroAttack()` 根據健康狀態決定 |
| AI 虛弱時撤退 | ✅ PASS | `HeroAI.ts:decideCombat()` 危急時考慮逃跑 |
| AI 英雄合作 | ✅ PASS | `HeroAI.ts` 有團隊策略評估 |

**詳細說明:**
- ✅ AI 根據健康狀態決定攻擊或逃跑
- ✅ 有武器時增加攻擊傾向
- ⚠️ AI 武器選擇邏輯較簡單，僅檢查是否有武器，未比較最佳武器

---

## 測試覆蓋率

### 單元測試結果

```
combat.test.ts:        29 tests passed
HeroAI.test.ts:        49 tests passed
```

### 測試覆蓋項目

✅ **已覆蓋:**
- 戰鬥驗證（相鄰檢查、死亡檢查、作祟階段檢查）
- 武器效果計算（所有 5 種武器類型）
- 戰鬥解析流程
- 傷害計算與應用
- 平手處理
- AI 決策邏輯

⚠️ **部分覆蓋:**
- CombatModal 前端組件使用模擬數據
- AI 武器選擇邏輯較簡化

---

## 發現的問題

### 問題 1: CombatModal 使用模擬數據

**嚴重程度:** Medium  
**位置:** `apps/web/src/components/game/combat/CombatModal.tsx`  
**描述:** CombatModal 組件使用模擬擲骰結果，而非調用真實的戰鬥邏輯

```typescript
// CombatModal.tsx 第 47-60 行
const result: CombatResult = {
  winner: Math.random() > 0.5 ? 'attacker' : 'defender',
  attackerRoll: Math.floor(Math.random() * 6) + 1,
  defenderRoll: Math.floor(Math.random() * 6) + 1,
  damage: Math.floor(Math.random() * 3) + 1,
  damageType: 'physical',
};
```

**建議:** 應該調用 `combatManager.initiateCombat()` 來獲取真實的戰鬥結果

---

### 問題 2: AI 武器選擇邏輯過於簡化

**嚴重程度:** Low  
**位置:** `packages/game-engine/src/ai/HeroAI.ts`  
**描述:** AI 僅檢查是否有武器，未比較不同武器的加成效果

```typescript
// HeroAI.ts 第 312-315 行
const hasWeapon = player.items.some(item => 
  item.id.includes('weapon') || item.id.includes('axe') || item.id.includes('knife')
);
```

**建議:** 應該使用 `combatManager.calculateWeaponBonusFromId()` 來選擇最佳武器

---

## 規則符合性總結

| 規則項目 | 符合狀態 | 備註 |
|---------|---------|------|
| Page 15: 攻擊必須在同一房間 | ✅ 符合 | 近戰武器正確檢查 |
| Page 15: 雙方擲 Might | ✅ 符合 | 預設使用 might，遠程使用 speed |
| Page 15: 較高總和獲勝 | ✅ 符合 | 正確實作 |
| Page 15: 傷害 = 差值 | ✅ 符合 | `calculateDamage()` 正確 |
| Page 15: 輸家降低 Might | ✅ 符合 | `applyDamage()` 正確 |
| Page 15: 武器加成 | ✅ 符合 | 所有武器效果正確 |
| Page 16: 平手處理 | ✅ 符合 | 雙方各受 1 傷害 |

---

## 建議

### 高優先級
1. **修復 CombatModal** - 使用真實戰鬥邏輯而非模擬數據

### 中優先級
2. **增強 AI 武器選擇** - 讓 AI 能夠比較並選擇最佳武器

### 低優先級
3. **增加整合測試** - 測試前端 CombatModal 與後端戰鬥邏輯的整合

---

## 結論

戰鬥系統的核心邏輯（`combat.ts`）**完全符合**官方規則書 Page 15-16 的規定。所有武器效果、戰鬥解析、傷害計算都正確實作。

主要問題在於前端 CombatModal 組件使用模擬數據而非真實戰鬥邏輯，這需要修復以確保遊戲體驗的正確性。

**建議狀態:** ⚠️ **有條件通過** - 需要修復 CombatModal 後才能標記為完全通過

---

## 相關檔案

- `packages/game-engine/src/rules/combat.ts` - 戰鬥核心邏輯
- `packages/game-engine/src/rules/combat.test.ts` - 戰鬥單元測試
- `packages/game-engine/src/ai/HeroAI.ts` - 英雄 AI
- `packages/game-engine/src/ai/__tests__/HeroAI.test.ts` - AI 測試
- `apps/web/src/components/game/combat/CombatModal.tsx` - 戰鬥 UI
- `apps/web/src/app/solo/page.tsx` - 單人遊戲頁面

---

*報告生成時間: 2026-04-05*  
*Agent 5 - Rule QA / Test Judge*
