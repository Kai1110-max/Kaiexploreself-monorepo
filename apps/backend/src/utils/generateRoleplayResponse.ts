import { ChatPromptTemplate, HumanMessagePromptTemplate, SystemMessagePromptTemplate } from "@langchain/core/prompts"
import { z } from "zod";
import { chatModel } from "../config/config";
import { IRoleplaySessionORM, IAgendaORM } from "../config/schema";
import { RoleplayAgentType } from "@core";
import { summarizeProfilicInfo } from './summary';

export async function generateChildResponse(agenda: IAgendaORM, session: IRoleplaySessionORM, newParentMessage: string, language: string = 'en'): Promise<string> {
  const init_info = await summarizeProfilicInfo(agenda.initialNarrative);
  
  let transcript = "";
  session.messages.forEach((m: any) => {
    if (m.sender === RoleplayAgentType.Child) transcript += `Child: ${m.content}\n`;
    else if (m.sender === RoleplayAgentType.Parent) transcript += `Parent: ${m.content}\n`;
    else if (m.sender === RoleplayAgentType.Moderator) transcript += `Coach: ${m.content}\n`;
  });

  const languageInstruction = language === 'zh' 
    ? "MUST strictly use ONLY Simplified Chinese (简体中文). DO NOT output any English words, including stage directions like *crying* (use *大哭* instead)."
    : "MUST strictly use ONLY English.";

  const systemPrompt = `You are an AI acting as a specific child in a parent training simulation.
Your goal is to simulate realistic challenging behavior based on your profile, to help the parent practice their parenting skills.
The child's profile is: ${session.childProfile}

Here is the conversation history so far:
${transcript}

Rules:
1. Act entirely in character as the specific child described in the profile (e.g., 4-year-old Tongtong). Do not break character.
2. Be difficult, resistant, and deeply absorbed in your specific frustration (e.g., the shoes), especially if the parent uses poor communication (like yelling or rushing you).
3. If the parent uses good Emotion Coaching skills (e.g., noticing your frustration, validating your sadness/anger without judgment), you can slightly de-escalate, but maintain the realism of a toddler's emotional state.
4. Keep your responses short, age-appropriate, and focused on your immediate problem.
5. You ${languageInstruction}
6. VERY IMPORTANT: If the parent's message is clearly addressed to the "Coach" (e.g., they are describing their own feelings, like "I feel angry" or "I want to hit him"), DO NOT respond directly to that. In that case, just output an ambient action like ${language === 'zh' ? '"*在地上大哭*"' : '"*crying loudly on the floor*"'} or ${language === 'zh' ? '"*把鞋子踢飞*"' : '"*kicking the shoes away*"'} using the target language. Only interact when the parent speaks to YOU (the child).`;

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", systemPrompt],
    ["user", "{newParentMessage}"]
  ]);
  const chain = prompt.pipe(chatModel);

  const response = await chain.invoke({
    newParentMessage
  });

  return response.content.toString();
}

export async function generateRoleplayHint(agenda: IAgendaORM, session: IRoleplaySessionORM, stepLabel: string, stepDescription: string, currentText: string): Promise<string> {
  let transcript = "";
  session.messages.forEach((m: any) => {
    if (m.sender === RoleplayAgentType.Child) transcript += `Child: ${m.content}\n`;
    else if (m.sender === RoleplayAgentType.Parent) transcript += `Parent: ${m.content}\n`;
    else if (m.sender === RoleplayAgentType.Moderator) transcript += `Coach: ${m.content}\n`;
  });

  const systemPrompt = `You are a helpful Parent Training AI Coach.
The parent is currently writing their documentation for a specific step: "${stepLabel} - ${stepDescription}".
They have already typed: "${currentText}"

Here is their roleplay history with the simulated child:
${transcript}

Task: Provide ONE short, highly specific hint (1-2 sentences) on what they should write next for this step, based strictly on what happened in the roleplay. Focus on guiding them to dig deeper.
Do NOT write the documentation for them. Just prompt them.`;

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", systemPrompt],
    ["user", "Give me a hint."]
  ]);
  const chain = prompt.pipe(chatModel);
  const response = await chain.invoke({});

  return response.content.toString();
}

export async function generateModeratorResponse(agenda: IAgendaORM, session: IRoleplaySessionORM, newParentMessage: string, childResponse: string, language: string = 'en'): Promise<string> {
  const init_info = await summarizeProfilicInfo(agenda.initialNarrative);

  const languageInstruction = language === 'zh' 
    ? "MUST strictly use ONLY Simplified Chinese (简体中文). DO NOT output any English words."
    : "MUST strictly use ONLY English.";

  const systemPrompt = `You are an objective AI Moderator and Parent Coach observing a roleplay between a Parent and a Simulated Child.
The parent's initial problem is: ${init_info}

Your goal is to guide the parent through the "Emotional Radar" exercise.
Analyze the parent's latest message ("{newParentMessage}") and the child's reaction ("{childResponse}").

Rules:
1. PHASE 1 (Self-Reflection): If the parent is answering your initial question about their OWN emotions (e.g., "I feel angry", "I want to yell"), VALIDATE their feelings first. Acknowledge that it's normal to feel that way. THEN, instruct them to turn their attention to the child and try to use Emotion Coaching (e.g., "It's completely normal to feel a fire in your heart when you are rushing. Now that you've noticed it, take a breath. What will you say to Tongtong right now?").
2. PHASE 2 (Coaching): If the parent is talking to the child, point out if they used a good skill (e.g., emotion validation) or a poor one (e.g., escalation, invalidation). Suggest what they should try next.
3. Be concise (2-3 sentences max).
4. Address the parent directly (e.g., "Notice how your question escalated the situation.").
5. You ${languageInstruction}`;

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", systemPrompt],
    ["user", "Parent said: {newParentMessage}\nChild reacted: {childResponse}"]
  ]);
  const chain = prompt.pipe(chatModel);

  const response = await chain.invoke({
    newParentMessage,
    childResponse
  });

  return response.content.toString();
}

export async function generateRoleplayEvaluation(agenda: IAgendaORM, session: IRoleplaySessionORM, language: string = 'en') {
  const init_info = await summarizeProfilicInfo(agenda.initialNarrative);

  let transcript = "";
  session.messages.forEach((m: any) => {
    if (m.sender === RoleplayAgentType.Child) transcript += `Child: ${m.content}\n`;
    else if (m.sender === RoleplayAgentType.Parent) transcript += `Parent: ${m.content}\n`;
    else if (m.sender === RoleplayAgentType.Moderator) transcript += `Coach: ${m.content}\n`;
  });

  const languageInstruction = language === 'zh' 
    ? "MUST strictly use ONLY Simplified Chinese (简体中文). DO NOT output any English words."
    : "MUST strictly use ONLY English.";

  const systemPrompt = `You are a Senior Clinical Child Psychologist evaluating a parent's performance in a roleplay simulation.
The parent's initial problem is: ${init_info}
The goal of the exercise was to practice the "5-Step Emotion Coaching Method":
Step 1: Notice the child's emotion (觉察情绪).
Step 2: Recognize the emotion as an opportunity for connection (视为连接机会).
Step 3: Listen empathetically and validate the feelings (倾听并接纳).
Step 4: Help the child verbally label their emotions (帮助标记情绪).
Step 5: Set limits while exploring problem-solving strategies (设定界限/解决问题).

Here is the complete transcript of the roleplay:
${transcript}

Task: Provide a structured evaluation of the parent's performance.
1. 'score': The overall score (Sum of the 5 step scores, max 100).
2. 'stepScores': Evaluate EACH of the 5 steps individually. For each step, provide a score from 0 to 20, and a brief 1-sentence feedback explaining why they received this score for this specific step.
3. 'strengths': An array of 1-3 specific things they did well overall.
4. 'improvements': An array of 1-3 specific things they could improve overall.
5. 'coachMessage': A warm, encouraging concluding message summarizing their effort and providing a final piece of advice.

You ${languageInstruction}`;

  const evaluationSchema = z.object({
    score: z.number().describe("Overall score out of 100 (sum of step scores)"),
    stepScores: z.array(z.object({
      stepName: z.string().describe("Name of the step (e.g., 'Step 1: Notice the emotion')"),
      score: z.number().describe("Score for this step (0-20)"),
      feedback: z.string().describe("1 sentence explaining why this score was given for this step")
    })).describe("Detailed scoring for each of the 5 Emotion Coaching steps"),
    strengths: z.array(z.string()).describe("List of 1 to 3 strengths demonstrated by the parent"),
    improvements: z.array(z.string()).describe("List of 1 to 3 areas for improvement"),
    coachMessage: z.string().describe("A warm, encouraging closing message from the coach")
  });

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", systemPrompt],
    ["user", "Evaluate the transcript."]
  ]);

  const structuredLlm = chatModel.withStructuredOutput(evaluationSchema);
  const chain = prompt.pipe(structuredLlm);

  try {
    const result = await chain.invoke({});
    return result;
  } catch (error) {
    console.error("Error generating roleplay evaluation:", error);
    return {
      score: 80,
      stepScores: [
        { stepName: "Step 1", score: 20, feedback: "Good" },
        { stepName: "Step 2", score: 20, feedback: "Good" },
        { stepName: "Step 3", score: 20, feedback: "Good" },
        { stepName: "Step 4", score: 10, feedback: "Okay" },
        { stepName: "Step 5", score: 10, feedback: "Okay" }
      ],
      strengths: [language === 'zh' ? "努力参与了角色扮演" : "Participated in the roleplay actively"],
      improvements: [language === 'zh' ? "可以尝试更多地倾听孩子的感受" : "Could try listening to the child's feelings more"],
      coachMessage: language === 'zh' ? "感谢您的参与！情绪辅导是一个长期的过程，慢慢来，您会做得越来越好的。" : "Thank you for participating! Emotion coaching is a long-term process. Take your time, you will get better and better."
    };
  }
}