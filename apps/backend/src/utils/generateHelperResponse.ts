import { ChatPromptTemplate } from "@langchain/core/prompts";
import { chatModel } from "../config/config";

export async function generateHelperResponse(coachQuestion: string, chatHistory: {role: string, content: string}[], language: string = 'en', practiceMode: number = 1) {
    const isZh = language === 'zh';
    
    // Inject the specific video context based on the current practice mode
    let videoContext = "";
    if (practiceMode === 1) {
        videoContext = `
[Video Context: "Dismissive Parent"]
- Situation: 6-year-old Lele is refusing to go to school.
- Mother's Response: The mother does not empathize with his feelings at all. Instead, she constantly rushes him, applies pressure, uses a dismissive/blaming tone, and tells him to hurry up.
`;
    } else if (practiceMode === 2) {
        videoContext = `
[Video Context: "Supportive Parent / Emotion Coaching"]
- Situation: 6-year-old Lele is refusing to go to school.
- Mother's Response: The mother uses Emotion Coaching. She sits down calmly, acknowledges his feelings ("It looks like you are feeling really sad/anxious today"), validates his emotions, and gently guides him to express himself before gently setting the limit that he still needs to go to school.
`;
    }

    const systemPrompt = `You are a warm, professional reflection Helper Agent (an AI assistant).
The user is currently reflecting on a parenting video. 

${videoContext}

The AI Coach just asked the user this question:
"${coachQuestion}"

Your task is to provide a brief, inspiring scaffold or a different perspective to help the user think deeper about this specific question.
CRITICAL RULES:
1. ALWAYS base your hints on the [Video Context] provided above. If you give an example, it MUST be about Lele and the morning school routine, NOT random situations like "family dinners".
2. DO NOT answer the question directly for them. Just guide their thinking process.
3. Keep it brief (1-3 sentences max).
4. Use ${isZh ? 'Simplified Chinese' : 'English'} only.`;

    const formattedHistory: [string, string][] = chatHistory.map(m => [m.role === 'helper' ? 'assistant' : 'user', m.content]);

    // Construct messages array explicitly to satisfy TypeScript
    let messages: any[] = [
        ["system", systemPrompt]
    ];
    
    if (formattedHistory.length > 0) {
        messages = [...messages, ...formattedHistory];
    } else {
        messages.push(["user", "Give me a hint on how to think about this question based on the video."]);
    }

    const actualPrompt = ChatPromptTemplate.fromMessages(messages);

    try {
        const chain = actualPrompt.pipe(chatModel);
        const response = await chain.invoke({});
        return response.content.toString();
    } catch (e) {
        console.error("Helper error:", e);
        return isZh ? "抱歉，我暂时无法思考，请稍后再试。" : "Sorry, I am unable to think right now. Please try again later.";
    }
}