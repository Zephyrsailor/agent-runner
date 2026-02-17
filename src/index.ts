// Core API
export { AgentRunner } from "./runner.js";
export type { AgentRunnerConfig, BackendId } from "./runner.js";

// Types
export type { Backend, RunOptions, RunResult } from "./types.js";

// Backends (for direct use or extending)
export { AutoBackend } from "./backends/auto.js";
export { ClaudeCodeBackend } from "./backends/claude-code.js";
export { CodexBackend } from "./backends/codex.js";

// Spawn utility
export { spawnCommand } from "./spawn.js";
export type { SpawnResult, SpawnOptions } from "./spawn.js";

// Streaming
export { streamCommand } from "./streaming.js";
export type { StreamEvent, StreamOptions } from "./streaming.js";
