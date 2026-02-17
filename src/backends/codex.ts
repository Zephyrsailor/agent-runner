import type { Backend, RunOptions, RunResult } from "../types.js";
import { spawnCommand } from "../spawn.js";

/**
 * Parse Codex JSONL output to extract text and session ID.
 * Codex outputs newline-delimited JSON objects.
 */
export function parseCodexJsonl(raw: string): { text: string; sessionId?: string } {
  const lines = raw.trim().split("\n").filter(Boolean);
  const textParts: string[] = [];
  let sessionId: string | undefined;

  for (const line of lines) {
    try {
      const obj = JSON.parse(line);

      // Extract session/thread ID from thread.started event
      if (obj.type === "thread.started" && obj.thread_id) {
        sessionId = obj.thread_id;
      }

      // Extract text from item.completed events (agent_message)
      if (obj.type === "item.completed" && obj.item) {
        if (obj.item.type === "agent_message" && typeof obj.item.text === "string") {
          textParts.push(obj.item.text);
        }
      }

      // Legacy format: message with role=assistant
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

/** Map our mode to codex sandbox flags. */
function resolveCodexSandbox(mode: RunOptions["mode"]): string[] {
  switch (mode ?? "full-access") {
    case "full-access":
      return ["--dangerously-bypass-approvals-and-sandbox"];
    case "workspace-write":
      return ["--sandbox", "workspace-write", "--full-auto"];
    case "print":
      return ["--sandbox", "read-only"];
  }
}

export class CodexBackend implements Backend {
  readonly name = "codex";

  private command: string;

  constructor(options?: { command?: string }) {
    this.command = options?.command ?? "codex";
  }

  async available(): Promise<boolean> {
    return (await this.version()) !== null;
  }

  async version(): Promise<string | null> {
    try {
      const result = await spawnCommand(this.command, {
        args: ["--version"],
        timeoutMs: 10_000,
      });
      if (result.code === 0 && result.stdout.trim().length > 0) {
        return result.stdout.trim();
      }
      return null;
    } catch {
      return null;
    }
  }

  async run(options: RunOptions): Promise<RunResult> {
    const start = Date.now();
    const timeoutMs = options.timeoutMs ?? 300_000;
    const sandboxArgs = resolveCodexSandbox(options.mode);

    const args: string[] = [
      "exec",
      "--json",
      "--color",
      "never",
      ...sandboxArgs,
      "--skip-git-repo-check",
    ];

    if (options.model) {
      args.push("--model", options.model);
    }
    if (options.extraArgs) {
      args.push(...options.extraArgs);
    }

    // Prompt goes last
    args.push(options.prompt);

    const env = options.env
      ? { ...process.env, ...options.env }
      : undefined;

    const result = await spawnCommand(this.command, {
      args,
      cwd: options.cwd,
      env,
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
