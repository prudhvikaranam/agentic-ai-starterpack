import {
    StateGraph,
    START,
    END,
    Annotation
} from "@langchain/langgraph";


// ============================================================
// 1. STATE DEFINITION
// ============================================================
//
// Defines the SHAPE of the graph state.
// It does not contain the runtime values.
//
// Runtime values will be supplied through app.invoke(...)
//

const State = Annotation.Root({

    question: Annotation(),

    weather: Annotation(),

    knowledge: Annotation(),

    answer: Annotation()
});


// ============================================================
// 2. WEATHER NODE
// ============================================================
//
// This node performs weather-related work.
// It updates only the "weather" part of the state.
//

const weatherNode = async (state) => {

    console.log(
        "\nWeather node started"
    );

    // Simulate a 1-second API call
    await new Promise(
        resolve =>
            setTimeout(resolve, 1000)
    );

    console.log(
        "Weather node completed"
    );

    return {

        weather: {
            temperature: "30°C",
            condition: "Sunny"
        }

    };
};


// ============================================================
// 3. RAG NODE
// ============================================================
//
// This node performs knowledge-base work.
// It updates only the "knowledge" part of the state.
//

const ragNode = async (state) => {

    console.log(
        "\nRAG node started"
    );

    // Simulate a slower 3-second operation
    await new Promise(
        resolve =>
            setTimeout(resolve, 3000)
    );

    console.log(
        "RAG node completed"
    );

    return {

        knowledge:
            "India has a tropical monsoon climate."

    };
};


// ============================================================
// 4. SYNTHESIS NODE
// ============================================================
//
// This node runs after BOTH parallel branches complete.
//
// It can read:
//   state.weather
//   state.knowledge
//

const synthesisNode = async (state) => {

    console.log(
        "\nSynthesis node started"
    );

    const weather =
        state.weather;

    const knowledge =
        state.knowledge;

    return {

        answer:
            `Current weather: ${weather.temperature}, ` +
            `${weather.condition}. ` +
            `Knowledge base says: ${knowledge}`

    };
};


// ============================================================
// 5. BUILD GRAPH
// ============================================================

const graph =

    new StateGraph(State)

        // ----------------------------------------
        // Nodes
        // ----------------------------------------

        .addNode(
            "weatherNode",
            weatherNode
        )

        .addNode(
            "rag",
            ragNode
        )

        .addNode(
            "synthesis",
            synthesisNode
        )


        // ----------------------------------------
        // START → PARALLEL BRANCHES
        // ----------------------------------------

        .addEdge(
            START,
            "weatherNode"
        )

        .addEdge(
            START,
            "rag"
        )


        // ----------------------------------------
        // PARALLEL BRANCHES → SYNTHESIS
        // ----------------------------------------

        .addEdge(
            "weatherNode",
            "synthesis"
        )

        .addEdge(
            "rag",
            "synthesis"
        )


        // ----------------------------------------
        // SYNTHESIS → END
        // ----------------------------------------

        .addEdge(
            "synthesis",
            END
        );


// ============================================================
// 6. COMPILE
// ============================================================

const app =
    graph.compile();


// ============================================================
// 7. INITIAL STATE
// ============================================================

const initialState = {

    question:
        "Compare current weather with India's climate",

    weather: null,

    knowledge: null,

    answer: ""

};


// ============================================================
// 8. EXECUTE GRAPH
// ============================================================

console.log(
    "\n=============================="
);

console.log(
    "STARTING GRAPH"
);

console.log(
    "=============================="
);


const startTime =
    Date.now();


const result =
    await app.invoke(
        initialState
    );


const endTime =
    Date.now();


// ============================================================
// 9. RESULT
// ============================================================

console.log(
    "\n=============================="
);

console.log(
    "FINAL STATE"
);

console.log(
    "=============================="
);

console.log(
    result
);


// ============================================================
// 10. EXECUTION TIME
// ============================================================

console.log(
    "\nExecution time:"
);

console.log(
    `${endTime - startTime} ms`
);