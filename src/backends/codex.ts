import type { Backend, RunOptions, RunResult } from "../types.js";
import { spawnCommand } from "../spawn.js";

/**
 * Parse Codex JSONL output to extract text and session ID.
 * Codex outputs newline-delimited JSON objects.
 */
function parseCodexJsonl(raw: string): { text: string; sessionId?: string } {
  const lines = raw.trim().split("\n").filter(Boolean);
  const textParts: string[] = [];
  let sessionId: string | undefined;

  for (const line of lines) {
    try {
      const obj = JSON.parse(line);

      // Extract session/thread ID
      if (obj.thread_id && !sessionId) {
        sessionId = obj.thread_id;
      }

      // Extract message content
      if (obj.type === "message" && obj.role === "assistant") {
        if (typeof obj.content === "string") {
          textParts.push(obj.content);
        } else if (Array.isArray(obj.content)) {
          for (const part of obj.content) {
            if (part.type === "output_text" && typeof part.text === "string") {
              textParts.push(part.text);
            }
          }
        }
      }
    } catch {
      // Skip unparseable lines
    }
  }

  if (textParts.length > 0) {
    return { text: textParts.join("\n"), sessionId };
  }

  // Fallback: return last non-empty line or full output
  return { text: lines[lines.length - 1] ?? raw.trim(), sessionId };
}

export class CodexBackend implements Backend {
  readonly name = "codex";

  private command: string;

  constructor(options?: { command?: string }) {
    this.command = options?.command ?? "codex";
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

    const args: string[] = [
      "exec",
      "--json",
      "--color",
      "never",
      "--sandbox",
      "read-only",
      "--skip-git-repo-check",
    ];

    if (options.model) {
      args.push("--model", options.model);
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
      const errorText = result.stderr.trim() || result.stdout.trim() || "codex process failed";
      throw new Error(
        `codex exited with code ${result.code}: ${errorText}`,
      );
    }

    const parsed = parseCodexJsonl(result.stdout);

    return {
      text: parsed.text,
      sessionId: parsed.sessionId,
      durationMs,
      exitCode: result.code,
    };
  }
}
