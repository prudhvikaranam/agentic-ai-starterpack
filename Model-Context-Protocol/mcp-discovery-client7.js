import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";

const client = new Client({
  name: "discovery-client",
  version: "1.0.0"
});

const transport = new StdioClientTransport({
  command: "node",
  args: ["mcp-prompt-server5.js", "mcp-resource-server3.js","mcp-server1.js"]
});

try {
  await client.connect(transport);

  console.log("Connected to MCP server.\n");

  // Discover tools
  const toolsResult = await client.listTools();

  console.log("TOOLS:");

  for (const tool of toolsResult.tools) {
    console.log(`- ${tool.name}`);
    console.log(`  ${tool.description ?? "No description"}`);
  }

  // Discover resources
  const resourcesResult = await client.listResources();

  console.log("\nRESOURCES:");

  for (const resource of resourcesResult.resources) {
    console.log(`- ${resource.name}`);
    console.log(`  URI: ${resource.uri}`);
    console.log(`  ${resource.description ?? "No description"}`);
  }

  // Discover prompts
  const promptsResult = await client.listPrompts();

  console.log("\nPROMPTS:");

  for (const prompt of promptsResult.prompts) {
    console.log(`- ${prompt.name}`);
    console.log(`  ${prompt.description ?? "No description"}`);
  }

} catch (error) {
  console.error("Discovery failed:", error);
} finally {
  await client.close();
}