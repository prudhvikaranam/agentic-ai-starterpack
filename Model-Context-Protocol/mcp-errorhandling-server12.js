import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import * as z from "zod/v4";

const server = new McpServer({
  name: "weather-server",
  version: "1.0.0"
});

server.registerTool(
  "get_weather",
  {
    description: "Get current weather for a city.",
    inputSchema: z.object({
      city: z.string().min(2)
    })
  },
  async ({ city }) => {
    console.error(`Weather requested for: ${city}`);

    // Simulate external API failure
    if (city.toLowerCase() === "error") {
      throw new Error("Weather API is unavailable");
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            city,
            temperature: "30°C",
            condition: "Sunny"
          })
        }
      ]
    };
  }
);

void serveStdio(() => server);

console.error("Error-handling MCP server started.");