import { StateGraph, StateSchema } from "@langchain/langgraph";
import {ChatGroq} from "@langchain/groq"
import * as z from "zod"

const llm = new ChatGroq({
    model: "openai/gpt-oss-120b",
    apiKey: process.env.GROQ_API_KEY
})

const State  = new StateSchema({
    topic: z.string(),
    joke: z.string(),
    improvedJoke: z.string(),
    finalJoke: z.string()
})

const generateJoke = async (state)=>{
    const msg = await llm.invoke(`Write a short joke about ${state.topic}`)

    return {joke: msg.content}
}

const checkPunchLine = async (state)=>{
    if(state.joke?.includes("?") || state.joke.includes("!")){
        return "Pass"
    }
    return "Fail";
}

const improveJoke = async (state)=>{
    const msg = await llm.invoke(`Make this joke funnier by adding wordplay: ${state.joke}`)

    return {improvedJoke: msg.content }
}

const polishJoke = async (state)=>{
    const msg = await llm.invoke(
    `Add a surprising twist to this joke: ${state.improvedJoke}`);

    return { finalJoke: msg.content };
}

const chain  = new StateGraph(State)
    .addNode("generateJoke", generateJoke)
    .addNode("improveJoke", improveJoke)
    .addNode("polishJoke", polishJoke)
    .addEdge("__start__", "generateJoke")
    .addConditionalEdges("generateJoke", checkPunchLine, {
        Pass: "improveJoke",
        Fail: "__end__"
    })
    .addEdge("improveJoke", "polishJoke")
    .addEdge("polishJoke", "__end__")
    .compile()

const state = await chain.invoke({topic: "cats"})  
console.log("Initial joke:");
console.log(state.joke);
console.log("\n--- --- ---\n");  
if (state.improvedJoke !== undefined) {
  console.log("Improved joke:");
  console.log(state.improvedJoke);
  console.log("\n--- --- ---\n");

  console.log("Final joke:");
  console.log(state.finalJoke);
} else {
  console.log("Joke failed quality gate - no punchline detected!");
}