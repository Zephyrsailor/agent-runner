import { describe, it, expect } from "vitest";
import { AgentRunner, runWithClaude, runWithCodex } from "./index.js";

const LIVE = process.env.AGENT_RUNNER_LIVE_TEST === "1";

describe.skipIf(!LIVE)("Integration: Claude Code", () => {
  it("checks availability and version", async () => {
    const runner = new AgentRunner({ backend: "claude-code" });
    expect(await runner.available()).toBe(true);
    const ver = await runner.version();
    expect(ver).toBeTruthy();
  });

  it("runs in print mode (no tools)", async () => {
    const runner = new AgentRunner({ backend: "claude-code" });
    const result = await runner.run({
      prompt: "What is 2+2? Reply with ONLY the number, nothing else.",
      mode: "print",
      timeoutMs: 60_000,
    });
    expect(result.text).toContain("4");
    expect(result.exitCode).toBe(0);
    expect(result.durationMs).toBeGreaterThan(0);
  }, 120_000);

  it("runs in full-access mode (default)", async () => {
    const runner = new AgentRunner({ backend: "claude-code" });
    const result = await runner.run({
      prompt: "What is 2+2? Reply with ONLY the number, nothing else.",
      timeoutMs: 60_000,
    });
    expect(result.text).toContain("4");
    expect(result.exitCode).toBe(0);
  }, 120_000);

  it("convenience function runWithClaude works", async () => {
    const text = await runWithClaude(
      "What is 3+3? Reply with ONLY the number.",
      { mode: "print", timeoutMs: 60_000 },
    );
    expect(text).toContain("6");
  }, 120_000);

  it("streams output", async () => {
    const runner = new AgentRunner({ backend: "claude-code" });
    const events: string[] = [];
    for await (const event of runner.stream({
      prompt: "Say the word hello. Nothing else.",
      mode: "print",
      timeoutMs: 60_000,
    })) {
      events.push(`${event.type}:${event.data.slice(0, 50)}`);
      if (event.type === "done") break;
    }
    expect(events.length).toBeGreaterThan(0);
    const hasText = events.some((e) => e.startsWith("text:"));
    expect(hasText).toBe(true);
  }, 120_000);
}, 300_000);

describe.skipIf(!LIVE)("Integration: Codex", () => {
  it("checks availability and version", async () => {
    const runner = new AgentRunner({ backend: "codex" });
    expect(await runner.available()).toBe(true);
    const ver = await runner.version();
    expect(ver).toBeTruthy();
  });

  it("runs in print mode", async () => {
    const runner = new AgentRunner({ backend: "codex" });
    const result = await runner.run({
      prompt: "What is 2+2? Reply with ONLY the number, nothing else.",
      mode: "print",
      timeoutMs: 60_000,
    });
    expect(result.text).toContain("4");
    expect(result.exitCode).toBe(0);
  }, 120_000);

  it("convenience function runWithCodex works", async () => {
    const text = await runWithCodex(
      "What is 3+3? Reply with ONLY the number.",
      { mode: "print", timeoutMs: 60_000 },
    );
    expect(text).toContain("6");
  }, 120_000);
}, 300_000);

describe.skipIf(!LIVE)("Integration: Auto", () => {
  it("auto-detects and runs", async () => {
    const runner = new AgentRunner({ backend: "auto" });
    expect(await runner.available()).toBe(true);
    const result = await runner.run({
      prompt: "What is 5+5? Reply with ONLY the number.",
      mode: "print",
      timeoutMs: 60_000,
    });
    expect(result.text).toContain("10");
  }, 120_000);
}, 300_000);
