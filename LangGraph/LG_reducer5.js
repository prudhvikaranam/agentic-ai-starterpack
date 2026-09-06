// START
//   ├── Weather Node
//   └── Knowledge Node
//           ↓
//        Reducer
//           ↓
//       Synthesis
//           ↓
//          END



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
// "results" is the important field.
//
// Multiple parallel nodes will update the SAME field.
// Therefore we define a reducer to merge those updates.
//
// ============================================================

const State = Annotation.Root({

    question: Annotation(),

    results: Annotation({
        reducer: (existing, update) => [
            ...existing,
            ...update
        ],
        default: () => []
    }),

    answer: Annotation()
});


// ============================================================
// 2. WEATHER NODE
// ============================================================

const weatherNode = async (state) => {

    console.log(
        "\n[Weather Node] Started"
    );

    // Simulate API delay
    await new Promise(
        resolve => setTimeout(resolve, 1000)
    );

    console.log(
        "[Weather Node] Completed"
    );

    return {

        results: [
            {
                source: "weather",

                data: {
                    city: "Hyderabad",
                    temperature: "30°C",
                    condition: "Sunny"
                }
            }
        ]

    };
};


// ============================================================
// 3. KNOWLEDGE NODE
// ============================================================

const knowledgeNode = async (state) => {

    console.log(
        "\n[Knowledge Node] Started"
    );

    // Simulate slower operation
    await new Promise(
        resolve => setTimeout(resolve, 2000)
    );

    console.log(
        "[Knowledge Node] Completed"
    );

    return {

        results: [
            {
                source: "knowledge_base",

                data:
                    "India has a tropical monsoon climate."
            }
        ]

    };
};


// ============================================================
// 4. SYNTHESIS NODE
// ============================================================

const synthesisNode = async (state) => {

    console.log(
        "\n[Synthesis Node] Started"
    );

    console.log(
        "\nResults available to synthesis:"
    );

    console.log(
        state.results
    );

    return {

        answer:
            "Combined results received successfully."

    };
};


// ============================================================
// 5. BUILD GRAPH
// ============================================================

const graph =

    new StateGraph(State)

        // ----------------------------
        // Nodes
        // ----------------------------

        .addNode(
            "weather",
            weatherNode
        )

        .addNode(
            "knowledge",
            knowledgeNode
        )

        .addNode(
            "synthesis",
            synthesisNode
        )


        // ----------------------------
        // START → PARALLEL BRANCHES
        // ----------------------------

        .addEdge(
            START,
            "weather"
        )

        .addEdge(
            START,
            "knowledge"
        )


        // ----------------------------
        // PARALLEL → SYNTHESIS
        // ----------------------------

        .addEdge(
            "weather",
            "synthesis"
        )

        .addEdge(
            "knowledge",
            "synthesis"
        )


        // ----------------------------
        // SYNTHESIS → END
        // ----------------------------

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
        "Compare weather with India climate",

    results: [],

    answer: ""

};


// ============================================================
// 8. RUN GRAPH
// ============================================================

const result =
    await app.invoke(
        initialState
    );


// ============================================================
// 9. FINAL STATE
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