import {
    StateGraph,
    START,
    END,
    Annotation
} from "@langchain/langgraph";

import dotenv from "dotenv";

import {
    ToolNode
} from "@langchain/langgraph/prebuilt";

import {
    tool
} from "@langchain/core/tools";

import {
    RunnableParallel,
    RunnablePassthrough
} from "@langchain/core/runnables";

import {
    ChatPromptTemplate
} from "@langchain/core/prompts";

import {
    StringOutputParser
} from "@langchain/core/output_parsers";

import {
    z
} from "zod";

import {
    QdrantVectorStore
} from "@langchain/qdrant";

import {
    HumanMessage
} from "@langchain/core/messages";

import {
    ChatOllama,
    OllamaEmbeddings
} from "@langchain/ollama";


dotenv.config();


// ==========================================================
// CONFIG
// ==========================================================

const COLLECTION_NAME =
    "knowledge_base_multiple_files";


// ==========================================================
// 1. STATE
// ==========================================================

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


// ==========================================================
// 2. MODEL
// ==========================================================

const model =
    new ChatOllama({

        model:
            "qwen2.5:7b"

    });


// ==========================================================
// 3. QDRANT + RETRIEVER
// ==========================================================

const embeddings =
    new OllamaEmbeddings({

        model:
            "nomic-embed-text"

    });


const vectorStore =
    await QdrantVectorStore
        .fromExistingCollection(

            embeddings,

            {

                url:
                    process.env.QDRANT_URL,

                apiKey:
                    process.env.QDRANT_API_KEY,

                collectionName:
                    COLLECTION_NAME,

                contentPayloadKey:
                    "text"

            }

        );


const retriever =
    vectorStore.asRetriever({

        k: 3

    });


// ==========================================================
// 4. RAG PROMPT
// ==========================================================

const ragPrompt =
    ChatPromptTemplate.fromTemplate(`

Answer using the context below.

Context:
{context}

Question:
{question}

`);


// ==========================================================
// 5. RAG CHAIN
// ==========================================================

const ragChain =

    RunnableParallel.from({

        context:
            retriever,

        question:
            new RunnablePassthrough()

    })

        .pipe(ragPrompt)

        .pipe(model)

        .pipe(
            new StringOutputParser()
        );


// ==========================================================
// 6. WEATHER TOOL
// ==========================================================

const weatherTool =

    tool(

        async ({ city }) => {

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
                "Get current weather for a city.",

            schema:
                z.object({

                    city:
                        z.string()

                })

        }

    );


// ==========================================================
// 7. TIME TOOL
// ==========================================================

const timeTool =

    tool(

        async ({ city }) => {

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
                "Get the current time for a city.",

            schema:
                z.object({

                    city:
                        z.string()

                })

        }

    );


// ==========================================================
// 8. RAG TOOL
// ==========================================================

const ragTool =

    tool(

        async ({ question }) => {

            return await ragChain.invoke(
                question
            );

        },

        {

            name:
                "search_knowledge_base",

            description:
                "Use this tool when the answer requires information from the stored knowledge base. It retrieves relevant documents and generates an answer from them.",

            schema:
                z.object({

                    question:
                        z.string()

                })

        }

    );


// ==========================================================
// 9. BIND TOOLS TO MODEL
// ==========================================================

const modelWithTools =
    model.bindTools([

        weatherTool,

        timeTool,

        ragTool

    ]);


// ==========================================================
// 10. TOOL NODE
// ==========================================================

const toolNode =
    new ToolNode([

        weatherTool,

        timeTool,

        ragTool

    ]);


// ==========================================================
// 11. MODEL NODE
// ==========================================================

const callModel =

    async (state) => {

        const response =
            await modelWithTools.invoke(
                state.messages
            );

        return {

            messages: [
                response
            ]

        };

    };


// ==========================================================
// 12. ROUTER
// ==========================================================

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

            return "tools";

        }

        return "end";

    };


// ==========================================================
// 13. GRAPH
// ==========================================================

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

        .addEdge(
            START,
            "callModel"
        )

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

        .addEdge(
            "tools",
            "callModel"
        );


// ==========================================================
// 14. COMPILE
// ==========================================================

const app =
    graph.compile();


// ==========================================================
// 15. USER QUESTION
// ==========================================================

const question =
    "What is the baggage policy?";


// ==========================================================
// 16. RUN GRAPH
// ==========================================================

const result =
    await app.invoke({

        messages: [

            new HumanMessage(
                question
            )

        ]

    });


// ==========================================================
// 17. FINAL ANSWER
// ==========================================================

const finalMessage =
    result.messages[
        result.messages.length - 1
    ];

console.log(
    finalMessage.content
);