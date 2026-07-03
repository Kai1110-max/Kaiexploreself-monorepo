import { ChatZhipuAI } from '@langchain/community/chat_models/zhipuai';

const chatModel = new ChatZhipuAI({
  zhipuAIApiKey: process.env.ZHIPUAI_API_KEY || "5a8ce15272e841d6a36a5e5b5c8b5083.RmQYB1waqZDKNEtM",
  model: "glm-4-flash",
});

const llmModel = new ChatZhipuAI({
  zhipuAIApiKey: process.env.ZHIPUAI_API_KEY || "5a8ce15272e841d6a36a5e5b5c8b5083.RmQYB1waqZDKNEtM",
  model: "glm-4-flash",
});

// const uid = '668bcb49eea1742b895f0fe8'

export {chatModel, llmModel}