import * as z from "zod"
import {ChatGoogleGenerativeAI} from "@langchain/google-genai"
import {ChatGroq} from "@langchain/groq"
import { StateGraph, StateSchema } from "@langchain/langgraph"

const llm1 = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-pro",
    apiKey: process.env.GOOGLE_API_KEY
})

const llm2 = new ChatGroq({
    model: "openai/gpt-oss-120b",
    apiKey: process.env.GROQ_API_KEY
})

const llm3 = new ChatGroq({
    model: "llama-3.1-8b-instant",
    apiKey: process.env.GROQ_API_KEY
})

const State = new StateSchema({
    topic: z.string(),
    joke: z.string(),
    story: z.string(),
    poem: z.string(),
    combineOutput: z.string(),
})

const callLlm1 = async (state)=>{
    console.log("1", state)
    const msg = await llm1.invoke(`Write a joke about ${state.topic}`)
    return { joke: msg.content };
}

const callLlm2 = async (state)=>{
    console.log("2", state)
    const msg = await llm2.invoke(`Write a 3 line story about ${state.topic}`)
    return {story: msg.content}
}

const callLlm3 = async (state)=>{
       console.log("3", state)
    const msg = await llm2.invoke(`Write a 4 line poem about ${state.topic}`)
    return {poem: msg.content}
}

const aggregator = async (state)=>{
    console.log("calling agreegator.....", state)
    const combined = `
    Here's is story, joke and poem about ${state.topic}!\n\n` +
    `STORY:\n${state.story}\n\n`+
    `JOKE:\n${state.joke}\n\n`+
    `POEM:\n${state.poem}\n\n`;

    return {combineOutput: combined}
}

const parallelWorkflow = new StateGraph(State)
    .addNode("callLlm1", callLlm1)
    .addNode("callLlm2", callLlm2)
    .addNode("callLlm3", callLlm3)
    .addNode("aggregator", aggregator)
    .addEdge("__start__", "callLlm1")
    .addEdge("__start__", "callLlm2")
    .addEdge("__start__", "callLlm3")
    .addEdge("callLlm1", "aggregator")
    .addEdge("callLlm2", "aggregator")
    .addEdge("callLlm3", "aggregator")
    .addEdge("aggregator", "__end__")
    .compile()

const result = await parallelWorkflow.invoke({topic: "Dog"})  
console.log("result", result.combineOutput)  