# Interface Request Template

## Requested by
Agent 2

## Current blocker
Tile placement legality needs door metadata on RoomState.

## Proposed contract change
Add `doors: Door[]` to `RoomState`.

## Downstream impact
- Frontend highlighting
- Replay schema
- AI legal action generation

## Approval needed from
- Agent 0 (Orchestrator)
- Agent 1 (Core Architect)
- Agent 5 (Rule QA)

---

## 使用说明

1. **创建请求**：当需要修改 core contract 时创建
2. **说明阻塞**：为什么需要这个变更
3. **提出方案**：具体的 contract 变更建议
4. **分析影响**：对下游的影响
5. **等待批准**：需要 Agent 0, 1, 5 批准

## 审批流程

```
Agent X 提出 Interface Request
    ↓
Agent 1 审查技术可行性
    ↓
Agent 5 审查规则符合性
    ↓
Agent 0 最终批准/拒绝
    ↓
更新 contract 文档
    ↓
通知所有相关 agents
```

## 注意事项

- 不要随意修改 core contract
- 必须说明阻塞原因
- 必须分析下游影响
- 必须获得三方批准
