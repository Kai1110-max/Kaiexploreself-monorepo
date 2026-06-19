import { ChatPromptTemplate, HumanMessagePromptTemplate, SystemMessagePromptTemplate } from "@langchain/core/prompts"
import { z } from "zod";
import { chatModel } from "../config/config";
import { IUserORM, IThreadORM, IAgendaORM } from "../config/schema";
import { summarizeProfilicInfo } from './summary';

const generateThemeSteps = async (user: IUserORM, agenda: IAgendaORM, thread: IThreadORM) => {
  const language = user.isKorean ? "in KOREAN" : "in English";

  const systemTemplate = `
  [Role]
  You are an expert Clinical Child Psychologist and Parent Training Coach.
  
  [Task]
  Given a parent's challenge, provide a 3-step Parent Management Training (PMT) framework sequence (specifically the ABC Model: Antecedent, Behavior, Consequence) to help them analyze and solve this specific theme.
  
  The 3 steps must strictly follow this logic:
  - Step 1: Identify Antecedents (Triggers)
  - Step 2: Analyze the Target Behavior
  - Step 3: Plan the Consequence (Response/Intervention)
  
  For each of the 3 steps, provide:
  - 'label': A simple name for this step (e.g., "Step 1: Identify the Trigger").
  - 'description': A short, clear explanation of what the parent needs to do in this step.
  - 'question': A specific, empathetic question directly related to the user's theme that guides them to start reflecting on this step.
  
  All outputs must be ${language}. Be extremely concise and fast.

  [Input]
  <initial_information/>: Parent's initial brief introductory of difficulty.
  <theme_of_session/>: The specific scenario the parent wants to explore.
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
      theoryName: "Parent Management Training (ABC Model)",
      steps: [
        {
          label: "Step 1: Identify Antecedents",
          description: "Understand the triggers that occur immediately before the child's difficult behavior.",
          question: "What specific events, times, or interactions usually trigger this behavior?"
        },
        {
          label: "Step 2: Analyze Behavior",
          description: "Describe the child's specific actions without judgment.",
          question: "What exactly does the child do? Try to describe it as if you were watching a video recording."
        },
        {
          label: "Step 3: Plan Consequence",
          description: "Determine how you will respond to the behavior to either decrease it or encourage better alternatives.",
          question: "How do you usually react? How might you change your reaction next time?"
        }
      ]
    };
  }
}

export default generateThemeSteps;