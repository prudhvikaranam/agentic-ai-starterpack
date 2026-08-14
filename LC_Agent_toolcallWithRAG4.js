import dotenv from "dotenv";
import { createAgent, tool } from "langchain";
import { ChatOllama, OllamaEmbeddings } from "@langchain/ollama";
import { QdrantVectorStore } from "@langchain/qdrant";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import {
    RunnableParallel,
    RunnablePassthrough
} from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { z } from "zod";

dotenv.config();

// ============================================================
// CONFIGURATION
// ============================================================

const COLLECTION_NAME =
    "knowledge_base_multiple_files";

const OLLAMA_CHAT_MODEL =
    "qwen2.5:7b";

const OLLAMA_EMBEDDING_MODEL =
    "nomic-embed-text";


// ============================================================
// STEP 1
// OLLAMA EMBEDDINGS
// ============================================================

const embeddings =
    new OllamaEmbeddings({
        model: OLLAMA_EMBEDDING_MODEL
    });


// ============================================================
// STEP 2
// CONNECT TO EXISTING QDRANT COLLECTION
// ============================================================
//
// We are reusing the collection you already created
// with your manual ingestion code.
//
// Your existing payload:
//
// {
//     text: "...",
//     source: "..."
// }
//
// Therefore:
//
// contentPayloadKey: "text"
//

const vectorStore =
    await QdrantVectorStore.fromExistingCollection(
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


// ============================================================
// STEP 3
// RETRIEVER
// ============================================================

const retriever =
    vectorStore.asRetriever({
        k: 3
    });


// ============================================================
// STEP 4
// RAG MODEL
// ============================================================
//
// This model is used INSIDE the RAG chain.
//
// The Agent also uses the same model later.
// Keeping one model instance is fine for this
// learning example.
//

const model =
    new ChatOllama({
        model: OLLAMA_CHAT_MODEL
    });


// ============================================================
// STEP 5
// RAG PROMPT
// ============================================================

const ragPrompt =
    ChatPromptTemplate.fromTemplate(`
You are a helpful knowledge-base assistant.

Answer the question using the provided context.

If the answer cannot be found in the context,
say that you do not have enough information.

Context:
{context}

Question:
{question}

Answer:
`);


// ============================================================
// STEP 6
// RAG OUTPUT PARSER
// ============================================================

const ragParser =
    new StringOutputParser();


// ============================================================
// STEP 7
// BUILD RAG CHAIN
// ============================================================
//
// Input:
//     user question
//
// RunnableParallel produces:
//
// {
//     context: documents,
//     question: original question
// }
//
// Then:
//
//     Prompt
//       ↓
//     ChatOllama
//       ↓
//     StringOutputParser
//

const ragChain =
    RunnableParallel.from({

        context:
            retriever,

        question:
            new RunnablePassthrough()

    })
    .pipe(ragPrompt)
    .pipe(model)
    .pipe(ragParser);


// ============================================================
// STEP 8
// WEATHER TOOL
// ============================================================

const weatherTool =
    tool(
        async ({ city }) => {

            console.log(
                `\n[Weather Tool] Executing for: ${city}`
            );

            // Mock data for learning.
            // Later we can replace this with
            // a real weather API.

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
                "Get the current weather for a given city.",

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
// STEP 9
// TIME TOOL
// ============================================================

const timeTool =
    tool(
        async ({ city }) => {

            console.log(
                `\n[Time Tool] Executing for: ${city}`
            );

            // Mock/simple local time implementation
            // for learning.

            return {
                city,
                time:
                    new Date().toLocaleTimeString()
            };
        },
        {
            name:
                "get_time",

            description:
                "Get the current time for a given city.",

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
// STEP 10
// RAG TOOL
// ============================================================
//
// This is the important bridge.
//
// The Agent sees:
//
// search_knowledge_base(question)
//
// It does NOT need to know that internally we use:
//
// Retriever
// Qdrant
// Prompt
// ChatOllama
// Parser
//

const ragTool =
    tool(
        async ({ question }) => {

            console.log(
                `\n[RAG Tool] Searching knowledge base for: ${question}`
            );

            const answer =
                await ragChain.invoke(
                    question
                );

            return answer;
        },
        {
            name:
                "search_knowledge_base",

            description:
                "Search the stored knowledge base and answer questions using the available documents.",

            schema:
                z.object({
                    question:
                        z.string()
                            .describe(
                                "Question to answer using the knowledge base"
                            )
                })
        }
    );


// ============================================================
// STEP 11
// CREATE AGENT
// ============================================================
//
// The Agent now has three capabilities:
//
// 1. Weather
// 2. Time
// 3. Knowledge Base / RAG
//

const agent =
    createAgent({

        model,

        tools: [
            weatherTool,
            timeTool,
            ragTool
        ],

        systemPrompt: `
You are a helpful assistant.

Use the available tools when they are useful.

Rules:

1. Use get_weather for current weather questions.

2. Use get_time for current time questions.

3. Use search_knowledge_base when the user asks
   about information that may exist in the stored
   knowledge base.

4. You may use multiple tools when necessary.

5. If no tool is required, answer directly.

6. When multiple tool results are available,
   combine them into one clear answer.
`
    });


// ============================================================
// STEP 12
// AGENT EXECUTION HELPER
// ============================================================

async function askAgent(question) {

    console.log(
        "\n\n=================================================="
    );

    console.log(
        "USER QUESTION:"
    );

    console.log(
        question
    );

    console.log(
        "==================================================\n"
    );


    const result =
        await agent.invoke({

            messages: [
                {
                    role:
                        "user",

                    content:
                        question
                }
            ]

        });


    // ========================================================
    // SHOW AGENT MESSAGE HISTORY
    // ========================================================
    //
    // This is useful for learning/debugging.
    //
    // You will be able to see:
    //
    // HumanMessage
    // AIMessage (tool calls)
    // ToolMessage
    // AIMessage (final answer)
    //

    console.log(
        "\n========== AGENT MESSAGE HISTORY ==========\n"
    );

    console.log(
        JSON.stringify(
            result.messages,
            null,
            2
        )
    );


    // ========================================================
    // FINAL ANSWER
    // ========================================================

    const finalMessage =
        result.messages[
            result.messages.length - 1
        ];


    console.log(
        "\n========== FINAL ANSWER ==========\n"
    );

    console.log(
        finalMessage.content
    );

    console.log(
        "\n============================================\n"
    );
}


// ============================================================
// STEP 13
// TEST QUESTIONS
// ============================================================

// await askAgent(
//     "What is the weather in Hyderabad?"
// );


// Uncomment one at a time while learning.

// await askAgent(
//     "According to my knowledge base, what climate does India have?"
// );

// await askAgent(
//     "What is the current weather in Hyderabad and how does it compare with the climate of India described in my knowledge base?"
// );

await askAgent(
    "What is JavaScript?"
);