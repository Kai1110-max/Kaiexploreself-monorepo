import { Http } from '../net/http';
import { IRoleplaySessionPopulated } from '@core';

export const startRoleplaySession = async (
  token: string,
  agendaId: string,
  tid: string
): Promise<IRoleplaySessionPopulated | null> => {
  try {
    const response = await Http.axios.post(
      `/agendas/${agendaId}/themes/${tid}/roleplay/start`,
      {},
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
  content: string
): Promise<IRoleplaySessionPopulated | null> => {
  try {
    const response = await Http.axios.post(
      `/agendas/${agendaId}/themes/${tid}/roleplay/message`,
      { content },
      { headers: Http.makeSignedInHeader(token) }
    );
    return response.data;
  } catch (err) {
    console.error('Error sending roleplay message:', err);
    return null;
  }
};