import {
    McpServer
} from "@modelcontextprotocol/server";

import {
    serveStdio
} from "@modelcontextprotocol/server/stdio";

import * as z from "zod/v4";





// ==========================================================
// 1. CREATE MCP SERVER
// ==========================================================

const server =
    new McpServer({

        name:
            "weather-server",

        version:
            "1.0.0"

    });


// ==========================================================
// 2. REGISTER TOOL
// ==========================================================
//
// Tool name:
//     get_weather
//
// Input:
//     city
//
// ==========================================================

server.registerTool(

    "get_weather",

    {

        description:
            "Get the current weather for a city.",

        inputSchema:
            z.object({

                city:
                    z.string()

            })

    },

    async ({ city }) => {


        // Why we error instead of log: writing arbitrary logs to stdout, we can corrupt the protocol stream.
        console.error(
            `Weather tool called for: ${city}`
        );


        // --------------------------------------------------
        // Fake weather implementation
        // --------------------------------------------------

        const result = {

            city,

            temperature:
                "40°C",

            condition:
                "Sunny"

        };


        // --------------------------------------------------
        // Return MCP tool result
        // --------------------------------------------------

        return {

            content: [

                {

                    type:
                        "text",

                    text:
                        JSON.stringify(result)

                }

            ]

        };

    }

);


// ==========================================================
// 3. START MCP SERVER
// ==========================================================
// Below are the MCP transport layers
// stdio:
// stdin  = requests coming into server
// stdout = MCP protocol responses

// serveStdio() for local MCP servers.

// void serveStdio(
//     () => server
// );


// This starts the MCP server using stdio transport.


//
// IMPORTANT:
// Never use console.log() here.
// stdout belongs to MCP protocol communication.
//
// ==========================================================

void serveStdio(
    () => server
);


console.error(
    "Weather MCP server started."
);