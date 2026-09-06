import { ChatOllama } from "@langchain/ollama";
import { tool } from "@langchain/core/tools";
import {
    HumanMessage,
    ToolMessage
} from "@langchain/core/messages";
import { z } from "zod";

// ======================================================
// 1. WEATHER TOOL
// ======================================================

const weatherTool = tool(
    async ({ city }) => {

        console.log(
            `Executing weather tool for ${city}`
        );

        return {
            city,
            temperature: "30°C",
            condition: "Sunny"
        };
    },
    {
        name: "get_weather",

        description:
            "Get the current weather in a given city",

        schema: z.object({
            city: z
                .string()
                .describe("Name of the city")
        })
    }
);


// ======================================================
// 2. TIME TOOL
// ======================================================

const timeTool = tool(
    async ({ city }) => {

        console.log(
            `Executing time tool for ${city}`
        );

        return {
            city,
            time: new Date().toLocaleTimeString()
        };
    },
    {
        name: "get_time",

        description:
            "Get the current time in a given city",

        schema: z.object({
            city: z
                .string()
                .describe("Name of the city")
        })
    }
);


// ======================================================
// 3. CALCULATOR TOOL
// ======================================================

const calculatorTool = tool(
    async ({ a, b }) => {

        console.log(
            `Executing calculator: ${a} + ${b}`
        );

        return {
            result: a + b
        };
    },
    {
        name: "add_numbers",

        description:
            "Add two numbers together",

        schema: z.object({
            a: z.number(),
            b: z.number()
        })
    }
);


// ======================================================
// 4. ALL AVAILABLE TOOLS
// ======================================================

const tools = [
    weatherTool,
    timeTool,
    calculatorTool
];


// ======================================================
// 5. TOOL REGISTRY
// ======================================================
//
// Instead of:
//
// if (toolName === "get_weather")
// else if (toolName === "get_time")
// ...
//
// we create a registry.
//

const toolMap = {

    get_weather:
        weatherTool,

    get_time:
        timeTool,

    add_numbers:
        calculatorTool

};


// ======================================================
// 6. OLLAMA MODEL
// ======================================================

const model =
    new ChatOllama({
        model: "qwen2.5:7b"
    });


// ======================================================
// 7. BIND TOOLS TO MODEL
// ======================================================

const modelWithTools =
    model.bindTools(tools);


// ======================================================
// 8. USER QUESTION
// ======================================================

const question =
    "What is the weather in Hyderabad, what time is it there, and what is 25 + 30?";


// ======================================================
// 9. FIRST MODEL CALL
// ======================================================

const response =
    await modelWithTools.invoke(
        [
            new HumanMessage(question)
        ]
    );


// ======================================================
// 10. INSPECT MODEL DECISION
// ======================================================

console.log(
    "\n================ TOOL CALLS ================\n"
);

console.log(
    JSON.stringify(
        response.tool_calls,
        null,
        2
    )
);


// ======================================================
// 11. CHECK WHETHER TOOLS WERE REQUESTED
// ======================================================

if (
    !response.tool_calls ||
    response.tool_calls.length === 0
) {

    console.log(
        "\nNo tools requested."
    );

    console.log(
        response.content
    );

    process.exit(0);
}


// ======================================================
// 12. EXECUTE ALL REQUESTED TOOLS
// ======================================================
//
// IMPORTANT:
//
// We use Promise.all() here because these three
// tools are independent.
//
// weather does not depend on time
// time does not depend on calculator
// calculator does not depend on weather
//
// Therefore they can execute concurrently.
//

const toolResults =
    await Promise.all(

        response.tool_calls.map(
            async (toolCall) => {

                console.log(
                    `\nExecuting tool: ${toolCall.name}`
                );

                // Find requested tool
                const selectedTool =
                    toolMap[toolCall.name];

                // Safety check
                if (!selectedTool) {

                    throw new Error(
                        `Unknown tool: ${toolCall.name}`
                    );
                }

                // Execute tool
                const result =
                    await selectedTool.invoke(
                        toolCall.args
                    );

                return {
                    toolCall,
                    result
                };
            }
        )
    );


// ======================================================
// 13. CONVERT RESULTS TO TOOL MESSAGES
// ======================================================
//
// The LLM originally produced:
//
// AIMessage
//      ↓
// Tool Calls
//
// Now we provide:
//
// ToolMessage
//      ↓
// Tool Results
//

const toolMessages =
    toolResults.map(
        ({ toolCall, result }) => {

            return new ToolMessage({
                content:
                    JSON.stringify(result),

                tool_call_id:
                    toolCall.id
            });

        }
    );


// ======================================================
// 14. SHOW TOOL RESULTS
// ======================================================

console.log(
    "\n================ TOOL RESULTS ================\n"
);

for (
    const { toolCall, result }
    of toolResults
) {

    console.log(
        `Tool: ${toolCall.name}`
    );

    console.log(
        result
    );

    console.log(
        "--------------------------------"
    );
}


// ======================================================
// 15. SECOND MODEL CALL
// ======================================================
//
// The model now receives:
//
// HumanMessage
//       ↓
// AIMessage (tool calls)
//       ↓
// ToolMessage
//       ↓
// ToolMessage
//       ↓
// ToolMessage
//
// Then it generates the final answer.
//

const finalResponse =
    await modelWithTools.invoke([

        new HumanMessage(
            question
        ),

        response,

        ...toolMessages

    ]);


// ======================================================
// 16. FINAL ANSWER
// ======================================================

console.log(
    "\n================ FINAL ANSWER ================\n"
);

console.log(
    finalResponse.content
);


// import { ChatOllama } from "@langchain/ollama";
// import { tool } from "@langchain/core/tools";
// import { z } from "zod";
// import {
//     HumanMessage,
//     ToolMessage
// }
//     from "@langchain/core/messages";
// // ==========================================
// // 1. Create Tool
// // ==========================================

// const weatherTool = tool(
//     async ({ city }) => {
//         console.log(
//             `Executing weather tool for ${city}`
//         );

//         return {
//             temperature: "30°C",
//             condition: "Sunny",
//             city
//         };
//     },
//     {
//         name: "get_weather",

//         description:
//             "Get the current weather in a given city",

//         schema: z.object({
//             city: z.string().describe("Name of the city")
//         })
//     }
// );

// // ==========================================
// // 2. Create Model
// // ==========================================

// const model = new ChatOllama({
//     model: "qwen2.5:7b"
// });

// // ==========================================
// // 3. Bind Tool
// // ==========================================

// const modelWithTools = model.bindTools([
//     weatherTool
// ]);

// // ==========================================
// // 4. Ask Question
// // ==========================================

// const question =
//     "What is the weather in Hyderabad?";

// const response =
//     await modelWithTools.invoke(question);

// // ==========================================
// // 5. Inspect Model Decision
// // ==========================================

// console.log("\nTool Calls:");

// console.log(response.tool_calls);

// // ==========================================
// // 6. Execute Tool
// // ==========================================

// const toolCall =
//     response.tool_calls[0];

// const toolResult =
//     await weatherTool.invoke(
//         toolCall.args
//     );


// const toolMessage =
//     new ToolMessage({
//         content:
//             JSON.stringify(toolResult),

//         tool_call_id:
//             toolCall.id
//     });


// const messages = [

//     new HumanMessage(
//         question
//     ),

//     response,

//     toolMessage
// ];

// const finalResponse =
//     await modelWithTools.invoke(
//         messages
//     );

// console.log("\nTool Result:");

// console.log(toolResult);

// console.log("*************");


// console.log(
//     finalResponse.content
// );