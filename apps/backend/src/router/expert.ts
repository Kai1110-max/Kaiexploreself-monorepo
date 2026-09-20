import express from 'express';
import { signedInUserMiddleware, RequestWithUser } from './middlewares';
import { body, validationResult } from 'express-validator';
import { generateExpertResponse } from '../utils/generateExpertResponse';

const router = express.Router();

router.post(
  '/chat',
  signedInUserMiddleware,
  body('newMessage').isString().notEmpty(),
  body('chatHistory').isArray(),
  body('language').optional().isString(),
  async (req: RequestWithUser, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { newMessage, chatHistory, language } = req.body;
      const response = await generateExpertResponse(chatHistory, newMessage, language || 'zh');
      
      res.json({ response });
    } catch (err) {
      console.error("Expert chat error:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

export default router;
