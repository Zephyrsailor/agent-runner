import { describe, it, expect } from "vitest";
import { parseClaudeJson, parseStreamJsonLine, parseVerboseStreamJson } from "./claude-code.js";

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

  it("extracts tool_use entries from array result", () => {
    const json = JSON.stringify({
      result: [
        { type: "text", text: "Done" },
        { type: "tool_use", name: "Bash", input: { command: "ls" } },
        { type: "tool_use", name: "Edit", input: { file: "a.ts" } },
      ],
      session_id: "s1",
    });
    const parsed = parseClaudeJson(json);
    expect(parsed.toolUses).toHaveLength(2);
    expect(parsed.toolUses![0]).toEqual({ name: "Bash", input: { command: "ls" } });
    expect(parsed.toolUses![1]).toEqual({ name: "Edit", input: { file: "a.ts" } });
  });

  it("extracts numTurns and costUsd from top-level JSON", () => {
    const json = JSON.stringify({
      result: "4",
      session_id: "s1",
      num_turns: 1,
      total_cost_usd: 0.021,
    });
    const parsed = parseClaudeJson(json);
    expect(parsed.numTurns).toBe(1);
    expect(parsed.costUsd).toBe(0.021);
  });

  it("extracts numTurns > 1 indicating tool use occurred", () => {
    const json = JSON.stringify({
      result: "done.",
      session_id: "s2",
      num_turns: 3,
      total_cost_usd: 0.108,
    });
    const parsed = parseClaudeJson(json);
    expect(parsed.numTurns).toBe(3);
    expect(parsed.costUsd).toBe(0.108);
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
    expect(parsed.numTurns).toBeUndefined();
    expect(parsed.costUsd).toBeUndefined();
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

  it("returns no toolUses when result has only text blocks", () => {
    const json = JSON.stringify({
      result: [{ type: "text", text: "just text" }],
      session_id: "s3",
    });
    const parsed = parseClaudeJson(json);
    expect(parsed.toolUses).toBeUndefined();
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

describe("parseVerboseStreamJson", () => {
  it("extracts tool_use from assistant messages and result from final line", () => {
    const lines = [
      JSON.stringify({ type: "system", subtype: "init", tools: ["Bash", "Read"] }),
      JSON.stringify({
        type: "assistant",
        message: {
          content: [
            { type: "tool_use", name: "Bash", input: { command: "printf 'hello' > /tmp/test.txt" } },
          ],
        },
      }),
      JSON.stringify({
        type: "user",
        message: { content: [{ tool_use_id: "toolu_123", type: "tool_result", content: "" }] },
      }),
      JSON.stringify({
        type: "assistant",
        message: { content: [{ type: "text", text: "Done." }] },
      }),
      JSON.stringify({
        type: "result",
        result: "Done.",
        session_id: "s1",
        num_turns: 2,
        total_cost_usd: 0.058,
      }),
    ].join("\n");

    const parsed = parseVerboseStreamJson(lines);
    expect(parsed.text).toBe("Done.");
    expect(parsed.sessionId).toBe("s1");
    expect(parsed.numTurns).toBe(2);
    expect(parsed.costUsd).toBe(0.058);
    expect(parsed.toolUses).toHaveLength(1);
    expect(parsed.toolUses![0].name).toBe("Bash");
    expect(parsed.toolUses![0].input).toEqual({ command: "printf 'hello' > /tmp/test.txt" });
  });

  it("extracts multiple tool calls across turns", () => {
    const lines = [
      JSON.stringify({
        type: "assistant",
        message: {
          content: [
            { type: "tool_use", name: "Read", input: { file_path: "/tmp/a.txt" } },
          ],
        },
      }),
      JSON.stringify({
        type: "assistant",
        message: {
          content: [
            { type: "tool_use", name: "Edit", input: { file_path: "/tmp/a.txt", old_string: "x", new_string: "y" } },
          ],
        },
      }),
      JSON.stringify({
        type: "assistant",
        message: { content: [{ type: "text", text: "Updated." }] },
      }),
      JSON.stringify({
        type: "result",
        result: "Updated.",
        num_turns: 3,
        total_cost_usd: 0.12,
        session_id: "s2",
      }),
    ].join("\n");

    const parsed = parseVerboseStreamJson(lines);
    expect(parsed.toolUses).toHaveLength(2);
    expect(parsed.toolUses![0].name).toBe("Read");
    expect(parsed.toolUses![1].name).toBe("Edit");
    expect(parsed.numTurns).toBe(3);
  });

  it("returns no toolUses when no tool calls occurred", () => {
    const lines = [
      JSON.stringify({
        type: "assistant",
        message: { content: [{ type: "text", text: "4" }] },
      }),
      JSON.stringify({
        type: "result",
        result: "4",
        num_turns: 1,
        total_cost_usd: 0.02,
        session_id: "s3",
      }),
    ].join("\n");

    const parsed = parseVerboseStreamJson(lines);
    expect(parsed.text).toBe("4");
    expect(parsed.toolUses).toBeUndefined();
    expect(parsed.numTurns).toBe(1);
  });

  it("falls back to parseClaudeJson for non-stream content", () => {
    const json = JSON.stringify({ result: "hello", session_id: "s4", num_turns: 1, total_cost_usd: 0.01 });
    const parsed = parseVerboseStreamJson(json);
    expect(parsed.text).toBe("hello");
    expect(parsed.sessionId).toBe("s4");
  });
});
