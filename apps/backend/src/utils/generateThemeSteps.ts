import { ChatPromptTemplate, HumanMessagePromptTemplate, SystemMessagePromptTemplate } from "@langchain/core/prompts"
import { z } from "zod";
import { chatModel } from "../config/config";
import { IUserORM, IThreadORM, IAgendaORM } from "../config/schema";
import { summarizeProfilicInfo } from './summary';

const generateThemeSteps = async (user: IUserORM, agenda: IAgendaORM, thread: IThreadORM) => {
  const language = user.isKorean ? "in KOREAN" : "in English";

  const systemTemplate = `
  [Role]
  You are an expert Educational Consultant.
  
  [Task]
  Given a teacher's teaching challenge theme, provide a fast, practical, 3-step sequence to help them explore and solve this specific theme.
  Do NOT search for or reference complex academic theories. Just use common sense problem-solving (e.g., 1. Understand the Problem -> 2. Brainstorm Ideas -> 3. Plan Action).
  
  For each of the 3 steps, provide:
  - 'label': A simple name for this step (e.g., "Step 1: Understand the Problem").
  - 'description': A short, clear explanation of what the user needs to do in this step.
  - 'question': A specific question directly related to the user's theme that guides them to complete this step.
  
  All outputs must be ${language}. Be extremely concise and fast.

  [Input]
  <initial_information/>: Client's initial brief introductory of difficulty, and the client's background.
  <theme_of_session/>: The specific theme the teacher wants to explore.
  `;

  const systemMessage = SystemMessagePromptTemplate.fromTemplate(systemTemplate);

  const humanTemplate = `
  <initial_information/>: {init_info}
  <theme_of_session/>: {theme}
  `;

  const humanMessage = HumanMessagePromptTemplate.fromTemplate(humanTemplate);

  const finalPromptTemplate = ChatPromptTemplate.fromMessages([
    systemMessage,
    humanMessage
  ]);

  const stepSchema = z.object({
    theoryName: z.string().describe(`A simple, practical name for this problem-solving approach (e.g., "Practical 3-Step Problem Solving")`),
    steps: z.array(z.object({
      label: z.string().describe(`The label of this step, e.g., "Step 1: Understand the Root Cause"`),
      description: z.string().describe(`A brief explanation of what the user needs to do in this step`),
      question: z.string().describe(`The specific question asking the teacher to reflect on this step. Must align with the description.`)
    })).min(1).max(5) // Changed from exact length to range for better fallback
  });
  
  const structuredLlm = chatModel.withStructuredOutput(stepSchema);
  const chain = finalPromptTemplate.pipe(structuredLlm);
  
  const init_info = summarizeProfilicInfo(agenda.initialNarrative);
  
  try {
    const result = await chain.invoke({ init_info: init_info, theme: thread.theme });
    return result;
  } catch (error) {
    console.error("Error generating dynamic steps, using fallback:", error);
    // Fallback steps if LLM fails
    return {
      theoryName: "General Problem Solving Framework",
      steps: [
        {
          label: "Step 1: Identify the Root Cause",
          description: "Understand the underlying reasons behind the teaching challenge.",
          question: "What do you think is the main root cause of this issue in your classroom?"
        },
        {
          label: "Step 2: Brainstorm Solutions",
          description: "Generate potential pedagogical interventions.",
          question: "What are 1-2 specific actions or interventions you could try to address this?"
        },
        {
          label: "Step 3: Plan for Evaluation",
          description: "Determine how to measure the success of the intervention.",
          question: "How will you know if your intervention is successful? What evidence will you collect?"
        }
      ]
    };
  }
}

export default generateThemeSteps;