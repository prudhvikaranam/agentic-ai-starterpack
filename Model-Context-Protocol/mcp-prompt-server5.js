import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import * as z from "zod/v4";

const server = new McpServer({
  name: "code-review-server",
  version: "1.0.0"
});

server.registerPrompt(
  "review-code",
  {
    title: "Code Review",
    description: "Review code for security, performance, and maintainability.",
    argsSchema: z.object({
      code: z.string(),
      language: z.string()
    })
  },
  ({ code, language }) => {
    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `
Review the following ${language} code.

Focus on:
1. Security issues
2. Performance problems
3. Maintainability
4. Potential bugs

Return:
- Finding
- Severity
- Explanation
- Suggested fix

Code:

${code}
            `.trim()
          }
        }
      ]
    };
  }
);

void serveStdio(() => server);

console.error("Code review MCP server started.");



