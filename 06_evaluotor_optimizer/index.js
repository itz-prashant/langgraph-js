import * as z from "zod"
import {StateSchema, StateGraph} from "@langchain/langgraph"
import {ChatGroq} from "@langchain/groq"

const llm = new ChatGroq({
   model: "openai/gpt-oss-120b",
   apiKey: process.env.GROQ_API_KEY,
})


const State = new StateSchema({
    joke: z.string(),
    topic: z.string(),
    feedback: z.string(),
    funnyOrNot: z.string()
})

const feedbackSchema = z.object({
    grade: z.enum(["funny", "not funny"]).describe(
        "Decide if the joke is funny or not."
    ),
    feedback: z.string().describe(
        "If the joke is not funny, provide feedback on how to improve it."
    )
})

const evaluator = llm.withStructuredOutput(feedbackSchema)

const llmCallGenerator = async (state)=>{
    let msg;
    if(state.feedback){
        msg = await llm.invoke(
      `Write a joke about ${state.topic} but take into account the feedback: ${state.feedback}`
    );
    }else{
        msg = await llm.invoke(`Write a joke about ${state.topic}`);
    }

    return {joke: msg.content}
}

const llmCallEvaluator = async (state)=>{
    const grade = await evaluator.invoke(`Grade the joke ${state.joke}`)

     return { funnyOrNot: grade.grade, feedback: grade.feedback };
}

const routeJoke = async (state)=>{
    if(state.funnyOrNot === "funny"){
        return "Accepted";
    }else{
        return "Rejected + Feedback";
    }
}

const optimizerWorkflow  = new StateGraph(State)
    .addNode("llmCallGenerator", llmCallGenerator)
    .addNode("llmCallEvaluator", llmCallEvaluator)
    .addEdge("__start__", llmCallGenerator)
    .addEdge("llmCallGenerator", "llmCallEvaluator")
    .addConditionalEdges(
        "llmCallEvaluator",
        routeJoke,
        {
            "Accepted": "__end__",
            "Rejected + Feedback": "llmCallGenerator",
        }
    )
    .compile()

const state = await optimizerWorkflow.invoke({ topic: "Cats" });
console.log(state.joke);    