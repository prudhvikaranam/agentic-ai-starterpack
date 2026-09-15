import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";

const client = new Client({
  name: "code-review-client",
  version: "1.0.0"
});

const transport = new StdioClientTransport({
  command: "node",
  args: ["Model-Context-Protocol/mcp-prompt-server5.js"]
});

try {
  // Connect to MCP server
  await client.connect(transport);

  console.log("Connected to MCP server.");

  // Discover available prompts
  const { prompts } = await client.listPrompts();

  console.log("\nAvailable prompts:");

  for (const prompt of prompts) {
    console.log(`- ${prompt.name}`);
    console.log(`  ${prompt.description ?? "No description"}`);
  }

  // Get the "review-code" prompt
  const result = await client.getPrompt({
    name: "review-code",
    arguments: {
      language: "javascript",
      code: `
const user = req.body.user;

db.query(
  "SELECT * FROM users WHERE name = '" + user + "'"
);
      `.trim()
    }
  });

  // Display the messages returned by the MCP prompt
  console.log("\nPrompt result:");

  for (const message of result.messages) {
    console.log(`\nRole: ${message.role}`);

    if (message.content.type === "text") {
      console.log(message.content.text);
    }
  }
} catch (error) {
  console.error("MCP client error:", error);
} finally {
  await client.close();
}