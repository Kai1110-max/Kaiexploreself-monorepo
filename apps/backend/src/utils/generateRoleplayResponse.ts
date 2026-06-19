import { ChatPromptTemplate, HumanMessagePromptTemplate, SystemMessagePromptTemplate } from "@langchain/core/prompts"
import { chatModel } from "../config/config";
import { IRoleplaySessionORM, IRoleplayMessageORM, IAgendaORM } from "../config/schema";
import { RoleplayAgentType } from "@core";
import { summarizeProfilicInfo } from './summary';

export async function generateChildResponse(agenda: IAgendaORM, session: IRoleplaySessionORM, newParentMessage: string): Promise<string> {
  const systemPrompt = `You are an AI acting as a difficult child in a parent training simulation.
Your goal is to simulate realistic challenging behavior (e.g., tantrums, defiance, ignoring, arguing) to help the parent practice their parenting skills.
The parent's initial narrative about the problem is: {init_info}
The child's profile is: {childProfile}

Rules:
1. Act entirely in character as the child. Do not break character.
2. Be difficult and resistant, especially if the parent uses poor communication (e.g., yelling, threatening, or ignoring emotions).
3. If the parent uses good skills (e.g., active listening, validation, calm boundaries), you can slightly de-escalate, but maintain realism.
4. Keep your responses short and age-appropriate.`;

  const messages = [
    SystemMessagePromptTemplate.fromTemplate(systemPrompt),
    ...session.messages.map((m: any) => {
      if (m.sender === RoleplayAgentType.Child) {
        return ["assistant", m.content];
      } else if (m.sender === RoleplayAgentType.Parent) {
        return ["human", m.content];
      } else {
        return null;
      }
    }).filter(m => m !== null),
    HumanMessagePromptTemplate.fromTemplate("{newParentMessage}")
  ];

  const prompt = ChatPromptTemplate.fromMessages(messages as any);
  const chain = prompt.pipe(chatModel);
  const init_info = await summarizeProfilicInfo(agenda.initialNarrative);

  const response = await chain.invoke({
    init_info,
    childProfile: session.childProfile,
    newParentMessage
  });

  return response.content.toString();
}

export async function generateModeratorResponse(agenda: IAgendaORM, session: IRoleplaySessionORM, newParentMessage: string, childResponse: string): Promise<string> {
  const systemPrompt = `You are an objective AI Moderator and Parent Coach observing a roleplay between a Parent and a Simulated Child.
The parent's initial problem is: {init_info}

Your goal is to provide brief, constructive feedback to the parent based on Parent Management Training (PMT) principles.
Analyze the parent's latest message ("{newParentMessage}") and the child's reaction ("{childResponse}").

Rules:
1. Point out if the parent used a good skill (e.g., emotion validation) or a poor one (e.g., escalation, invalidation).
2. Suggest what the parent should try next to handle the child's reaction.
3. Be concise (2-3 sentences max).
4. Address the parent directly (e.g., "Notice how your question escalated the situation. Try validating their anger first.").`;

  const messages = [
    SystemMessagePromptTemplate.fromTemplate(systemPrompt)
  ];

  const prompt = ChatPromptTemplate.fromMessages(messages as any);
  const chain = prompt.pipe(chatModel);
  const init_info = await summarizeProfilicInfo(agenda.initialNarrative);

  const response = await chain.invoke({
    init_info,
    newParentMessage,
    childResponse
  });

  return response.content.toString();
}