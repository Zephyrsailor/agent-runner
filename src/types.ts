/** Options for a single agent run. */
export interface RunOptions {
  /** The prompt/message to send to the agent. */
  prompt: string;
  /** Working directory for the agent process. Defaults to process.cwd(). */
  cwd?: string;
  /** Session/conversation ID for multi-turn conversations. */
  sessionId?: string;
  /** Model to use (e.g. "opus", "sonnet", "o4-mini"). */
  model?: string;
  /** System prompt to prepend/append. */
  systemPrompt?: string;
  /** Abort signal to cancel the run. */
  signal?: AbortSignal;
  /** Timeout in milliseconds. Defaults to 300_000 (5 min). */
  timeoutMs?: number;
  /**
   * Execution mode controlling what the agent can do.
   *
   * - "print": text-only response, no tool use (Claude: --tools "", Codex: --sandbox read-only)
   * - "full-access": agent can edit files, run bash, use all tools with no prompts
   *   (Claude: --dangerously-skip-permissions, Codex: --dangerously-bypass-approvals-and-sandbox)
   * - "workspace-write": agent can write within workspace only
   *   (Claude: --permission-mode acceptEdits, Codex: --sandbox workspace-write)
   *
   * Defaults to "full-access".
   */
  mode?: "print" | "full-access" | "workspace-write";
  /** Additional CLI flags to pass to the backend command. */
  extraArgs?: string[];
  /** Environment variables to pass to the child process. Merged with process.env. */
  env?: Record<string, string>;
  /**
   * Restrict which tools are available (Claude Code only).
   * E.g. ["Bash", "Read", "Edit"] or ["Bash(git:*)"]
   */
  allowedTools?: string[];
  /**
   * Maximum dollar amount to spend on API calls (Claude Code only).
   */
  maxBudgetUsd?: number;
  /**
   * Enable verbose mode to capture full tool call details (Claude Code only).
   *
   * When true, uses `--output-format stream-json --verbose` internally and
   * parses every tool_use event, populating `RunResult.toolUses` with the
   * complete list of tools the agent invoked (name + input).
   *
   * Defaults to false.
   */
  verbose?: boolean;
}

/** A record of a single tool invocation during the run. */
export interface ToolUseEntry {
  /** Tool name (e.g. "Bash", "Edit", "Read"). */
  name: string;
  /** Tool input/arguments (parsed from JSON). */
  input?: unknown;
}

/** Result from an agent run. */
export interface RunResult {
  /** The agent's text response. */
  text: string;
  /** Session/conversation ID for resuming later. */
  sessionId?: string;
  /** Wall-clock duration of the run in milliseconds. */
  durationMs: number;
  /** Process exit code (0 = success). */
  exitCode: number | null;
  /** Number of conversation turns (1 = no tool use, 2+ = tool calls occurred). */
  numTurns?: number;
  /** Total API cost in USD (Claude Code only). */
  costUsd?: number;
  /** Tools the agent invoked during the run (Claude Code with --verbose only). */
  toolUses?: ToolUseEntry[];
}

/** Event emitted during streaming. */
export interface StreamEvent {
  type: "text" | "tool_use" | "tool_result" | "error" | "done";
  data: string;
}

/** A backend that can execute agent runs via a CLI tool. */
export interface Backend {
  /** Human-readable backend name. */
  readonly name: string;
  /** Check if the CLI tool is installed and reachable. */
  available(): Promise<boolean>;
  /** Return the CLI version string, or null if not available. */
  version?(): Promise<string | null>;
  /** Execute a prompt and return the result. */
  run(options: RunOptions): Promise<RunResult>;
  /** Execute a prompt and stream events. */
  stream?(options: RunOptions): AsyncIterable<StreamEvent>;
}
