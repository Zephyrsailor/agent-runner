import { AgentRunner } from "../src/index.js";

async function main() {
  const runner = new AgentRunner({ backend: "claude-code" });

  console.log("Streaming Claude Code output (with tool events)...\n");

  for await (const event of runner.stream({
    prompt: "Read package.json and tell me the project name.",
    mode: "full-access",
    timeoutMs: 120_000,
  })) {
    switch (event.type) {
      case "text":
        process.stdout.write(event.data);
        break;
      case "tool_use":
        console.log(`\n[tool_use] ${event.data}`);
        break;
      case "tool_result":
        console.log(`[tool_result] ${event.data.slice(0, 200)}`);
        break;
      case "error":
        console.error("\nError:", event.data);
        break;
      case "done":
        console.log(`\n\nDone. Exit code: ${event.data}`);
        break;
    }
  }
}

main().catch(console.error);
