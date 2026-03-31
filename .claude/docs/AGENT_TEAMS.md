# Claude Code Agent Teams — Master Reference Guide

> Source: https://code.claude.com/docs/en/agent-teams
> Purpose: Reference for building effective agent teams in this project.
> Last synced: 2026-03-31

---

## What Agent Teams Are

Agent teams coordinate multiple Claude Code instances working together. One session acts as the **team lead**, coordinating work, assigning tasks, and synthesizing results. **Teammates** work independently, each in its own context window, and communicate directly with each other.

Unlike subagents (which run within a single session and can only report back to the caller), teammates can message each other directly, share a task list, and self-coordinate.

**Requirements:**
- Claude Code v2.1.32 or later
- `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in env or settings.json (experimental feature)

---

## When to Use Agent Teams vs Subagents

### Use Agent Teams When:
- **Research and review**: multiple teammates investigate different aspects simultaneously, share and challenge findings
- **New modules or features**: teammates each own a separate piece without stepping on each other
- **Debugging with competing hypotheses**: teammates test different theories in parallel and converge faster
- **Cross-layer coordination**: changes spanning frontend, backend, and tests, each owned by a different teammate

### Use Subagents Instead When:
- Tasks are sequential
- Work involves same-file edits
- Tasks have many dependencies between them
- You only need the result, not inter-agent discussion

### Comparison Table

| Aspect | Subagents | Agent Teams |
|---|---|---|
| **Context** | Own context; results return to caller | Own context; fully independent |
| **Communication** | Report results back to main agent only | Teammates message each other directly |
| **Coordination** | Main agent manages all work | Shared task list with self-coordination |
| **Best for** | Focused tasks where only the result matters | Complex work requiring discussion and collaboration |
| **Token cost** | Lower: results summarized back to main context | Higher: each teammate is a separate Claude instance |

---

## How to Enable

Set the environment variable in `.claude/settings.local.json`:

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

Or export in shell: `export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`

---

## Architecture

An agent team consists of four components:

| Component | Role |
|---|---|
| **Team lead** | The main Claude Code session that creates the team, spawns teammates, and coordinates work |
| **Teammates** | Separate Claude Code instances that each work on assigned tasks |
| **Task list** | Shared list of work items that teammates claim and complete |
| **Mailbox** | Messaging system for communication between agents |

### Storage Locations
- **Team config**: `~/.claude/teams/{team-name}/config.json`
- **Task list**: `~/.claude/tasks/{team-name}/`

Both are auto-generated when you create a team. The team config holds runtime state (session IDs, tmux pane IDs) — do NOT edit it by hand; your changes are overwritten on the next state update.

The team config contains a `members` array with each teammate's name, agent ID, and agent type. Teammates can read this file to discover other team members.

**Important:** There is no project-level team config. A file like `.claude/teams/teams.json` in your project directory is NOT recognized as configuration.

---

## Starting a Team

Tell Claude to create an agent team in natural language. Claude creates the team, spawns teammates, and coordinates work based on your prompt.

### Good Prompt Example
```
I'm designing a CLI tool that helps developers track TODO comments across
their codebase. Create an agent team to explore this from different angles: one
teammate on UX, one on technical architecture, one playing devil's advocate.
```

### Two Ways Teams Start
1. **You request a team**: explicitly ask for an agent team
2. **Claude proposes a team**: Claude determines your task benefits from parallel work, suggests a team, and you confirm

Claude will never create a team without your approval.

---

## Display Modes

### In-Process (default)
All teammates run inside your main terminal.
- **Shift+Down**: cycle through teammates
- **Enter**: view a teammate's session
- **Escape**: interrupt their current turn
- **Ctrl+T**: toggle the task list
- Works in any terminal, no extra setup

### Split Panes
Each teammate gets its own pane. You see everyone's output at once.
- Requires **tmux** or **iTerm2** with `it2` CLI
- Click into a pane to interact directly

### Configuration

Default is `"auto"` (split panes if inside tmux, in-process otherwise).

Set in `~/.claude.json`:
```json
{
  "teammateMode": "in-process"
}
```

Override per session:
```bash
claude --teammate-mode in-process
```

**Note:** Split-pane mode is NOT supported in VS Code's integrated terminal, Windows Terminal, or Ghostty.

---

## Controlling the Team

### Specify Teammates and Models
```
Create a team with 4 teammates to refactor these modules in parallel.
Use Sonnet for each teammate.
```

### Require Plan Approval
For complex/risky tasks, require teammates to plan before implementing:
```
Spawn an architect teammate to refactor the authentication module.
Require plan approval before they make any changes.
```

When a teammate finishes planning, it sends a plan approval request to the lead. The lead reviews and either approves or rejects with feedback. If rejected, the teammate revises and resubmits. Once approved, the teammate exits plan mode and implements.

**Influence approval criteria:**
```
Only approve plans that include test coverage.
Reject plans that modify the database schema.
```

### Talk to Teammates Directly
Each teammate is a full, independent Claude Code session. You can message any teammate directly.

- **In-process mode**: Shift+Down to cycle, type to send message
- **Split-pane mode**: click into a teammate's pane

### Assign and Claim Tasks
Task states: **pending**, **in progress**, **completed**.
Tasks can have dependencies — blocked tasks auto-unblock when dependencies complete.

- **Lead assigns**: tell the lead which task to give to which teammate
- **Self-claim**: after finishing a task, teammates pick up the next unassigned, unblocked task

Task claiming uses **file locking** to prevent race conditions.

### Shut Down a Teammate
```
Ask the researcher teammate to shut down
```
The teammate can approve (exits gracefully) or reject with an explanation.

### Clean Up the Team
```
Clean up the team
```
This removes shared team resources. **Always use the lead** to clean up — never a teammate. The lead checks for active teammates and fails if any are still running; shut them down first.

---

## Using Subagent Definitions for Teammates

You can reference a subagent type when spawning a teammate. The teammate inherits that subagent's system prompt, tools, and model. Define a role once (e.g., `security-reviewer`) and reuse it as both a subagent and a teammate.

```
Spawn a teammate using the security-reviewer agent type to audit the auth module.
```

---

## Context and Communication

### What Teammates Get at Spawn
- Project context: CLAUDE.md, MCP servers, skills
- The spawn prompt from the lead
- **NOT** the lead's conversation history

### How Teammates Share Information
- **Automatic message delivery**: messages delivered automatically, no polling needed
- **Idle notifications**: teammate notifies the lead when it finishes and stops
- **Shared task list**: all agents see task status and claim available work

### Messaging Modes
- **message**: send to one specific teammate
- **broadcast**: send to ALL teammates simultaneously. Use sparingly — costs scale with team size.

---

## Permissions

- Teammates start with the lead's permission settings
- If lead uses `--dangerously-skip-permissions`, all teammates do too
- You can change individual teammate modes after spawning
- You CANNOT set per-teammate modes at spawn time

---

## Hooks for Quality Gates

Use hooks to enforce rules when teammates finish work or tasks change:

| Hook Event | When It Fires | Exit Code 2 Effect |
|---|---|---|
| `TeammateIdle` | Teammate is about to go idle | Send feedback, keep teammate working |
| `TaskCreated` | A task is being created | Prevent creation, send feedback |
| `TaskCompleted` | A task is being marked complete | Prevent completion, send feedback |

---

## Best Practices

### 1. Give Teammates Enough Context
Teammates load project context (CLAUDE.md, MCP, skills) but NOT the lead's conversation history. Include task-specific details in the spawn prompt:

```
Spawn a security reviewer teammate with the prompt: "Review the authentication
module at src/auth/ for security vulnerabilities. Focus on token handling,
session management, and input validation. The app uses JWT tokens stored in
httpOnly cookies. Report any issues with severity ratings."
```

### 2. Choose Appropriate Team Size
- **Start with 3-5 teammates** for most workflows
- Token costs scale linearly per teammate
- Coordination overhead increases with more teammates
- Three focused teammates often outperform five scattered ones
- **Target 5-6 tasks per teammate** for optimal productivity
- 15 independent tasks = ~3 teammates

### 3. Size Tasks Appropriately
- **Too small**: coordination overhead exceeds benefit
- **Too large**: teammates work too long without check-ins
- **Just right**: self-contained units with clear deliverables (a function, a test file, a review)

### 4. Wait for Teammates to Finish
If the lead starts implementing instead of waiting:
```
Wait for your teammates to complete their tasks before proceeding
```

### 5. Avoid File Conflicts
Two teammates editing the same file leads to overwrites. Break work so each teammate owns different files.

### 6. Monitor and Steer
Check in on progress, redirect failing approaches, synthesize findings as they come in. Unattended teams risk wasted effort.

### 7. Start with Research and Review
If new to agent teams, start with non-coding tasks: reviewing a PR, researching a library, investigating a bug. Clear boundaries, less coordination risk.

---

## Effective Prompt Patterns

### Parallel Code Review
```
Create an agent team to review PR #142. Spawn three reviewers:
- One focused on security implications
- One checking performance impact
- One validating test coverage
Have them each review and report findings.
```

### Competing Hypotheses (Debugging)
```
Users report the app exits after one message instead of staying connected.
Spawn 5 agent teammates to investigate different hypotheses. Have them talk to
each other to try to disprove each other's theories, like a scientific
debate. Update the findings doc with whatever consensus emerges.
```

### Cross-Layer Feature Work
```
Create a team to implement the new billing endpoint:
- One teammate owns the FastAPI route and schema
- One teammate owns the Stripe integration service
- One teammate owns the tests
Have them coordinate on interfaces before implementing.
```

---

## Troubleshooting

### Teammates Not Appearing
- In in-process mode, press **Shift+Down** — they may already be running
- Ensure the task was complex enough to warrant a team
- For split panes, verify tmux: `which tmux`
- For iTerm2, verify `it2` CLI and Python API are enabled

### Too Many Permission Prompts
Pre-approve common operations in permission settings before spawning teammates.

### Teammates Stopping on Errors
Check their output (Shift+Down or click pane), then:
- Give them additional instructions directly
- Spawn a replacement teammate

### Lead Shuts Down Too Early
Tell it to keep going. Tell it to wait for teammates to finish.

### Orphaned tmux Sessions
```bash
tmux ls
tmux kill-session -t <session-name>
```

---

## Known Limitations

1. **No session resumption**: `/resume` and `/rewind` do not restore in-process teammates. After resuming, spawn new teammates if needed.
2. **Task status can lag**: teammates sometimes fail to mark tasks complete. Check manually and update or nudge.
3. **Shutdown can be slow**: teammates finish current request/tool call first.
4. **One team per session**: clean up current team before starting a new one.
5. **No nested teams**: teammates cannot spawn their own teams. Only the lead manages the team.
6. **Lead is fixed**: the creating session is the lead for its lifetime. Cannot promote or transfer.
7. **Permissions set at spawn**: all teammates start with lead's mode. Change individually after.
8. **Split panes require tmux/iTerm2**: not supported in VS Code terminal, Windows Terminal, or Ghostty.

---

## Token Usage Warning

Agent teams use significantly more tokens than a single session. Each teammate has its own context window. Token usage scales linearly with active teammates. For research, review, and new feature work, the extra tokens are usually worthwhile. For routine tasks, a single session is more cost-effective.

---

## RuleGPT-Specific Team Patterns

These patterns are tailored for this codebase based on the architecture documented in CLAUDE.md:

### RAG Pipeline Changes
```
Create a team of 3:
- One teammate owns pipeline.py and generator.py changes
- One teammate owns test_smart_routing.py and test_generator_quality.py
- One teammate reviews the changes for correctness against CLAUDE.md
Require plan approval before implementation.
```

### Cross-Stack Feature
```
Create a team of 3:
- One teammate on the FastAPI backend (rulegpt-api/)
- One teammate on the React frontend (rulegpt-ui/)
- One teammate on integration tests
Each teammate should read CLAUDE.md first.
```

### Answer Quality Audit
```
Create a team of 4 reviewers to audit answer quality:
- One runs golden queries from GOLDEN_QUERIES.md
- One checks citation accuracy against retrieved rules
- One validates confidence band calibration
- One tests edge cases (out-of-scope, empty retrieval, partial coverage)
Have them share findings and flag regressions.
```

### Deployment Review
```
Create a team of 3:
- One reviews environment variable configuration against .env.example
- One reviews the Alembic migration chain for correctness
- One reviews render.yaml and vercel.json deployment configs
Report blockers before we deploy.
```
