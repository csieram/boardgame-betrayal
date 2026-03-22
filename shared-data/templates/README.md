# Templates - 工作模板

## 可用模板

| 模板 | 用途 | 文件 |
|------|------|------|
| **GitHub Issue** | 创建新 issue | [github-issue-template.md](./github-issue-template.md) |
| **Daily Update** | 每日同步 | [daily-update-format.md](./daily-update-format.md) |
| **Interface Request** | 请求接口变更 | [interface-request-template.md](./interface-request-template.md) |

---

## GitHub Issue Template

用于创建新的开发任务。

**关键字段：**
- Goal - 要实现什么
- Owner - 哪个 agent 负责
- Dependencies - 依赖哪些 issue
- Rulebook refs - 规则书引用
- Acceptance criteria - 完成标准
- Tests required - 需要的测试
- Evidence required - 需要的证据

**使用场景：**
- Agent 0 拆解任务时
- 发现新需求时
- 报告 bug 时

---

## Daily Update Format

用于每日同步会议。

**关键字段：**
- Yesterday - 昨天完成
- Today - 今天计划
- Blockers - 阻塞
- Files touched - 修改的文件
- Contract changes requested - 接口变更请求
- Evidence produced - 产生的证据

**使用场景：**
- 每日站会
- Issue 进度更新
- 向 Agent 0 报告

---

## Interface Request Template

用于请求修改 core contract。

**关键字段：**
- Requested by - 请求者
- Current blocker - 当前阻塞
- Proposed contract change - 建议的变更
- Downstream impact - 下游影响
- Approval needed from - 需要谁的批准

**使用场景：**
- 需要修改 Agent 1 定义的接口时
- 发现 contract 不足以支持功能时
- 需要添加新字段到 state 时

**重要：**
- 必须获得 Agent 0, 1, 5 三方批准
- 必须分析下游影响
- 不能随意修改 core contract

---

## 使用建议

1. **Agent 0** - 主要使用 GitHub Issue 模板
2. **所有 Agents** - 每天使用 Daily Update 格式
3. **Agent 2, 3, 4** - 需要时使用 Interface Request 模板
