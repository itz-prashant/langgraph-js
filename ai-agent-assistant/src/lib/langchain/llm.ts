import { ChatOpenRouter } from "@langchain/openrouter";

export const llm = new ChatOpenRouter(
  "openai/gpt-3.5-turbo", 
  {
    temperature: 0.1,
    apiKey: process.env.OPENROUTER_API_KEY,
  }
);