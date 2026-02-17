import type { Backend, RunOptions, RunResult, StreamEvent } from "../types.js";
import { spawnCommand } from "../spawn.js";
import { streamCommand } from "../streaming.js";

/**
 * Parse Claude Code JSON output to extract the assistant text and session ID.
 * Claude --output-format json returns { result, session_id, ... }.
 */
export function parseClaudeJson(raw: string): { text: string; sessionId?: string } {
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

/**
 * Parse a single line of Claude stream-json output into a StreamEvent.
 */
export function parseStreamJsonLine(line: string): StreamEvent | null {
  try {
    const obj = JSON.parse(line);

    // Assistant text message
    if (obj.type === "assistant" && typeof obj.message === "string") {
      return { type: "text", data: obj.message };
    }
    // Content block with text
    if (obj.type === "content_block_delta" || obj.type === "text") {
      const text = obj.text ?? obj.delta?.text;
      if (typeof text === "string") {
        return { type: "text", data: text };
      }
    }
    // Tool use events
    if (obj.type === "tool_use") {
      return { type: "tool_use", data: JSON.stringify({ name: obj.name, input: obj.input }) };
    }
    // Tool result events
    if (obj.type === "tool_result") {
      return { type: "tool_result", data: JSON.stringify({ output: obj.output ?? obj.content }) };
    }
    // Result message (final)
    if (obj.type === "result") {
      const text = typeof obj.result === "string"
        ? obj.result
        : Array.isArray(obj.result)
          ? obj.result
              .filter((b: { type: string }) => b.type === "text")
              .map((b: { text: string }) => b.text)
              .join("\n")
          : JSON.stringify(obj.result);
      return { type: "text", data: text };
    }

    return null;
  } catch {
    if (line.trim()) {
      return { type: "text", data: line };
    }
    return null;
  }
}

/** Build common CLI args based on mode and options (shared by run and stream). */
function buildModeArgs(options: RunOptions, outputFormat: string): string[] {
  const mode = options.mode ?? "full-access";
  const args: string[] = ["-p", "--output-format", outputFormat];

  switch (mode) {
    case "full-access":
      args.push("--dangerously-skip-permissions");
      break;
    case "workspace-write":
      args.push("--permission-mode", "acceptEdits");
      break;
    case "print":
      // Disable all tools for pure text output
      args.push("--tools", "");
      break;
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
  if (options.allowedTools && options.allowedTools.length > 0) {
    args.push("--allowedTools", ...options.allowedTools);
  }
  if (options.maxBudgetUsd !== undefined) {
    args.push("--max-budget-usd", String(options.maxBudgetUsd));
  }
  if (options.extraArgs) {
    args.push(...options.extraArgs);
  }

  // Prompt goes last
  args.push(options.prompt);

  return args;
}

export class ClaudeCodeBackend implements Backend {
  readonly name = "claude-code";

  private command: string;

  constructor(options?: { command?: string }) {
    this.command = options?.command ?? "claude";
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
    const args = buildModeArgs(options, "json");

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

  async *stream(options: RunOptions): AsyncIterable<StreamEvent> {
    const args = buildModeArgs(options, "stream-json");

    const env = options.env
      ? { ...process.env, ...options.env }
      : undefined;

    const rawStream = streamCommand({
      command: this.command,
      args,
      cwd: options.cwd,
      env,
      timeoutMs: options.timeoutMs,
      signal: options.signal,
    });

    for await (const rawEvent of rawStream) {
      if (rawEvent.type === "done") {
        yield { type: "done", data: rawEvent.data };
        return;
      }
      if (rawEvent.type === "error") {
        yield { type: "error", data: rawEvent.data };
        return;
      }
      const parsed = parseStreamJsonLine(rawEvent.data);
      if (parsed) {
        yield parsed;
      }
    }
  }
}
