import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import * as z from "zod/v4";

const server = new McpServer({
  name: "weather-server",
  version: "1.0.0",
});

server.registerTool(
  "get_weather",
  {
    description: "Get the current weather for a city.",
    inputSchema: z.object({
      city: z.string(),
    }),
  },
  async ({ city }) => {
    console.error(`Weather tool called for: ${city}`);

    const result = {
      city,
      temperature: "30°C",
      condition: "Sunny",
    };

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result),
        },
      ],
    };
  }
);

void serveStdio(() => server);

console.error("Weather MCP server started.");