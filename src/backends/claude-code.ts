import type { Backend, RunOptions, RunResult } from "../types.js";
import { spawnCommand } from "../spawn.js";

/**
 * Parse Claude Code JSON output to extract the assistant text and session ID.
 * Claude --output-format json returns { result, session_id, ... }.
 */
function parseClaudeJson(raw: string): { text: string; sessionId?: string } {
  try {
    const parsed = JSON.parse(raw);

    // Handle top-level result string
    if (typeof parsed.result === "string") {
      return {
        text: parsed.result,
        sessionId: parsed.session_id ?? parsed.sessionId,
      };
    }

    // Handle array-of-blocks format (newer Claude Code versions)
    if (Array.isArray(parsed.result)) {
      const textParts: string[] = [];
      for (const block of parsed.result) {
        if (block.type === "text" && typeof block.text === "string") {
          textParts.push(block.text);
        }
      }
      if (textParts.length > 0) {
        return {
          text: textParts.join("\n"),
          sessionId: parsed.session_id ?? parsed.sessionId,
        };
      }
    }

    // Fallback: return raw
    return { text: raw.trim() };
  } catch {
    // Not valid JSON, return raw text
    return { text: raw.trim() };
  }
}

export class ClaudeCodeBackend implements Backend {
  readonly name = "claude-code";

  private command: string;

  constructor(options?: { command?: string }) {
    this.command = options?.command ?? "claude";
  }

  async available(): Promise<boolean> {
    try {
      const result = await spawnCommand(this.command, {
        args: ["--version"],
        timeoutMs: 10_000,
      });
      return result.code === 0 && result.stdout.trim().length > 0;
    } catch {
      return false;
    }
  }

  async run(options: RunOptions): Promise<RunResult> {
    const start = Date.now();
    const timeoutMs = options.timeoutMs ?? 300_000;

    const sandbox = options.sandbox ?? "none";
    const args: string[] = [
      "-p",
      "--output-format",
      "json",
    ];

    // In "none" sandbox mode, skip permission prompts for full tool access
    if (sandbox === "none") {
      args.push("--dangerously-skip-permissions");
    }

    if (options.model) {
      args.push("--model", options.model);
    }

    if (options.sessionId) {
      args.push("--session-id", options.sessionId);
    }

    if (options.systemPrompt) {
      args.push("--append-system-prompt", options.systemPrompt);
    }

    // Extra args from caller
    if (options.extraArgs) {
      args.push(...options.extraArgs);
    }

    // Prompt goes as the last positional arg
    args.push(options.prompt);

    const result = await spawnCommand(this.command, {
      args,
      cwd: options.cwd,
      timeoutMs,
      signal: options.signal,
    });

    const durationMs = Date.now() - start;

    if (result.code !== 0) {
      const errorText = result.stderr.trim() || result.stdout.trim() || "claude process failed";
      throw new Error(
        `claude-code exited with code ${result.code}: ${errorText}`,
      );
    }

    const parsed = parseClaudeJson(result.stdout);

    return {
      text: parsed.text,
      sessionId: parsed.sessionId,
      durationMs,
      exitCode: result.code,
    };
  }
}
