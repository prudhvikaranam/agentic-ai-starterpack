import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";

const client = new Client({
  name: "error-demo-client",
  version: "1.0.0"
});

const transport = new StdioClientTransport({
  command: "node",
  args: ["mcp-errorhandling-server12.js"]
});

try {
  await client.connect(transport);

  console.log("Connected.");

  const result = await client.callTool({
    name: "get_weather",
    arguments: {
      city: "error"
    }
  });

  // Tool-level error
  if (result.isError) {
    console.error("\nTool failed:");

    for (const block of result.content ?? []) {
      if (block.type === "text") {
        console.error(block.text);
      }
    }
  } else {
    console.log("\nTool succeeded:");
    console.log(result.content);
  }

} catch (error) {
  // Protocol-level / SDK-level / transport error
  console.error("\nMCP request failed:");
  console.error(error);

} finally {
  await client.close();
}