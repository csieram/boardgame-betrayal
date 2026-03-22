# Daily Update Format

## 使用方式

在 #daily-sync 频道或 issue comment 中发布：

---

**Yesterday:**
- 完成了什么？

**Today:**
- 计划做什么？

**Blockers:**
- 有什么阻塞？

**Files touched:**
- 修改了哪些文件？

**Contract changes requested:**
- 是否请求了接口变更？

**Evidence produced:**
- 产生了什么证据？

---

## 示例

**Yesterday:**
- 完成了 GameState schema 设计
- 实现了 Player 和 Room 类型定义

**Today:**
- 实现 Tile 和 Item 类型
- 编写 applyAction 基础函数

**Blockers:**
- 需要 Agent 0 确认 Room 和 Tile 的关系定义

**Files touched:**
- `packages/game-engine/src/core/GameState.ts`
- `packages/game-engine/src/types/index.ts`

**Contract changes requested:**
- 请求在 RoomState 中添加 `doors` 字段

**Evidence produced:**
- 类型定义文档
- 示例 state payload
