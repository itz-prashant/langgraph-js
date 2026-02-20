import { totalSalesTool } from "./tools/salesTools.js"
import { ChatGroq } from "@langchain/groq";
import dotenv from "dotenv";
dotenv.config()

const llm = new ChatGroq({
  model: "openai/gpt-oss-120b",
  apiKey: process.env.GROQ_API_KEY,
});

const llmWithTools = llm.bindTools([totalSalesTool])

const response = await llmWithTools.invoke([
    {
    role: "system",
    content: "You are a business analytics assistant."
  },
  {
    role: "user",
    content: "What is the total sales?"
  }
])

if(response?.tool_calls?.length){
    const toolCall = response.tool_calls[0];
    console.log("Tool requested:", toolCall.name);

    const toolResult = await totalSalesTool.invoke(toolCall.args);

    console.log("Tool Result:", toolResult);

    const finalResponse = await llm.invoke([
        {
            role: "system",
            content: "You are a business analytics assistant."
        },
        {
            role: "user",
            content: "What is the total sales?"
        },
        response,
        {
            role: "tool",
            content: toolResult,
            tool_call_id: toolCall.id
        }
    ])
    console.log("Final Answer:", finalResponse.content);
}