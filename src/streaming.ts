import { spawn } from "node:child_process";
import { EventEmitter } from "node:events";

/** Raw line-level event from the spawned process (internal use). */
export interface RawStreamEvent {
  type: "text" | "error" | "done";
  data: string;
}

export interface StreamOptions {
  command: string;
  args: string[];
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  input?: string;
  timeoutMs?: number;
  signal?: AbortSignal;
}

/**
 * Stream stdout from a CLI agent process line-by-line.
 * Returns an async iterable of StreamEvents.
 */
export async function* streamCommand(
  options: StreamOptions,
): AsyncGenerator<RawStreamEvent> {
  const { command, args, cwd, env, input, timeoutMs, signal } = options;

  const child = spawn(command, args, {
    stdio: ["pipe", "pipe", "pipe"],
    cwd: cwd ?? process.cwd(),
    env: env ?? process.env,
  });

  // Write input to stdin if provided, then close
  if (input !== undefined && child.stdin) {
    child.stdin.write(input);
    child.stdin.end();
  } else {
    child.stdin?.end();
  }

  const emitter = new EventEmitter();
  let buffer = "";
  let stderrBuffer = "";
  let done = false;

  const timer = timeoutMs
    ? setTimeout(() => {
        if (!done) child.kill("SIGKILL");
      }, timeoutMs)
    : undefined;

  const onAbort = () => {
    if (!done) child.kill("SIGTERM");
  };
  if (signal) {
    if (signal.aborted) {
      child.kill("SIGTERM");
    } else {
      signal.addEventListener("abort", onAbort, { once: true });
    }
  }

  child.stdout.on("data", (chunk: Buffer) => {
    buffer += chunk.toString();
    // Emit complete lines
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (line.trim()) {
        emitter.emit("event", { type: "text", data: line } satisfies RawStreamEvent);
      }
    }
  });

  child.stderr.on("data", (chunk: Buffer) => {
    stderrBuffer += chunk.toString();
  });

  const closePromise = new Promise<number | null>((resolve) => {
    child.on("close", (code) => {
      done = true;
      if (timer) clearTimeout(timer);
      if (signal) signal.removeEventListener("abort", onAbort);
      // Flush remaining buffer
      if (buffer.trim()) {
        emitter.emit("event", { type: "text", data: buffer.trim() } satisfies RawStreamEvent);
      }
      resolve(code);
    });
    child.on("error", (err) => {
      done = true;
      if (timer) clearTimeout(timer);
      emitter.emit("event", { type: "error", data: err.message } satisfies RawStreamEvent);
      resolve(null);
    });
  });

  // Yield events as they come in
  const queue: RawStreamEvent[] = [];
  let resolveWait: (() => void) | null = null;

  emitter.on("event", (event: RawStreamEvent) => {
    queue.push(event);
    if (resolveWait) {
      resolveWait();
      resolveWait = null;
    }
  });

  while (true) {
    if (queue.length > 0) {
      const event = queue.shift()!;
      yield event;
      if (event.type === "error") return;
    } else if (done && queue.length === 0) {
      break;
    } else {
      await new Promise<void>((r) => {
        resolveWait = r;
        // Also resolve if process already done
        if (done) r();
      });
    }
  }

  const exitCode = await closePromise;

  if (stderrBuffer.trim() && exitCode !== 0) {
    yield { type: "error", data: stderrBuffer.trim() };
  }

  yield { type: "done", data: String(exitCode ?? 0) };
}
