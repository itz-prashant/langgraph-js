import { NextResponse } from "next/server";
import { llm } from "@/lib/langchain/llm";
import { z } from "zod";

export async function POST(req: Request) {
  const { message } = await req.json();

  const schema = z.object({
    type: z.enum(["answer", "action"]),
    message: z.string(),
  });

  const structuredLLM = llm.withStructuredOutput(schema);

  const response = await structuredLLM.invoke(message);

  return NextResponse.json({
    data: response,
  });
}