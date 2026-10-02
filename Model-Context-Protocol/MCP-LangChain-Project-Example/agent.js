// No separate MCP client file is required here.
// Why?
// Because we're now using:
// MultiServerMCPClient
// from:
// @langchain/mcp-adapters
// instead of manually creating:
// Client
// StdioClientTransport
// The adapter handles the MCP client integration for us.








import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { ChatOllama } from "@langchain/ollama";
import { createAgent } from "langchain";


// --------------------------------------------------
// 1. Create MCP Client
// --------------------------------------------------

const mcpClient = new MultiServerMCPClient({
  mcpServers: {
    weather: {
      transport: "stdio",
      command: "node",
      args: ["Model-Context-Protocol/MCP-LangChain-Project-Example/mcp-weather-server.js"],
    },
    knowledge: {
      transport: "stdio",
      command: "node",
      args: ["Model-Context-Protocol/MCP-LangChain-Project-Example/mcp-knowledge-server.js"],
    },
  },
});


// --------------------------------------------------
// 2. Discover MCP tools
// --------------------------------------------------

const tools = await mcpClient.getTools();

console.log("\nAvailable MCP tools:");

for (const tool of tools) {
  console.log(`- ${tool.name}`);
}


// --------------------------------------------------
// 3. Create Ollama model
// --------------------------------------------------

const model = new ChatOllama({
  model: "qwen2.5:7b",
  temperature: 0,
});


// --------------------------------------------------
// 4. Create LangChain Agent
// --------------------------------------------------

const agent = createAgent({
  model,
  tools,
});


// --------------------------------------------------
// 5. Send user question
// --------------------------------------------------

const result = await agent.invoke({
  messages: [
    {
      role: "user",
      content: "tell me about block chain?",
    },
  ],

});


console.log('Prudhvi Karanam', result);

// --------------------------------------------------
// 6. Get final response
// --------------------------------------------------

const lastMessage =
  result.messages[result.messages.length - 1];

console.log("\nFinal answer:");
console.log(lastMessage.content);


// --------------------------------------------------
// 7. Close MCP connections
// --------------------------------------------------

await mcpClient.close();