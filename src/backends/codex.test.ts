import { describe, it, expect } from "vitest";

describe("Codex JSONL parsing", () => {
  function parseCodexJsonl(raw: string): { text: string; sessionId?: string } {
    const lines = raw.trim().split("\n").filter(Boolean);
    const textParts: string[] = [];
    let sessionId: string | undefined;

    for (const line of lines) {
      try {
        const obj = JSON.parse(line);
        if (obj.thread_id && !sessionId) {
          sessionId = obj.thread_id;
        }
        if (obj.type === "message" && obj.role === "assistant") {
          if (typeof obj.content === "string") {
            textParts.push(obj.content);
          } else if (Array.isArray(obj.content)) {
            for (const part of obj.content) {
              if (part.type === "output_text" && typeof part.text === "string") {
                textParts.push(part.text);
              }
            }
          }
        }
      } catch {
        // skip
      }
    }

    if (textParts.length > 0) {
      return { text: textParts.join("\n"), sessionId };
    }
    return { text: lines[lines.length - 1] ?? raw.trim(), sessionId };
  }

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
});
