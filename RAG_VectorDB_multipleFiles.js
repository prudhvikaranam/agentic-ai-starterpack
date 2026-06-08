import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import ollama from "ollama";
import pdf from "pdf-parse";
import { QdrantClient } from "@qdrant/js-client-rest";

dotenv.config();

const COLLECTION_NAME = "knowledge_base_multiple_files";

const client = new QdrantClient({
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY
});

// =========================================
// Create collection if it doesn't exist
// =========================================

async function createCollectionIfNotExists() {

    try {

        await client.getCollection(
            COLLECTION_NAME
        );

        console.log("Collection already exists");

    } catch {

        console.log("Creating collection...");

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

        console.log("Collection created");
    }
}

// =========================================
// Read text from files
// =========================================

async function getTextFromFile(filePath) {

    // TXT Files
    if (filePath.endsWith(".txt")) {

        return fs.readFileSync(
            filePath,
            "utf8"
        );
    }

    // PDF Files
    if (filePath.endsWith(".pdf")) {

        const dataBuffer =
            fs.readFileSync(filePath);

        const data =
            await pdf(dataBuffer);

        return data.text;
    }

    return "";
}

// =========================================
// Chunking Function
// =========================================

function chunkText(text, chunkSize = 1000) {

    const chunks = [];

    for (
        let i = 0;
        i < text.length;
        i += chunkSize
    ) {

        chunks.push(
            text.slice(i, i + chunkSize)
        );
    }

    return chunks;
}

// =========================================
// Ingest all files from storage folder
// =========================================

async function ingestKnowledge() {

    const storagePath = "./storage";

    const files =
        fs.readdirSync(storagePath);

    console.log(
        `Found ${files.length} files`
    );

    let pointId = 1;

    // Optional:
    // clear chunks debug file
    fs.writeFileSync(
        "./chunks.txt",
        ""
    );

    for (const file of files) {

        const filePath =
            path.join(storagePath, file);

        console.log(
            `\nProcessing file: ${file}`
        );

        const extractedText =
            await getTextFromFile(filePath);

        if (!extractedText) {

            console.log(
                `Skipping unsupported/empty file: ${file}`
            );

            continue;
        }

        // Create chunks
        const chunks =
            chunkText(extractedText, 1000);

        console.log(
            `Total chunks: ${chunks.length}`
        );

        // Save chunks for debugging
        fs.appendFileSync(
            "./chunks.txt",
            `\n\n========================\nFILE: ${file}\n========================\n\n${chunks.join("\n\n")}`
        );

        // Generate embeddings + store in Qdrant
        for (const chunk of chunks) {

            try {

                const response =
                    await ollama.embeddings({
                        model: "nomic-embed-text",
                        prompt: chunk
                    });

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
                                    text: chunk,
                                    source: file
                                }
                            }
                        ]
                    }
                );

                console.log(
                    `Inserted chunk ${pointId - 1}`
                );

            } catch (error) {

                console.log(
                    `Error processing chunk in ${file}`
                );

                console.error(error);
            }
        }
    }

    console.log(
        "\nKnowledge ingestion completed"
    );
}

// =========================================
// Ask Question
// =========================================

async function askQuestion() {

    const userQuestion =
        "Tell me about climate in india";

    console.log(
        "\nGenerating query embedding..."
    );

    const queryEmbedding =
        await ollama.embeddings({
            model: "nomic-embed-text",
            prompt: userQuestion
        });

    console.log(
        "Searching Qdrant..."
    );

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

    console.log(
        "\nTop matching chunks found"
    );

    const prompt = `
You are a helpful assistant.

Use the context below to answer the question.

Context:
${topChunks.join("\n\n")}

Question:
${userQuestion}

Answer:
`;

    console.log(
        "\nExecuting final LLM prompt..."
    );

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
        "\n=================================="
    );

    console.log(
        "FINAL ANSWER"
    );

    console.log(
        "==================================\n"
    );

    console.log(
        finalResponse.message.content
    );
}

// =========================================
// Main Runner
// =========================================

async function run() {

    try {

        await createCollectionIfNotExists();

        await ingestKnowledge();

        await askQuestion();

    } catch (error) {

        console.error(
            "\nApplication Error:"
        );

        console.error(error);
    }
}

run();