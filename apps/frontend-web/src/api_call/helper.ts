import { Http } from "../net/http";

export const chatWithHelper = async (coachQuestion: string, chatHistory: any[], language: string, practiceMode: number) => {
    try {
        const res = await Http.axios.post('/helper/chat', { coachQuestion, chatHistory, language, practiceMode });
        return res.data.reply;
    } catch (e) {
        console.error(e);
        throw e;
    }
};