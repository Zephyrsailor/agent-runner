import { describe, it, expect, vi } from "vitest";

// Test the parseClaudeJson function by extracting it
// Since it's private, we test through the backend's run method indirectly,
// or we can test the parsing logic inline.

describe("Claude JSON parsing", () => {
  function parseClaudeJson(raw: string): { text: string; sessionId?: string } {
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed.result === "string") {
        return {
          text: parsed.result,
          sessionId: parsed.session_id ?? parsed.sessionId,
        };
      }
      if (Array.isArray(parsed.result)) {
        const textParts: string[] = [];
        for (const block of parsed.result) {
          if (block.type === "text" && typeof block.text === "string") {
            textParts.push(block.text);
          }
        }
        if (textParts.length > 0) {
          return {
            text: textParts.join("\n"),
            sessionId: parsed.session_id ?? parsed.sessionId,
          };
        }
      }
      return { text: raw.trim() };
    } catch {
      return { text: raw.trim() };
    }
  }

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
});
