# Agent Creation Guide

This document describes how to reproduce the 6-agent setup for the Betrayal project.

## Prerequisites

- OpenClaw installed and configured
- Discord bot token configured
- GitHub repository: https://github.com/csieram/boardgame-betrayal

## Agent Prompts Location

All agent prompts are in:
```
shared-data/agents/
├── agent-0-prompt.md  (Orchestrator)
├── agent-1-prompt.md  (Architecture)
├── agent-2-prompt.md  (Rules Engine)
├── agent-3-prompt.md  (Frontend)
├── agent-4-prompt.md  (AI Player)
└── agent-5-prompt.md  (Rule QA)
```

## Key Modification: Traditional Chinese Reply

All agent prompts include this instruction at the end:
```markdown
**重要：請使用繁體中文回覆所有訊息。**
```

This was added in commit `06b369c` to ensure all agents reply in Traditional Chinese.

## Creating New Agents

### Step 1: Copy Agent Prompt

Each agent prompt file contains a `/new` command. Copy the content from:
- `shared-data/agents/agent-X-prompt.md`

### Step 2: Create Agent

```bash
openclaw agents add <agent-name> --workspace ~/.openclaw/workspace-<agent-name>
```

### Step 3: Configure Model

Set model to `moonshot/kimi-k2.5` in `~/.openclaw/openclaw.json`:
```json
{
  "id": "<agent-name>",
  "model": "moonshot/kimi-k2.5"
}
```

### Step 4: Bind to Discord Channel

Add binding in `~/.openclaw/openclaw.json`:
```json
{
  "type": "route",
  "agentId": "<agent-name>",
  "match": {
    "channel": "discord",
    "peer": {
      "kind": "group",
      "id": "<channel-id>"
    }
  }
}
```

### Step 5: Setup Workspace

Copy shared data to agent workspace:
```bash
cp -r ~/.openclaw/workspace/projects/betrayal-monorepo/shared-data \
  ~/.openclaw/workspace-<agent-name>/
```

### Step 6: Update SOUL.md

Add workflow section to `~/.openclaw/workspace-<agent-name>/SOUL.md`:
- For Agent 0: Include subagent spawning workflow
- For Agents 1-5: Include task acceptance/completion workflow

### Step 7: Clear Sessions

```bash
rm -rf ~/.openclaw/agents/<agent-name>/sessions/*
```

## Agent 0 Special Configuration

Agent 0 (Orchestrator) needs additional `subagents` config:

```json
{
  "id": "orchestrator",
  "model": "moonshot/kimi-k2.5",
  "subagents": {
    "allowAgents": ["architecture", "rules-engine", "frontend", "ai-player", "rule-qa"]
  }
}
```

This allows Agent 0 to spawn other agents.

## Complete Agent List

| Agent | Role | Discord Channel |
|-------|------|-----------------|
| orchestrator | Orchestrator / Producer | #orchestrator |
| architecture | Core Architect / State | #architecture |
| rules-engine | Rules Engine / Gameplay | #engine |
| frontend | Frontend / UX | #frontend |
| ai-player | AI Player | #ai-player |
| rule-qa | Rule QA / Test Judge | #rule-qa |

## Workflow Summary

### For Agent 0 (Orchestrator):
1. Human approves/recommends issues
2. Agent 0 creates GitHub sub-tasks
3. Agent 0 spawns sub-agents via `sessions_spawn`
4. Agent 0 tracks progress via GitHub
5. Agent 0 reports to human in Discord
6. Sub-agent marks "🟢 Pending Approval"
7. **Human approves and closes issue**

### For Agents 1-5 (Sub-agents):
1. Receive task from Agent 0
2. Accept/confirm task
3. Work and update GitHub checklist
4. Submit PR with evidence
5. Mark "🟢 Pending Approval"
6. **Wait for human to close issue**

## Important Rules

1. **Human approval required** at start and end
2. **Never close GitHub issues** - only human can close
3. **Use GitHub as source of truth** for progress
4. **Reply in Traditional Chinese** (enforced in prompts)
5. **Post updates to Discord** for real-time communication

## Templates Available

In `shared-data/templates/`:
- `github-issue-parent.md` - For EPIC issues
- `github-issue-subtask.md` - For sub-task issues
- `daily-update-format.md` - For daily standups
- `interface-request-template.md` - For API changes

## Reference Documentation

- `shared-data/AGENTS_GUIDE.md` - Full collaboration guide
- `shared-data/README.md` - Project overview
- `shared-data/rulebook/` - Game rules
