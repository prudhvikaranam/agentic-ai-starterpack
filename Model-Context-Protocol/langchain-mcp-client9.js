import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { ChatOllama } from "@langchain/ollama";
import { createAgent } from "langchain";

// --------------------------------------------------
// 1. Create MCP client
// --------------------------------------------------

const client = new MultiServerMCPClient({
  weather: {
    transport: "stdio",
    command: "node",
    args: ["mcp-server1.js"]
  }
});


// For multiple servers, you can add more entries to the MultiServerMCPClient configuration. For example:
// const client = new MultiServerMCPClient({
//   weather: {
//     transport: "stdio",
//     command: "node",
//     args: ["mcp-weather.js"],
    // url: "http://localhost:8000/mcp" we can have url here if the server is running on a different machine or port instead of args: ["mcp-weather.js"]
//   },

//   github: {
//     transport: "stdio",
//     command: "node",
//     args: ["mcp-github.js"]
//   },

//   jira: {
//     transport: "stdio",
//     command: "node",
//     args: ["mcp-jira.js"]
//   }
// });


// --------------------------------------------------
// 2. Discover MCP tools and convert them
//    into LangChain-compatible tools
// --------------------------------------------------

const tools = await client.getTools();

console.log("MCP tools loaded into LangChain:");

for (const tool of tools) {
  console.log(`- ${tool.name}`);
}

// --------------------------------------------------
// 3. Create Ollama model
// --------------------------------------------------

const model = new ChatOllama({
  model: "qwen2.5:7b"
});

// --------------------------------------------------
// 4. Create LangChain agent
// --------------------------------------------------

const agent = createAgent({
  model,
  tools
});

// --------------------------------------------------
// 5. Ask a question
// --------------------------------------------------

const result = await agent.invoke({
  messages: [
    {
      role: "user",
      content: "What is the weather in Hyderabad?"
    }
  ]
});

// --------------------------------------------------
// 6. Display final response
// --------------------------------------------------

const messages = result.messages;

const lastMessage = messages[messages.length - 1];

console.log("\nFinal answer:");
console.log(lastMessage.content);

// --------------------------------------------------
// 7. Close MCP connections
// --------------------------------------------------

await client.close();