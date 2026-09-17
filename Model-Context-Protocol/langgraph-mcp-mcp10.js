import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { ChatOllama } from "@langchain/ollama";
import {
  StateGraph,
  MessagesAnnotation,
  START,
  END
} from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";

// --------------------------------------------------
// 1. Connect to MCP server
// --------------------------------------------------

const mcpClient = new MultiServerMCPClient({
  weather: {
    transport: "stdio",
    command: "node",
    args: ["mcp-server1.js"]
  }
});

// --------------------------------------------------
// 2. Get MCP tools as LangChain tools
// --------------------------------------------------

const tools = await mcpClient.getTools();

console.log("MCP tools:");

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
// 4. Bind MCP-backed tools to the model
// --------------------------------------------------

const modelWithTools = model.bindTools(tools);

// --------------------------------------------------
// 5. Model node
// --------------------------------------------------

const callModel = async (state) => {
  const response = await modelWithTools.invoke(state.messages);

  return {
    messages: [response]
  };
};

// --------------------------------------------------
// 6. ToolNode
// --------------------------------------------------

const toolNode = new ToolNode(tools);

// --------------------------------------------------
// 7. Decide whether to continue
// --------------------------------------------------

const shouldContinue = (state) => {
  const lastMessage = state.messages[state.messages.length - 1];

  if (lastMessage.tool_calls?.length) {
    return "tools";
  }

  return END;
};

// --------------------------------------------------
// 8. Build graph
// --------------------------------------------------

const graph = new StateGraph(MessagesAnnotation)
  .addNode("callModel", callModel)
  .addNode("tools", toolNode)
  .addEdge(START, "callModel")
  .addConditionalEdges("callModel", shouldContinue)
  .addEdge("tools", "callModel");

// --------------------------------------------------
// 9. Compile
// --------------------------------------------------

const app = graph.compile();

// --------------------------------------------------
// 10. Run
// --------------------------------------------------

const result = await app.invoke({
  messages: [
    {
      role: "user",
      content: "What is the weather in Hyderabad?"
    }
  ]
});

// --------------------------------------------------
// 11. Display final response
// --------------------------------------------------

const finalMessage =
  result.messages[result.messages.length - 1];

console.log("\nFinal answer:");
console.log(finalMessage.content);

// --------------------------------------------------
// 12. Close MCP connections
// --------------------------------------------------

await mcpClient.close();