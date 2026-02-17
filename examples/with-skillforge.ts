/**
 * Skillforge integration example.
 *
 * This shows how agent-runner can be used as the execution engine
 * for skillforge skills that need Claude Code or Codex capabilities.
 *
 * In a skillforge skill definition, you would set:
 *   engine: 'claude-code'
 *
 * Then the runtime calls agent-runner to execute the prompt.
 */
import { AgentRunner, runWithClaude } from "../src/index.js";

async function main() {
  // Simplest usage: one-liner for skillforge handlers
  console.log("=== Simple skill execution ===");
  const result = await runWithClaude(
    "List 3 fruits in JSON array format. Return ONLY the JSON, no explanation.",
    { mode: "print", timeoutMs: 30_000 },
  );
  console.log("Result:", result);

  // Parse the JSON output from the agent
  try {
    const fruits = JSON.parse(result);
    console.log("Parsed fruits:", fruits);
  } catch {
    console.log("(output was not pure JSON, that's ok for demo)");
  }

  // More advanced: using AgentRunner directly for stateful skills
  console.log("\n=== Stateful skill with session ===");
  const runner = new AgentRunner({ backend: "claude-code" });

  const step1 = await runner.run({
    prompt: "Generate a random 4-letter word. Reply with ONLY the word.",
    mode: "print",
    timeoutMs: 30_000,
  });
  console.log("Step 1 (word):", step1.text);

  if (step1.sessionId) {
    const step2 = await runner.run({
      prompt: "Now reverse that word. Reply with ONLY the reversed word.",
      sessionId: step1.sessionId,
      mode: "print",
      timeoutMs: 30_000,
    });
    console.log("Step 2 (reversed):", step2.text);
  }

  // Full-access skill: agent can edit files and run commands
  console.log("\n=== Full-access skill (file operations) ===");
  const edit = await runner.run({
    prompt: "What directory are we in? Reply with just the path.",
    mode: "full-access",
    timeoutMs: 60_000,
  });
  console.log("Working dir:", edit.text);
}

main().catch(console.error);
