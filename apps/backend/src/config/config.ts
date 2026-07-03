import { ChatZhipuAI } from '@langchain/community/chat_models/zhipuai';

const chatModel = new ChatZhipuAI({
  model: "glm-4-flash",
  zhipuAIApiKey: "d9e8316dfa9d82136e0d3c01f6004b31.S35Yk60bKz3fA24z",
});

const llmModel = new ChatZhipuAI({
  model: "glm-4-flash",
  zhipuAIApiKey: "d9e8316dfa9d82136e0d3c01f6004b31.S35Yk60bKz3fA24z",
});

// const uid = '668bcb49eea1742b895f0fe8'

export {chatModel, llmModel}