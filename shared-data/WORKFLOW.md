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

## Discord 頻道對照表

| Agent | 頻道名稱 | 頻道 ID |
|-------|----------|---------|
| Agent 1 (Architecture) | #architecture | 1484939726791250100 |
| Agent 2 (Rules Engine) | #rules-engine | 1484939899252768779 |
| Agent 3 (Frontend) | #frontend | 1484940096301039688 |
| Agent 4 (AI Player) | #ai-player | 1484939943062012116 |
| Agent 5 (Rule QA) | #rule-qa | 1484939989820112906 |
| Agent 0 (Orchestrator) | #orchestrator | 1484939675935314051 |

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
  - Discord #agent-X 頻道的更新
  - GitHub issues 狀態
- 如果 agent 15 分鐘沒有回應 → 主動檢查狀態
- 如果 agent 報告阻塞 → 協調解決
- 在 Discord #orchestrator 發布更新給 human

### Step 5: Coordinate Completion
- 當 sub-agent 標記 "🟢 Pending Approval"
- 驗證所有驗收標準已滿足
- 驗證 Discord 更新完整
- 在 Discord 通知 human
- **等待 human 批准並關閉 issue**

### Step 6: Report to Human
- 在 #orchestrator 發布完成摘要
- 更新 parent issue 進度
- 推薦下一步

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
- **15 分鐘無回應** → 主動發送消息詢問狀態
- **Agent 報告阻塞** → 立即協調資源解決
- **Session 超時** → 檢查 transcript，決定接管或重新指派
- **Discord 更新缺失** → 提醒 Agent 補發
- **任務完成等待批准** → 及時審查並批准，避免 Agents 長時間等待

### Agent 必須遵守
- 遇到問題立即在 Discord 發送 **[Blocked]** 消息
- 不要靜默失敗或等待超時
- **四次 Discord 更新**必須完整發送:
  1. Task Received
  2. In Progress
  3. Completed
  4. Approved
- 獲得批准後發送最終 **[Approved]** 確認消息

## 並行任務處理

**可以同時指派多個 Agents 執行不同任務:**
- 每個 Agent 獨立工作，互不阻塞
- 各自在專屬 Discord 頻道匯報進度

## 關鍵規則

1. **永遠等待 human 批准** 才開始工作
2. **永遠等待 human 批准** 才關閉 issues
3. **永遠不要自己關閉 GitHub issues** - 只有 human 可以關閉
4. **使用 GitHub issues 作為 source of truth** - 所有進度追蹤在那裡
5. **定期發布更新** 到 Discord #orchestrator 給 human

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
