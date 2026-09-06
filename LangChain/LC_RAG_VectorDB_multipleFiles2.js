import dotenv from "dotenv";

import {
    ChatPromptTemplate,
} from "@langchain/core/prompts";


import {
    RunnableParallel,
    RunnablePassthrough
} from "@langchain/core/runnables";

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

const COLLECTION_NAME =
    "knowledge_base_multiple_files";


async function run() {

    // console.log(
    //     "Creating embeddings..."
    // );

    const embeddings =
        new OllamaEmbeddings({
            model: "nomic-embed-text"
        });


    // console.log(
    //     "Connecting to Qdrant..."
    // );

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


    // console.log(
    //     "Creating retriever..."
    // );

    const retriever =
        vectorStore.asRetriever({
            k: 3
        });


    // console.log(
    //     "Creating prompt..."
    // );

    const prompt =
        ChatPromptTemplate.fromTemplate(`
You are a helpful assistant.

Answer the user's question using the provided context.

If the answer cannot be found in the context,
say that you do not have enough information.

Context:
{context}

Question:
{question}

Answer:
`);


    // console.log(
    //     "Creating ChatOllama..."
    //  );

    const model =
        new ChatOllama({
            model: "qwen2.5:7b"
        });


    // console.log(
    //     "Creating output parser..."
    // );

    const parser =
        new StringOutputParser();


    // console.log(
    //     "Creating RAG chain..."
    // );

    const ragChain =
        RunnableParallel.from({

            context:
                retriever,

            question:
                new RunnablePassthrough()

        })
            .pipe(prompt)
            .pipe(model)
            .pipe(parser);


    const userQuestion =
        "Tell me about climate in India and also about the festivals celebrated in India.";


    // console.log(
    //     "\nQuestion:"
    // );

    // console.log(
    //     userQuestion
    // );


    // console.log(
    //     "\nRunning RAG chain..."
    // );


    const answer =
        await ragChain.invoke(
            userQuestion
        );


    console.log(
        "\n=============================="
    );

    console.log(
        "FINAL ANSWER"
    );

    console.log(
        "==============================\n"
    );

    console.log(
        answer
    );
}


run();