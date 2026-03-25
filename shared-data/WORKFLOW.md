# WORKFLOW.md - Agent 0 工作流程

## 概述

本文檔描述 Agent 0 (Orchestrator) 管理 6-Agent 團隊的完整工作流程。

## 6-Agent 團隊結構

```
Agent 0 — Orchestrator / Producer (指揮者)
    ├── Agent 1 — Core Architect / State (核心架構)
    ├── Agent 2 — Rules Engine / Gameplay (規則引擎)
    ├── Agent 3 — Frontend / UX (前端體驗)
    ├── Agent 4 — AI Player (AI 玩家)
    └── Agent 5 — Rule QA / Test Judge (規則驗證)
```

## Discord 頻道

| 頻道 | 用途 |
|------|------|
| #orchestrator | Agent 0 向 Human 報告的唯一頻道 |

**注意：** Sub-agents (Agent 1-5) **不會**在 Discord 發送訊息。它們完成後在 session result 中回報，由 Agent 0 統一在 #orchestrator 報告。

## 工作流程 (需要 Human 批准)

### Step 1: Recommend Issues
- 分析 human 的需求
- 推薦子任務給 human
- **等待 human 批准後再繼續**

### Step 2: Create GitHub Issues
- 使用模板創建子任務 issues:
  - `shared-data/templates/github-issue-parent.md` 用於 EPICs
  - `shared-data/templates/github-issue-subtask.md` 用於子任務
- 連結到 parent issue

### Step 3: Spawn Sub-Agents
- 使用 `sessions_spawn` 委派給 sub-agents
- **重要:** 在任務中包含正確的 Discord 頻道 ID
- 傳遞 GitHub issue URL 和需求

### Step 4: Track Progress
- 透過以下方式監控 sub-agent 工作:
  - 檢查 sub-agent session 狀態
  - GitHub issues 狀態
- 如果 agent 15 分鐘沒有回應 → 主動檢查狀態
- 如果 agent 報告阻塞 → 協調解決
- **Agent 0 只在 #orchestrator 向 human 報告**

### Step 5: Coordinate Completion
- 當 sub-agent 標記 "🟢 Pending Approval"
- 驗證所有驗收標準已滿足
- **Agent 0 在 #orchestrator 通知 human**
- **等待 human 批准並關閉 issue**

### Step 6: Report to Human
- 在 #orchestrator 發布完成摘要
- 更新 parent issue 進度
- 推薦下一步

## Bug 處理流程

### 發現 Bug 時

當 Human 在測試中發現 Bug 時：

**Step 1: 創建 Bug Issue**
- Agent 0 在 GitHub 創建新的 bug issue
- 標題格式: `[Bug] 簡短描述`
- 標籤: `bug` + 相關 agent 標籤 (如 `agent-3`, `frontend`)
- 內容包含:
  - Bug 描述
  - 重現步驟
  - 預期行為 vs 實際行為
  - 相關檔案
  - Acceptance criteria

**Step 2: 指派給對應 Agent**
- 根據 bug 類型指派:
  - UI/Frontend 問題 → Agent 3
  - Rules/Gameplay 問題 → Agent 2
  - State/Architecture 問題 → Agent 1
  - AI 問題 → Agent 4
  - QA/測試問題 → Agent 5

**Step 3: 追蹤修復**
- Agent 修復 bug
- 提交 PR
- Agent 0 驗證修復
- Human 批准關閉

### Bug Issue 模板

```markdown
## Bug Description
[清楚描述 bug]

## Current Behavior
[實際發生什麼]

## Expected Behavior
[應該發生什麼]

## Reproduction Steps
1. [步驟 1]
2. [步驟 2]
3. [步驟 3]

## Files Affected
- [檔案路徑]

## Acceptance Criteria
- [ ] [修復項目 1]
- [ ] [修復項目 2]

---
*Reported during testing of #[原始 issue]*
```

## Discord 匯報格式

### 任務委派時
```
📋 Task Delegated - AGENT-X-XXX
**Spawned:** Agent X (Role)
**GitHub Issue:** #XX
**Parent:** #XX
**Status:** 🟡 In Progress
🔗 [GitHub Link]
```

### 進度更新
```
📊 Progress Update
**Completed:** [List]
**Next:** [Plan]
**Blockers:** [List]
```

### 任務完成等待批准
```
✅ Task Complete - AGENT-X-XXX
**Status:** 🟢 Pending Approval
**PR:** #XX
**Evidence:** [List]
🔗 [GitHub Link]
⚠️ Awaiting human approval to close
```

## Agent 監控與錯誤處理

### Agent 0 監控職責
- **15 分鐘無回應** → 主動檢查 sub-agent 狀態
- **Agent 報告阻塞** → 立即協調資源解決
- **Session 超時** → 檢查 transcript，決定接管或重新指派
- **任務完成等待批准** → 及時在 #orchestrator 報告給 human

### Sub-agent 回報方式
- Sub-agents **不會**在 Discord 發送訊息
- 完成後在 session result 中回報
- Agent 0 收到通知後統一在 #orchestrator 報告

## 並行任務處理

**可以同時指派多個 Agents 執行不同任務:**
- 每個 Agent 獨立工作，互不阻塞
- 完成後由 Agent 0 統一在 #orchestrator 報告

## 關鍵規則

1. **永遠等待 human 批准** 才開始工作
2. **永遠等待 human 批准** 才關閉 issues
3. **永遠不要自己關閉 GitHub issues** - 只有 human 可以關閉
4. **永遠等待 human 批准** 才推送 PR 到遠端 repo
5. **永遠等待 human 批准** 才合併 PR
6. **使用 GitHub issues 作為 source of truth** - 所有進度追蹤在那裡
7. **定期發布更新** 到 Discord #orchestrator 給 human

## 開發階段

### Phase 1: Solo Mode 基礎
| 順序 | Issue | Agent | 描述 |
|------|-------|-------|------|
| 1 | #35 | Agent 1 | Core Game State Architecture |
| 2 | #38 | Agent 2 | Turn Flow & Movement System |
| 3 | #37 | Agent 2 | Room Discovery & Tile Placement |
| 4 | #36 | Agent 2 | Card Drawing System |
| 5 | #41 | Agent 2 | Haunt Roll & Haunt Reveal |
| 6 | #40 | Agent 3 | Solo Mode UI - Character Select |
| 7 | #39 | Agent 3 | Solo Mode UI - Game Board |
| 8 | #42 | Agent 3 | Solo Mode UI - Card Display |
| 9 | #43 | Agent 3 | Solo Mode UI - Game Log |
| 10 | #45 | Agent 4 | AI Player - Traitor Bot |
| 11 | #44 | Agent 5 | Rule QA - Solo Mode Validation |

### Phase 2: Multiplayer
| 順序 | Issue | Agent | 描述 |
|------|-------|-------|------|
| 1 | #50 | Agent 1 | Multiplayer State Sync |
| 2 | #46 | Agent 3 | Multiplayer UI - Lobby |
| 3 | #49 | Agent 3 | Multiplayer UI - Turn Management |
| 4 | #48 | Agent 2 | Haunt Traitor System |
| 5 | #51 | Agent 2 | Combat System |
| 6 | #47 | Agent 5 | Rule QA - Multi Mode Validation |

## 相關文件

- [AGENTS_GUIDE.md](./AGENTS_GUIDE.md) - 完整 Agent 協作指南
- [README.md](./README.md) - 專案概述
- [templates/github-issue-template.md](./templates/github-issue-template.md) - Issue 模板
