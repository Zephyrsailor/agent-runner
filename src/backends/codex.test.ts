import { describe, it, expect } from "vitest";
import { parseCodexJsonl } from "./codex.js";

describe("parseCodexJsonl", () => {
  it("parses assistant message with string content", () => {
    const jsonl = [
      JSON.stringify({ thread_id: "t-1" }),
      JSON.stringify({ type: "message", role: "assistant", content: "Hello" }),
    ].join("\n");
    const parsed = parseCodexJsonl(jsonl);
    expect(parsed.text).toBe("Hello");
    expect(parsed.sessionId).toBe("t-1");
  });

  it("parses assistant message with array content", () => {
    const jsonl = [
      JSON.stringify({ thread_id: "t-2" }),
      JSON.stringify({
        type: "message",
        role: "assistant",
        content: [
          { type: "output_text", text: "Part 1" },
          { type: "output_text", text: "Part 2" },
        ],
      }),
    ].join("\n");
    const parsed = parseCodexJsonl(jsonl);
    expect(parsed.text).toBe("Part 1\nPart 2");
    expect(parsed.sessionId).toBe("t-2");
  });

  it("handles no parseable message (fallback to last line)", () => {
    const jsonl = "some raw output";
    const parsed = parseCodexJsonl(jsonl);
    expect(parsed.text).toBe("some raw output");
  });

  it("ignores non-assistant messages", () => {
    const jsonl = [
      JSON.stringify({ type: "message", role: "user", content: "hi" }),
      JSON.stringify({ type: "message", role: "assistant", content: "response" }),
    ].join("\n");
    const parsed = parseCodexJsonl(jsonl);
    expect(parsed.text).toBe("response");
  });

  it("handles multiple assistant messages", () => {
    const jsonl = [
      JSON.stringify({ type: "message", role: "assistant", content: "first" }),
      JSON.stringify({ type: "message", role: "assistant", content: "second" }),
    ].join("\n");
    const parsed = parseCodexJsonl(jsonl);
    expect(parsed.text).toBe("first\nsecond");
  });

  it("handles empty input", () => {
    const parsed = parseCodexJsonl("");
    expect(parsed.text).toBe("");
  });
});
