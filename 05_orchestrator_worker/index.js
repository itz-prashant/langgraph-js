import { ReducedValue, Send, StateGraph, StateSchema } from "@langchain/langgraph";
import { ChatGroq } from "@langchain/groq";
import * as z from "zod";

const llm = new ChatGroq({
  model: "openai/gpt-oss-120b",
  apiKey: process.env.GROQ_API_KEY,
});

const SectionSchema = z.object({
  name: z.string(),
  description: z.string(),
});

const SectionsSchema = z.object({
  sections: z.array(SectionSchema),
});

const planner = llm.withStructuredOutput(SectionsSchema);

const State = new StateSchema({
  topic: z.string(),

  sections: z.array(SectionSchema),

  completedSections: new ReducedValue(
    z.array(z.string()).default(() => []),
    {
      reducer: (a, b) => a.concat(b),
    }
  ),

  finalReport: z.string(),
});

const WorkerState = new StateSchema({
  section: SectionSchema,

  completedSections: new ReducedValue(
    z.array(z.string()).default(() => []),
    {
      reducer: (a, b) => a.concat(b),
    }
  ),
});

const orchestrator = async (state) => {
  const reportSections = await planner.invoke([
    { role: "system", content: "Generate a plan for the report." },
    { role: "user", content: `Here is the report topic: ${state.topic}` },
  ]);

  return { sections: reportSections.sections };
};

const llmCall = async (state) => {
  const section = await llm.invoke([
    {
      role: "system",
      content:
        "Write a report section following the provided name and description. Include no preamble for each section. Use markdown formatting.",
    },
    {
      role: "user",
      content: `Here is the section name: ${state.section.name} and description: ${state.section.description}`,
    },
  ]);
   return { completedSections: [section.content] };
};

const synthesizer = async (state)=>{
    const completedSections = state.completedSections;

    const completedReportSections = completedSections.join("\n\n--\n\n")

    return { finalReport: completedReportSections };
}


const asignWorker = (state) => {
  return state.sections.map((section) =>
    new Send("llmCall", { section })
  );
};


const orchestratorWorker = new StateGraph(State)
    .addNode("orchestrator", orchestrator)
    .addNode("llmCall", llmCall)
    .addNode("synthesizer", synthesizer)
    .addEdge("__start__", orchestrator)
    .addConditionalEdges(
        "orchestrator",
        asignWorker,
        ["llmCall"]
    )
    .addEdge("llmCall", "synthesizer")
    .addEdge("synthesizer", "__end__")
    .compile()

const state = await orchestratorWorker.invoke({
  topic: "Create a report on LLM scaling laws"
});    

console.log(state.finalReport);
