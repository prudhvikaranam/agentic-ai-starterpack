// START -> prepare -> humanApproval -> interrupt() -> PAUSE -> Human provides decision -> RESUME -> END


import {
    StateGraph,
    START,
    END,
    Annotation,
    interrupt,
    Command,
    MemorySaver
} from "@langchain/langgraph";


// ==========================================================
// 1. STATE
// ==========================================================

const State = Annotation.Root({

    message: Annotation({

        reducer:
            (_existing, update) => update,

        default:
            () => ""

    }),

    isApproved: Annotation({

        reducer:
            (_existing, update) => update,

        default:
            () => false

    })

});


// ==========================================================
// 2. PREPARE NODE
// ==========================================================

const prepare = async (state) => {

    console.log(
        "\nPreparing request..."
    );

    return {

        message:
            "Request is ready for approval."

    };

};


// ==========================================================
// 3. HUMAN APPROVAL NODE
// ==========================================================
//
// interrupt() pauses the workflow.
//
// The workflow will continue only when
// we resume it with a human decision.
// ==========================================================

const humanApproval = async (state) => {

    console.log(
        "\nWaiting for human approval..."
    );


    const decision = interrupt({

        message:
            "Do you approve this request?",

        request:
            state.message

    });


    console.log(
        "\nHuman decision:",
        decision
    );


    return {

        isApproved:
            decision === true

    };

};


// ==========================================================
// 4. ROUTER
// ==========================================================
//
// Decide where to go after human approval.
// ==========================================================

const routeAfterApproval = (state) => {

    if (state.isApproved) {

        return "approvedBranch";

    }

    return "rejected";

};


// ==========================================================
// 5. APPROVED NODE
// ==========================================================

const approved1 = async () => {

    console.log(
        "\nRequest approved."
    );

    return {};

};


// ==========================================================
// 6. REJECTED NODE
// ==========================================================

const rejected = async () => {

    console.log(
        "\nRequest rejected."
    );

    return {};

};


// ==========================================================
// 7. BUILD GRAPH
// ==========================================================

const graph =

    new StateGraph(State)

        // --------------------------------------------------
        // Nodes
        // --------------------------------------------------

        .addNode(
            "prepare",
            prepare
        )

        .addNode(
            "humanApproval",
            humanApproval
        )

        .addNode(
            "approvedBranch",
            approved1
        )

        .addNode(
            "rejected",
            rejected
        )


        // --------------------------------------------------
        // START → prepare
        // --------------------------------------------------

        .addEdge(
            START,
            "prepare"
        )


        // --------------------------------------------------
        // prepare → humanApproval
        // --------------------------------------------------

        .addEdge(
            "prepare",
            "humanApproval"
        )


        // --------------------------------------------------
        // humanApproval → router
        // --------------------------------------------------

        .addConditionalEdges(

            "humanApproval",

            routeAfterApproval,

            {

                approvedBranch:
                    "approvedBranch",

                rejected:
                    "rejected"

            }

        )


        // --------------------------------------------------
        // approvedBranch → END
        // --------------------------------------------------

        .addEdge(
            "approvedBranch",
            END
        )


        // --------------------------------------------------
        // rejected → END
        // --------------------------------------------------

        .addEdge(
            "rejected",
            END
        );


// ==========================================================
// 8. CHECKPOINTER
// ==========================================================
//
// MemorySaver stores checkpoints in memory.
//
// This is required because interrupt()
// pauses the workflow.
// ==========================================================

const checkpointer =
    new MemorySaver();


// ==========================================================
// 9. COMPILE GRAPH
// ==========================================================

const app =
    graph.compile({

        checkpointer

    });


// ==========================================================
// 10. THREAD ID
// ==========================================================
//
// Identifies this specific workflow execution.
//
// The same thread_id must be used when
// resuming the paused workflow.
// ==========================================================

const config = {

    configurable: {

        thread_id:
            "demo-001"

    }

};


// ==========================================================
// 11. FIRST EXECUTION
// ==========================================================
//
// The workflow will:
//
// START
//   ↓
// prepare
//   ↓
// humanApproval
//   ↓
// interrupt()
//   ↓
// PAUSE
//
// ==========================================================

console.log(
    "\n===================================="
);

console.log(
    "STARTING WORKFLOW"
);

console.log(
    "===================================="
);


const pausedResult =

    await app.invoke(

        {

            message:
                "Book the selected flight.",

            isApproved:
                false

        },

        config

    );


console.log(
    "\n===================================="
);

console.log(
    "WORKFLOW PAUSED"
);

console.log(
    "===================================="
);


console.log(
    pausedResult
);


// ==========================================================
// 12. RESUME WORKFLOW
// ==========================================================
//
// Imagine the human clicked:
//
// YES
//
// resume: true
//
// ==========================================================

console.log(
    "\n===================================="
);

console.log(
    "RESUMING WORKFLOW"
);

console.log(
    "===================================="
);


const finalResult =

    await app.invoke(

        new Command({

            resume:
                true

        }),

        config

    );


// ==========================================================
// 13. FINAL RESULT
// ==========================================================

console.log(
    "\n===================================="
);

console.log(
    "WORKFLOW COMPLETED"
);

console.log(
    "===================================="
);


console.log(
    finalResult
);


// Execution Flow
// First invocation
// app.invoke(initialState)
//         ↓
// START
//         ↓
// prepare
//         ↓
// humanApproval
//         ↓
// interrupt()
//         ↓
// PAUSE

// At this point LangGraph saves a checkpoint using:

// new MemorySaver()
// Human decision

// The human says:

// YES

// So we resume with:

// new Command({
//     resume: true
// })

// using the same:

// thread_id: "demo-001"
// Second invocation
// resume
//   ↓
// humanApproval continues
//   ↓
// decision = true
//   ↓
// approved = true
//   ↓
// routeAfterApproval
//   ↓
// approved
//   ↓
// END
// Core Concepts
// interrupt()
// Pause the workflow and wait for external input.
// MemorySaver
// Store checkpoints in memory.
// thread_id
// Identify a particular workflow execution.
// Command({ resume: value })
// Resume the paused workflow with a value.
// Memory Rule
// interrupt()
//     = PAUSE

// checkpoint
//     = REMEMBER

// thread_id
//     = WHICH WORKFLOW?

// Command(resume)
//     = CONTINUE
// Most Important Mental Model
// Human-in-the-loop
//         ↓
// interrupt()
//         ↓
// pause
//         ↓
// checkpoint
//         ↓
// human decision
//         ↓
// resume
//         ↓
// continue workflow

// Also remember:

// Node
// =
// executable work

// AIMessage
// =
// possible result produced by that work

// The node itself should be registered with LangGraph; it should not be replaced by an already-executed result.