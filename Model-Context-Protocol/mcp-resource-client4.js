import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";

const client = new Client({
  name: "company-client",
  version: "1.0.0"
});

const transport = new StdioClientTransport({
  command: "node",
  args: ["Model-Context-Protocol/mcp-resource-server3.js"]
});

await client.connect(transport);

console.log("Connected to MCP server.");

const resourceResult = await client.listResources();

console.log("\nAvailable resources:");

for (const resource of resourceResult.resources) {
  console.log(`- ${resource.name}`);
  console.log(`  URI: ${resource.uri}`);
  console.log(`  Description: ${resource.description}`);
}

const result = await client.readResource({
  uri: "company://policies/leave"
});

console.log("\nResource contents:");

for (const item of result.contents) {
  console.log(item.text);
}

await client.close();