import { Http } from '../net/http';

export async function generateActionPlanDoc(
  token: string,
  agendaId: string
): Promise<any> {
  try {
    const response = await Http.axios.put(
      `/agendas/${agendaId}/action-plan-doc`,
      {},
      {
        headers: Http.makeSignedInHeader(token),
      }
    );
    return response.data.actionPlanDocument;
  } catch (err) {
    console.error('Error in getting action plan doc: ', err);
    return null;
  }
}

export async function evaluateActionPlan(
  token: string,
  agendaId: string
): Promise<any> {
  try {
    const response = await Http.axios.post(
      `/agendas/${agendaId}/action-plan-doc/evaluate`,
      {},
      {
        headers: Http.makeSignedInHeader(token),
      }
    );
    return response.data;
  } catch (err) {
    console.error('Error evaluating action plan: ', err);
    return null;
  }
}

export async function improveActionPlanSection(
  token: string,
  agendaId: string,
  sectionName: string,
  content: string
): Promise<string | null> {
  try {
    const response = await Http.axios.post(
      `/agendas/${agendaId}/action-plan-doc/improve`,
      { sectionName, content },
      {
        headers: Http.makeSignedInHeader(token),
      }
    );
    return response.data.improvedText;
  } catch (err) {
    console.error('Error improving action plan section: ', err);
    return null;
  }
}

export async function updateActionPlanDoc(
  token: string,
  agendaId: string,
  actionPlanDocument: any
): Promise<any> {
  try {
    const response = await Http.axios.post(
      `/agendas/${agendaId}/action-plan-doc/update`,
      { actionPlanDocument },
      {
        headers: Http.makeSignedInHeader(token),
      }
    );
    return response.data.actionPlanDocument;
  } catch (err) {
    console.error('Error updating action plan doc: ', err);
    return null;
  }
}

export async function agenticSync(
  token: string,
  agendaId: string,
  sectionName: string,
  content: string,
  actionPlanDocument: any
): Promise<any> {
  try {
    const response = await Http.axios.post(
      `/agendas/${agendaId}/action-plan-doc/agent-sync`,
      { sectionName, content, actionPlanDocument },
      {
        headers: Http.makeSignedInHeader(token),
      }
    );
    return response.data.agentResponse;
  } catch (err) {
    console.error('Error agentic sync: ', err);
    return null;
  }
}

export async function fetchConsistencyMap(
  token: string,
  agendaId: string
): Promise<any> {
  try {
    const response = await Http.axios.post(
      `/agendas/${agendaId}/action-plan-doc/consistency`,
      {},
      {
        headers: Http.makeSignedInHeader(token),
      }
    );
    return response.data.consistencyMap;
  } catch (err) {
    console.error('Error fetching consistency map: ', err);
    return null;
  }
}

export async function submitPeerReview(
  token: string,
  agendaId: string,
  section: string,
  comment: string
): Promise<any> {
  try {
    const response = await Http.axios.post(
      `/agendas/${agendaId}/peer-review`,
      { section, comment },
      {
        headers: Http.makeSignedInHeader(token),
      }
    );
    return response.data.peerReview;
  } catch (err) {
    console.error('Error submitting peer review: ', err);
    return null;
  }
}
