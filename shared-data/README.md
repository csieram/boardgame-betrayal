# Shared Data - Agents 共享数据

> **6-Agent 团队协作结构**
> 
> Agent 0 (指挥) → Agent 1-5 (执行) → Agent 5 (验证)

## 快速导航

| 文档 | 用途 |
|------|------|
| [AGENTS_GUIDE.md](./AGENTS_GUIDE.md) | **必读！** 6-Agent 协作指南 |
| [agents/](./agents/) | **Agent 启动命令** |
| [templates/](./templates/) | **工作模板** |
| [rulebook/](./rulebook/) | 游戏规则书 |
| [rooms/](./rooms/) | 房间数据 (46个) |
| [characters/](./characters/) | 角色数据 (6个) |
| [cards/](./cards/) | 卡牌数据 (34张) |

## 如果你是...

### Agent 0 — Orchestrator / Producer
👉 **先看** [AGENTS_GUIDE.md](./AGENTS_GUIDE.md) 了解如何管理团队
👉 **使用** [templates/github-issue-template.md](./templates/github-issue-template.md) 创建任务

**你的任务：**
- 从 GitHub issues 读取任务
- 拆分为子任务
- 指派给 Agent 1-5
- 每日同步进度
- 最终验收

### Agent 1 — Core Architect / State
👉 **先看** [AGENTS_GUIDE.md](./AGENTS_GUIDE.md) 中 "Agent 1" 部分

**关键输入：**
- `rulebook/rulebook-summary.md` - 核心规则
- `rooms/rooms.ts` - 房间数据结构
- `characters/characters.ts` - 角色数据结构

**你的输出：**
- `packages/game-engine/src/core/GameState.ts`
- 类型定义
- API 契约

**阻塞：** 其他所有 agent 都依赖你！

### Agent 2 — Rules Engine / Gameplay
👉 **先看** [AGENTS_GUIDE.md](./AGENTS_GUIDE.md) 中 "Agent 2" 部分

**关键输入：**
- Agent 1 的状态接口
- `rulebook/rulebook-summary.md` - 规则书

**重点规则：**
- Page 11-13: 回合流程
- Page 12: 房间发现
- Page 14: 作祟触发
- Page 15: 战斗系统

### Agent 3 — Frontend / UX
👉 **先看** [AGENTS_GUIDE.md](./AGENTS_GUIDE.md) 中 "Agent 3" 部分

**关键输入：**
- Agent 1 的状态接口
- Agent 2 的游戏机制
- `characters/` - 角色图像
- `rooms/` - 房间图像

**技术栈：** React + TypeScript + Tailwind + Framer Motion

### Agent 4 — AI Player
👉 **先看** [AGENTS_GUIDE.md](./AGENTS_GUIDE.md) 中 "Agent 4" 部分

**关键输入：**
- Agent 1 的状态接口
- Agent 2 的游戏规则
- `characters/` - 角色数据

**你的任务：**
- 实现 AI 决策树
- 设计难度等级
- 让 AI 可以玩单人游戏

### Agent 5 — Rule QA / Test Judge
👉 **先看** [AGENTS_GUIDE.md](./AGENTS_GUIDE.md) 中 "Agent 5" 部分

**关键输入：**
- 所有其他 agents 的输出
- `rulebook/rulebook-summary.md` - 规则书

**你的权力：**
- ✅ 可以阻止不符合规则的 PR
- ✅ 可以要求重新实现
- ✅ 最终决定是否符合规则

## 数据概览

### 房间 Rooms
- **46 个房间**
- 地下室：18 个
- 地面层：12 个
- 上层：10 个
- 跨楼层：6 个

### 角色 Characters
- **6 个角色**
- Missy, Zoe, Brandon, Vivian, Peter, Madame Zostra
- 每个角色有 4 个属性

### 卡牌 Cards
- **34 张卡牌**
- 事件卡：12 张
- 物品卡：12 张
- 预兆卡：10 张

## 关键规则摘要

### 探索阶段
1. 根据 Speed 值移动
2. 发现新房间 → **回合自动结束**
3. 根据房间符号抽卡
   - E = 事件卡
   - I = 物品卡
   - O = 预兆卡 + 作祟检定

### 作祟触发
- 抽预兆卡后检定
- 掷骰数量 = 已发现预兆数量
- 结果 ≥ 5 触发

## 开发顺序

```
Week 1: Agent 1 → State Schema
Week 2: Agent 2 → Rules Engine
Week 3: Agent 3 (Frontend) + Agent 4 (AI) 并行
Week 4: Agent 5 → 全面验证
Week 5: All → 集成测试 + Bug 修复
```

## 沟通方式

- **每日站会** - Agent 0 主持 ([模板](./templates/daily-update-format.md))
- **GitHub Issues** - 任务追踪 ([模板](./templates/github-issue-template.md))
- **Interface Request** - 接口变更 ([模板](./templates/interface-request-template.md))
- **GitHub PR** - 代码审查
- **共享文档** - 本文件夹

## 问题？

1. 查看 [AGENTS_GUIDE.md](./AGENTS_GUIDE.md)
2. 在 GitHub issue 中提问
3. 联系 Agent 0 协调
