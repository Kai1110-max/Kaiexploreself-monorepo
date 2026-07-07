import { Http } from '../net/http';
import { IRoleplaySessionPopulated } from '@core';
import { IRoleplayEvaluation } from '@core';

export const startRoleplaySession = async (
  token: string,
  agendaId: string,
  tid: string,
  language: string = 'en',
  practiceMode: number = 3
): Promise<IRoleplaySessionPopulated | null> => {
  try {
    const response = await Http.axios.post(
      `/agendas/${agendaId}/themes/${tid}/roleplay/start`,
      { language, practiceMode },
      { headers: Http.makeSignedInHeader(token) }
    );
    return response.data;
  } catch (err) {
    console.error('Error starting roleplay session:', err);
    return null;
  }
};

export const sendRoleplayMessage = async (
  token: string,
  agendaId: string,
  tid: string,
  content: string,
  language: string = 'en',
  practiceMode: number = 3
): Promise<IRoleplaySessionPopulated | null> => {
  try {
    const response = await Http.axios.post(
      `/agendas/${agendaId}/themes/${tid}/roleplay/message`,
      { content, language, practiceMode },
      { headers: Http.makeSignedInHeader(token) }
    );
    return response.data;
  } catch (err) {
    console.error('Error sending roleplay message:', err);
    return null;
  }
};

export type { IRoleplayEvaluation };

export const evaluateRoleplaySession = async (
  token: string,
  agendaId: string,
  tid: string,
  language: string = 'en',
  practiceMode: number = 3
): Promise<IRoleplayEvaluation | null> => {
  try {
    const response = await Http.axios.post(
      `/agendas/${agendaId}/themes/${tid}/roleplay/evaluate`,
      { language, practiceMode },
      { headers: Http.makeSignedInHeader(token) }
    );
    return response.data;
  } catch (err) {
    console.error('Error evaluating roleplay:', err);
    return null;
  }
};