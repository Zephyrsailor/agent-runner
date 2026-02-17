// Core API
export { AgentRunner } from "./runner.js";
export type { AgentRunnerConfig, BackendId } from "./runner.js";

// Types
export type { Backend, RunOptions, RunResult, StreamEvent } from "./types.js";

// Backends (for direct use or extending)
export { AutoBackend } from "./backends/auto.js";
export { ClaudeCodeBackend } from "./backends/claude-code.js";
export { CodexBackend } from "./backends/codex.js";

// Spawn utility
export { spawnCommand } from "./spawn.js";
export type { SpawnResult, SpawnOptions } from "./spawn.js";

// Streaming (low-level)
export { streamCommand } from "./streaming.js";
export type { StreamOptions } from "./streaming.js";

// ── Convenience functions ──────────────────────────────────────────

import { AgentRunner } from "./runner.js";
import type { RunOptions } from "./types.js";

/**
 * Run a prompt with Claude Code and return the text response.
 * Shorthand for creating an AgentRunner with claude-code backend.
 */
export async function runWithClaude(
  prompt: string,
  opts?: Omit<RunOptions, "prompt">,
): Promise<string> {
  const runner = new AgentRunner({ backend: "claude-code" });
  const result = await runner.run({ prompt, ...opts });
  return result.text;
}

/**
 * Run a prompt with Codex and return the text response.
 * Shorthand for creating an AgentRunner with codex backend.
 */
export async function runWithCodex(
  prompt: string,
  opts?: Omit<RunOptions, "prompt">,
): Promise<string> {
  const runner = new AgentRunner({ backend: "codex" });
  const result = await runner.run({ prompt, ...opts });
  return result.text;
}

/**
 * Run a prompt with whichever agent CLI is available.
 * Tries Claude Code first, then Codex.
 */
export async function runWithAuto(
  prompt: string,
  opts?: Omit<RunOptions, "prompt">,
): Promise<string> {
  const runner = new AgentRunner({ backend: "auto" });
  const result = await runner.run({ prompt, ...opts });
  return result.text;
}
