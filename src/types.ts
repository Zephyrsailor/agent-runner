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
  /** System prompt to prepend. */
  systemPrompt?: string;
  /** Abort signal to cancel the run. */
  signal?: AbortSignal;
  /** Timeout in milliseconds. Defaults to 300_000 (5 min). */
  timeoutMs?: number;
  /**
   * Whether to allow the agent to write files and execute commands.
   * - "none": full access, no sandbox (Claude: --dangerously-skip-permissions, Codex: --sandbox off)
   * - "read-only": agent can read but not modify (default for Codex)
   * - "locked": no file system access (Codex only)
   * Defaults to "none" (full access with skipped permissions).
   */
  sandbox?: "none" | "read-only" | "locked";
  /** Additional CLI flags to pass to the backend command. */
  extraArgs?: string[];
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
}

/** A backend that can execute agent runs via a CLI tool. */
export interface Backend {
  /** Human-readable backend name. */
  readonly name: string;
  /** Check if the CLI tool is installed and reachable. */
  available(): Promise<boolean>;
  /** Execute a prompt and return the result. */
  run(options: RunOptions): Promise<RunResult>;
}
