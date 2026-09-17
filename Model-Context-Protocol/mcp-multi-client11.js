import { MultiServerMCPClient } from "@langchain/mcp-adapters";

const client = new MultiServerMCPClient({
    prefixToolNameWithServerName: true,
    onConnectionError: "ignore",
    mcpServers: {
        weather: {
            transport: "stdio",
            command: "node",
            args: ["mcp-server1.js"]
        },

        resources: {
            transport: "stdio",
            command: "node",
            args: ["mcp-resource-server3.js"]
        },

        prompts: {
            transport: "stdio",
            command: "node",
            args: ["mcp-prompt-server5.js"]
        }
    }
});

try {
    // -----------------------------------------------
    // 1. Discover tools from all MCP servers
    // -----------------------------------------------

    const tools = await client.getTools();

    console.log("\nTOOLS:");

    for (const tool of tools) {
        console.log(`- ${tool.name}`);
    }

    // -----------------------------------------------
    // 2. Discover resources
    // -----------------------------------------------

    const resources = await client.listResources();

    console.log("\nRESOURCES:");

    for (const [serverName, serverResources] of Object.entries(resources)) {
        console.log(`\nServer: ${serverName}`);

        for (const resource of serverResources) {
            console.log(`- ${resource.name}`);
            console.log(`  URI: ${resource.uri}`);
        }
    }

    // -----------------------------------------------
    // 3. Access prompt server directly
    // -----------------------------------------------

    const promptClient = await client.getClient("prompts");

    const prompts = await promptClient.listPrompts();

    console.log("\nPROMPTS:");

    for (const prompt of prompts.prompts) {
        console.log(`- ${prompt.name}`);
    }

} catch (error) {
    console.error("MCP error:", error);
} finally {
    await client.close();
}