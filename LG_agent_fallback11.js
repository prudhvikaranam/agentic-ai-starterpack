import dotenv from "dotenv";

import {
    StateGraph,
    START,
    END,
    Annotation
} from "@langchain/langgraph";

import {
    ChatOllama,
    OllamaEmbeddings
} from "@langchain/ollama";

import {
    QdrantVectorStore
} from "@langchain/qdrant";

import {
    ChatPromptTemplate
} from "@langchain/core/prompts";

import {
    RunnableParallel,
    RunnablePassthrough
} from "@langchain/core/runnables";

import {
    StringOutputParser
} from "@langchain/core/output_parsers";


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
// STATE
// ==========================================================

const State = Annotation.Root({

    question: Annotation({

        reducer:
            (_existing, update) => update,

        default:
            () => ""

    }),


    answer: Annotation({

        reducer:
            (_existing, update) => update,

        default:
            () => ""

    }),


    error: Annotation({

        reducer:
            (_existing, update) => update,

        default:
            () => null

    }),


    retryCount: Annotation({

        reducer:
            (_existing, update) => update,

        default:
            () => 0

    }),


    source: Annotation({

        reducer:
            (_existing, update) => update,

        default:
            () => ""

    })

});


// ==========================================================
// MODEL
// ==========================================================

const model =
    new ChatOllama({

        model:
            LLM_MODEL

    });


// ==========================================================
// EMBEDDINGS
// ==========================================================

const embeddings =
    new OllamaEmbeddings({

        model:
            EMBEDDING_MODEL

    });


// ==========================================================
// RAG PROMPT
// ==========================================================

const ragPrompt =
    ChatPromptTemplate.fromTemplate(`

Answer the question using ONLY the provided context.

Context:
{context}

Question:
{question}

If the answer is not present in the context,
say that it is not available.

`);


// ==========================================================
// PRIMARY RAG NODE
// ==========================================================

const searchRAG = async (state) => {

    const attempt =
        state.retryCount + 1;


    console.log(
        `\nRAG attempt ${attempt}/${MAX_RETRIES}`
    );


    try {

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


        const retriever =
            vectorStore.asRetriever({

                k: 3

            });


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


        const answer =
            await ragChain.invoke(
                state.question
            );


        console.log(
            "RAG succeeded."
        );


        return {

            answer,

            error:
                null,

            retryCount:
                attempt,

            source:
                "qdrant"

        };

    } catch (error) {

        console.error(
            `RAG failed: ${error.message}`
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
// ROUTER AFTER RAG
// ==========================================================

const routeAfterRAG = (state) => {


    // -----------------------------------------------
    // SUCCESS
    // -----------------------------------------------

    if (!state.error) {

        return "success";

    }


    // -----------------------------------------------
    // RETRY AVAILABLE
    // -----------------------------------------------

    if (
        state.retryCount < MAX_RETRIES
    ) {

        return "retry";

    }


    // -----------------------------------------------
    // RETRIES EXHAUSTED
    // -----------------------------------------------

    return "fallback";

};


// ==========================================================
// FALLBACK NODE
// ==========================================================
//
// This represents our alternative strategy.
//
// In a real application this could be:
//
// - another database
// - another API
// - cached data
// - another search provider
// - normal LLM
// - human escalation
//
// ==========================================================

const fallback = async (state) => {

    console.log(
        "\n========== FALLBACK =========="
    );


    console.log(
        "Qdrant unavailable."
    );


    // ------------------------------------------------------
    // OPTION 1:
    // Simple fallback response
    // ------------------------------------------------------

    const fallbackAnswer =

        `The knowledge base is currently unavailable. I could not verify "${state.question}" against the stored documents. Please try again later.`;


    return {

        answer:
            fallbackAnswer,

        source:
            "fallback",

        error:
            null

    };

};

// As below we can use alternate strategies for the fallback node, such as using a normal LLM to answer the question without context. This is commented out for now, but can be used if needed.

const question =
    "Tell me about Javascript";




// Rememeber this should be asynchronous, if synchronous it will not work with the graph. The graph expects a promise to be returned from the node function.
const fallbackResponse = async (state) => {

    console.log(
        "\n========== FALLBACK =========="
    );

    console.log(
        "Qdrant unavailable."
    );

    const response =
        await model.invoke([
            {
                role: "system",
                content:
                    "Answer using your general knowledge. Clearly state that the answer could not be verified from the knowledge base."
            },
            {
                role: "user",
                content:
                    state.question
            }
        ]);

    return {

        answer:
            response.content,

        source:
            "fallback",

        error:
            null

    };

};








// ==========================================================
// GRAPH
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
            "fallback",
            fallbackResponse
        )


        // --------------------------------------------------
        // START
        // --------------------------------------------------

        .addEdge(
            START,
            "searchRAG"
        )


        // --------------------------------------------------
        // RAG → ROUTER
        // --------------------------------------------------

        .addConditionalEdges(

            "searchRAG",

            routeAfterRAG,

            {

                success:
                    END,

                retry:
                    "searchRAG",

                fallback:
                    "fallback"

            }

        )


        // --------------------------------------------------
        // FALLBACK → END
        // --------------------------------------------------

        .addEdge(
            "fallback",
            END
        );


// ==========================================================
// COMPILE
// ==========================================================

const app =
    graph.compile();


// ==========================================================
// RUN
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

            source:
                ""

        });


    console.log(
        "\n===================================="
    );

    console.log(
        "FINAL ANSWER"
    );

    console.log(
        "===================================="
    );

    console.log(
        result.answer
    );


    console.log(
        "\nSource:",
        result.source
    );


    console.log(
        "Attempts:",
        result.retryCount
    );


} catch (error) {

    console.error(
        "Unexpected graph error:",
        error
    );

}





