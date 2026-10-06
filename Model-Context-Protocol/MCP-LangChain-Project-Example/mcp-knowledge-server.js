import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import * as z from "zod/v4";

import { run } from "./rag.js";

const server = new McpServer({
  name: "knowledge-server",
  version: "1.0.0",
});

server.registerTool(
  "search_knowledge",
  {
    description:
      "Search the company knowledge base and return relevant information.",
    inputSchema: z.object({
      query: z.string(),
    }),
  },
  async ({ query }) => {
    try {
      console.error(
        `Knowledge search requested: ${query}`
      );

      const documents =
        await run(query);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(documents),
          },
        ],
      };
    } catch (error) {
      console.error(
        "Knowledge search failed:",
        error
      );

      return {
        isError: true,
        content: [
          {
            type: "text",
            text: "Knowledge search failed.",
          },
        ],
      };
    }
  }
);

void serveStdio(() => server);

console.error("Knowledge MCP server started.");




























// Below is the code for manual injected knowledge.........

// import { McpServer } from "@modelcontextprotocol/server";
// import { serveStdio } from "@modelcontextprotocol/server/stdio";
// import * as z from "zod/v4";

// const server = new McpServer({
//   name: "knowledge-server",
//   version: "1.0.0",
// });

// server.registerTool(
//   "search_knowledge",
//   {
//     description: "Search company knowledge and return relevant information.",
//     inputSchema: z.object({
//       query: z.string(),
//     }),
//   },
//   async ({ query }) => {
//     console.error(`Knowledge tool called with query: ${query}`);

//     const knowledge = {
//       query,
//       result:
//         "Employees are eligible for 20 days of paid leave per calendar year.",
//     };

//     return {
//       content: [
//         {
//           type: "text",
//           text: JSON.stringify(knowledge),
//         },
//       ],
//     };
//   }
// );

// void serveStdio(() => server);

// console.error("Knowledge MCP server started.");