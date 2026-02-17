import { AgentRunner } from "../src/index.js";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

/**
 * Demonstrates full-access mode: the agent can create/edit files and run commands.
 * Uses a temp directory so it's safe to run.
 */
async function main() {
  const runner = new AgentRunner({ backend: "claude-code" });

  // Create a temp workspace
  const workspace = await mkdtemp(path.join(tmpdir(), "agent-runner-demo-"));
  console.log("Workspace:", workspace);

  try {
    // Ask the agent to create a file
    console.log("\n--- Creating a file via agent ---");
    const result = await runner.run({
      prompt: 'Create a file called hello.ts with a function that returns "Hello, World!". Only create the file, no explanation needed.',
      cwd: workspace,
      mode: "full-access",
      timeoutMs: 120_000,
    });
    console.log("Agent response:", result.text);

    // Verify the file was created
    try {
      const content = await readFile(path.join(workspace, "hello.ts"), "utf-8");
      console.log("\nCreated file content:");
      console.log(content);
    } catch {
      console.log("File was not created (agent may have responded differently)");
    }

    // Ask the agent to read and modify
    console.log("\n--- Modifying the file via agent ---");
    const modify = await runner.run({
      prompt: "Read hello.ts, then add a second function called goodbye that returns 'Goodbye!'. Only edit the file, no explanation needed.",
      cwd: workspace,
      mode: "full-access",
      sessionId: result.sessionId,
      timeoutMs: 120_000,
    });
    console.log("Agent response:", modify.text);

    try {
      const content = await readFile(path.join(workspace, "hello.ts"), "utf-8");
      console.log("\nModified file content:");
      console.log(content);
    } catch {
      console.log("File not found after modification attempt");
    }
  } finally {
    // Clean up
    await rm(workspace, { recursive: true, force: true });
    console.log("\nCleaned up workspace");
  }
}

main().catch(console.error);
