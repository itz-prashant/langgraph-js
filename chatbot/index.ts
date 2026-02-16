import "dotenv/config"
import readline from "node:readline/promises"
import { stdin, stdout } from "node:process"
import { StateGraph, StateSchema, GraphNode, MessagesValue } from "@langchain/langgraph"
import { ChatGroq } from "@langchain/groq"
import { MongoDBSaver } from "@langchain/langgraph-checkpoint-mongodb"
import { MongoClient } from "mongodb"
import { tool } from "@langchain/core/tools"
import { interrupt } from "@langchain/langgraph";
import { Command } from "@langchain/langgraph";

import * as z from "zod"

// CLI
const rl = readline.createInterface({
  input: stdin,
  output: stdout,
})

// LLM
const llm = new ChatGroq({
  model: "llama-3.3-70b-versatile",
  temperature: 0,
  apiKey: process.env.GROQ_API_KEY,
})

// STATE
const ChatState = new StateSchema({
  messages: MessagesValue
})


const humanAssistanceTool = tool(
  async (input: { query: string }) => {
    const humanResponse = await interrupt({
      query: input.query,
    })
    console.log("response",humanResponse)
    return humanResponse
  },
  {
    name: "human_assistance",
    description: "Ask a human for help when the AI is unsure.",
  }
)

const tools = [humanAssistanceTool]

const llm_With_tools = llm.bindTools(tools)

// NODE
const chatbotNode: GraphNode<typeof ChatState> = async (state) => {
  const result = await llm_With_tools.invoke(state.messages)

  return { messages: [result] }
}

async function main() {
  try {
    // 🔥 Mongo connect safely inside main
    const client = new MongoClient(process.env.MONGODB_URI!)
    await client.connect()

    console.log("✅ MongoDB connected")

    const checkpointer = new MongoDBSaver(
      {client, dbName: "langgraph"}
    )

    // 🔥 Graph AFTER checkpointer ready
    const graph = new StateGraph(ChatState)
      .addNode("chatbotNode", chatbotNode)
      .addEdge("__start__", "chatbotNode")
      .addEdge("chatbotNode", "__end__")
      .compile({ checkpointer })

    const threadId = "1"

    while (true) {
      const userInput = await rl.question("You: ")

      if (userInput.toLowerCase() === "bye") break

      const result = await graph.invoke(
        { 
          messages: [
            {role: "user", content: userInput}
          ]
         },
        { configurable: { thread_id: threadId } } // ✅ correct key
      )
    const lastMessage = result.messages[result.messages.length - 1]
      console.log("Bot:", lastMessage.content)
    }

    rl.close()
    await client.close()
    console.log("👋 Closed cleanly")
  } catch (error) {
    console.error("❌ Error:", error)
  }
}

main()
