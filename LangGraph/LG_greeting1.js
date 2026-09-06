import {
    StateGraph,
    START,
    END
} from "@langchain/langgraph";
import { Annotation } from "@langchain/langgraph";


const State = Annotation.Root({
    name: Annotation(),
    greeting: Annotation()
});


const greetingNode = async (state) => {

    return {
        greeting: `Hello ${state.name}!`
    };

};



const graph =
    new StateGraph(State)
        .addNode(
            "createGreeting",
            greetingNode
        )
        .addEdge(
            START,
            "createGreeting"
        )
        .addEdge(
            "createGreeting",
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