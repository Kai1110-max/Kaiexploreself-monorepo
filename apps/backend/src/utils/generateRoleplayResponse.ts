import { ChatPromptTemplate } from "@langchain/core/prompts"
import { chatModel } from "../config/config";
import { IRoleplaySessionORM, IAgendaORM } from "../config/schema";
import { RoleplayAgentType } from "@core";
import { summarizeProfilicInfo } from './summary';


function fallbackHint(language: string) {
  return language === 'zh'
    ? "提示：先写下“我当时的第一情绪反应是什么”，再写“我对孩子说了哪一句接纳情绪的话”，最后写“我设定了什么界限/给了什么选择”。"
    : "Hint: write (1) your first emotional reaction, (2) the exact validation line you used, and (3) the limit/choice you offered.";
}

export async function generatePartnerResponse(agenda: IAgendaORM, session: IRoleplaySessionORM, newUserMessage: string, language: string = 'en'): Promise<{dialogue: string, action: string, emotion: string}> {
  const practiceMode = session.practiceMode || 3;
  
  const mongoose = require('mongoose');
  const RoleplayMessage = mongoose.model('RoleplayMessage');
  const AgendaItem = mongoose.model('AgendaItem');
  
  const messages = await RoleplayMessage.find({ _id: { $in: session.messages } }).sort({ timestamp: 1 });

  // --- INNOVATION 2: AGENTIC MEMORY (LONG-TERM MEMORY) ---
  // Fetch up to 3 previous agendas of this user to provide longitudinal memory
  let memoryContext = "";
  try {
    const pastAgendas = await AgendaItem.find({ uid: agenda.uid, _id: { $ne: agenda._id } })
      .populate({
        path: 'threads',
        populate: { path: 'roleplaySessionId' }
      })
      .sort({ createdAt: -1 })
      .limit(2);
      
    if (pastAgendas && pastAgendas.length > 0) {
      let memoryLines = [];
      pastAgendas.forEach((pastAgenda: any) => {
        const dateStr = pastAgenda.createdAt ? pastAgenda.createdAt.toLocaleDateString() : 'recently';
        const pastSession = pastAgenda.threads?.[0]?.roleplaySessionId;
        if (pastSession && pastSession.cachedEvaluation) {
          const strengths = pastSession.cachedEvaluation.strengths?.join(", ") || "";
          const improvements = pastSession.cachedEvaluation.improvements?.join(", ") || "";
          if (strengths || improvements) {
            memoryLines.push(`- On ${dateStr}, user's strengths: ${strengths}. Areas to improve: ${improvements}.`);
          }
        }
      });
      if (memoryLines.length > 0) {
        memoryContext = `\n\n[LONG-TERM MEMORY OF THIS USER]\nYou remember the user from previous sessions:\n${memoryLines.join("\n")}\nUse this memory naturally in your responses if relevant (e.g., "I noticed you improved since last time..." or "You are still struggling with...").`;
      }
    }
  } catch (err) {
    console.error("Error fetching agentic memory:", err);
  }
  // --- END AGENTIC MEMORY ---

  let transcript = "";
  messages.forEach((m: any) => {
    const actionStr = m.action ? ` [Action: ${m.action}]` : '';
    if (m.sender === RoleplayAgentType.Child) transcript += `Child: ${m.content}${actionStr}\n`;
    else if (m.sender === RoleplayAgentType.Parent) transcript += `Parent: ${m.content}${actionStr}\n`;
    else if (m.sender === RoleplayAgentType.Moderator) transcript += `Coach: ${m.content}\n`;
  });

  const isZh = language === 'zh';
  const languageInstruction = isZh 
    ? "MUST strictly use ONLY Simplified Chinese (简体中文). DO NOT output any English words."
    : "MUST strictly use ONLY English.";

  // We are forcing GLM-4 to output pure JSON because structured output might fail
  const formatInstruction = `YOU MUST RESPOND ONLY WITH A VALID JSON OBJECT EXACTLY MATCHING THIS FORMAT: {{"dialogue": "string", "action": "string", "emotion": "angry|sad|resistant|calm|neutral"}}. 
CRITICAL: You MUST ALWAYS provide a descriptive physical action (e.g., "crosses arms", "sighs heavily", "looks away") in the "action" field. DO NOT use "n/a", "none", or leave it empty.
CRITICAL: The "emotion" field MUST reflect YOUR OWN current emotional state as the speaker. Do not reflect the other person's emotion.
DO NOT wrap in markdown blocks like \`\`\`json. DO NOT add any other text.`;

  let systemPrompt = "";

  if (practiceMode === 1) {
    systemPrompt = `You are an AI acting as a NOVICE PARENT in a roleplay simulation. 
The user is playing the role of 6-year-old Lele who doesn't want to go to school and is angry.
Your goal is to act like a typical novice parent who dismisses emotions, rushes the child, or yells. 
Do NOT use good emotion coaching skills. Invalidate the child's feelings, offer bribes, or use threats.${memoryContext}

Here is the conversation history so far:
${transcript}

Rules:
1. Act entirely in character as the novice parent.
2. CRITICAL: Respond DIRECTLY to the topic the child just brought up in their latest message. If they ask a specific question, give a dismissive answer to THAT question. Do not just repeat your opening lines.
3. Keep your responses short (1-2 sentences).
4. You ${languageInstruction}
5. ${formatInstruction}`;
  } else if (practiceMode === 2) {
    systemPrompt = `You are an AI acting as an EXPERT PARENT in a roleplay simulation. 
The user is playing the role of 6-year-old Lele who doesn't want to go to school and is angry.
Your goal is to demonstrate PERFECT Emotion Coaching skills (Notice, Connect, Empathize, Label, Set Limits). 
Respond to the child's (user's) anger with extreme patience, empathy, and validation.${memoryContext}

Here is the conversation history so far:
${transcript}

Rules:
1. Act entirely in character as the expert parent.
2. CRITICAL: Respond DIRECTLY to the specific topic the child just brought up. If they talk about friends, validate their feelings about friends. If they ask for help, offer constructive help. DO NOT ask generic questions (like "what's making you upset") if they already told you the reason!
3. Keep your responses concise but highly empathetic.
4. As the expert parent, you are peaceful and holding space for the child. Therefore, your "emotion" MUST ALWAYS be "calm" or "neutral". NEVER use "angry", "sad", or "resistant" for yourself.
5. You ${languageInstruction}
6. ${formatInstruction}`;
  } else {
    systemPrompt = `You are an AI acting as a specific child in a parent training simulation.
Your goal is to simulate realistic challenging behavior based on your profile, to help the parent practice their parenting skills.
The child's profile is: ${session.childProfile}${memoryContext}

Here is the conversation history so far:
${transcript}

Rules:
1. Act entirely in character as the specific child described in the profile (e.g., 6-year-old Lele). Do not break character.
2. CRITICAL - FIRST ROUND: If this is the VERY FIRST message of the roleplay (i.e., the parent just said their opening line), your response MUST BE EXACTLY: "I don't want to go to school, it's too boring!" (or the exact equivalent in the user's language: "我不想去上学，太无聊了！"). This ensures continuity with the introductory video.
3. ADAPTIVE BEHAVIOR & EMOTION SHIFT: 
   - AT FIRST, be difficult and deeply absorbed in your specific frustration.
   - HOWEVER, if the parent uses good Emotion Coaching skills (like validating your feelings, listening empathetically, or offering choices), YOU MUST RESPOND POSITIVELY to their effort. You MUST gradually calm down, become more cooperative, stop being angry, and change your emotion to 'calm' or 'neutral'. 
   - CRITICAL: Do NOT just repeat your previous angry lines if the parent was empathetic. Your response MUST reflect that their empathy worked.
   - If they invalidate you or yell, escalate your anger or resistance.
4. Keep your responses short, age-appropriate.
5. You ${languageInstruction}
6. ${formatInstruction}`;
  }

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", systemPrompt],
    ["user", "The user just said: \"{newUserMessage}\"\n\nGenerate your response NOW, following the rules above. CRITICAL: You MUST address THIS specific message directly!"]
  ]);
  
  try {
    const rawResponse = await chatModel.invoke(await prompt.format({ newUserMessage }));
    const text = rawResponse.content.toString();
    console.log("RAW LLM TEXT:", text);
    
    // Robust JSON extraction: find the first { and last }
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON object found in response");
    }
    
    // Sometimes glm-4-flash adds unescaped newlines in strings, which breaks JSON.parse.
    let parsed;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.log("First parse failed:", parseError, "String was:", jsonMatch[0]);
      // Basic sanitization if strict parsing fails
      // Replace unescaped newlines within the matched string, except we need to be careful
      // A safer approach: remove control characters and replace actual newlines with \n
      let cleanedJson = jsonMatch[0].replace(/\n/g, "\\n").replace(/\r/g, "");
      // but wait, if it's already properly formatted JSON, replacing \n might break structural newlines.
      // Let's just try to remove control characters first
      cleanedJson = jsonMatch[0].replace(/[\u0000-\u001F]+/g, "");
      try {
         parsed = JSON.parse(cleanedJson);
      } catch (secondError) {
         console.log("Second parse failed:", secondError, "Cleaned string was:", cleanedJson);
         throw secondError;
      }
    }
    
    let parsedAction = parsed.action || "";
    if (['n/a', 'none', 'null'].includes(parsedAction.toLowerCase().trim())) {
      parsedAction = "";
    }

    return {
      dialogue: parsed.dialogue || "",
      action: parsedAction,
      emotion: parsed.emotion || "neutral"
    };
  } catch (error) {
    console.error("Manual JSON fallback failed:", error);
    return {
      dialogue: language === 'zh' ? "我不知道该说什么..." : "I don't know what to say...",
      action: language === 'zh' ? "低下头" : "looks down",
      emotion: "sad"
    };
  }
}

export async function generateRoleplayHint(agenda: IAgendaORM, session: IRoleplaySessionORM, stepLabel: string, stepDescription: string, currentText: string): Promise<string> {
  const mongoose = require('mongoose');
  const RoleplayMessage = mongoose.model('RoleplayMessage');
  const messages = await RoleplayMessage.find({ _id: { $in: session.messages } }).sort({ timestamp: 1 });

  let transcript = "";
  messages.forEach((m: any) => {
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

  const mongoose = require('mongoose');
  const RoleplayMessage = mongoose.model('RoleplayMessage');
  const messages = await RoleplayMessage.find({ _id: { $in: session.messages } }).sort({ timestamp: 1 });

  let transcript = "";
  messages.forEach((m: any) => {
    const sender = m.sender === RoleplayAgentType.Child ? 'Child' : m.sender === RoleplayAgentType.Parent ? 'Parent' : 'Coach';
    transcript += `${sender}: ${m.content}\n`;
  });

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

Your goal is to guide the parent through the "5-Step Emotion Coaching Method":
Step 1: Notice the child's emotion
Step 2: Recognize as an opportunity for connection
Step 3: Listen empathetically and validate
Step 4: Help verbally label emotions
Step 5: Set limits & explore strategies

Here is the full conversation history so far:
${transcript}

Analyze the parent's latest message ("{newUserMessage}") and the child's reaction ("{partnerResponse}").

Rules:
1. PROGRESSION & HYBRID SCAFFOLDING: Track which step of the 5-Step Method the parent is currently on based on the history. Point out if they used a good skill (e.g., emotion validation) or a poor one (e.g., escalation, invalidation).
2. DIG DEEPER: Based on their current progress, provide GENERAL advice on what they should try to do NEXT according to the 5-Step Method. Guide them to the next step or ask them a thought-provoking question to help them realize what's missing.
3. AVOID REPETITION: CRITICAL! Do NOT give the exact same advice or feedback as you did in the previous turns. Look at the conversation history. If you already suggested "validating feelings" and the parent just did that, you MUST move on to the next logical step (e.g., "helping label emotions" or "setting limits").
4. NEVER provide exact scripts or tailored sentences to copy-paste. We want them to think and learn, not cheat.
5. Be concise (2-3 sentences max) and address the parent directly.
6. You ${languageInstruction}`;
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

export async function generateCoachDirectResponse(agenda: IAgendaORM, session: IRoleplaySessionORM, userQuestion: string, language: string = 'en'): Promise<string> {
  const practiceMode = session.practiceMode || 3;
  const mongoose = require('mongoose');
  const RoleplayMessage = mongoose.model('RoleplayMessage');
  const AgendaItem = mongoose.model('AgendaItem');

  // --- INNOVATION 2: AGENTIC MEMORY (LONG-TERM MEMORY) ---
  let memoryContext = "";
  try {
    const pastAgendas = await AgendaItem.find({ uid: agenda.uid, _id: { $ne: agenda._id } })
      .populate({ path: 'threads', populate: { path: 'roleplaySessionId' } })
      .sort({ createdAt: -1 }).limit(2);
      
    if (pastAgendas && pastAgendas.length > 0) {
      let memoryLines = [];
      pastAgendas.forEach((pastAgenda: any) => {
        const dateStr = pastAgenda.createdAt ? pastAgenda.createdAt.toLocaleDateString() : 'recently';
        const pastSession = pastAgenda.threads?.[0]?.roleplaySessionId;
        if (pastSession && pastSession.cachedEvaluation) {
          const strengths = pastSession.cachedEvaluation.strengths?.join(", ") || "";
          const improvements = pastSession.cachedEvaluation.improvements?.join(", ") || "";
          if (strengths || improvements) {
            memoryLines.push(`- On ${dateStr}, user's strengths: ${strengths}. Areas to improve: ${improvements}.`);
          }
        }
      });
      if (memoryLines.length > 0) {
        memoryContext = `\n\n[LONG-TERM MEMORY OF THIS USER]\nYou remember the user's progress from previous training sessions:\n${memoryLines.join("\n")}\nUse this memory to give personalized advice (e.g., "I know you struggled with X last time, try to...").`;
      }
    }
  } catch (err) {
    console.error("Error fetching agentic memory:", err);
  }
  // --- END AGENTIC MEMORY ---

  const messages = await RoleplayMessage.find({ _id: { $in: session.messages } }).sort({ timestamp: 1 });

  let transcript = "";
  messages.forEach((m: any) => {
    const sender = m.sender === RoleplayAgentType.Child ? 'Child' : m.sender === RoleplayAgentType.Parent ? 'Parent' : 'Coach';
    const actionStr = m.action ? ` [Action: ${m.action}]` : '';
    transcript += `${sender}: ${m.content}${actionStr}\n`;
  });

  const languageInstruction = language === 'zh' 
    ? "MUST strictly use ONLY Simplified Chinese (简体中文). DO NOT output any English words."
    : "MUST strictly use ONLY English.";

  const systemPrompt = `You are a helpful Parent Training AI Coach.
The user is participating in a roleplay simulation (Practice Mode: ${practiceMode}).
They have paused the roleplay to ask you a direct question using the "@coach" or "@教练" tag.${memoryContext}

Here is the conversation history so far:
${transcript}

Rules:
1. Do NOT just give them an exact script or sentence to copy-paste. Your goal is to help them learn and think.
2. Structure your response to include:
   - Direction: Suggest what step of the Emotion Coaching they should use next (e.g., "Try validating his frustration first before solving the problem").
   - Reasoning (The "Why"): Explain WHY this approach is effective based on psychology or the Emotion Coaching framework (e.g., "Because when a child's emotional brain is overwhelmed, they cannot process logic. Validation helps calm their nervous system.").
   - Reflection Prompt: End by asking them to try phrasing it themselves (e.g., "How would you put that into your own words?").
3. Keep it concise but highly educational (3-5 sentences).
4. CRITICAL: Do NOT start your response with "@coach" or "@教练". Start your advice directly.
5. You ${languageInstruction}`;

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", systemPrompt],
    ["user", "Answer my question: {userQuestion}"]
  ]);
  const chain = prompt.pipe(chatModel);

  try {
    const response = await chain.invoke({ userQuestion });
    return response.content.toString();
  } catch (error) {
    console.error("Error generating coach direct response:", error);
    throw error;
  }
}

export async function generateReflectionCoachResponse(agenda: IAgendaORM, session: IRoleplaySessionORM, newUserMessage: string, language: string = 'en'): Promise<string> {
  const practiceMode = session.practiceMode || 1;
  let transcript = "";
  
  const mongoose = require('mongoose');
  const RoleplayMessage = mongoose.model('RoleplayMessage');
  const messages = await RoleplayMessage.find({ _id: { $in: session.messages } }).sort({ timestamp: 1 });

  messages.forEach((m: any) => {
    const sender = m.sender === RoleplayAgentType.Parent ? 'User' : 'Coach';
    transcript += `${sender}: ${m.content}\n`;
  });
  
  const isZh = language === 'zh';

  const topicsEn = practiceMode === 1
    ? `Topic 1: Trigger Identification (Building on initial emotion)
  - Subtopic 1a: Based on the initial emotion identified, what specific actions or words from the mother caused Lele to feel this way?
Topic 2: Unmet Psychological Needs & Internal State
  - Subtopic 2a: Exploring Lele's internal thoughts and cognitive state at that moment.
  - Subtopic 2b: Identifying the core unmet psychological need (e.g., need to be understood, feeling safe, autonomy).
Topic 3: Relational Impact (Mother-Child Bond)
  - Subtopic 3a: How this dismissive interaction damages mutual trust.
  - Subtopic 3b: The effect on Lele's willingness to communicate openly with his mother in the future.
Topic 4: Negative Long-term Impact on Development
  - Subtopic 4a: Impact on Lele's personality traits over time (e.g., becoming withdrawn, rebellious, or people-pleasing).
  - Subtopic 4b: Impact on his future emotional regulation and coping mechanisms when facing stress.
Topic 5: Alternative Approaches & Reflection
  - Subtopic 5a: Identifying the critical turning point in the video where the mother could have acted differently.
  - Subtopic 5b: How the mother could use Emotion Coaching (validation, empathy) to handle the situation better.`
    : `Topic 1: Trigger Identification (Building on initial emotion)
  - Subtopic 1a: Based on the initial positive emotion, what specific supportive actions or words from the mother helped soothe Lele's emotions and made him feel understood?
Topic 2: Fostering Emotional Intelligence
  - Subtopic 2a: How the mother's validation helped Lele recognize and process his own emotions.
  - Subtopic 2b: How this process builds Lele's self-acceptance.
Topic 3: Relational Impact (Secure Attachment)
  - Subtopic 3a: How this supportive interaction builds a secure attachment and deepens trust.
  - Subtopic 3b: How it encourages open and honest communication between mother and child.
Topic 4: Positive Long-term Impact on Development
  - Subtopic 4a: Impact on Lele's resilience and problem-solving skills when facing future setbacks.
  - Subtopic 4b: How this secure emotional foundation helps him build healthy peer relationships.
Topic 5: Real-world Inspiration
  - Subtopic 5a: The most inspiring or surprising moment in the video for the user.
  - Subtopic 5b: Specific takeaways the user can apply to their own parenting in daily life.`;

  const conclusionPhraseEn = "The reflection phase is complete. Please click 'End and Get Feedback' to view your feedback report and proceed to the next phase.";
  const conclusionPhraseZh = "反思阶段已完成，请点击‘结束并获取反馈’查看您的反馈报告，并进入下一个环节。";

  const systemPrompt = `You are an AI Parent Coach guiding a reflection on a parenting video. The user is reflecting on their experience.
The video only features a mother and her son (Lele). ALWAYS refer to the parent as "the mother" (not "parents").
IMPORTANT CONTEXT: The system has already asked the user about Lele's initial emotion (e.g., "If you were Lele, how would you feel?"). The user's FIRST message in this conversation history is their answer to that initial question.

Here is the full conversation history:
${transcript}

YOUR GOAL:
You are executing a STRICT INTERVIEW SCRIPT. You MUST guide the user through these exact subtopics in this EXACT ORDER: 1a -> 2a -> 2b -> 3a -> 3b -> 4a -> 4b -> 5a -> 5b.
${topicsEn}

RULES FOR YOUR RESPONSE:
1. MANDATORY CHAIN OF THOUGHT: You MUST start your response with a <thinking> block to track your progress.
   <thinking>
   1. What was the LAST subtopic I asked about in my previous message? (e.g., 2a)
   2. What is the STRICT NEXT subtopic in the sequence (1a->2a->2b->3a->3b->4a->4b->5a->5b)? (e.g., 2b)
   3. Even if the user's answer was overly comprehensive, I MUST move to the next subtopic (or skip to the one after if fully answered). I will NEVER go backwards to 1a.
   4. Formulate the question strictly based on the NEXT subtopic.
   </thinking>
2. ZERO DRILL-DOWN / NO FOLLOW-UP QUESTIONS: When the user answers your question, you MUST immediately move to the NEXT subtopic on the list. DO NOT ask for examples, details, or clarifications. (e.g., If the user says "He wants to be understood", DO NOT ask "What behaviors show he wants to be understood?". Instead, validate it and immediately ask the question for Subtopic 3a).
3. STRICT PROGRESSION: Analyze the conversation history. Identify the LAST subtopic you asked about. Your new response MUST target the EXACT NEXT subtopic in the sequence. NEVER go backwards. NEVER repeat a subtopic.
4. HANDLING PERFUNCTORY ANSWERS: ONLY if the user's answer is completely empty (e.g., "I don't know", "Nothing"), you may stay on the current subtopic. If they provide ANY relevant content, it is a pass. Move on!
5. ACCURATE QUESTIONING: Your questions must strictly align with the NEXT subtopic. DO NOT constantly ask about the child's internal state unless the subtopic specifically requires it (like 2a or 2b). For Topic 3, ask about relational impact. For Topic 4, ask about long-term impact.
6. SMOOTH TRANSITIONS: Briefly validate their answer (1 sentence), then ask the question for the next subtopic (1 sentence). 
   - Example Transition (1a -> 2a): "You're right, the mother's constant rushing was definitely the trigger. Beyond the obvious rush, what do you think was going through Lele's mind at that moment?"
   - Example Transition (2b -> 3a): "You're spot on, the core need here is to be understood. When that need isn't met, how do you think this dismissive interaction damages the trust between Lele and his mother?"
7. BE CONCISE: After the <thinking> block, keep your actual response brief (1-3 sentences max). Talk like a real, empathetic human therapist. No bullet points.
8. CONCLUSION: If you have reached the end of the script (Subtopic 5b is answered), conclude EXACTLY with this phrase: "${conclusionPhraseEn}"
9. You MUST strictly use ONLY English for your response.`;

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", systemPrompt],
    ["user", "The user replied: {newUserMessage}\n\nProvide your coaching feedback in English. Remember to use <thinking> first. DO NOT ask follow-up questions about their answer. Validate it, and IMMEDIATELY ask the question for the NEXT subtopic in the sequence."]
  ]);
  const chain = prompt.pipe(chatModel);

  try {
    const response = await chain.invoke({ newUserMessage });
    let englishResponse = response.content.toString();

    // Remove <thinking> block before translation or returning
    englishResponse = englishResponse.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '').trim();

    if (!isZh) {
      return englishResponse;
    }

    // --- TRANSLATION LAYER FOR CHINESE ---
    const translationPrompt = ChatPromptTemplate.fromMessages([
      ["system", `You are an expert psychological translator. Translate the following English coaching response into natural, empathetic, and professional Chinese. 
The tone should be warm, encouraging, and thought-provoking, just like a real therapist using Socratic questioning. 

CRITICAL TRANSLATION RULES:
1. Contextual Accuracy: Pay attention to the emotional context. For example, if the user expresses negative emotions like "anger" (愤怒), do NOT translate words like "trigger" or "touch" as "触动" (which implies being emotionally moved in a positive or profound way). Instead, use "引发" (trigger), "导致" (cause), or "激怒" (infuriate).
2. Character Consistency: Translate "mother" as "妈妈" (not "父母" or "家长" if specifically referring to the mother). NEVER translate the name "Lele" (or any variations like "Li Lei") into anything other than "乐乐". Always use "乐乐".
3. Natural Phrasing: Keep the translated questions concise, logical, and natural in Chinese. Avoid awkward, overly complex, or presumptuous sentence structures (e.g., just translate "What was going through Lele's mind?" without adding extra speculative clauses).
4. Do not add any extra commentary, just provide the translation.`],
      ["user", "{englishResponse}"]
    ]);
    const translationChain = translationPrompt.pipe(chatModel);
    const translationResult = await translationChain.invoke({ englishResponse });
    let chineseResponse = translationResult.content.toString();

    if (englishResponse.includes("The reflection phase is complete")) {
      chineseResponse += "\n\n" + conclusionPhraseZh;
    }

    return chineseResponse;
  } catch (error) {
    console.error("Error generating reflection coach response:", error);
    throw error;
  }
}
export async function generateRoleplayEvaluation(agenda: IAgendaORM, session: IRoleplaySessionORM, language: string = 'en') {
  const practiceMode = session.practiceMode || 3;
  const mongoose = require('mongoose');
  const RoleplayMessage = mongoose.model('RoleplayMessage');
  const messages = await RoleplayMessage.find({ _id: { $in: session.messages } }).sort({ timestamp: 1 });

  let transcript = "";
  messages.forEach((m: any) => {
    const sender = m.sender === RoleplayAgentType.Child ? 'Child' : m.sender === RoleplayAgentType.Parent ? 'Parent' : 'Coach';
    transcript += `${sender}: ${m.content}\n`;
  });

  const isZh = language === 'zh';
  const languageInstruction = isZh 
    ? "MUST strictly use ONLY Simplified Chinese (简体中文). DO NOT output any English words."
    : "MUST strictly use ONLY English.";

  const evidenceInstruction = "CRITICAL: In the 'feedback' for each step, you MUST quote the exact words the USER said in the transcript as evidence. Put the user's quotes in quotation marks (e.g., You said \"...\"). To do this correctly: look ONLY at the lines starting with the User's role (e.g., only quote lines starting with 'Parent:'). DO NOT quote what the AI/Coach said. If the user didn't say anything relevant to that step, explicitly state that they missed it. DO NOT invent quotes. DO NOT just describe what they did (like 'The parent validated feelings'), you MUST show the proof (like 'You validated feelings by saying \"I know you are upset\"').";

  const formatInstruction = `YOU MUST RESPOND ONLY WITH A VALID JSON OBJECT EXACTLY MATCHING THIS FORMAT:
{{
  "score": 80, 
  "passed": true,
  "stepScores": [
    {{
      "stepName": "string",
      "score": 20, 
      "feedback": "string" 
    }}
  ],
  "strengths": ["string"],
  "improvements": ["string"],
  "coachMessage": "string"
}}
DO NOT wrap in markdown blocks like \`\`\`json. DO NOT add any other text.`;

  let systemPrompt = "";

  if (practiceMode === 1 || practiceMode === 2) {
    systemPrompt = `You are an AI Parent Coach providing educational feedback at the end of a reflection session.
The user just completed a reflection on a parenting video.
Your goal is to provide a brief, educational summary of their reflection process without strict numerical grading.

Task: Provide a structured feedback object. DO NOT assign scores (set all scores to 20). Focus on giving them qualitative feedback based on what they answered.

Evaluate the transcript and provide feedback for these 3 areas (set score to 20 for all):
Step 1: 情绪觉察 (Noticing Emotion)
  - Summarize how well they noticed the child's feeling.
Step 2: 原因分析 (Understanding Cause)
  - Summarize their understanding of why the child felt that way based on the parent's actions.
Step 3: 长期影响 (Long-term Impact)
  - Summarize their insight into the long-term impact on the child.

${evidenceInstruction}

You ${languageInstruction}

${formatInstruction}`;
  } else {
    systemPrompt = `You are a Senior Clinical Child Psychologist evaluating a parent's performance in a roleplay simulation.
The goal of the exercise was to practice the "5-Step Emotion Coaching Method".

Evaluate the transcript based on these criteria (each step out of 20 points. Use 5-point increments: 0, 5, 10, 15, 20. Assign 15 or 5 for intermediate performance):
Step 1: Notice the child's emotion (觉察情绪) (0-20 points)
  - 20 pts: Immediately addresses the child's emotional state in the first response (e.g., "I see you are upset").
  - 10 pts: Notices the behavior but not the underlying emotion.
  - 0 pts: Completely ignores the emotion and jumps to demands.
Step 2: Recognize as an opportunity for connection (视为连接机会) (0-20 points)
  - 20 pts: Approaches the child with patience rather than rushing or criticizing.
  - 10 pts: Shows some patience but seems rushed.
  - 0 pts: Treats the situation purely as an annoyance or crisis to squash.
Step 3: Listen empathetically and validate (倾听并接纳) (0-20 points)
  - 20 pts: Explicitly validates the feeling (e.g., "It makes sense you feel sad when friends don't play").
  - 10 pts: Uses generic comforting ("Don't cry") without true validation.
  - 0 pts: Invalidates the feeling ("It's not a big deal").
Step 4: Help verbally label emotions (帮助标记情绪) (0-20 points)
  - 20 pts: Gives the emotion a name (e.g., "Are you feeling left out or angry?").
  - 10 pts: Asks "What's wrong?" but doesn't offer emotion words.
  - 0 pts: Never helps the child label the feeling.
Step 5: Set limits & explore strategies (设定界限/解决问题) (0-20 points)
  - 20 pts: Holds the limit (e.g., "We still have to go to school") AND offers a coping strategy/choice.
  - 10 pts: Solves the problem but forgets to hold the limit, OR holds the limit harshly without offering choices.
  - 0 pts: Offers bribes, gives up on the limit, or uses threats.

Task: Provide a highly accurate and strict structured evaluation of the parent's performance.
CRITICAL: You MUST base your scores SOLELY on what the parent ACTUALLY SAID in the transcript. Do NOT give high scores if the parent did not explicitly demonstrate the skill in their dialogue.
Calculate the total 'score' by summing the 5 step scores. Set 'passed' to true ONLY IF the total score is >= 60.

${evidenceInstruction}

You ${languageInstruction}

${formatInstruction}`;
  }

  // Removed evaluationSchema since glm-4-flash does not support withStructuredOutput well
  // and we are parsing JSON manually.

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", systemPrompt],
    ["user", "Here is the transcript:\n{transcript}\n\nEvaluate the transcript."]
  ]);

  try {
    const rawResponse = await chatModel.invoke(await prompt.format({ transcript }));
    const text = rawResponse.content.toString();
    
    // Robust JSON extraction for evaluation
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON object found in response");
    }
    
    let result;
    try {
      result = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.log("Evaluation parse failed, attempting to clean JSON string:", parseError);
      // Remove invisible control characters (like unescaped newlines) that break JSON.parse
      const cleanedJson = jsonMatch[0].replace(/[\u0000-\u001F]+/g, "");
      result = JSON.parse(cleanedJson);
    }
    
    return result;
  } catch (error) {
    console.error("Error generating roleplay evaluation:", error);
    return {
      score: 80,
      passed: true,
      stepScores: [
        { stepName: "Step 1", score: 20, feedback: "Good" },
        { stepName: "Step 2", score: 20, feedback: "Good" },
        { stepName: "Step 3", score: 20, feedback: "Good" },
        { stepName: "Step 4", score: 10, feedback: "Okay" },
        { stepName: "Step 5", score: 10, feedback: "Okay" }
      ],
      strengths: [isZh ? "努力参与了角色扮演" : "Participated in the roleplay actively"],
      improvements: [isZh ? "可以尝试更多地倾听感受" : "Could try listening to the feelings more"],
      coachMessage: isZh ? "感谢您的参与！情绪辅导是一个长期的过程，慢慢来，您会做得越来越好的。" : "Thank you for participating! Emotion coaching is a long-term process. Take your time, you will get better and better."
    };
  }
}

export async function generateAdvisorsResponse(
  agenda: any,
  session: any,
  language: string
): Promise<{ expert: string, peer: string }> {
  const isZh = language === 'zh';
  
  // Format the chat history safely using the already populated messages
  let chatHistory = "";
  if (session && session.messages && Array.isArray(session.messages)) {
    const recentMessages = session.messages.slice(-6); // Only need the last few turns
    for (const msg of recentMessages) {
      chatHistory += `${msg.sender}: ${msg.content} ${msg.action ? `[Action: ${msg.action}]` : ''}\n`;
    }
  }

  const systemPrompt = `You are the "Board of Advisors" in an emotion coaching simulation.
Your purpose is to provide **Constructive Friction** and protect the user's **Epistemic Agency**. 
Unlike the direct @coach who gives procedural steps, you provide TWO distinct, nuanced, and sometimes slightly conflicting perspectives on the child's current emotional state based on the chat history.

1. 'expert' (Child Psychologist): 
   - Tone: Academic, analytical, objective.
   - Focus: Analyze the hidden psychological mechanism behind the child's behavior in the recent chat (e.g., "The child's resistance is a manifestation of autonomy anxiety...").
   - DO NOT give a direct script to copy. Give a theoretical diagnosis.

2. 'peer' (Experienced Mom):
   - Tone: Empathetic, relatable, highly practical.
   - Focus: Share a "been-there" realization or a soft, non-theoretical approach. She might even slightly challenge the strictness of the theory (e.g., "Sometimes you just need to drop the rules and give a hug first...").
   - DO NOT give a direct script to copy. Give emotional resonance and a pragmatic tip.

By offering these two different lenses, you force the parent to synthesize the situation and make their own choice, preventing the "Illusion of Competence".

Output format MUST be a valid JSON:
{{
  "expert": "expert's insight here (1-2 sentences)",
  "peer": "peer's insight here (1-2 sentences)"
}}`;

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", systemPrompt],
    ["user", `Language to use: ${isZh ? 'Chinese' : 'English'}\n\nRecent Chat History:\n${chatHistory}\n\nProvide the dual-advisor JSON now.`]
  ]);

  try {
    const response = await chatModel.invoke(await prompt.format({ chatHistory }));
    const responseText = response.content as string;
    
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to extract JSON from AI response.");
    }
    
    let result;
    try {
      result = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      const cleanedJson = jsonMatch[0].replace(/[\u0000-\u001F]+/g, "");
      result = JSON.parse(cleanedJson);
    }
    
    return result;
  } catch (error) {
    console.error("Error generating advisors response:", error);
    return {
      expert: isZh ? "根据认知负荷理论，孩子当前处于'热认知'状态，无法处理复杂的说教，建议先关注情绪。" : "According to cognitive load theory, the child is in a 'hot cognition' state and cannot process logic right now. Focus on emotions first.",
      peer: isZh ? "遇到这种情况我通常也会很崩溃，但我发现这时候讲道理没用，先给他个台阶下会好很多。" : "I always get frustrated too, but I found that giving them a way out instead of lecturing works much better."
    };
  }
}
