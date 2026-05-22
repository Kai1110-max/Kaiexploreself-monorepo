import { IThreadWithQuestionIds, IQASetWithIds } from '@core';
import { Http } from '../net/http';

const populateThread = async (
  token: string,
  agendaId: string,
  tid: string
): Promise<{ threadData: IThreadWithQuestionIds, questions: IQASetWithIds[] } | null> => {
  try {
    const response = await Http.axios.post(
      `/agendas/${agendaId}/themes/${tid}/populate`,
      {},
      {
        headers: Http.makeSignedInHeader(token),
      }
    );
    return response.data;
  } catch (err) {
    console.error('Error populating thread: ', err);
    return null;
  }
};
export default populateThread;