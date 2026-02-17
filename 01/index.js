import { tool } from "@langchain/core/tools";
import {ChatGroq} from "@langchain/groq"
import * as z from "zod"

const llm = new ChatGroq({
    model: "openai/gpt-oss-120b",
    apiKey: process.env.GROQ_API_KEY
})

// Schema for structured output
const SearchQuery = z.object({
    search_query: z.string().describe("Query that is optimized web search."),
    justification: z.string().describe("Why this query is relevant to the user's request.")
})

// Augment the LLM with schema for structured output
const structuredLlm = llm.withStructuredOutput(SearchQuery);

// Invoke the augmented LLM
const output = await structuredLlm.invoke(
    "How does Calcium CT score relate to high cholesterol?"
)

// Define a tool
const multiply = tool(({a,b})=>{
    return a * b
},{
    name: "multiply",
    description: "Multiply two numbers",
    schema: z.object({
        a: z.number(),
        b: z.number()
    })
})

const llmWithTools = llm.bindTools([multiply])

const msg = await llmWithTools.invoke("What is 2 times 3? use tool multiply calling ")

console.log(msg)