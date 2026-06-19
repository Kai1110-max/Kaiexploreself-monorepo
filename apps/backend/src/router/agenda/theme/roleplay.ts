import express from 'express';
import { RoleplaySession, RoleplayMessage, ThreadItem } from '../../../config/schema';
import type { RequestWithTheme } from '../../middlewares';
import { RoleplayAgentType } from '@core';
import { generateChildResponse, generateModeratorResponse } from '../../../utils/generateRoleplayResponse';

const router = express.Router({ mergeParams: true });

// Start or get existing roleplay session for a theme
router.post('/start', async (req: RequestWithTheme, res) => {
  try {
    const thread = await ThreadItem.findById(req.theme._id).populate({
      path: 'roleplaySessionId',
      populate: { path: 'messages' }
    });

    if (thread?.roleplaySessionId) {
      return res.json(thread.roleplaySessionId);
    }

    const newSession = new RoleplaySession({
      tid: req.theme._id,
      childProfile: "A child experiencing emotional distress.",
      status: 'active'
    });
    await newSession.save();

    await ThreadItem.findByIdAndUpdate(req.theme._id, { roleplaySessionId: newSession._id });

    // AI Moderator starts the session
    const initialModMsg = new RoleplayMessage({
      sender: RoleplayAgentType.Moderator,
      content: "Welcome to the Roleplay Simulator. I am your coach. Please start by saying something to your child based on the current situation."
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
  const { content } = req.body;
  
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
    const childResponseStr = await generateChildResponse(req.agenda, session, content);
    const childMsg = new RoleplayMessage({
      sender: RoleplayAgentType.Child,
      content: childResponseStr
    });
    await childMsg.save();
    session.messages.push(childMsg._id);

    // 3. Generate Moderator Feedback
    const modResponseStr = await generateModeratorResponse(req.agenda, session, content, childResponseStr);
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

export default router;