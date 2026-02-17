# agent-runner

Unified TypeScript API to run Claude Code and Codex CLI agents programmatically.

Spawn `claude` or `codex` as child processes with full tool access (file editing, bash execution), structured output parsing, streaming, session management, and abort support.

## Install

```bash
npm install agent-runner
```

**Prerequisites:** You need at least one CLI agent installed:
- Claude Code: `npm i -g @anthropic-ai/claude-code`
- Codex: `npm i -g @openai/codex`

## Quick Start

```typescript
import { runWithClaude } from "agent-runner";

// One-liner: run a prompt and get the text back
const answer = await runWithClaude("Fix the bug in src/app.ts", {
  cwd: "/path/to/project",
});
```

## Real Output

```typescript
const agent = new AgentRunner({ backend: "claude-code" });
const result = await agent.run({
  prompt: "What is 2+2? Reply with just the number.",
  mode: "print",
});

console.log(result);
// {
//   text: "4",
//   sessionId: "35109334-1e41-4ca3-a73f-10c849dea3f8",
//   durationMs: 2426,
//   exitCode: 0,
//   numTurns: 1,
//   costUsd: 0.02099
// }
```

In full-access mode, the agent uses tools and `numTurns` reflects that:

```typescript
const result = await agent.run({
  prompt: "Create /tmp/hello.txt with 'hello'. Reply done.",
  mode: "full-access",
  cwd: "/tmp",
});

console.log(result.numTurns); // 2 (turn 1: tool call, turn 2: response)
console.log(result.costUsd);  // 0.058
```

## Execution Modes

The key differentiator: agent-runner gives you access to the **full capabilities** of Claude Code and Codex, not just text completion.

```typescript
import { AgentRunner } from "agent-runner";

const agent = new AgentRunner({ backend: "claude-code" });

// full-access (default): agent can edit files, run bash, use all tools
await agent.run({
  prompt: "Refactor the auth module to use JWT",
  cwd: "/path/to/project",
  mode: "full-access",
});

// workspace-write: agent can write within workspace, with approval prompts
await agent.run({
  prompt: "Add unit tests for the User model",
  mode: "workspace-write",
});

// print: text-only response, no tool use (safe for untrusted prompts)
await agent.run({
  prompt: "Explain what this codebase does",
  mode: "print",
});
```

### Mode mapping

| Mode | Claude Code | Codex |
|------|------------|-------|
| `full-access` (default) | `--dangerously-skip-permissions` | `--dangerously-bypass-approvals-and-sandbox` |
| `workspace-write` | `--permission-mode acceptEdits` | `--sandbox workspace-write --full-auto` |
| `print` | `--allowedTools Read,Glob,Grep,...` | `--sandbox read-only` |

## Streaming

Stream events in real-time, including tool use and results:

```typescript
for await (const event of agent.stream({
  prompt: "Read package.json and summarize it",
  mode: "full-access",
})) {
  switch (event.type) {
    case "text":       process.stdout.write(event.data); break;
    case "tool_use":   console.log("[tool]", event.data); break;
    case "tool_result": console.log("[result]", event.data); break;
    case "done":       console.log("\nExit:", event.data); break;
  }
}
```

## Multi-turn Conversations

```typescript
const first = await agent.run({ prompt: "What files are in src/?" });

const second = await agent.run({
  prompt: "Now explain the main entry point.",
  sessionId: first.sessionId,
});
```

## Auto Backend

Automatically use whichever CLI is available (tries Claude Code first):

```typescript
import { runWithAuto } from "agent-runner";

const text = await runWithAuto("Explain this code");
```

## Convenience Functions

```typescript
import { runWithClaude, runWithCodex, runWithAuto } from "agent-runner";

const a = await runWithClaude("Fix the bug", { mode: "full-access" });
const b = await runWithCodex("Add tests", { mode: "workspace-write" });
const c = await runWithAuto("Explain this", { mode: "print" });
```

## Advanced Options

```typescript
await agent.run({
  prompt: "Complex task",
  cwd: "/workspace",
  model: "opus",
  systemPrompt: "You are a senior engineer",
  timeoutMs: 300_000,
  env: { MY_API_KEY: "sk-..." },
  allowedTools: ["Bash", "Read", "Edit"],  // Claude Code only
  maxBudgetUsd: 5.0,                        // Claude Code only
  extraArgs: ["--verbose"],
});
```

## Custom Backend

```typescript
import type { Backend } from "agent-runner";

const myBackend: Backend = {
  name: "my-agent",
  async available() { return true; },
  async run(options) {
    return { text: "done", durationMs: 100, exitCode: 0 };
  },
};

const agent = new AgentRunner({ backend: myBackend });
```

## API Reference

### `AgentRunner`

- `constructor(config: { backend: "claude-code" | "codex" | "auto" | Backend, command?: string })`
- `run(options: RunOptions): Promise<RunResult>` - Execute a prompt
- `stream(options: RunOptions): AsyncIterable<StreamEvent>` - Stream events
- `available(): Promise<boolean>` - Check if CLI is installed
- `version(): Promise<string | null>` - Get CLI version
- `backendName: string` - Name of the active backend

### `RunOptions`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `prompt` | `string` | (required) | The prompt to send |
| `mode` | `"full-access" \| "workspace-write" \| "print"` | `"full-access"` | Execution mode |
| `cwd` | `string` | `process.cwd()` | Working directory |
| `sessionId` | `string` | | Session ID for multi-turn |
| `model` | `string` | | Model override |
| `systemPrompt` | `string` | | System prompt to append |
| `signal` | `AbortSignal` | | Cancellation signal |
| `timeoutMs` | `number` | `300000` | Timeout in ms |
| `env` | `Record<string, string>` | | Extra env vars |
| `extraArgs` | `string[]` | | Additional CLI flags |
| `allowedTools` | `string[]` | | Tool allowlist (Claude only) |
| `maxBudgetUsd` | `number` | | Budget cap (Claude only) |

### `RunResult`

| Field | Type | Description |
|-------|------|-------------|
| `text` | `string` | Agent response text |
| `sessionId` | `string?` | Session ID for follow-ups |
| `durationMs` | `number` | Wall-clock duration |
| `exitCode` | `number?` | Process exit code |
| `numTurns` | `number?` | Conversation turns (1 = no tools, 2+ = tool calls occurred) |
| `costUsd` | `number?` | Total API cost in USD (Claude Code only) |
| `toolUses` | `ToolUseEntry[]?` | Tools the agent invoked (Claude Code with array result) |

### `StreamEvent`

| Field | Type | Description |
|-------|------|-------------|
| `type` | `"text" \| "tool_use" \| "tool_result" \| "error" \| "done"` | Event type |
| `data` | `string` | Event payload |

## Testing

```bash
npm test                              # Unit tests (39 tests)
AGENT_RUNNER_LIVE_TEST=1 npm test     # + integration tests (9 more, requires CLI tools)
```

## License

MIT
