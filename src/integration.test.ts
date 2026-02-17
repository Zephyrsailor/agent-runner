import { describe, it, expect } from "vitest";
import { AgentRunner } from "./runner.js";
import { ClaudeCodeBackend } from "./backends/claude-code.js";
import { CodexBackend } from "./backends/codex.js";

const LIVE = process.env.LIVE_TEST === "1";

describe.skipIf(!LIVE)("Integration: Claude Code", () => {
  it("checks availability", async () => {
    const backend = new ClaudeCodeBackend();
    const ok = await backend.available();
    expect(ok).toBe(true);
  });

  it("runs a simple prompt", async () => {
    const runner = new AgentRunner({ backend: "claude-code" });
    const result = await runner.run({
      prompt: "What is 2+2? Reply with ONLY the number, nothing else.",
      timeoutMs: 60_000,
    });
    expect(result.text).toContain("4");
    expect(result.exitCode).toBe(0);
    expect(result.durationMs).toBeGreaterThan(0);
  }, 120_000);
});

describe.skipIf(!LIVE)("Integration: Codex", () => {
  it("checks availability", async () => {
    const backend = new CodexBackend();
    const ok = await backend.available();
    expect(ok).toBe(true);
  });

  it("runs a simple prompt", async () => {
    const runner = new AgentRunner({ backend: "codex" });
    const result = await runner.run({
      prompt: "What is 2+2? Reply with ONLY the number, nothing else.",
      timeoutMs: 60_000,
    });
    expect(result.text).toContain("4");
    expect(result.exitCode).toBe(0);
    expect(result.durationMs).toBeGreaterThan(0);
  }, 120_000);
});
