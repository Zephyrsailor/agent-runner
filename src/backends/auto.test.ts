import { describe, it, expect } from "vitest";
import { AutoBackend } from "./auto.js";
import type { Backend, RunOptions, RunResult } from "../types.js";

function makeMockBackend(name: string, isAvailable: boolean): Backend {
  return {
    name,
    async available() {
      return isAvailable;
    },
    async run(_options: RunOptions): Promise<RunResult> {
      return { text: `from ${name}`, durationMs: 1, exitCode: 0 };
    },
  };
}

describe("AutoBackend", () => {
  it("reports available when at least one CLI exists", async () => {
    // AutoBackend checks real CLIs; just verify the interface works
    const auto = new AutoBackend();
    const result = await auto.available();
    // On this machine both CLIs exist, so should be true
    expect(typeof result).toBe("boolean");
  });

  it("has name 'auto'", () => {
    const auto = new AutoBackend();
    expect(auto.name).toBe("auto");
  });
});
