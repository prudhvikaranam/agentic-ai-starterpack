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
    ChatOllama
} from "@langchain/ollama";

import {
    tool
} from "@langchain/core/tools";

import {
    z
} from "zod";
import {
    HumanMessage
} from "@langchain/core/messages";



// ============================================================
// 1. STATE
// ============================================================

const State = Annotation.Root({

    messages: Annotation({

        reducer: (
            existing,
            update
        ) => [
            ...existing,
            ...update
        ],

        default: () => []

    })

});


// ============================================================
// 2. WEATHER TOOL
// ============================================================

const weatherTool =
    tool(

        async ({ city }) => {

            console.log(
                `\n[Weather Tool] Executing for ${city}`
            );

            return {

                city,

                temperature:
                    "30°C",

                condition:
                    "Sunny"

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

                })

        }

    );


// ============================================================
// 3. MODEL
// ============================================================

const model =
    new ChatOllama({

        model:
            "qwen2.5:7b"

    });


// ============================================================
// 4. BIND TOOL
// ============================================================

const modelWithTools =
    model.bindTools([
        weatherTool
    ]);


// ============================================================
// 5. TOOL NODE
// ============================================================

const toolNode =
    new ToolNode([
        weatherTool
    ]);


// ============================================================
// 6. LLM NODE
// ============================================================

const callModel =
    async (state) => {

        console.log(
            "\n[LLM Node] Running... and state in call model node", state
        );

        const response =
            await modelWithTools.invoke(
                state.messages
            );

            console.log(
                "call Model response: ",
                response
            );

        return {

            messages: [
                response
            ]

        };

    };


// ============================================================
// 7. ROUTER
// ============================================================
//
// Decide whether the graph should:
//   - execute tools
//   - finish
//

const shouldContinue =
    (state) => {

        console.log(
            "\n[Router] Running... and state in shouldContinue router node", state
        );

        const lastMessage =
            state.messages[
                state.messages.length - 1
            ];

        if (
            lastMessage.tool_calls &&
            lastMessage.tool_calls.length > 0
        ) {

            console.log(
                "[Router] Tool call detected"
            );

            return "tools";
        }

        console.log(
            "[Router] No tool call - finishing"
        );

        return "end";
    };


// ============================================================
// 8. BUILD GRAPH
// ============================================================

const graph =

    new StateGraph(State)

        .addNode(
            "callModel",
            callModel
        )

        .addNode(
            "tools",
            toolNode
        )

        // START → LLM
        .addEdge(
            START,
            "callModel"
        )

        // LLM → Tool OR END
        .addConditionalEdges(

            "callModel",

            shouldContinue,

            {

                tools:
                    "tools",

                end:
                    END

            }

        )

        // Tool → LLM
        .addEdge(
            "tools",
            "callModel"
        );


// ============================================================
// 9. COMPILE
// ============================================================

const app =
    graph.compile();


// ============================================================
// 10. INVOKE
// ============================================================
const result =
    await app.invoke({

        messages: [

            new HumanMessage(
                "What is the weather in Hyderabad?"
            )

        ]

    });



// ============================================================
// 11. MESSAGE HISTORY
// ============================================================

console.log(
    "\n================ MESSAGE HISTORY ================\n"
);

console.log(
    JSON.stringify(
        result.messages,
        null,
        2
    )
);


// ============================================================
// 12. FINAL ANSWER
// ============================================================

const finalMessage =
    result.messages[
        result.messages.length - 1
    ];

console.log(
    "\n================ FINAL ANSWER ================\n"
);

console.log(
    finalMessage.content
);