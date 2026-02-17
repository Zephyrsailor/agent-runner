import { describe, it, expect } from "vitest";
import { AgentRunner } from "./runner.js";
import type { Backend, RunOptions, RunResult, StreamEvent } from "./types.js";

describe("AgentRunner", () => {
  it("accepts a custom backend", async () => {
    const mockBackend: Backend = {
      name: "mock",
      async available() {
        return true;
      },
      async run(_options: RunOptions): Promise<RunResult> {
        return { text: "hello", durationMs: 10, exitCode: 0 };
      },
    };

    const runner = new AgentRunner({ backend: mockBackend });
    expect(runner.backendName).toBe("mock");
    expect(await runner.available()).toBe(true);

    const result = await runner.run({ prompt: "test" });
    expect(result.text).toBe("hello");
    expect(result.exitCode).toBe(0);
  });

  it("creates claude-code backend by ID", () => {
    const runner = new AgentRunner({ backend: "claude-code" });
    expect(runner.backendName).toBe("claude-code");
  });

  it("creates codex backend by ID", () => {
    const runner = new AgentRunner({ backend: "codex" });
    expect(runner.backendName).toBe("codex");
  });

  it("creates auto backend by ID", () => {
    const runner = new AgentRunner({ backend: "auto" });
    expect(runner.backendName).toBe("auto");
  });

  it("throws on unknown backend", () => {
    expect(() => new AgentRunner({ backend: "nope" as "claude-code" })).toThrow(
      "Unknown backend",
    );
  });

  it("throws on stream() when backend does not support it", () => {
    const mockBackend: Backend = {
      name: "no-stream",
      async available() { return true; },
      async run() { return { text: "", durationMs: 0, exitCode: 0 }; },
      // No stream() method
    };
    const runner = new AgentRunner({ backend: mockBackend });
    expect(() => runner.stream({ prompt: "test" })).toThrow("does not support streaming");
  });

  it("stream() works when backend supports it", async () => {
    const mockBackend: Backend = {
      name: "streamable",
      async available() { return true; },
      async run() { return { text: "", durationMs: 0, exitCode: 0 }; },
      async *stream(): AsyncIterable<StreamEvent> {
        yield { type: "text", data: "hello" };
        yield { type: "done", data: "0" };
      },
    };
    const runner = new AgentRunner({ backend: mockBackend });
    const events: StreamEvent[] = [];
    for await (const e of runner.stream({ prompt: "test" })) {
      events.push(e);
    }
    expect(events).toHaveLength(2);
    expect(events[0]).toEqual({ type: "text", data: "hello" });
    expect(events[1]).toEqual({ type: "done", data: "0" });
  });

  it("version() returns 'unknown' for backends without version()", async () => {
    const mockBackend: Backend = {
      name: "no-ver",
      async available() { return true; },
      async run() { return { text: "", durationMs: 0, exitCode: 0 }; },
    };
    const runner = new AgentRunner({ backend: mockBackend });
    expect(await runner.version()).toBe("unknown");
  });
});
