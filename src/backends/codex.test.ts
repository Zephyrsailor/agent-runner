import { describe, it, expect } from "vitest";
import { parseCodexJsonl } from "./codex.js";

describe("parseCodexJsonl", () => {
  it("parses real codex JSONL output (item.completed format)", () => {
    const jsonl = [
      JSON.stringify({ type: "thread.started", thread_id: "019c-abc" }),
      JSON.stringify({ type: "turn.started" }),
      JSON.stringify({ type: "item.completed", item: { id: "item_0", type: "agent_message", text: "4" } }),
      JSON.stringify({ type: "turn.completed", usage: { input_tokens: 100 } }),
    ].join("\n");
    const parsed = parseCodexJsonl(jsonl);
    expect(parsed.text).toBe("4");
    expect(parsed.sessionId).toBe("019c-abc");
  });

  it("parses multiple item.completed messages", () => {
    const jsonl = [
      JSON.stringify({ type: "thread.started", thread_id: "t-1" }),
      JSON.stringify({ type: "item.completed", item: { type: "agent_message", text: "Line 1" } }),
      JSON.stringify({ type: "item.completed", item: { type: "agent_message", text: "Line 2" } }),
    ].join("\n");
    const parsed = parseCodexJsonl(jsonl);
    expect(parsed.text).toBe("Line 1\nLine 2");
    expect(parsed.sessionId).toBe("t-1");
  });

  it("parses legacy message format with string content", () => {
    const jsonl = [
      JSON.stringify({ thread_id: "t-legacy" }),
      JSON.stringify({ type: "message", role: "assistant", content: "Hello" }),
    ].join("\n");
    const parsed = parseCodexJsonl(jsonl);
    expect(parsed.text).toBe("Hello");
  });

  it("parses legacy message format with array content", () => {
    const jsonl = [
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
  });

  it("handles no parseable message (fallback to last line)", () => {
    const jsonl = "some raw output";
    const parsed = parseCodexJsonl(jsonl);
    expect(parsed.text).toBe("some raw output");
  });

  it("ignores non-agent events", () => {
    const jsonl = [
      JSON.stringify({ type: "turn.started" }),
      JSON.stringify({ type: "item.completed", item: { type: "agent_message", text: "response" } }),
      JSON.stringify({ type: "turn.completed", usage: {} }),
    ].join("\n");
    const parsed = parseCodexJsonl(jsonl);
    expect(parsed.text).toBe("response");
  });

  it("handles empty input", () => {
    const parsed = parseCodexJsonl("");
    expect(parsed.text).toBe("");
  });
});
