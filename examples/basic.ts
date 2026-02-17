import { AgentRunner, runWithClaude } from "../src/index.js";

async function main() {
  // ── Convenience function (simplest usage) ──
  console.log("=== Convenience function ===");
  const answer = await runWithClaude("What is 2+2? Reply with just the number.", {
    mode: "print",
    timeoutMs: 60_000,
  });
  console.log("Answer:", answer);

  // ── Full AgentRunner with modes ──
  console.log("\n=== Full-access mode (can use tools) ===");
  const claude = new AgentRunner({ backend: "claude-code" });

  if (!(await claude.available())) {
    console.error("Claude Code CLI not found. Install: npm i -g @anthropic-ai/claude-code");
    process.exit(1);
  }

  const ver = await claude.version();
  console.log("CLI version:", ver);

  const result = await claude.run({
    prompt: "List the files in the current directory. Just the filenames, one per line.",
    mode: "full-access",
    timeoutMs: 120_000,
  });
  console.log("Response:", result.text);
  console.log("Duration:", result.durationMs, "ms");

  // ── Multi-turn conversation ──
  if (result.sessionId) {
    console.log("\n=== Multi-turn (same session) ===");
    const followUp = await claude.run({
      prompt: "How many files did you find? Just the number.",
      sessionId: result.sessionId,
      mode: "print",
      timeoutMs: 60_000,
    });
    console.log("Follow-up:", followUp.text);
  }

  // ── Streaming ──
  console.log("\n=== Streaming ===");
  for await (const event of claude.stream({
    prompt: "Write a haiku about code. Nothing else.",
    mode: "print",
    timeoutMs: 60_000,
  })) {
    if (event.type === "text") process.stdout.write(event.data);
    if (event.type === "done") console.log(`\n(exit: ${event.data})`);
  }
}

main().catch(console.error);
