# Agents 协作指南 (6-Agent 团队)

## 团队结构

```
Agent 0 — Orchestrator / Producer (指挥者)
    ├── Agent 1 — Core Architect / State (核心架构)
    ├── Agent 2 — Rules Engine / Gameplay (规则引擎)
    ├── Agent 3 — Frontend / UX (前端体验)
    ├── Agent 4 — AI Player (AI 玩家)
    └── Agent 5 — Rule QA / Test Judge (规则验证)
```

## 职责分工

### Agent 0 — Orchestrator / Producer
**核心职责：**
- 拆分 issue 为具体任务
- 安排任务依赖顺序
- 指派 agent 执行任务
- 每日同步会议主持
- Merge gate 管理
- 决定何时算 "done"

**工作流程：**
1. **推荐任务** - 分析需求，向人类推荐子任务
2. **等待批准** - 人类批准/修改后才开始
3. **创建子任务** - 在 GitHub 创建子 issue
4. **指派 agent** - 使用 `sessions_spawn` 委派给子 agent
5. **跟踪进度** - 监控子 agent 工作，更新 GitHub
6. **汇报进度** - 在 Discord #orchestrator 向人类汇报
7. **等待验收** - 子任务完成后标记 "Pending Approval"
8. **人类批准** - 人类审查并关闭 issue

**GitHub Issue 流程：**
```
人类创建/批准 Parent Issue (EPIC)
    ↓
Agent 0 创建 Sub-task Issues
    ↓
Agent 0 spawn 子 agent
    ↓
子 agent 工作并更新 GitHub
    ↓
子 agent 标记 "Pending Approval"
    ↓
Agent 0 在 Discord 通知人类
    ↓
人类审查并关闭 issue
```

**Discord 汇报格式：**
```
📋 Task Delegated - AGENT-X-XXX
**Spawned:** Agent X
**GitHub Issue:** #XX
**Status:** 🟡 In Progress
🔗 [GitHub Link]

📊 Progress Update
**Completed:** [List]
**Next:** [Plan]

✅ Task Complete - AGENT-X-XXX
**Status:** 🟢 Pending Approval
**PR:** #XX
🔗 [GitHub Link]
```

**关键决策：**
- 任务优先级
- 资源分配
- 发布时间

---

## Sub-Agent Workflow (Agents 1-5)

### 被 Agent 0 委派时的流程

**1. 接收任务**
- Agent 0 使用 `sessions_spawn` 创建子会话
- 接收 GitHub issue 链接和任务描述

**2. 接受/确认任务**
- 审查任务要求
- 确认可以在 deadline 前完成
- 向 Agent 0 回复接受确认

**3. 工作并更新 GitHub**
- 在 GitHub issue 中更新进度
- 使用 checklist 标记完成的任务
- 遇到问题及时在 Discord 频道汇报

**4. 提交 PR**
- 完成任务后创建 PR
- PR 关联到 GitHub issue
- 包含所有要求的 evidence

**5. 标记 Pending Approval**
- 在 GitHub issue 中标记 "🟢 Pending Approval"
- 向 Agent 0 报告完成

**6. 等待人类批准**
- 人类审查 PR 和 issue
- 人类关闭 issue (最终批准)

### Discord 汇报格式 (在自己的频道)

```
🏗️ AGENT-X-XXX - [Task Name]

**GitHub:** #XX
**Status:** 🟡 In Progress

### Progress
- [x] Completed item 1
- [ ] In progress item 2

### Code Preview
```typescript
// code snippet
```

### Blockers
None / [List blockers]

🔗 [GitHub Link]
```

---

### Agent 1 — Core Architect / State
**核心职责：**
- Game state schema 设计
- Action / event contract 定义
- Reducer / state transition 实现
- Deterministic RNG / replay foundation

**输入：**
- `shared-data/rulebook/` - 规则书
- `shared-data/rooms/` - 房间数据
- `shared-data/characters/` - 角色数据

**输出：**
- `packages/game-engine/src/core/GameState.ts`
- `packages/game-engine/src/types/` - 类型定义
- API 契约文档

**关键接口：**
```typescript
interface GameState {
  phase: 'setup' | 'exploration' | 'haunt' | 'end';
  players: Player[];
  map: Tile[][];
  turn: TurnState;
  cards: CardState;
}
```

**阻塞：** 其他所有 agent 都依赖此 agent

---

### Agent 2 — Rules Engine / Gameplay
**核心职责：**
- Turn flow (回合流程)
- Movement (移动系统)
- Room discovery (房间发现)
- Tile placement (板块放置)
- Item / Omen / Event / Haunt / Combat 等规则实现

**输入：**
- Agent 1 的状态接口
- `shared-data/rulebook/` - 规则书
- `shared-data/rooms/` - 房间数据
- `shared-data/cards/` - 卡牌数据

**输出：**
- `packages/game-engine/src/rules/` - 规则实现
- `packages/game-engine/src/mechanics/` - 游戏机制

**关键规则：**
- 探索阶段规则 (Page 11-13)
- 作祟触发规则 (Page 14)
- 战斗规则 (Page 15)
- 移动规则 (Page 11)

**依赖：** Agent 1

---

### Agent 3 — Frontend / UX
**核心职责：**
- Board UI (游戏板界面)
- Player panel (玩家面板)
- Action controls (操作控件)
- History log (历史记录)
- Animation / interaction (动画交互)

**输入：**
- Agent 1 的状态接口
- Agent 2 的游戏机制
- `shared-data/characters/` - 角色图像
- `shared-data/rooms/` - 房间图像

**输出：**
- `apps/web/src/components/game/` - 游戏组件
- `apps/web/src/app/solo/` - 单人游戏页面
- UI/UX 设计文档

**技术栈：**
- React + TypeScript
- Tailwind CSS
- Framer Motion (动画)

**依赖：** Agent 1, Agent 2

---

### Agent 4 — AI Player
**核心职责：**
- Bot policy (AI 策略)
- Legal action selection (合法动作选择)
- Simulation / heuristic (模拟/启发式)
- Difficulty levels (难度等级)

**输入：**
- Agent 1 的状态接口
- Agent 2 的游戏规则
- `shared-data/characters/` - 角色数据

**输出：**
- `packages/game-engine/src/ai/` - AI 系统
- `packages/game-engine/src/ai/BotPlayer.ts`
- AI 策略文档

**AI 行为：**
- 移动策略
- 房间发现优先级
- 战斗决策
- 物品使用
- 交易行为

**依赖：** Agent 1, Agent 2

---

### Agent 5 — Rule QA / Test Judge
**核心职责：**
- Rule book traceability (规则书可追溯)
- Acceptance test (验收测试)
- Scenario test (场景测试)
- Replay test (回放测试)
- Merge blocking (阻止不符合规则的合并)

**输入：**
- 所有其他 agents 的输出
- `shared-data/rulebook/` - 规则书
- GitHub PR

**输出：**
- 测试报告
- Bug 报告
- 规则符合性检查表
- 阻止/批准合并建议

**验证清单：**
- [ ] 骰子系统符合 Page 10
- [ ] 回合流程符合 Page 11-13
- [ ] 房间发现符合 Page 12
- [ ] 作祟触发符合 Page 14
- [ ] 战斗系统符合 Page 15
- [ ] 角色死亡符合 Page 9, 19

**权力：**
- 可以阻止任何不符合规则的 PR
- 可以要求重新实现
- 最终决定权在 Agent 0

**依赖：** 所有其他 agents

---

## 开发顺序

### Phase 1: 基础 (Week 1)
```
Agent 1 → State Schema
    ↓
Agent 0 审查并批准
```

### Phase 2: 规则 (Week 2)
```
Agent 2 → Rules Engine
    ↓
Agent 5 验证规则正确性
    ↓
Agent 0 批准
```

### Phase 3: 并行开发 (Week 3-4)
```
Agent 3 → Frontend
Agent 4 → AI Player
    ↓
并行进行
    ↓
Agent 5 验证两者
    ↓
Agent 0 批准
```

### Phase 4: 集成 (Week 5)
```
All Agents → 集成测试
    ↓
Agent 5 → 全面验证
    ↓
Agent 0 → 最终发布
```

---

## 沟通协议

### 每日站会 (由 Agent 0 主持)
```
Agent X 报告：
- 昨天完成：[具体任务 + 链接]
- 今天计划：[具体任务]
- 阻塞：[需要谁的帮助]
- 风险：[可能影响进度的因素]
```

### 任务状态更新
- **Todo** → Agent 0 指派
- **In Progress** → Agent 开始工作时更新
- **Review** → 完成，等待审查
- **QA** → Agent 5 验证中
- **Done** → Agent 0 最终批准

### 冲突解决
1. 技术冲突 → 引用规则书讨论
2. 资源冲突 → Agent 0 协调
3. 规则争议 → Agent 5 裁决
4. 最终决策 → Agent 0

---

## 代码规范

### 提交信息
```
[Agent X][模块] 简短描述

详细说明：
- 做了什么
- 为什么这样做
- 影响范围
- 测试情况

Refs: #issue-number
Depends-on: #other-pr
```

### PR 审查流程
1. Agent 提交 PR
2. Agent 0 指派审查者
3. 技术审查 (其他 agents)
4. 规则审查 (Agent 5)
5. Agent 0 最终合并

### 合并标准 (Agent 5 检查)
- [ ] 代码符合规范
- [ ] 有单元测试
- [ ] 符合规则书
- [ ] 不破坏现有功能
- [ ] 文档已更新

---

## 紧急联系

### 阻塞升级路径
1. 在 GitHub issue 中标记 "blocked"
2. 在每日站会中报告
3. Agent 0 协调资源
4. 必要时调整计划

### 关键决策点
- 架构变更 → Agent 1 + Agent 0
- 规则解释 → Agent 2 + Agent 5
- 发布决定 → Agent 0
