import { streamCommand } from "../src/index.js";

async function main() {
  console.log("Streaming Claude Code output...\n");

  const stream = streamCommand({
    command: "claude",
    args: [
      "-p",
      "--output-format",
      "stream-json",
      "--dangerously-skip-permissions",
      "Write a haiku about TypeScript.",
    ],
    timeoutMs: 60_000,
  });

  for await (const event of stream) {
    switch (event.type) {
      case "text":
        process.stdout.write(event.data + "\n");
        break;
      case "error":
        console.error("Error:", event.data);
        break;
      case "done":
        console.log("\nDone. Exit code:", event.data);
        break;
    }
  }
}

main().catch(console.error);
