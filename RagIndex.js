import fs from "fs";
import ollama from "ollama";

/*
|--------------------------------------------------------------------------
| STEP 1
| Read the knowledge file
|--------------------------------------------------------------------------
|
| This is our mini knowledge base.
|
*/

const content = fs.readFileSync(
    "./storage/RagKnowledge.txt",
    "utf8"
);

/*
|--------------------------------------------------------------------------
| STEP 2
| Chunking
|--------------------------------------------------------------------------
|
| Split the file into smaller pieces.
|
| In real-world RAG:
| - PDFs
| - Word Documents
| - Web Pages
|
| are split into chunks before embedding.
|
*/

const chunks = content
    .split(/\r?\n\r?\n/)
    .filter(Boolean);

console.log("\n========= CHUNKS =========\n");
console.log(chunks);

/*
|--------------------------------------------------------------------------
| STEP 3
| Cosine Similarity Function
|--------------------------------------------------------------------------
|
| This compares two vectors.
|
| Result:
| 1.0   => Very Similar
| 0.0   => Unrelated
| -1.0  => Opposite
|
*/

function cosineSimilarity(vectorA, vectorB) {

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vectorA.length; i++) {

        dotProduct += vectorA[i] * vectorB[i];

        normA += vectorA[i] * vectorA[i];

        normB += vectorB[i] * vectorB[i];
    }

    return (
        dotProduct /
        (
            Math.sqrt(normA) *
            Math.sqrt(normB)
        )
    );
}

async function run() {

    /*
    |--------------------------------------------------------------------------
    | STEP 4
    | Generate Embeddings For Each Chunk
    |--------------------------------------------------------------------------
    */

    const embeddedChunks = [];

    console.log("\n========= GENERATING EMBEDDINGS =========\n");

    for (const chunk of chunks) {

        const response = await ollama.embeddings({
            model: "nomic-embed-text",
            prompt: chunk
        });

        embeddedChunks.push({
            text: chunk,
            embedding: response.embedding
        });


        
        console.log("============response==============");
        console.log("response:", response);
        console.log("============Chunk==============");
        console.log("Chunk:", chunk);
        console.log("==========embeddedChunks================");
        console.log('embeddedChunks', embeddedChunks);


        // console.log(
        //     "Embedding Length:",
        //     response.embedding.length
        // );

        // console.log("--------------------------");
    }

    /*
    |--------------------------------------------------------------------------
    | STEP 5
    | User Question
    |--------------------------------------------------------------------------
    */

    const userQuestion = "Tell me about Prudhvi";

    // console.log("\n========= USER QUESTION =========\n");
    // console.log(userQuestion);

    /*
    |--------------------------------------------------------------------------
    | STEP 6
    | Convert User Question Into Embedding
    |--------------------------------------------------------------------------
    */

    const queryEmbeddingResponse =
        await ollama.embeddings({
            model: "nomic-embed-text",
            prompt: userQuestion
        });

    const queryEmbedding =
        queryEmbeddingResponse.embedding;

    /*
    |--------------------------------------------------------------------------
    | STEP 7
    | Similarity Search
    |--------------------------------------------------------------------------
    |
    | Compare user question vector
    | against every chunk vector.
    |
    */

    const scoredChunks = [];

    for (const chunk of embeddedChunks) {

        const score = cosineSimilarity(
            queryEmbedding,
            chunk.embedding
        );

        scoredChunks.push({
            text: chunk.text,
            score
        });
    }

    /*
    |--------------------------------------------------------------------------
    | STEP 8
    | Sort By Highest Similarity
    |--------------------------------------------------------------------------
    */

    scoredChunks.sort(
        (a, b) => b.score - a.score
    );

    // console.log("\n========= SIMILARITY SCORES =========\n");

    scoredChunks.forEach(item => {

        // console.log(
        //     `Score: ${item.score.toFixed(4)}`
        // );

        // console.log(item.text);

        // console.log("----------------");
    });

    /*
    |--------------------------------------------------------------------------
    | STEP 9
    | Retrieval
    |--------------------------------------------------------------------------
    |
    | Take top 3 chunks.
    |
    */

    const topChunks =
        scoredChunks
            .slice(0, 3)
            .map(item => item.text);

    // console.log("\n========= RETRIEVED CHUNKS =========\n");

    // console.log(topChunks);

    /*
    |--------------------------------------------------------------------------
    | STEP 10
    | Augmentation
    |--------------------------------------------------------------------------
    |
    | Build the prompt.
    |
    | THIS IS THE "A" IN RAG.
    |
    */

    const prompt = `
You are a helpful assistant.

Use the context below to answer the question.

Context:
${topChunks.join("\n")}

Question:
${userQuestion}

Answer:
`;

    // console.log("\n========= AUGMENTED PROMPT =========\n");

    // console.log(prompt);

    /*
    |--------------------------------------------------------------------------
    | STEP 11
    | Generation
    |--------------------------------------------------------------------------
    |
    | Send augmented prompt to LLM.
    |
    | THIS IS THE "G" IN RAG.
    |
    */

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

    // console.log("\n========= FINAL ANSWER =========\n");

    console.log(
        finalResponse.message.content
    );
}

run();