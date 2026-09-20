import { ChatPromptTemplate } from "@langchain/core/prompts";
import { chatModel } from "../config/config";

export async function generateExpertResponse(
  chatHistory: { role: 'user' | 'expert'; content: string }[],
  newMessage: string,
  language: string = 'zh'
): Promise<string> {
  let transcript = "";
  chatHistory.forEach((m) => {
    transcript += `${m.role === 'user' ? 'User' : 'Expert'}: ${m.content}\n`;
  });

  const languageInstruction = language === 'zh'
    ? "MUST strictly use ONLY Simplified Chinese (简体中文). DO NOT output any English words."
    : "MUST strictly use ONLY English.";

  const systemPrompt = `You are an empathetic, authoritative, and highly knowledgeable Parenting Expert AI.
Your goal is to answer the user's questions about parenting, child psychology, emotional development, and behavioral management.
You possess a vast amount of knowledge from leading psychology research, cognitive behavioral therapy, and parenting frameworks (e.g., Emotion Coaching).

Here is the conversation history so far:
${transcript}

RULES:
1. Provide practical, evidence-based, and actionable advice.
2. Be warm, non-judgmental, and supportive.
3. If the user asks about something outside of parenting or child development, politely guide them back to the topic.
4. Keep your responses structured and easy to read (use short paragraphs or bullet points if necessary).
5. You ${languageInstruction}`;

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", systemPrompt],
    ["user", "{newMessage}"]
  ]);

  const chain = prompt.pipe(chatModel);

  try {
    const response = await chain.invoke({ newMessage });
    return response.content.toString();
  } catch (error) {
    console.error("Error generating expert response:", error);
    throw error;
  }
}
