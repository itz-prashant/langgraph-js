import {ChatGoogleGenerativeAI} from "@langchain/google-genai"
import {ChatGroq} from "@langchain/groq"
import { StateGraph, StateSchema } from "@langchain/langgraph"
import * as z from "zod"

const llm = new ChatGroq({
    model: "openai/gpt-oss-120b",
    apiKey: process.env.GROQ_API_KEY
})


const routerSchema = z.object({
    step: z.enum(["poem", "story", "joke"]).describe("The next step in the routing process")
})

const router = llm.withStructuredOutput(routerSchema)

const State = new StateSchema({
    input: z.string(),
    decision: z.string().optional(),
    output: z.string().optional()
})

const llmCall1 = async (state)=>{
    const result = await llm.invoke([
        {
            role: "system",
            content: "You are an expert storyteller write only 4 line story."
        },
        {
            role: "user",
            content: state.input
        }
    ])

    return {output: result.content}
}

const llmCall2 = async (state)=>{
    const result = await llm.invoke([
        {
            role: "system",
            content: "You are an expert comedian."
        },
        {
            role: "user",
            content: state.input
        }
    ])

    return {output: result.content}
}

const llmCall3 = async (state)=>{
    const result = await llm.invoke([
        {
            role: "system",
            content: "You are an expert poet to write 4 line poem."
        },
        {
            role: "user",
            content: state.input
        }
    ])

    return {output: result.content}
}

const llmCallRouter = async (state)=>{
    console.log("STATE:", state)
    const decision  = await router.invoke([
        {
            role: "system",
            content: "Route the input to story, joke, or poem based on the user's request."
        },
        {
            role: "user",
            content: state.input
        }
    ])

    return {decision: decision.step}
}

const routeDecision = async(state)=>{
    if (state.decision === "story"){
        return "llmCall1"
    }else if(state.decision == "joke"){
        return "llmCall2"
    }else{
        return "llmCall3"
    }
}

const graph = new StateGraph(State)
    .addNode("llmCall1", llmCall1)
    .addNode("llmCall2", llmCall2)
    .addNode("llmCall3", llmCall3)
    .addNode("llmCallRouter", llmCallRouter)
    .addEdge("__start__", "llmCallRouter")
    .addConditionalEdges("llmCallRouter", routeDecision,["llmCall1", "llmCall2", "llmCall3"])
    .addEdge("llmCall1", "__end__")
    .addEdge("llmCall2", "__end__")
    .addEdge("llmCall3", "__end__")
    .compile()

const result = await graph.invoke({
    input: "Write a poem about cats"
})    

console.log("result", result.output)