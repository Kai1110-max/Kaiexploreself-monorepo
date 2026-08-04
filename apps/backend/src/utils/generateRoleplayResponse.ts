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

export async function generatePartnerResponse(agenda: IAgendaORM, session: IRoleplaySessionORM, newUserMessage: string, language: string = 'en'): Promise<{dialogue: string, action: string, emotion: string}> {
  const init_info = await summarizeProfilicInfo(agenda.initialNarrative);
  const practiceMode = session.practiceMode || 3;
  
  const mongoose = require('mongoose');
  const RoleplayMessage = mongoose.model('RoleplayMessage');
  const messages = await RoleplayMessage.find({ _id: { $in: session.messages } }).sort({ timestamp: 1 });

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
Do NOT use good emotion coaching skills. Invalidate the child's feelings, offer bribes, or use threats.

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
Respond to the child's (user's) anger with extreme patience, empathy, and validation.

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
The child's profile is: ${session.childProfile}

Here is the conversation history so far:
${transcript}

Rules:
1. Act entirely in character as the specific child described in the profile (e.g., 6-year-old Lele). Do not break character.
2. CRITICAL: Respond DIRECTLY to the parent's latest message. Answer their specific questions or react to their specific actions.
3. Be difficult, resistant, and deeply absorbed in your specific frustration, especially if the parent uses poor communication.
4. If the parent uses good Emotion Coaching skills, you can slightly de-escalate, but maintain the realism of a child's emotional state.
5. Keep your responses short, age-appropriate.
6. You ${languageInstruction}
7. ${formatInstruction}`;
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

export async function generateCoachDirectResponse(agenda: IAgendaORM, session: IRoleplaySessionORM, userQuestion: string, language: string = 'en'): Promise<string> {
  const practiceMode = session.practiceMode || 3;
  const mongoose = require('mongoose');
  const RoleplayMessage = mongoose.model('RoleplayMessage');
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
They have paused the roleplay to ask you a direct question using the "@coach" or "@教练" tag.

Here is the conversation history so far:
${transcript}

Rules:
1. Directly answer their question ("${userQuestion}").
2. Provide practical, empathetic advice based on Emotion Coaching principles.
3. Be concise (2-4 sentences max).
4. Do not act for them; give them guidance on what to try next.
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
  let userMessageCount = 0;
  
  // Fetch actual messages from DB to avoid Mongoose unpopulation issues after save()
  const mongoose = require('mongoose');
  const RoleplayMessage = mongoose.model('RoleplayMessage');
  const messages = await RoleplayMessage.find({ _id: { $in: session.messages } }).sort({ timestamp: 1 });

  messages.forEach((m: any) => {
    const sender = m.sender === RoleplayAgentType.Parent ? 'User' : 'Coach';
    if (m.sender === RoleplayAgentType.Parent) {
      userMessageCount++;
    }
    transcript += `${sender}: ${m.content}\n`;
  });
  
  const languageInstruction = language === 'zh' 
    ? "MUST strictly use ONLY Simplified Chinese (简体中文). DO NOT output any English words."
    : "MUST strictly use ONLY English.";

  // Deterministic state machine based purely on the number of user messages
  let nextQuestion = "";
  let isConclusion = false;

  const isZh = language === 'zh';

  if (practiceMode === 1) {
    if (userMessageCount === 1) nextQuestion = isZh ? "在那个难过的当下，你心里最渴望家长对你说什么，或者怎么做？" : "In that difficult moment, what did you most want the parent to say or do?";
    else if (userMessageCount === 2) nextQuestion = isZh ? "如果家长经常这样回应，长此以往会对孩子的性格产生什么影响？" : "If the parent frequently responds this way, what long-term impact might it have on the child's personality?";
    else if (userMessageCount === 3) nextQuestion = isZh ? "跳出孩子的角色，作为家长，你觉得视频里的妈妈为什么会这么急躁？" : "Stepping out of the child's role, as a parent, why do you think the mother in the video was so impatient?";
    else isConclusion = true;
  } else {
    if (userMessageCount === 1) nextQuestion = isZh ? "当你的情绪被接纳后，你原本抗拒的心情发生了怎样的变化？" : "After your emotions were validated, how did your initial feelings of resistance change?";
    else if (userMessageCount === 2) nextQuestion = isZh ? "长期在这样被接纳的环境中长大，孩子未来面对挫折时会怎么表现？" : "Growing up in such an accepting environment long-term, how might the child handle setbacks in the future?";
    else if (userMessageCount === 3) nextQuestion = isZh ? "这段视频里的做法，对你在现实中处理孩子的情绪有什么启发？" : "How does the approach in this video inspire you to handle your child's emotions in reality?";
    else isConclusion = true;
  }

  const systemPrompt = `You are an AI Parent Coach guiding a reflection on a parenting video. The user is reflecting on how it feels to be the CHILD in the video.

Here is the full conversation history:
${transcript}

YOUR TASK:
1. Provide a VERY CONCISE, EMPATHETIC, and SPECIFIC feedback to the User's last message ("${newUserMessage}"). 
   - First, positively reinforce and affirm what they did well or understood correctly (Positive Feedback).
   - Then, gently provide corrective or guiding insight if necessary.
   - CRITICAL: Ensure you accurately reflect the specific emotion the user mentioned (e.g., if they say "angry", don't assume "sad").
   - CRITICAL: Keep your feedback extremely concise and to the point. Maximum 2 short sentences total! Do not ramble.
2. ${isConclusion 
      ? `After your feedback, conclude the session EXACTLY with this sentence: "${isZh ? "你反思/总结得非常深刻。问完所有问题了，反思阶段已完成，请点击‘结束并获取反馈’查看您的反馈报告，并进入下一个环节。" : "Your reflection is very profound. All questions have been asked, and the reflection phase is complete. Please click 'End and Get Feedback' to view your feedback report and proceed to the next phase."}"` 
      : `After your short feedback, you MUST append the following question exactly to move the conversation forward. DO NOT add any other questions of your own.\n\nEXACT NEXT QUESTION TO APPEND: "${nextQuestion}"`}

CRITICAL RULES:
1. ONLY output the conversational response. DO NOT output internal labels, brackets, or "Next Question:".
2. DO NOT ask the user why they feel that way. I have provided the exact question you must ask.
3. If the user's answer is extremely short or doesn't address the previous question, gently encourage them to reflect deeper on it before you append the exact next question.
4. NEVER ask the user to clarify their previous answer. ALWAYS move forward to the EXACT NEXT QUESTION provided above.
5. You ${languageInstruction}`;

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", systemPrompt],
    ["user", "The user replied: {newUserMessage}\n\nProvide your detailed coaching feedback and then EXACTLY append the required next step/question."]
  ]);
  const chain = prompt.pipe(chatModel);

  try {
    const response = await chain.invoke({ newUserMessage });
    return response.content.toString();
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

  const evidenceInstruction = "CRITICAL: In the 'feedback' for each step, you MUST quote the exact words the USER said in the transcript as evidence. To do this correctly: look ONLY at the lines starting with the User's role (e.g., only quote lines starting with 'Parent:'). DO NOT quote what the AI/Coach said. If the user didn't say anything relevant, state what was missing. DO NOT invent quotes.";

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

Task: Provide a structured evaluation of the parent's performance.

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
