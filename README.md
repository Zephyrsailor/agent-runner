# agent-runner

Unified TypeScript API to run Claude Code and Codex CLI agents programmatically.

Spawn `claude` or `codex` as child processes with structured output parsing, session management, timeout handling, and abort support.

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

### Custom backend

```typescript
import type { Backend } from "agent-runner";

const myBackend: Backend = {
  name: "my-agent",
  async available() { return true; },
  async run(options) {
    // Your implementation
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

## API

### `AgentRunner`

- `constructor(config: { backend: "claude-code" | "codex" | Backend, command?: string })`
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

### `RunResult`

| Field | Type | Description |
|-------|------|-------------|
| `text` | `string` | Agent response text |
| `sessionId` | `string?` | Session ID for follow-ups |
| `durationMs` | `number` | Wall-clock duration |
| `exitCode` | `number?` | Process exit code |

## License

MIT
