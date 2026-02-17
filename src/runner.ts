import type { Backend, RunOptions, RunResult } from "./types.js";
import { AutoBackend } from "./backends/auto.js";
import { ClaudeCodeBackend } from "./backends/claude-code.js";
import { CodexBackend } from "./backends/codex.js";

export type BackendId = "claude-code" | "codex" | "auto";

export interface AgentRunnerConfig {
  /** Built-in backend name or a custom Backend implementation. */
  backend: BackendId | Backend;
  /** Custom command path (only used with built-in backend IDs). */
  command?: string;
}

function resolveBackend(config: AgentRunnerConfig): Backend {
  if (typeof config.backend === "object") {
    return config.backend;
  }

  switch (config.backend) {
    case "claude-code":
      return new ClaudeCodeBackend({ command: config.command });
    case "codex":
      return new CodexBackend({ command: config.command });
    case "auto":
      return new AutoBackend();
    default:
      throw new Error(`Unknown backend: ${config.backend as string}`);
  }
}

export class AgentRunner {
  private backend: Backend;

  constructor(config: AgentRunnerConfig) {
    this.backend = resolveBackend(config);
  }

  /** Check if the backend CLI tool is available. */
  async available(): Promise<boolean> {
    return this.backend.available();
  }

  /** Run a prompt through the agent backend. */
  async run(options: RunOptions): Promise<RunResult> {
    return this.backend.run(options);
  }

  /** Return the CLI version string, or null if not available. */
  async version(): Promise<string | null> {
    if (this.backend.version) {
      return this.backend.version();
    }
    return (await this.backend.available()) ? "unknown" : null;
  }

  /** The name of the active backend. */
  get backendName(): string {
    return this.backend.name;
  }
}
