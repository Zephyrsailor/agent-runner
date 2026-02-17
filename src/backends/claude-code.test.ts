import { describe, it, expect } from "vitest";
import { parseClaudeJson } from "./claude-code.js";

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
    // Falls back to raw since no text blocks found
    expect(parsed.text).toBe(json);
  });
});
