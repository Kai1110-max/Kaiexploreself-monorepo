import express from 'express';
import { RoleplaySession, RoleplayMessage, ThreadItem } from '../../../config/schema';
import type { RequestWithTheme } from '../../middlewares';
import { RoleplayAgentType } from '@core';
import { generatePartnerResponse, generateModeratorResponse, generateRoleplayHint, generateRoleplayEvaluation, generateCoachDirectResponse, generateReflectionCoachResponse } from '../../../utils/generateRoleplayResponse';

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
        ? "刚刚你看完了乐乐上学的第一个视频。在这个视频中，家长的回应方式属于‘忽视型’或‘指责型’。请问看完这段视频，你有什么初步的感受？如果乐乐是你，你听到家长这些话会有什么感觉？"
        : "You just watched the first video of Lele going to school. In this video, the parent's response is 'dismissive' or 'blaming'. How did you feel after watching this video? If you were Lele, how would you feel hearing these words from your parent?";
    } else if (practiceMode === 2) {
      initialContent = isZh 
        ? "刚刚你看完了乐乐上学的第二个视频。这一次，家长的回应方式是‘情绪辅导型’的。看完这段视频，你的感受和上一个视频有什么不同？如果你是乐乐，这次你会觉得被理解和尊重吗？"
        : "You just watched the second video. This time, the parent used an 'emotion coaching' approach. How do your feelings differ from the first video? If you were Lele, would you feel understood and respected this time?";
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
    // For all modes, the user is the Parent learning.
    const userRole = RoleplayAgentType.Parent;
    
    // For mode 1 & 2, the AI is solely the Coach (Moderator). For mode 3, AI is the Child.
    const aiRole = (practiceMode === 1 || practiceMode === 2) ? RoleplayAgentType.Moderator : RoleplayAgentType.Child;

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

    if (isToCoach && practiceMode === 3) {
      // Direct question to the coach
      const modResponseStr = await generateCoachDirectResponse(req.agenda, session, content, language);
      const modMsg = new RoleplayMessage({
        sender: RoleplayAgentType.Moderator,
        content: modResponseStr
      });
      await modMsg.save();
      session.messages.push(modMsg._id);
      await session.save();
    } else if (practiceMode === 1 || practiceMode === 2) {
      // 2. Generate Reflection Coach Response
      const modResponseStr = await generateReflectionCoachResponse(req.agenda, session, content, language);
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
        emotion: aiResponse.emotion,
        ambient_weather: aiResponse.ambient_weather
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
      
      // For practiceMode 1 and 2, there is no pass/fail score requirement.
      if (practiceMode === 1 || practiceMode === 2) {
        evaluation.passed = true;
      } else {
        evaluation.passed = totalScore >= 60;
      }
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