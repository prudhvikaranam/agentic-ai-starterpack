import {
    StateGraph,
    START,
    END
} from "@langchain/langgraph";
import { Annotation } from "@langchain/langgraph";


const State = Annotation.Root({
    name: Annotation(),
    greeting: Annotation(),
    message: Annotation()
});

const createGreeting = async (state) => {
    return {
        greeting: `Hello ${state.name}!`
    };
};

const addMessage = async (state) => {

    return {
        message:
            `${state.greeting} Welcome to LangGraph!`
    };

};

const graph =
    new StateGraph(State)
        .addNode(
            "createGreeting",
            createGreeting
        )
        .addNode(
            "addMessage",
            addMessage
        )
        .addEdge(
            START,
            "createGreeting"
        )
        .addEdge(
            "createGreeting",
            "addMessage"
        )
        .addEdge(
            "addMessage",
            END
        );

const app =
    graph.compile();

const result =
    await app.invoke({
        name: "Prudhvi",
        greeting: ""
    });


console.log(result);