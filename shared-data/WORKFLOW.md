# 6-Agent Collaboration Workflow

## Overview

Human-driven workflow with Agent 0 (Orchestrator) coordinating Agents 1-5.

## Workflow Steps

| Step | Who | Action | Where |
|------|-----|--------|-------|
| 1 | **You** | Select/approve issues (or approve Agent 0's recommendations) | GitHub |
| 2 | Agent 0 | Create sub-task issues, spawn sub-agent | GitHub + internal |
| 3 | Agent 0 | Post delegation in #orchestrator | Discord |
| 4 | Sub-agent | Work, update GitHub issue | GitHub + Discord |
| 5 | Sub-agent | Submit PR, mark "🟢 Pending Approval" | GitHub |
| 6 | Agent 0 | Notify you in #orchestrator | Discord |
| 7 | **You** | Review and approve/close issue | GitHub |
| 8 | Agent 0 | Update parent issue, report completion | Discord + GitHub |

## Detailed Flow

### Step 1: You Select/Approve Issues
- Create EPIC issue on GitHub using `github-issue-parent.md` template
- OR review Agent 0's recommendations and approve

### Step 2: Agent 0 Creates Sub-tasks
- Creates sub-task issues using `github-issue-subtask.md` template
- Spawns appropriate sub-agent via `sessions_spawn`
- Passes GitHub issue URL and requirements

### Step 3: Agent 0 Posts in #orchestrator
```
📋 Task Delegated - AGENT-X-XXX
**Spawned:** Agent X (Role)
**GitHub Issue:** #XX
**Parent:** #XX
**Status:** 🟡 In Progress
🔗 [GitHub Link]
```

### Step 4: Sub-agent Works
- Accepts task from Agent 0
- Updates GitHub issue checklist: `- [x] Completed item`
- Posts progress in own Discord channel
- Asks questions if blocked

### Step 5: Sub-agent Submits PR
- Creates PR with all required evidence
- Updates GitHub issue: "🟢 Pending Approval"
- Links PR to issue

### Step 6: Agent 0 Notifies You
```
✅ Task Complete - AGENT-X-XXX
**Status:** 🟢 Pending Approval
**PR:** #XX
**Evidence:** [List]
🔗 [GitHub Link]
⚠️ Awaiting your approval to close
```

### Step 7: You Review and Close
- Review PR and evidence
- Test if needed
- Close GitHub issue (only you can close)

### Step 8: Agent 0 Reports Completion
```
📊 Epic Progress Update
**Epic:** #XX
- [x] AGENT-1-XXX - Complete
- [x] AGENT-2-XXX - Complete
- [ ] AGENT-3-XXX - In Progress

**Next:** Spawn Agent 3 for remaining task
```

## Critical Rules

1. **Human approval required** at Step 1 (start) and Step 7 (end)
2. **Never close GitHub issues** - only human can close
3. **Always mark "🟢 Pending Approval"** when sub-agent completes work
4. **GitHub is source of truth** - all progress tracked in issues
5. **Discord for notifications** - real-time updates only

## Agent Responsibilities

### Agent 0 (Orchestrator)
- Coordinate all agents
- Create sub-tasks
- Spawn sub-agents
- Report to human
- Track epic progress

### Agents 1-5 (Sub-agents)
- Accept tasks from Agent 0
- Work on assigned issues
- Update GitHub checklist
- Submit PRs with evidence
- Mark "Pending Approval" when done

## Templates

- `github-issue-parent.md` - For EPIC issues (Step 1)
- `github-issue-subtask.md` - For sub-task issues (Step 2)
- `daily-update-format.md` - For progress updates (Step 4)

## Issue Status Flow

🟡 **In Progress** → Working on task
🟢 **Pending Approval** → Task complete, awaiting human review
✅ **Closed** → Human approved and closed

## Communication Channels

| Channel | Purpose |
|---------|---------|
| #orchestrator | Agent 0 coordination, human notifications |
| #architecture | Agent 1 work updates |
| #engine | Agent 2 work updates |
| #frontend | Agent 3 work updates |
| #ai-player | Agent 4 work updates |
| #rule-qa | Agent 5 work updates |
