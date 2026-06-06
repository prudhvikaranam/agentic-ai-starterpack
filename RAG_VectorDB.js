import fs from "fs";
import dotenv from "dotenv";
import ollama from "ollama";
import { QdrantClient } from "@qdrant/js-client-rest";

dotenv.config();
const COLLECTION_NAME = "knowledge_base";

// connecting to cloud qdrant vector database
const client = new QdrantClient({
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY
});

// Create collection if it doesn't exist
async function createCollectionIfNotExists() {

    try {

        await client.getCollection(
            COLLECTION_NAME
        );
    } catch {

        // console.log(
        //     "Creating collection..."
        // );

        const testEmbedding =
            await ollama.embeddings({
                model: "nomic-embed-text",
                prompt: "hello"
            });

        const vectorSize =
            testEmbedding.embedding.length;

        await client.createCollection(
            COLLECTION_NAME,
            {
                vectors: {
                    size: vectorSize,
                    distance: "Cosine"
                }
            }
        );

        // console.log(
        //     "Collection created"
        // );
    }
}

// Send data to Qdrant and store it as vectors with metadata
async function ingestKnowledge() {

    const content =
        fs.readFileSync(
            "./storage/RAG_VectorDBKnowledge.txt",
            "utf8"
        );

    const chunks =
        content
            .split(/\r?\n\r?\n/)
            .filter(Boolean);

    // console.log(
    //     `Found ${chunks.length} chunks`
    // );

    let pointId = 1;

    for (const chunk of chunks) {

        const response =
            await ollama.embeddings({
                model: "nomic-embed-text",
                prompt: chunk
            });


        // console.log('knowledge response after embedding:', response);
        // console.log('knowledge chunk :', chunk);



        await client.upsert(
            COLLECTION_NAME,
            {
                wait: true,
                points: [
                    {
                        id: pointId++,
                        vector:
                            response.embedding,
                        payload: {
                            text: chunk
                        }
                    }
                ]
            }
        );

        // console.log(
        //     "Stored:",
        //     chunk
        // );
    }
}

// User question -> embedding -> search in Qdrant -> retrieve relevant chunks -> prompt LLM with retrieved chunks as context
async function askQuestion() {

    const userQuestion =
        "Tell me about charminar";

    const queryEmbedding =
        await ollama.embeddings({
            model: "nomic-embed-text",
            prompt: userQuestion
        });

    const searchResults =
        await client.search(
            COLLECTION_NAME,
            {
                vector:
                    queryEmbedding.embedding,
                limit: 3
            }
        );

    const topChunks =
        searchResults.map(
            item => item.payload.text
        );

    // console.log(
    //     "\nRetrieved Chunks:\n"
    // );

    // console.log(topChunks);

    const prompt = `
You are a helpful assistant.

Use the context below to answer.

Context:
${topChunks.join("\n")}

Question:
${userQuestion}

Answer:
`;

console.log('*************Prompt getting executed*************');

    const finalResponse =
        await ollama.chat({
            model: "qwen2.5:7b",
            messages: [
                {
                    role: "user",
                    content: prompt
                }
            ]
        });

    console.log(
        "\nFinal Answer:\n"
    );

    console.log(
        finalResponse.message.content
    );
}

async function run() {
    await createCollectionIfNotExists();
    await ingestKnowledge();
    await askQuestion();
}

run();

