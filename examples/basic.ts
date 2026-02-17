import { AgentRunner } from "../src/index.js";

async function main() {
  // Use Claude Code backend
  const claude = new AgentRunner({ backend: "claude-code" });

  if (!(await claude.available())) {
    console.error("Claude Code CLI not found. Install: npm i -g @anthropic-ai/claude-code");
    process.exit(1);
  }

  console.log("Running prompt with Claude Code...");
  const result = await claude.run({
    prompt: "What is 2 + 2? Reply with just the number.",
    timeoutMs: 60_000,
  });

  console.log("Response:", result.text);
  console.log("Duration:", result.durationMs, "ms");
  if (result.sessionId) {
    console.log("Session ID:", result.sessionId);
  }

  // Multi-turn conversation
  if (result.sessionId) {
    console.log("\nFollowing up in same session...");
    const followUp = await claude.run({
      prompt: "Now multiply that by 3.",
      sessionId: result.sessionId,
      timeoutMs: 60_000,
    });
    console.log("Follow-up:", followUp.text);
  }
}

main().catch(console.error);
