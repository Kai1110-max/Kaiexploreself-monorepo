import { ChatPromptTemplate, HumanMessagePromptTemplate, SystemMessagePromptTemplate } from "@langchain/core/prompts"
import { z } from "zod";
import { chatModel } from "../config/config";
import { IRoleplaySessionORM, IAgendaORM } from "../config/schema";
import { RoleplayAgentType } from "@core";
import { summarizeProfilicInfo } from './summary';


function fallbackHint(language: string) {
  return language === 'zh'
    ? "提示：先写下“我当时的第一情绪反应是什么”，再写“我对孩子说了哪一句接纳情绪的话”，最后写“我设定了什么界限/给了什么选择”。"
    : "Hint: write (1) your first emotional reaction, (2) the exact validation line you used, and (3) the limit/choice you offered.";
}

export async function generatePartnerResponse(agenda: IAgendaORM, session: IRoleplaySessionORM, newUserMessage: string, language: string = 'en'): Promise<string> {
  const init_info = await summarizeProfilicInfo(agenda.initialNarrative);
  const practiceMode = session.practiceMode || 3;
  
  let transcript = "";
  session.messages.forEach((m: any) => {
    if (m.sender === RoleplayAgentType.Child) transcript += `Child: ${m.content}\n`;
    else if (m.sender === RoleplayAgentType.Parent) transcript += `Parent: ${m.content}\n`;
    else if (m.sender === RoleplayAgentType.Moderator) transcript += `Coach: ${m.content}\n`;
  });

  const languageInstruction = language === 'zh' 
    ? "MUST strictly use ONLY Simplified Chinese (简体中文). DO NOT output any English words."
    : "MUST strictly use ONLY English.";

  let systemPrompt = "";

  if (practiceMode === 1) {
    systemPrompt = `You are an AI acting as a NOVICE PARENT in a roleplay simulation. 
The user is playing the role of 6-year-old Lele who doesn't want to go to school and is angry.
Your goal is to act like a typical novice parent who dismisses emotions, rushes the child, or yells. 
Do NOT use good emotion coaching skills. Invalidate the child's feelings, offer bribes, or use threats.

Here is the conversation history so far:
${transcript}

Rules:
1. Act entirely in character as the novice parent.
2. Keep your responses short (1-2 sentences).
3. You ${languageInstruction}`;
  } else if (practiceMode === 2) {
    systemPrompt = `You are an AI acting as an EXPERT PARENT in a roleplay simulation. 
The user is playing the role of 6-year-old Lele who doesn't want to go to school and is angry.
Your goal is to demonstrate PERFECT Emotion Coaching skills (Notice, Connect, Empathize, Label, Set Limits). 
Respond to the child's (user's) anger with extreme patience, empathy, and validation.

Here is the conversation history so far:
${transcript}

Rules:
1. Act entirely in character as the expert parent.
2. Keep your responses concise but highly empathetic.
3. You ${languageInstruction}`;
  } else {
    systemPrompt = `You are an AI acting as a specific child in a parent training simulation.
Your goal is to simulate realistic challenging behavior based on your profile, to help the parent practice their parenting skills.
The child's profile is: ${session.childProfile}

Here is the conversation history so far:
${transcript}

Rules:
1. Act entirely in character as the specific child described in the profile (e.g., 6-year-old Lele). Do not break character.
2. Be difficult, resistant, and deeply absorbed in your specific frustration, especially if the parent uses poor communication.
3. If the parent uses good Emotion Coaching skills, you can slightly de-escalate, but maintain the realism of a child's emotional state.
4. Keep your responses short, age-appropriate.
5. You ${languageInstruction}
6. VERY IMPORTANT: If the parent's message is clearly addressed to the "Coach" (e.g., "I feel angry"), DO NOT respond directly to that. In that case, just output an ambient action like ${language === 'zh' ? '"*在地上大哭*"' : '"*crying loudly*"'} using the target language.`;
  }

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", systemPrompt],
    ["user", "{newUserMessage}"]
  ]);
  const chain = prompt.pipe(chatModel);

  try {
    const response = await chain.invoke({
      newUserMessage
    });
    return response.content.toString();
  } catch (error) {
    console.error("Error generating partner response:", error);
    throw error;
  }
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
  try {
    const response = await chain.invoke({});
    return response.content.toString();
  } catch (error) {
    const inferredLang = /[\u4e00-\u9fff]/.test(`${stepLabel}${stepDescription}${currentText}`) ? 'zh' : 'en';
    return fallbackHint(inferredLang);
  }
}

export async function generateModeratorResponse(agenda: IAgendaORM, session: IRoleplaySessionORM, newUserMessage: string, partnerResponse: string, language: string = 'en'): Promise<string> {
  const init_info = await summarizeProfilicInfo(agenda.initialNarrative);
  const practiceMode = session.practiceMode || 3;

  const languageInstruction = language === 'zh' 
    ? "MUST strictly use ONLY Simplified Chinese (简体中文). DO NOT output any English words."
    : "MUST strictly use ONLY English.";

  let systemPrompt = "";

  if (practiceMode === 1) {
    systemPrompt = `You are an objective AI Moderator and Coach observing a roleplay between a Simulated Novice Parent and a User acting as a Child.
Your goal is to guide the user to experience what it feels like to be a child whose emotions are invalidated.
Analyze the user's message ("{newUserMessage}") and the AI parent's reaction ("{partnerResponse}").

Rules:
1. Point out how the AI Parent's response is likely making the child (the user) feel worse.
2. Encourage the user to act out their frustration naturally. 
3. Be concise (2-3 sentences max).
4. Give general advice, NOT specific copy-pasted responses.
5. You ${languageInstruction}`;
  } else if (practiceMode === 2) {
    systemPrompt = `You are an objective AI Moderator and Coach observing a roleplay between a Simulated Expert Parent and a User acting as a Child.
Your goal is to help the user notice the good Emotion Coaching skills the AI Parent is using.
Analyze the user's message ("{newUserMessage}") and the AI parent's reaction ("{partnerResponse}").

Rules:
1. Point out the specific Emotion Coaching skill (e.g., validating, labeling) the AI Parent just used.
2. Ask the user how it feels to be on the receiving end of that good parenting.
3. Be concise (2-3 sentences max).
4. Give general advice, NOT specific copy-pasted responses.
5. You ${languageInstruction}`;
  } else {
    systemPrompt = `You are an objective AI Moderator and Parent Coach observing a roleplay between a Parent (the user) and a Simulated Child.
The parent's initial problem is: ${init_info}

Your goal is to guide the parent through the "Emotion Coaching" exercise.
Analyze the parent's latest message ("{newUserMessage}") and the child's reaction ("{partnerResponse}").

Rules:
1. Provide GENERAL advice on what they should try to do next (e.g., "Think about how to validate the child's emotion before solving the problem"), but NEVER provide exact scripts or tailored sentences to copy-paste. We want them to think and learn, not cheat.
2. Point out if they used a good skill (e.g., emotion validation) or a poor one (e.g., escalation, invalidation).
3. Be concise (2-3 sentences max).
4. Address the parent directly.
5. You ${languageInstruction}`;
  }

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", systemPrompt],
    ["user", "User said: {newUserMessage}\nPartner reacted: {partnerResponse}"]
  ]);
  const chain = prompt.pipe(chatModel);

  try {
    const response = await chain.invoke({
      newUserMessage,
      partnerResponse
    });
    return response.content.toString();
  } catch (error) {
    console.error("Error generating moderator response:", error);
    throw error;
  }
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
