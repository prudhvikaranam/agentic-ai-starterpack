import dotenv from "dotenv";

import {
    StateGraph,
    START,
    END,
    Annotation
} from "@langchain/langgraph";

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
    ChatOllama,
    OllamaEmbeddings
} from "@langchain/ollama";

import {
    QdrantVectorStore
} from "@langchain/qdrant";


dotenv.config();


// ==========================================================
// CONFIG
// ==========================================================

const COLLECTION_NAME =
    "knowledge_base_multiple_files";

const MAX_RETRIES =
    6;

const LLM_MODEL =
    "qwen2.5:7b";

const EMBEDDING_MODEL =
    "nomic-embed-text";


// ==========================================================
// 1. STATE
// ==========================================================

const State = Annotation.Root({

    // User's original question
    question: Annotation({

        reducer: (
            _existing,
            update
        ) => update,

        default: () => ""

    }),


    // Retrieved documents
    documents: Annotation({

        reducer: (
            _existing,
            update
        ) => update,

        default: () => []

    }),


    // Final RAG answer
    answer: Annotation({

        reducer: (
            _existing,
            update
        ) => update,

        default: () => ""

    }),


    // Current error
    error: Annotation({

        reducer: (
            _existing,
            update
        ) => update,

        default: () => null

    }),


    // Number of attempts
    retryCount: Annotation({

        reducer: (
            _existing,
            update
        ) => update,

        default: () => 0

    })

});


// ==========================================================
// 2. MODEL
// ==========================================================

const model =
    new ChatOllama({

        model:
            LLM_MODEL

    });


// ==========================================================
// 3. EMBEDDINGS
// ==========================================================

const embeddings =
    new OllamaEmbeddings({

        model:
            EMBEDDING_MODEL

    });


// ==========================================================
// 4. RAG PROMPT
// ==========================================================

const ragPrompt =
    ChatPromptTemplate.fromTemplate(`

Answer the question using ONLY the context below.

If the answer is not available in the context,
say that the information is not available.

Context:
{context}

Question:
{question}

`);


// ==========================================================
// 5. RAG NODE
// ==========================================================
//
// IMPORTANT:
//
// We are intentionally creating the Qdrant connection
// INSIDE the node.
//
// Why?
//
// Because if Qdrant is unavailable, the graph can catch
// the error and control what happens next.
//
// ==========================================================

const searchRAG = async (state) => {

    const attempt =
        state.retryCount + 1;


    console.log(
        `\n========== RAG ATTEMPT ${attempt} / ${MAX_RETRIES} ==========`
    );


    try {

        // --------------------------------------------------
        // Create vector store connection
        // --------------------------------------------------

        console.log(
            "Connecting to Qdrant..."
        );

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


        console.log(
            "Qdrant connection successful."
        );


        // --------------------------------------------------
        // Create retriever
        // --------------------------------------------------

        const retriever =
            vectorStore.asRetriever({

                k: 3

            });


        // --------------------------------------------------
        // RAG chain
        // --------------------------------------------------

        const ragChain =

            RunnableParallel.from({

                context:
                    retriever,

                question:
                    new RunnablePassthrough()

            })

                .pipe(
                    ragPrompt
                )

                .pipe(
                    model
                )

                .pipe(
                    new StringOutputParser()
                );


        // --------------------------------------------------
        // Execute RAG
        // --------------------------------------------------

        console.log(
            "Searching knowledge base..."
        );


        const answer =
            await ragChain.invoke(
                state.question
            );


        console.log(
            "RAG succeeded."
        );


        // --------------------------------------------------
        // SUCCESS
        // --------------------------------------------------

        return {

            answer,

            error:
                null,

            retryCount:
                attempt

        };


    } catch (error) {

        // --------------------------------------------------
        // FAILURE
        // --------------------------------------------------

        console.error(
            `RAG attempt ${attempt} failed:`,
            error.message
        );


        return {

            error:
                error.message,

            retryCount:
                attempt

        };

    }

};


// ==========================================================
// 6. ROUTER
// ==========================================================
//
// Decide:
//
// SUCCESS
//     → END
//
// ERROR + retries available
//     → retry
//
// ERROR + retries exhausted
//     → handleError
//
// ==========================================================

const routeAfterRAG = (state) => {


    // ------------------------------------------------------
    // SUCCESS
    // ------------------------------------------------------

    if (!state.error) {

        console.log(
            "\nRAG completed successfully."
        );

        return "success";

    }


    // ------------------------------------------------------
    // RETRY AVAILABLE
    // ------------------------------------------------------

    if (
        state.retryCount < MAX_RETRIES
    ) {

        console.log(
            `Retrying... (${state.retryCount} / ${MAX_RETRIES})`
        );

        return "retry";

    }


    // ------------------------------------------------------
    // RETRIES EXHAUSTED
    // ------------------------------------------------------

    console.log(
        "\nMaximum retry attempts reached."
    );

    return "failed";

};


// ==========================================================
// 7. ERROR HANDLER
// ==========================================================
//
// Final node when all retries fail.
//
// ==========================================================

const handleError = async (state) => {

    console.log(
        "\n========== ERROR HANDLER =========="
    );


    const finalErrorMessage =

        `I could not retrieve information from the knowledge base after ${MAX_RETRIES} attempts. Please try again later.`;



    return {

        answer:
            finalErrorMessage

    };

};


// ==========================================================
// 8. GRAPH
// ==========================================================

const graph =

    new StateGraph(State)

        // --------------------------------------------------
        // Nodes
        // --------------------------------------------------

        .addNode(
            "searchRAG",
            searchRAG
        )

        .addNode(
            "handleError",
            handleError
        )


        // --------------------------------------------------
        // START → RAG
        // --------------------------------------------------

        .addEdge(
            START,
            "searchRAG"
        )


        // --------------------------------------------------
        // RAG → Router
        // --------------------------------------------------

        .addConditionalEdges(

            "searchRAG",

            routeAfterRAG,

            {

                // Success
                success:
                    END,

                // Retry
                retry:
                    "searchRAG",

                // Failed permanently
                failed:
                    "handleError"

            }

        )


        // --------------------------------------------------
        // Error handler → END
        // --------------------------------------------------

        .addEdge(
            "handleError",
            END
        );


// ==========================================================
// 9. COMPILE
// ==========================================================

const app =
    graph.compile();


// ==========================================================
// 10. QUESTION
// ==========================================================

const question =
    "What is the baggage policy?";


// ==========================================================
// 11. RUN GRAPH
// ==========================================================

try {

    const result =
        await app.invoke({

            question,

            retryCount:
                0,

            error:
                null,

            answer:
                "",

            documents:
                []

        });


    // ------------------------------------------------------
    // FINAL RESULT
    // ------------------------------------------------------

    console.log(
        "\n=========================================="
    );

    console.log(
        "FINAL RESULT"
    );

    console.log(
        "=========================================="
    );

    console.log(
        "Question:",
        result.question
    );

    console.log(
        "Attempts:",
        result.retryCount
    );

    console.log(
        "Answer:",
        result.answer
    );

    console.log(
        "Error:",
        result.error
    );


} catch (error) {

    console.error(
        "\nUnexpected graph failure:",
        error
    );

}