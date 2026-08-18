// LangGraph Example
// Conditional Edge + Loop + Retry Limit

import {
    StateGraph,
    START,
    END,
    Annotation
} from "@langchain/langgraph";

// ======================================================
// 1. STATE
// ======================================================

const State = Annotation.Root({

    destination: Annotation(),

    flightResults: Annotation(),

    retryCount: Annotation(),

    maxRetries: Annotation(),

    status: Annotation(),

    message: Annotation()
});


// ======================================================
// 2. SEARCH FLIGHTS NODE
// ======================================================
//
// This node performs the actual work.
//
// In a real application this would call a flight API.
// Here we simulate the result.
//

const searchFlights = async (state) => {

    console.log(
        `\nSearching flights to ${state.destination}`
    );

    console.log(
        `Attempt: ${state.retryCount + 1}`
    );


    // --------------------------------------------------
    // Simulated results
    // --------------------------------------------------
    //
    // First 2 attempts -> no suitable flight
    // Third attempt   -> flight found
    //

    let flightResults = [];

    if (state.retryCount >= 2) {

        flightResults = [
            {
                airline: "IndiGo",
                price: 5200,
                destination:
                    state.destination
            }
        ];

    }


    return {

        flightResults,

        retryCount:
            state.retryCount + 1

    };
};


// ======================================================
// 3. ROUTER / CONDITIONAL DECISION
// ======================================================
//
// This function does NOT perform the business operation.
//
// It only decides where the graph should go next.
//

const routeAfterSearch = (state) => {

    // ----------------------------------------------
    // Suitable flight found
    // ----------------------------------------------

    if (
        state.flightResults &&
        state.flightResults.length > 0
    ) {

        return "flight_found";

    }


    // ----------------------------------------------
    // Retry limit reached
    // ----------------------------------------------

    if (
        state.retryCount >= state.maxRetries
    ) {

        return "max_retries";

    }


    // ----------------------------------------------
    // Try searching again
    // ----------------------------------------------

    return "retry";
};


// ======================================================
// 4. SUCCESS NODE
// ======================================================

const flightFound = async (state) => {

    const flight =
        state.flightResults[0];

    console.log(
        `\nFlight found: ${flight.airline}`
    );

    console.log(
        `Price: ₹${flight.price}`
    );


    return {

        status: "success",

        message:
            `Flight found for ₹${flight.price}`

    };
};


// ======================================================
// 5. FAILURE NODE
// ======================================================

const maxRetriesReached = async (state) => {

    console.log(
        "\nMaximum retry limit reached."
    );


    return {

        status: "failed",

        message:
            `Unable to find a suitable flight to ${state.destination} after ${state.retryCount} attempts.`

    };
};


// ======================================================
// 6. BUILD GRAPH
// ======================================================

const graph =

    new StateGraph(State)

        // ------------------------------------------
        // Nodes
        // ------------------------------------------

        .addNode(
            "searchFlights",
            searchFlights
        )

        .addNode(
            "flightFound",
            flightFound
        )

        .addNode(
            "maxRetriesReached",
            maxRetriesReached
        )


        // ------------------------------------------
        // START
        // ------------------------------------------

        .addEdge(
            START,
            "searchFlights"
        )


        // ------------------------------------------
        // CONDITIONAL EDGE
        // ------------------------------------------
        //
        // After searchFlights finishes,
        // routeAfterSearch decides where to go.
        //

        .addConditionalEdges(
            "searchFlights",

            routeAfterSearch,

            {

                flight_found:
                    "flightFound",

                retry:
                    "searchFlights",

                max_retries:
                    "maxRetriesReached"

            }
        )


        // ------------------------------------------
        // END
        // ------------------------------------------

        .addEdge(
            "flightFound",
            END
        )

        .addEdge(
            "maxRetriesReached",
            END
        );


// ======================================================
// 7. COMPILE
// ======================================================

const app =
    graph.compile();


// ======================================================
// 8. EXECUTE
// ======================================================

const result =
    await app.invoke({

        destination:
            "Delhi",

        flightResults: [],

        retryCount: 0,

        maxRetries: 3,

        status: "",

        message: ""

    });


// ======================================================
// 9. FINAL STATE
// ======================================================

console.log(
    "\n============================"
);

console.log(
    "FINAL STATE"
);

console.log(
    "============================"
);

console.log(
    result
);