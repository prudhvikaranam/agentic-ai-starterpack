import {
    Client
} from "@modelcontextprotocol/client";

import {
    StdioClientTransport
} from "@modelcontextprotocol/client/stdio";


// ==========================================================
// 1. CREATE MCP CLIENT
// ==========================================================

const client =
    new Client({

        name:
            "weather-client",

        version:
            "1.0.0"

    });


// ==========================================================
// 2. CREATE TRANSPORT
// ==========================================================
//
// This tells the client how to communicate
// with the MCP server.
//
// stdio transport will start mcp-server.js
// as a child process.
//
// ==========================================================

const transport =
    new StdioClientTransport({

        command:
            "node",

        args: [
            "Model-Context-Protocol/mcp-server1.js"
        ]

    });


// ==========================================================
// 3. CONNECT TO MCP SERVER
// ==========================================================

await client.connect(
    transport
);


console.log(
    "\nConnected to MCP server."
);


// ==========================================================
// 4. DISCOVER TOOLS
// ==========================================================

const { tools } =
    await client.listTools();


console.log(
    "\nAvailable tools:"
);


for (const currentTool of tools) {

    console.log(
        `Tool name in client JS - ${currentTool.name}`
    );

    console.log(
        `Tool description in client JS   ${currentTool.description}`
    );

}


// ==========================================================
// 5. CALL WEATHER TOOL
// ==========================================================

const result =
    await client.callTool({

        name:
            "get_weather",

        arguments: {

            city:
                "Hyderabad"

        }

    });


// ==========================================================
// 6. DISPLAY RESULT
// ==========================================================

console.log(
    "\nTool result:"
);


for (const block of result.content) {

    if (
        block.type === "text"
    ) {

        console.log(
            block.text
        );

    }

}


// ==========================================================
// 7. CLOSE CONNECTION
// ==========================================================

await client.close();


console.log(
    "\nClient closed."
);