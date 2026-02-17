import { spawn } from "node:child_process";

export interface SpawnResult {
  stdout: string;
  stderr: string;
  code: number | null;
  signal: NodeJS.Signals | null;
}

export interface SpawnOptions {
  args: string[];
  cwd?: string;
  input?: string;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
  signal?: AbortSignal;
}

/**
 * Spawn a command, collect stdout/stderr, and resolve on close.
 * Supports timeout and AbortSignal cancellation.
 */
export function spawnCommand(
  command: string,
  options: SpawnOptions,
): Promise<SpawnResult> {
  const { args, cwd, input, env, timeoutMs, signal } = options;

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ["pipe", "pipe", "pipe"],
      cwd: cwd ?? process.cwd(),
      env: env ?? process.env,
    });

    let stdout = "";
    let stderr = "";
    let settled = false;

    const settle = () => {
      settled = true;
      if (timer) clearTimeout(timer);
      if (signal) signal.removeEventListener("abort", onAbort);
    };

    // Timeout handling
    const timer = timeoutMs
      ? setTimeout(() => {
          if (!settled) {
            child.kill("SIGKILL");
          }
        }, timeoutMs)
      : undefined;

    // AbortSignal handling
    const onAbort = () => {
      if (!settled) {
        child.kill("SIGTERM");
      }
    };
    if (signal) {
      if (signal.aborted) {
        child.kill("SIGTERM");
      } else {
        signal.addEventListener("abort", onAbort, { once: true });
      }
    }

    // Write stdin if provided
    if (input !== undefined && child.stdin) {
      child.stdin.write(input);
      child.stdin.end();
    } else {
      child.stdin?.end();
    }

    child.stdout.on("data", (d) => {
      stdout += d.toString();
    });
    child.stderr.on("data", (d) => {
      stderr += d.toString();
    });

    child.on("error", (err) => {
      if (settled) return;
      settle();
      reject(err);
    });

    child.on("close", (code, sig) => {
      if (settled) return;
      settle();
      resolve({ stdout, stderr, code, signal: sig });
    });
  });
}
