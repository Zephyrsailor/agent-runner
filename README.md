# agent-runner

Unified TypeScript API to run Claude Code and Codex CLI agents programmatically.

Spawn `claude` or `codex` as child processes with structured output parsing, session management, sandbox control, streaming, timeout handling, and abort support.

## Install

```bash
npm install agent-runner
```

**Prerequisites:** You need at least one CLI agent installed:
- Claude Code: `npm i -g @anthropic-ai/claude-code`
- Codex: `npm i -g @openai/codex`

## Usage

```typescript
import { AgentRunner } from "agent-runner";

const agent = new AgentRunner({ backend: "claude-code" });

const result = await agent.run({
  prompt: "Explain this codebase",
  cwd: "/path/to/project",
  timeoutMs: 120_000,
});

console.log(result.text);
console.log(`Took ${result.durationMs}ms`);
```

### Auto backend (use whichever CLI is available)

```typescript
const agent = new AgentRunner({ backend: "auto" });
// Tries Claude Code first, then Codex
const result = await agent.run({ prompt: "What does this code do?" });
```

### Multi-turn conversations

```typescript
const first = await agent.run({ prompt: "What files are in src/?" });

const second = await agent.run({
  prompt: "Now explain the main entry point.",
  sessionId: first.sessionId,
});
```

### Using Codex

```typescript
const codex = new AgentRunner({ backend: "codex" });
const result = await codex.run({ prompt: "Fix the type errors" });
```

### Sandbox modes

```typescript
// Full access (default for Claude Code) - can edit files and run commands
await agent.run({ prompt: "Fix the bug in src/app.ts", sandbox: "none" });

// Read-only (default for Codex) - can read but not modify
await agent.run({ prompt: "Analyze this codebase", sandbox: "read-only" });
```

### Streaming

```typescript
import { streamCommand } from "agent-runner";

const stream = streamCommand({
  command: "claude",
  args: ["-p", "--output-format", "stream-json", "Write a haiku"],
  timeoutMs: 60_000,
});

for await (const event of stream) {
  if (event.type === "text") process.stdout.write(event.data + "\n");
  if (event.type === "done") console.log("Exit:", event.data);
}
```

### Custom backend

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

### AbortSignal support

```typescript
const controller = new AbortController();
setTimeout(() => controller.abort(), 30_000);

const result = await agent.run({
  prompt: "Long running task",
  signal: controller.signal,
});
```

### Environment variables

```typescript
const result = await agent.run({
  prompt: "Use this API key",
  env: { MY_API_KEY: "sk-..." },
});
```

## API

### `AgentRunner`

- `constructor(config: { backend: "claude-code" | "codex" | "auto" | Backend, command?: string })`
- `available(): Promise<boolean>` - Check if the CLI tool is installed
- `run(options: RunOptions): Promise<RunResult>` - Execute a prompt
- `backendName: string` - Name of the active backend

### `RunOptions`

| Field | Type | Description |
|-------|------|-------------|
| `prompt` | `string` | The prompt to send (required) |
| `cwd` | `string` | Working directory |
| `sessionId` | `string` | Session ID for multi-turn |
| `model` | `string` | Model override |
| `systemPrompt` | `string` | System prompt to append |
| `signal` | `AbortSignal` | Cancellation signal |
| `timeoutMs` | `number` | Timeout (default: 300000) |
| `sandbox` | `"none" \| "read-only" \| "locked"` | Sandbox mode |
| `extraArgs` | `string[]` | Additional CLI flags |
| `env` | `Record<string, string>` | Environment variables |

### `RunResult`

| Field | Type | Description |
|-------|------|-------------|
| `text` | `string` | Agent response text |
| `sessionId` | `string?` | Session ID for follow-ups |
| `durationMs` | `number` | Wall-clock duration |
| `exitCode` | `number?` | Process exit code |

### Backends

- `ClaudeCodeBackend` - Direct Claude Code CLI backend
- `CodexBackend` - Direct Codex CLI backend
- `AutoBackend` - Auto-detect available backend

## License

MIT
