import express from 'express';
import { RoleplaySession, RoleplayMessage, ThreadItem } from '../../../config/schema';
import type { RequestWithTheme } from '../../middlewares';
import { RoleplayAgentType } from '@core';
import { generatePartnerResponse, generateModeratorResponse, generateRoleplayHint, generateRoleplayEvaluation, generateCoachDirectResponse } from '../../../utils/generateRoleplayResponse';

const router = express.Router({ mergeParams: true });

// Start or get existing roleplay session for a theme
router.post('/start', async (req: RequestWithTheme, res) => {
  try {
    const { language, practiceMode = 3 } = req.body;
    
    // Instead of relying on thread.roleplaySessionId which only holds 1 session, 
    // we query RoleplaySession by tid and practiceMode.
    const thread = await ThreadItem.findById(req.theme._id);
    if (!thread) {
      return res.status(404).json({ error: "Thread not found." });
    }

    let session = await RoleplaySession.findOne({ tid: req.theme._id, practiceMode }).populate('messages');

    if (session) {
      return res.json(session);
    }

    // Create new session if not found
    session = new RoleplaySession({
      tid: req.theme._id,
      practiceMode,
      childProfile: "6岁的乐乐，因为不想上学而哭闹。/ 6-year-old Lele, crying because he doesn't want to go to school.",
      status: 'active'
    });
    await session.save();

    // Set initial moderator message based on practiceMode
    const isZh = language === 'zh';
    let initialContent = "";
    
    if (practiceMode === 1) {
      initialContent = isZh 
        ? "【练习 1：家长作为孩子，AI作为新手家长】\n你是6岁的乐乐，你现在不想去上学，你很生气。AI将扮演一个缺乏经验的新手家长，请试着展现出孩子在面对不恰当安抚时，情绪是如何变得更糟的。"
        : "[Practice 1: You as Child, AI as Novice Parent]\nYou are 6-year-old Lele. You don't want to go to school and you are angry. The AI will act as a novice parent. Try to act out how a child's emotion gets worse when facing inappropriate comforting.";
    } else if (practiceMode === 2) {
      initialContent = isZh 
        ? "【练习 2：家长作为孩子，AI作为专家家长】\n你依然是6岁的乐乐。这次AI将扮演一个熟练掌握情绪辅导技巧的专家家长。请根据AI家长的引导，做出真实的反应（逐渐被安抚）。"
        : "[Practice 2: You as Child, AI as Expert Parent]\nYou are still 6-year-old Lele. This time, the AI will act as an expert parent using Emotion Coaching skills. React naturally to the AI's guidance and let yourself be soothed.";
    } else {
      initialContent = isZh 
        ? "【练习 3：家长作为家长，AI作为孩子】\n现在，你是家长，AI将扮演不想上学的乐乐。请运用我们学过的“情绪辅导五步法”来与乐乐沟通。\n\n请直接对乐乐说出你的第一句话："
        : "[Practice 3: You as Parent, AI as Child]\nNow, you are the parent, and the AI will act as Lele who doesn't want to go to school. Please use the '5-Step Emotion Coaching Method' to talk to Lele.\n\nPlease say your first sentence to Lele:";
    }
    
    const initialModMsg = new RoleplayMessage({
      sender: RoleplayAgentType.Moderator,
      content: initialContent
    });
    await initialModMsg.save();

    session.messages.push(initialModMsg._id);
    await session.save();

    const populatedSession = await RoleplaySession.findById(session._id).populate('messages');
    return res.json(populatedSession);
  } catch (err) {
    console.error('Error starting roleplay session:', err);
    res.status(500).json({ error: err.message });
  }
});

// Send a message from the parent
router.post('/message', async (req: RequestWithTheme, res) => {
  const { content, language, practiceMode = 3 } = req.body;
  
  try {
    const thread = await ThreadItem.findById(req.theme._id);
    if (!thread) {
      return res.status(404).json({ error: "Thread not found." });
    }

    const session = await RoleplaySession.findOne({ tid: thread._id, practiceMode }).populate('messages');
    if (!session) {
      return res.status(404).json({ error: "Session not found." });
    }

    // Determine sender types based on practice mode
    // Mode 1 & 2: User is Child, AI is Parent. Mode 3: User is Parent, AI is Child.
    const userRole = (practiceMode === 1 || practiceMode === 2) ? RoleplayAgentType.Child : RoleplayAgentType.Parent;
    const aiRole = (practiceMode === 1 || practiceMode === 2) ? RoleplayAgentType.Parent : RoleplayAgentType.Child;

    // 1. Save User Message
    const userMsg = new RoleplayMessage({
      sender: userRole,
      content: content
    });
    await userMsg.save();
    session.messages.push(userMsg._id);
    
    // Any new message resets the session status to active, invalidating the cached evaluation
    session.status = 'active';
    await session.save();

    const isToCoach = content.toLowerCase().includes('@coach') || content.includes('@教练');

    if (isToCoach) {
      // Direct question to the coach
      const modResponseStr = await generateCoachDirectResponse(req.agenda, session, content, language);
      const modMsg = new RoleplayMessage({
        sender: RoleplayAgentType.Moderator,
        content: modResponseStr
      });
      await modMsg.save();
      session.messages.push(modMsg._id);
      await session.save();
    } else {
      // 2. Generate AI Response (Structured JSON now!)
      const aiResponse = await generatePartnerResponse(req.agenda, session, content, language);
      const aiMsg = new RoleplayMessage({
        sender: aiRole,
        content: aiResponse.dialogue || "...", // Fallback if dialogue is empty but action exists
        action: aiResponse.action,
        emotion: aiResponse.emotion
      });
      await aiMsg.save();
      session.messages.push(aiMsg._id);

      // 3. Generate Moderator Feedback
      // Note: Moderator needs to know the dialogue and action. 
      const partnerFullResponse = `${aiResponse.dialogue} ${aiResponse.action ? `[Action: ${aiResponse.action}]` : ''}`;
      const modResponseStr = await generateModeratorResponse(req.agenda, session, content, partnerFullResponse, language);
      const modMsg = new RoleplayMessage({
        sender: RoleplayAgentType.Moderator,
        content: modResponseStr
      });
      await modMsg.save();
      session.messages.push(modMsg._id);

      await session.save();
    }

    const updatedSession = await RoleplaySession.findById(session._id).populate('messages');
    return res.json(updatedSession);
  } catch (err) {
    console.error('Error sending roleplay message:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/hint', async (req: RequestWithTheme, res) => {
  const { stepLabel, stepDescription, currentText, practiceMode = 3 } = req.body;
  try {
    const thread = await ThreadItem.findById(req.theme._id);
    if (!thread) {
      return res.status(404).json({ error: "Thread not found." });
    }

    const session = await RoleplaySession.findOne({ tid: thread._id, practiceMode }).populate('messages');
    if (!session) {
      return res.status(404).json({ error: "Session not found." });
    }

    const hint = await generateRoleplayHint(req.agenda, session, stepLabel, stepDescription, currentText);
    return res.json({ hint });
  } catch (err) {
    console.error('Error generating hint:', err);
    res.status(500).json({ error: err.message });
  }
});

    // Evaluate the roleplay session
router.post('/evaluate', async (req: RequestWithTheme, res) => {
  const { language, practiceMode = 3 } = req.body;

  try {
    const thread = await ThreadItem.findById(req.theme._id);
    if (!thread) {
      return res.status(404).json({ error: "Thread not found." });
    }

    const session = await RoleplaySession.findOne({ tid: thread._id, practiceMode }).populate('messages');
    if (!session) {
      return res.status(404).json({ error: "Session not found." });
    }

    // Check if we already have a cached evaluation AND no new messages have been added
    // To check if new messages were added, we can store the length of messages at the time of evaluation.
    // For a robust check, let's look at the cachedEvaluation.
    // If it exists, and the user hasn't sent new messages since it was created, return the cache.
    // We can verify this by checking if the session status is 'completed'. 
    // BUT we need it to update if the user sent more messages.
    // In our /message route, we set status to 'active' whenever a new message is sent!
    if (session.status === 'completed' && session.cachedEvaluation) {
       return res.json(session.cachedEvaluation);
    }

    // Call the LLM to generate the structured evaluation
    const evaluation = await generateRoleplayEvaluation(req.agenda, session, language);
    
    // Calculate accurate score based on steps (MUST BE EXACT MATH)
    let totalScore = 0;
    if (evaluation.stepScores && Array.isArray(evaluation.stepScores)) {
      evaluation.stepScores.forEach((step: any) => {
        // Enforce 5-point increments (0, 5, 10, 15, 20)
        step.score = Math.round(step.score / 5) * 5;
        if (step.score > 20) step.score = 20;
        if (step.score < 0) step.score = 0;
        
        totalScore += step.score;
      });
      evaluation.score = totalScore;
      evaluation.passed = totalScore >= 60;
    }

    // Update the session status to completed and cache the result
    session.status = 'completed';
    session.cachedEvaluation = evaluation as any;
    await session.save();

    return res.json(evaluation);
  } catch (err) {
    console.error('Error evaluating roleplay session:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;