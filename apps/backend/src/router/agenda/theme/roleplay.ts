import express from 'express';
import { RoleplaySession, RoleplayMessage, ThreadItem } from '../../../config/schema';
import type { RequestWithTheme } from '../../middlewares';
import { RoleplayAgentType } from '@core';
import { generateChildResponse, generateModeratorResponse, generateRoleplayHint, generateRoleplayEvaluation } from '../../../utils/generateRoleplayResponse';

const router = express.Router({ mergeParams: true });

// Start or get existing roleplay session for a theme
router.post('/start', async (req: RequestWithTheme, res) => {
  try {
    const { language } = req.body;
    
    const thread = await ThreadItem.findById(req.theme._id).populate({
      path: 'roleplaySessionId',
      populate: { path: 'messages' }
    });

    if (thread?.roleplaySessionId) {
      return res.json(thread.roleplaySessionId);
    }

    const newSession = new RoleplaySession({
      tid: req.theme._id,
      childProfile: "4岁的童童，因为穿不好魔术贴鞋子而崩溃大哭，感到极度挫败。/ 4-year-old Tongtong, crying and throwing a tantrum because he can't put on his velcro shoes.",
      status: 'active'
    });
    await newSession.save();

    await ThreadItem.findByIdAndUpdate(req.theme._id, { roleplaySessionId: newSession._id });

    // AI Moderator starts the session
    const isZh = language === 'zh';
    const initialContent = isZh 
      ? "欢迎来到角色扮演模拟器，我是您的情绪教练。让我们结合刚刚学过的童童案例来练习“情感雷达”。\n\n【场景】：早上8点05分，马上要迟到了。4岁的童童因为穿不好魔术贴鞋子，把鞋甩飞，躺在地上大哭。 \n\n**请先不要和童童说话。** 让我们先暂停一下，请直接告诉我（您的教练）：在看到童童把鞋甩飞的那一瞬间，**您的第一反应是什么？** （比如：是心里升起一团火想要制止他？想马上逃离现场？还是别的感受？）"
      : "Welcome to the Roleplay Simulator. I am your coach. Let's practice 'Emotional Radar'. Scenario: It's 8:05 AM. Your 4-year-old child, Tongtong, just threw his shoe across the room and is crying on the floor because he couldn't put it on.\n\nBefore you say anything to Tongtong, let's pause. Tell me (your coach): What is your FIRST emotional reaction right now? (e.g., Do you feel a fire of anger? Do you want to escape?)";
    
    const initialModMsg = new RoleplayMessage({
      sender: RoleplayAgentType.Moderator,
      content: initialContent
    });
    await initialModMsg.save();

    newSession.messages.push(initialModMsg._id);
    await newSession.save();

    const populatedSession = await RoleplaySession.findById(newSession._id).populate('messages');
    return res.json(populatedSession);
  } catch (err) {
    console.error('Error starting roleplay session:', err);
    res.status(500).json({ error: err.message });
  }
});

// Send a message from the parent
router.post('/message', async (req: RequestWithTheme, res) => {
  const { content, language } = req.body;
  
  try {
    const thread = await ThreadItem.findById(req.theme._id);
    if (!thread || !thread.roleplaySessionId) {
      return res.status(404).json({ error: "Roleplay session not found for this theme." });
    }

    const session = await RoleplaySession.findById(thread.roleplaySessionId).populate('messages');
    if (!session) {
      return res.status(404).json({ error: "Session not found." });
    }

    // 1. Save Parent Message
    const parentMsg = new RoleplayMessage({
      sender: RoleplayAgentType.Parent,
      content: content
    });
    await parentMsg.save();
    session.messages.push(parentMsg._id);
    await session.save(); // save temporarily so child sees it? The function takes string though.

    // 2. Generate Child Response
    const childResponseStr = await generateChildResponse(req.agenda, session, content, language);
    const childMsg = new RoleplayMessage({
      sender: RoleplayAgentType.Child,
      content: childResponseStr
    });
    await childMsg.save();
    session.messages.push(childMsg._id);

    // 3. Generate Moderator Feedback
    const modResponseStr = await generateModeratorResponse(req.agenda, session, content, childResponseStr, language);
    const modMsg = new RoleplayMessage({
      sender: RoleplayAgentType.Moderator,
      content: modResponseStr
    });
    await modMsg.save();
    session.messages.push(modMsg._id);

    await session.save();

    const updatedSession = await RoleplaySession.findById(session._id).populate('messages');
    return res.json(updatedSession);
  } catch (err) {
    console.error('Error sending roleplay message:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/hint', async (req: RequestWithTheme, res) => {
  const { stepLabel, stepDescription, currentText } = req.body;
  try {
    const thread = await ThreadItem.findById(req.theme._id);
    if (!thread || !thread.roleplaySessionId) {
      return res.status(404).json({ error: "Roleplay session not found." });
    }

    const session = await RoleplaySession.findById(thread.roleplaySessionId).populate('messages');
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
  const { language } = req.body;

  try {
    const thread = await ThreadItem.findById(req.theme._id);
    if (!thread || !thread.roleplaySessionId) {
      return res.status(404).json({ error: "Roleplay session not found for this theme." });
    }

    const session = await RoleplaySession.findById(thread.roleplaySessionId).populate('messages');
    if (!session) {
      return res.status(404).json({ error: "Session not found." });
    }

    // Call the LLM to generate the structured evaluation
    const evaluation = await generateRoleplayEvaluation(req.agenda, session, language);
    
    // Optionally update the session status to completed
    session.status = 'completed';
    await session.save();

    return res.json(evaluation);
  } catch (err) {
    console.error('Error evaluating roleplay session:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;