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
//
// The messages array contains:
//
// HumanMessage
// AIMessage
// ToolMessage
// AIMessage
//
// A reducer appends new messages to the existing history.
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
                            .describe(
                                "Name of the city"
                            )

                })

        }

    );


// ============================================================
// 3. TIME TOOL
// ============================================================

const timeTool =
    tool(

        async ({ city }) => {

            console.log(
                `\n[Time Tool] Executing for ${city}`
            );

            return {

                city,

                time:
                    new Date()
                        .toLocaleTimeString()

            };
        },

        {

            name:
                "get_time",

            description:
                "Get the current local time for a city.",

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
// 4. CALCULATOR TOOL
// ============================================================

const calculatorTool =
    tool(

        async ({ a, b }) => {

            console.log(
                `\n[Calculator Tool] Executing: ${a} + ${b}`
            );

            return {

                a,

                b,

                result:
                    a + b

            };
        },

        {

            name:
                "add_numbers",

            description:
                "Add two numbers.",

            schema:
                z.object({

                    a:
                        z.number(),

                    b:
                        z.number()

                })

        }

    );


// ============================================================
// 5. ALL AVAILABLE TOOLS
// ============================================================

const tools = [

    weatherTool,

    timeTool,

    calculatorTool

];


// ============================================================
// 6. OLLAMA MODEL
// ============================================================

const model =
    new ChatOllama({

        model:
            "qwen2.5:7b"

    });


// ============================================================
// 7. BIND TOOLS TO MODEL
// ============================================================
//
// This gives the model knowledge of the available tools.
//
// IMPORTANT:
// This does NOT execute the tools.
//

const modelWithTools =
    model.bindTools(
        tools
    );


// ============================================================
// 8. TOOL NODE
// ============================================================
//
// ToolNode is responsible for executing tool calls
// present in the latest AIMessage.
//
// It knows about all three tools.
//

const toolNode =
    new ToolNode(
        tools
    );


// ============================================================
// 9. MODEL NODE
// ============================================================
//
// Reads current message history,
// sends it to ChatOllama,
// returns the AIMessage as a state update.
//

const callModel =
    async (state) => {

        console.log(
            "\n[LLM Node] Executing..."
        );

        const response =
            await modelWithTools.invoke(
                state.messages
            );


                    console.log(
            "\n Prudhvi [LLM Node] Executing... call model response", response, 'state' ,state
        );

        return {

            messages: [
                response
            ]

        };

    };


// ============================================================
// 10. ROUTER
// ============================================================
//
// Decide:
//
// Tool calls exist?
//      YES -> ToolNode
//      NO  -> END
//
// ============================================================

const shouldContinue =
    (state) => {

        const lastMessage =
            state.messages[
            state.messages.length - 1
            ];

        if (
            lastMessage.tool_calls &&
            lastMessage.tool_calls.length > 0
        ) {

            console.log(
                "Prudhvi [Router] Tool calls detected shouldcontinue", state
            );

            return "tools";
        }

        console.log(
            "[Router] No tool calls. Ending."
        );

        return "end";

    };


// ============================================================
// 11. BUILD GRAPH
// ============================================================

const graph =

    new StateGraph(State)

        // ----------------------------------------
        // Nodes
        // ----------------------------------------

        .addNode(
            "callModel",
            callModel
        )

        .addNode(
            "tools",
            toolNode
        )


        // ----------------------------------------
        // START → MODEL
        // ----------------------------------------

        .addEdge(
            START,
            "callModel"
        )


        // ----------------------------------------
        // MODEL → TOOL or END
        // ----------------------------------------

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


        // ----------------------------------------
        // TOOL → MODEL
        // ----------------------------------------

        .addEdge(
            "tools",
            "callModel"
        );


// ============================================================
// 12. COMPILE
// ============================================================

const app =
    graph.compile();


// ============================================================
// 13. QUESTION
// ============================================================

const question =
    "What is the weather in Hyderabad, what time is it there, and what is 25 + 30?";


// ============================================================
// 14. INITIAL STATE
// ============================================================

const initialState = {

    messages: [

        new HumanMessage(
            question
        )



    ]

};


// ============================================================
// 15. RUN GRAPH
// ============================================================

const result =
    await app.invoke(
        initialState
    );


// ============================================================
// 16. SHOW MESSAGE HISTORY
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
// 17. FINAL ANSWER
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