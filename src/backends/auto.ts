import type { Backend, RunOptions, RunResult } from "../types.js";
import { ClaudeCodeBackend } from "./claude-code.js";
import { CodexBackend } from "./codex.js";

/**
 * Auto backend that tries Claude Code first, then Codex.
 * Useful when you want to use whichever agent CLI is available.
 */
export class AutoBackend implements Backend {
  readonly name = "auto";

  private resolved: Backend | null = null;
  private candidates: Backend[];

  constructor(options?: { prefer?: "claude-code" | "codex" }) {
    const claude = new ClaudeCodeBackend();
    const codex = new CodexBackend();
    this.candidates =
      options?.prefer === "codex" ? [codex, claude] : [claude, codex];
  }

  async available(): Promise<boolean> {
    for (const candidate of this.candidates) {
      if (await candidate.available()) {
        return true;
      }
    }
    return false;
  }

  private async resolve(): Promise<Backend> {
    if (this.resolved) return this.resolved;
    for (const candidate of this.candidates) {
      if (await candidate.available()) {
        this.resolved = candidate;
        return candidate;
      }
    }
    throw new Error(
      "No agent CLI found. Install claude (@anthropic-ai/claude-code) or codex (@openai/codex).",
    );
  }

  async run(options: RunOptions): Promise<RunResult> {
    const backend = await this.resolve();
    return backend.run(options);
  }
}
