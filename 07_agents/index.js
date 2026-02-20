import * as z from "zod";
import {ChatGroq} from "@langchain/groq"
import {tool} from "@langchain/core/tools"
import {StateGraph, StateSchema, MessagesValue} from "@langchain/langgraph"
import {ToolNode} from "@langchain/langgraph/prebuilt"

const llm = new ChatGroq({
   model: "openai/gpt-oss-120b",
   apiKey: process.env.GROQ_API_KEY,
})

const multiply = tool(
    ({a,b})=>{
        return a * b
    },
    {
        name: "multiply",
        description: "Multiply two numbers together",
        schema: z.object({
            a: z.number().describe("first number"),
            b: z.number().describe("second number")
        })
    }
)

const add = tool(
    ({a,b})=>{
        return a + b
    },
    {
        name: "add",
        description: "Add two numbers together",
        schema: z.object({
            a: z.number().describe("first number"),
            b: z.number().describe("second number")
        })
    }
)

const divide = tool(
    ({a,b})=>{
        return a / b
    },
    {
        name: "divide",
        description: "Divide two numbers",
        schema: z.object({
            a: z.number().describe("first number"),
            b: z.number().describe("second number"),
        }),
    }
)

const tools = [add, multiply, divide]

const toolsByName = Object.fromEntries(tools.map((tool)=> [tool.name, tool]))

const llmWithTools = llm.bindTools(tools)

const State = new StateSchema({
    messages: MessagesValue
})

const llmCall = async (state)=>{
    const result = await llmWithTools.invoke([
       {
         role: "system",
         content: "You are a helpful assistant tasked with performing arithmetic on a set of inputs."
       },
       ...state.messages
    ])

    return {
        message: [result]
    }
}

const toolNode = new ToolNode(tools)

const shouldContinue = (state)=>{
    const messages = state.messages
    const lastMessage = messages.at(-1)

    if(lastMessage?.tool?.length){
        return "toolNode"
    }else{
        return "__end__"
    }
}

const agentBuilder = new StateGraph(State)
    .addNode("llmCall", llmCall)
    .addNode("toolNode", toolNode)
    .addEdge("__start__", "llmCall")
    .addConditionalEdges(
        "llmCall",
        shouldContinue,
        ['toolNode', '__end__']
    )
    .addEdge("toolNode", "llmCall")
    .compile()

const messages = [{
  role: "user",
  content: "Add 3 and 4."
}];    

const result = await agentBuilder.invoke({ messages });
console.log(result.messages);
