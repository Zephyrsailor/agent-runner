import { describe, it, expect } from "vitest";
import { AgentRunner } from "./runner.js";
import type { Backend, RunOptions, RunResult } from "./types.js";

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

  it("throws on unknown backend", () => {
    expect(() => new AgentRunner({ backend: "nope" as "claude-code" })).toThrow(
      "Unknown backend",
    );
  });
});
