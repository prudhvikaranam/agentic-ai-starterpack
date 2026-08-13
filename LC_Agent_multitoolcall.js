import { createAgent, tool } from "langchain";
import { ChatOllama } from "@langchain/ollama";
import { z } from "zod";


// ==========================================
// WEATHER TOOL
// ==========================================

const weatherTool = tool(
    async ({ city }) => {

        console.log(
            `Executing weather tool for ${city}`
        );

        return {
            temperature: "30°C",
            condition: "Sunny",
            city
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


// ==========================================
// TIME TOOL
// ==========================================

const timeTool = tool(
    async ({ city }) => {

        console.log(
            `Executing time tool for ${city}`
        );

        return {
            time:
                new Date().toLocaleTimeString(),
            city
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


// ==========================================
// OLLAMA MODEL
// ==========================================

const model =
    new ChatOllama({
        model: "qwen2.5:7b"
    });


// ==========================================
// AGENT
// ==========================================

const agent =
    createAgent({
        model,

        tools: [
            weatherTool,
            timeTool
        ],

        systemPrompt:
            "You are a helpful assistant. Use tools when they are useful."
    });


// ==========================================
// USER QUESTION
// ==========================================

const question =
    "What is the weather in Hyderabad and what time is it there?";


// ==========================================
// RUN AGENT
// ==========================================

const result =
    await agent.invoke({

        messages: [
            {
                role: "user",
                content: question
            }
        ]

    });


// ==========================================
// DEBUG: SHOW COMPLETE LOOP
// ==========================================

console.log(
    "\n========= MESSAGE HISTORY =========\n"
);

console.log(
    JSON.stringify(
        result.messages,
        null,
        2
    )
);


// ==========================================
// FINAL ANSWER
// ==========================================

const finalMessage =
    result.messages[
        result.messages.length - 1
    ];

console.log(
    "\n========= FINAL ANSWER =========\n"
);

console.log(
    finalMessage.content
);