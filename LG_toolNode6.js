// START
//   ↓
// ToolNode
//   ↓
// weatherTool executes
//   ↓
// ToolMessage
//   ↓
// END


// const toolNode =
//     new ToolNode([
//         weatherTool
//     ]);


// AIMessage
// {
//     tool_calls: [
//         {
//             name: "get_weather",
//             args: {
//                 city: "Hyderabad"
//             }
//         }
//     ]
// }
//         ↓
// ToolNode
//         ↓
// weatherTool
//         ↓
// ToolMessage


// ToolNode knows how to look at the graph state, find the requested tool call, execute the matching tool, and produce the corresponding ToolMessage.



// LangChain Tool Calling: The LLM decides which tool to call and produces a tool call request.
// LangGraph ToolNode: A graph node that executes that tool call inside the workflow and returns the tool result.

// Tool Calling = decide/request the tool.
// ToolNode = execute the requested tool within the graph.


import {
    StateGraph,
    START,
    END,
    Annotation
} from "@langchain/langgraph";

import {
    ToolNode
} from "@langchain/langgraph/prebuilt";

import {
    tool
} from "@langchain/core/tools";

import {
    HumanMessage,
    AIMessage
} from "@langchain/core/messages";

import {
    z
} from "zod";


// ============================================================
// 1. CREATE WEATHER TOOL
// ============================================================

const weatherTool =
    tool(

        async ({ city }) => {

            console.log(
                `\n[Weather Tool] Executing for ${city}`
            );

            return {

                city,

                temperature: "30°C",

                condition: "Sunny"

            };

        },

        {
            name:
                "get_weather",

            description:
                "Get the current weather for a city.",

            schema:
                z.object({

                    city:
                        z.string()
                            .describe(
                                "Name of the city"
                            )

                })
        }

    );


// ============================================================
// 2. STATE DEFINITION
// ============================================================
//
// The important field here is "messages".
//
// ToolNode looks at the tool call inside the
// latest AI message and executes the requested tool.
//
// ============================================================

const State =
    Annotation.Root({

        messages:
            Annotation({

                reducer:
                    (existing, update) => [
                        ...existing,
                        ...update
                    ],

                default:
                    () => []

            })

    });


// ============================================================
// 3. CREATE TOOL NODE
// ============================================================

const toolNode =
    new ToolNode([
        weatherTool
    ]);


// ============================================================
// 4. BUILD GRAPH
// ============================================================
//
// We're manually providing an AIMessage that contains
// a tool call.
//
// This is intentionally NOT using an LLM yet.
//
// ============================================================

const graph =

    new StateGraph(State)

        .addNode(
            "tools",
            toolNode
        )

        .addEdge(
            START,
            "tools"
        )

        .addEdge(
            "tools",
            END
        );


// ============================================================
// 5. COMPILE
// ============================================================

const app =
    graph.compile();


// ============================================================
// 6. CREATE A TOOL CALL MANUALLY
// ============================================================
//
// Normally an LLM would generate this AIMessage.
//
// We're creating it manually so we can isolate
// the ToolNode concept.
//
// ============================================================

const aiMessage =
    new AIMessage({

        content: "",

        tool_calls: [

            {

                name:
                    "get_weather",

                args: {
                    city: "Hyderabad"
                },

                id:
                    "weather-call-1",

                type:
                    "tool_call"

            }

        ]

    });


// ============================================================
// 7. INITIAL STATE
// ============================================================

const initialState = {

    messages: [
        aiMessage
    ]

};


// ============================================================
// 8. RUN GRAPH
// ============================================================

const result =
    await app.invoke(
        initialState
    );


// ============================================================
// 9. SHOW RESULT
// ============================================================

console.log(
    "\n=============================="
);

console.log(
    "FINAL MESSAGES"
);

console.log(
    "=============================="
);

console.log(
    result.messages
);


// ============================================================
// 10. INSPECT TOOL RESULT
// ============================================================

const lastMessage =
    result.messages[
        result.messages.length - 1
    ];

console.log(
    "\n=============================="
);

console.log(
    "LAST MESSAGE"
);

console.log(
    "=============================="
);

console.log(
    lastMessage
);