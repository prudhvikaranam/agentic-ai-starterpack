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
    name: "exchange-server",
    version: "1.0.0"
  });

  server.registerTool(
    "get_exchange_rate",
    {
      description: "Get the exchange rate between two currencies.",
      inputSchema: z.object({
        from: z.string().length(3),
        to: z.string().length(3)
      })
    },
    async ({ from, to }) => {
      console.error(
        `Exchange rate request received: ${from} -> ${to}`
      );

      // Mock data for learning purposes
      const result = {
        from: from.toUpperCase(),
        to: to.toUpperCase(),
        rate: 87.25
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

httpServer.listen(3002, "127.0.0.1", () => {
  console.error(
    "Exchange MCP server listening on http://127.0.0.1:3002/mcp"
  );
});