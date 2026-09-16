import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";

const OLLAMA_URL = "http://localhost:11434/api/chat";
const MODEL = "qwen2.5:7b";

// --------------------------------------------------
// 1. Create MCP client
// --------------------------------------------------

const mcpClient = new Client({
  name: "ollama-mcp-host",
  version: "1.0.0"
});

// --------------------------------------------------
// 2. Connect to MCP server
// --------------------------------------------------

const transport = new StdioClientTransport({
  command: "node",
  args: ["mcp-server1.js"]
});

await mcpClient.connect(transport);

console.log("Connected to MCP server.");

// --------------------------------------------------
// 3. Discover MCP tools
// --------------------------------------------------

const { tools } = await mcpClient.listTools();

console.log("\nDiscovered MCP tools:");

for (const tool of tools) {
  console.log(`- ${tool.name}`);
  console.log(`  ${tool.description}`);
}

// --------------------------------------------------
// 4. Ask the LLM
// --------------------------------------------------

const userQuestion = "What is the weather in Hyderabad?";

const ollamaResponse = await fetch(OLLAMA_URL, {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    model: MODEL,
    stream: false,
    messages: [
      {
        role: "system",
        content: `
You are an AI assistant.

You have access to MCP tools.

Available MCP tools:
${JSON.stringify(tools, null, 2)}

If a tool is required, respond ONLY with JSON in this format:

{
  "tool": "tool_name",
  "arguments": {
    "key": "value"
  }
}

If no tool is required, respond ONLY with:

{
  "answer": "your answer"
}
        `.trim()
      },
      {
        role: "user",
        content: userQuestion
      }
    ]
  })
});

if (!ollamaResponse.ok) {
  throw new Error(
    `Ollama request failed: ${ollamaResponse.status} ${ollamaResponse.statusText}`
  );
}

const ollamaData = await ollamaResponse.json();

const llmDecision = JSON.parse(
  ollamaData.message.content
);

console.log("\nLLM decision:");
console.log(llmDecision);

// --------------------------------------------------
// 5. Execute MCP tool if requested
// --------------------------------------------------

let finalAnswer;

if (llmDecision.tool) {
  console.log(`\nCalling MCP tool: ${llmDecision.tool}`);

  const toolResult = await mcpClient.callTool({
    name: llmDecision.tool,
    arguments: llmDecision.arguments
  });

  let toolText = "";

  for (const block of toolResult.content ?? []) {
    if (block.type === "text") {
      toolText += block.text;
    }
  }

  console.log("\nMCP tool result:");
  console.log(toolText);

  // ------------------------------------------------
  // 6. Give MCP result back to the LLM
  // ------------------------------------------------

  const finalOllamaResponse = await fetch(OLLAMA_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: MODEL,
      stream: false,
      messages: [
        {
          role: "system",
          content: "Answer the user's question using the tool result."
        },
        {
          role: "user",
          content: userQuestion
        },
        {
          role: "assistant",
          content: `Tool result: ${toolText}`
        }
      ]
    })
  });

  if (!finalOllamaResponse.ok) {
    throw new Error(
      `Ollama final request failed: ${finalOllamaResponse.status}`
    );
  }

  const finalData = await finalOllamaResponse.json();

  finalAnswer = finalData.message.content;
} else {
  finalAnswer = llmDecision.answer;
}

// --------------------------------------------------
// 7. Final response
// --------------------------------------------------

console.log("\nFinal answer:");
console.log(finalAnswer);

// --------------------------------------------------
// 8. Close MCP connection
// --------------------------------------------------

await mcpClient.close();