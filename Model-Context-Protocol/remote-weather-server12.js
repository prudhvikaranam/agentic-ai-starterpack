import { createServer } from "node:http";

import {
  createMcpHandler,
  McpServer
} from "@modelcontextprotocol/server";

import {
  toNodeHandler,
  localhostHostValidation,
  localhostOriginValidation
} from "@modelcontextprotocol/node";

import * as z from "zod/v4";

const handler = createMcpHandler(() => {
  const server = new McpServer({
    name: "weather-server",
    version: "1.0.0"
  });

  server.registerTool(
    "get_weather",
    {
      description: "Get the current weather for a city.",
      inputSchema: z.object({
        city: z.string()
      })
    },
    async ({ city }) => {
      console.error(`Weather request received for: ${city}`);

      // Mock data for learning purposes
      const result = {
        city,
        temperature: 30,
        unit: "C",
        condition: "Sunny"
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result)
          }
        ]
      };
    }
  );

  return server;
});

const nodeHandler = toNodeHandler(handler);

const validateHost = localhostHostValidation();
const validateOrigin = localhostOriginValidation();

const httpServer = createServer((req, res) => {
  if (!validateHost(req, res) || !validateOrigin(req, res)) {
    return;
  }

  void nodeHandler(req, res);
});

httpServer.listen(3001, "127.0.0.1", () => {
  console.error(
    "Weather MCP server listening on http://127.0.0.1:3001/mcp"
  );
});