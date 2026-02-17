import { describe, it, expect } from "vitest";
import { runWithClaude, runWithCodex, runWithAuto } from "./index.js";

// These are just sanity checks that the functions exist and have correct signatures.
// Actual invocation is tested in integration.test.ts behind AGENT_RUNNER_LIVE_TEST=1.

describe("Convenience functions", () => {
  it("runWithClaude is a function", () => {
    expect(typeof runWithClaude).toBe("function");
  });

  it("runWithCodex is a function", () => {
    expect(typeof runWithCodex).toBe("function");
  });

  it("runWithAuto is a function", () => {
    expect(typeof runWithAuto).toBe("function");
  });
});
