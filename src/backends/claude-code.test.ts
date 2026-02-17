import { describe, it, expect } from "vitest";
import { parseClaudeJson, parseStreamJsonLine } from "./claude-code.js";

describe("parseClaudeJson", () => {
  it("parses simple result string", () => {
    const json = JSON.stringify({ result: "Hello world", session_id: "abc-123" });
    const parsed = parseClaudeJson(json);
    expect(parsed.text).toBe("Hello world");
    expect(parsed.sessionId).toBe("abc-123");
  });

  it("parses array-of-blocks result", () => {
    const json = JSON.stringify({
      result: [
        { type: "text", text: "Line 1" },
        { type: "tool_use", name: "bash" },
        { type: "text", text: "Line 2" },
      ],
      session_id: "sess-456",
    });
    const parsed = parseClaudeJson(json);
    expect(parsed.text).toBe("Line 1\nLine 2");
    expect(parsed.sessionId).toBe("sess-456");
  });

  it("handles sessionId field name variant", () => {
    const json = JSON.stringify({ result: "ok", sessionId: "id-789" });
    const parsed = parseClaudeJson(json);
    expect(parsed.sessionId).toBe("id-789");
  });

  it("falls back to raw text on invalid JSON", () => {
    const parsed = parseClaudeJson("just plain text");
    expect(parsed.text).toBe("just plain text");
    expect(parsed.sessionId).toBeUndefined();
  });

  it("falls back to raw on unexpected shape", () => {
    const json = JSON.stringify({ foo: "bar" });
    const parsed = parseClaudeJson(json);
    expect(parsed.text).toBe(json);
  });

  it("handles empty result array", () => {
    const json = JSON.stringify({ result: [], session_id: "s1" });
    const parsed = parseClaudeJson(json);
    expect(parsed.text).toBe(json);
  });
});

describe("parseStreamJsonLine", () => {
  it("parses assistant text message", () => {
    const line = JSON.stringify({ type: "assistant", message: "Hello" });
    const event = parseStreamJsonLine(line);
    expect(event).toEqual({ type: "text", data: "Hello" });
  });

  it("parses content block delta", () => {
    const line = JSON.stringify({ type: "content_block_delta", delta: { text: "chunk" } });
    const event = parseStreamJsonLine(line);
    expect(event).toEqual({ type: "text", data: "chunk" });
  });

  it("parses tool_use event", () => {
    const line = JSON.stringify({ type: "tool_use", name: "Bash", input: { command: "ls" } });
    const event = parseStreamJsonLine(line);
    expect(event?.type).toBe("tool_use");
    const data = JSON.parse(event!.data);
    expect(data.name).toBe("Bash");
    expect(data.input.command).toBe("ls");
  });

  it("parses tool_result event", () => {
    const line = JSON.stringify({ type: "tool_result", output: "file.ts" });
    const event = parseStreamJsonLine(line);
    expect(event?.type).toBe("tool_result");
    const data = JSON.parse(event!.data);
    expect(data.output).toBe("file.ts");
  });

  it("parses result event with string", () => {
    const line = JSON.stringify({ type: "result", result: "Final answer" });
    const event = parseStreamJsonLine(line);
    expect(event).toEqual({ type: "text", data: "Final answer" });
  });

  it("parses result event with array", () => {
    const line = JSON.stringify({
      type: "result",
      result: [{ type: "text", text: "Part A" }, { type: "text", text: "Part B" }],
    });
    const event = parseStreamJsonLine(line);
    expect(event).toEqual({ type: "text", data: "Part A\nPart B" });
  });

  it("returns null for unknown event types", () => {
    const line = JSON.stringify({ type: "ping" });
    const event = parseStreamJsonLine(line);
    expect(event).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseStreamJsonLine("")).toBeNull();
    expect(parseStreamJsonLine("   ")).toBeNull();
  });

  it("treats non-JSON as text", () => {
    const event = parseStreamJsonLine("some raw text");
    expect(event).toEqual({ type: "text", data: "some raw text" });
  });
});
