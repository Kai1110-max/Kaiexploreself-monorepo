import { ChatZhipuAI } from '@langchain/community/chat_models/zhipuai';

const chatModel = new ChatZhipuAI({
  model: "glm-4",
  zhipuAIApiKey: "5a8ce15272e841d6a36a5e5b5c8b5083.RmQYB1waqZDKNEtM",
});

const llmModel = new ChatZhipuAI({
  model: "glm-4",
  zhipuAIApiKey: "5a8ce15272e841d6a36a5e5b5c8b5083.RmQYB1waqZDKNEtM",
});

const dummyUid = '668bcb49eea1742b895f0fe8';

export { chatModel, llmModel, dummyUid };
