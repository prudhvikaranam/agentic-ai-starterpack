import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";

const server = new McpServer({
  name: "company-server",
  version: "1.0.0"
});

server.registerResource(
  "leave-policy",
  "company://policies/leave",
  {
    title: "Leave Policy",
    description: "Company leave policy",
    mimeType: "text/plain"
  },
  async (uri) => {
    console.error(`Resource requested: ${uri.href}`);

    return {
      contents: [
        {
          uri: uri.href,
          mimeType: "text/plain",
          text: `
Employees receive 20 annual leave days.
Sick leave requires manager notification.
Unused leave may be carried forward according to company policy.
          `.trim()
        }
      ]
    };
  }
);

void serveStdio(() => server);

console.error("Company MCP server started.");