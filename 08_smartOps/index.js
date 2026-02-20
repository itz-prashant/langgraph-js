import { totalSalesTool } from "./tools/salesTools.js"
import { ChatGroq } from "@langchain/groq";
import { StateGraph, StateSchema, MessagesValue } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import dotenv from "dotenv";
dotenv.config()

const State = new StateSchema({
    messages: MessagesValue
})

const llm = new ChatGroq({
  model: "openai/gpt-oss-120b",
  apiKey: process.env.GROQ_API_KEY,
});

const llmWithTools = llm.bindTools([totalSalesTool])

const llmCall = async(state)=>{
    const response = await llmWithTools.invoke(state.messages)

    return {
        messages: [response]
    }
}

const toolNode = new ToolNode([totalSalesTool])

const shouldContinue = (state)=>{
    const lastMessage = state.messages.at(-1);

    if(lastMessage?.tool_calls?.length){
        return "toolNode"
    }
    return "__end__"
}

// const response = await llmWithTools.invoke([
//     {
//     role: "system",
//     content: "You are a business analytics assistant."
//   },
//   {
//     role: "user",
//     content: "What is the total sales?"
//   }
// ])

// if(response?.tool_calls?.length){
//     const toolCall = response.tool_calls[0];
//     console.log("Tool requested:", toolCall.name);

//     const toolResult = await totalSalesTool.invoke(toolCall.args);

//     console.log("Tool Result:", toolResult);

//     const finalResponse = await llm.invoke([
//         {
//             role: "system",
//             content: "You are a business analytics assistant."
//         },
//         {
//             role: "user",
//             content: "What is the total sales?"
//         },
//         response,
//         {
//             role: "tool",
//             content: toolResult,
//             tool_call_id: toolCall.id
//         }
//     ])
//     console.log("Final Answer:", finalResponse.content);
// }

const graph = new StateGraph(State)
    .addNode("llmCall", llmCall)
    .addNode("toolNode", toolNode)
    .addEdge("__start__", "llmCall")
    .addConditionalEdges(
        "llmCall",
        shouldContinue,
        {
           toolNode:  "toolNode",
            __end__: "__end__"
        }
    )
    .addEdge("toolNode", "llmCall")
    .compile();

const result = await graph.invoke({
  messages: [
    {
      role: "system",
      content: "You are a business analytics assistant."
    },
    {
      role: "user",
      content: "What is the total sales?"
    }
  ]
});

console.log(result.messages.at(-1).content);    