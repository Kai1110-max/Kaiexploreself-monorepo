import { Http } from '../net/http';

export async function generateActionPlan(
  token: string,
  agendaId: string
): Promise<string | null> {
  try {
    const response = await Http.axios.put(
      `/agendas/${agendaId}/action-plan`,
      {},
      {
        headers: Http.makeSignedInHeader(token),
      }
    );
    return response.data.actionPlan;
  } catch (err) {
    console.error('Error in getting action plan: ', err);
    return null;
  }
};