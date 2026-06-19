import React, { useState, useEffect, useRef } from 'react';
import { Card, Input, Button, List, Typography, Space, Spin, Avatar } from 'antd';
import { SendOutlined, UserOutlined, RobotOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { useSelector } from '../../../redux/hooks';
import { startRoleplaySession, sendRoleplayMessage } from '../../../api_call/roleplay';
import { IRoleplaySessionPopulated, RoleplayAgentType } from '@core';

const { Text } = Typography;

export const RoleplayChat = ({ tid }: { tid: string }) => {
  const token = useSelector(state => state.auth.token);
  const agendaId = useSelector(state => state.agenda.agendaId);
  const [session, setSession] = useState<IRoleplaySessionPopulated | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initSession = async () => {
      if (token && agendaId && tid) {
        setLoading(true);
        const res = await startRoleplaySession(token, agendaId, tid);
        setSession(res);
        setLoading(false);
      }
    };
    initSession();
  }, [token, agendaId, tid]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session?.messages]);

  const handleSend = async () => {
    if (!message.trim() || !token || !agendaId) return;
    
    const userMsg = message;
    setMessage('');
    setSending(true);

    // Optimistically add user message
    if (session) {
      setSession({
        ...session,
        messages: [
          ...session.messages,
          { _id: 'temp', sender: RoleplayAgentType.Parent, content: userMsg, timestamp: new Date() }
        ]
      });
    }

    const updatedSession = await sendRoleplayMessage(token, agendaId, tid, userMsg);
    if (updatedSession) {
      setSession(updatedSession);
    }
    setSending(false);
  };

  if (loading) {
    return <div className="p-8 text-center"><Spin tip="Initializing Roleplay Environment..." /></div>;
  }

  return (
    <Card title="Dual-Agent Roleplay Simulator" className="shadow-md rounded-xl overflow-hidden border-indigo-200">
      <div className="bg-slate-50 p-3 rounded-lg mb-4 text-sm text-slate-600 border border-slate-200">
        <strong>Scenario:</strong> {session?.childProfile || "A child experiencing emotional distress."}
        <br/>
        Practice your Parent Management Training (PMT) skills here. The <b>Simulated Child</b> will react realistically, and the <b>AI Coach</b> will provide guidance.
      </div>

      <div className="chat-container h-96 overflow-y-auto p-4 bg-white border border-gray-100 rounded-lg shadow-inner mb-4 flex flex-col gap-4">
        {session?.messages?.map((msg, idx) => {
          const isParent = msg.sender === RoleplayAgentType.Parent;
          const isModerator = msg.sender === RoleplayAgentType.Moderator;
          const isChild = msg.sender === RoleplayAgentType.Child;

          return (
            <div key={msg._id || idx} className={`flex w-full ${isParent ? 'justify-end' : 'justify-start'}`}>
              {!isParent && (
                <Avatar 
                  icon={isModerator ? <SafetyCertificateOutlined /> : <RobotOutlined />} 
                  className={`mr-2 ${isModerator ? 'bg-amber-500' : 'bg-rose-500'}`} 
                />
              )}
              
              <div className={`max-w-[75%] p-3 rounded-xl ${
                isParent ? 'bg-blue-500 text-white rounded-tr-none' : 
                isModerator ? 'bg-amber-50 border border-amber-200 text-amber-900 rounded-tl-none shadow-sm' : 
                'bg-rose-50 border border-rose-200 text-rose-900 rounded-tl-none font-medium shadow-sm'
              }`}>
                <div className="text-xs opacity-70 mb-1 font-semibold uppercase tracking-wider">
                  {isParent ? 'You' : isModerator ? 'Coach (Moderator)' : 'Simulated Child'}
                </div>
                <div>{msg.content}</div>
              </div>

              {isParent && <Avatar icon={<UserOutlined />} className="ml-2 bg-blue-600" />}
            </div>
          );
        })}
        {sending && (
          <div className="flex w-full justify-start">
            <Avatar icon={<RobotOutlined />} className="mr-2 bg-rose-300 animate-pulse" />
            <div className="bg-gray-100 p-3 rounded-xl rounded-tl-none text-gray-500 italic">
              Child is reacting...
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="flex gap-2">
        <Input.TextArea 
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Type your response to the child here..."
          autoSize={{ minRows: 2, maxRows: 4 }}
          onPressEnter={(e) => {
            if (!e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          disabled={sending}
          className="rounded-lg"
        />
        <Button 
          type="primary" 
          icon={<SendOutlined />} 
          onClick={handleSend}
          loading={sending}
          className="h-auto px-6 rounded-lg bg-indigo-600 hover:bg-indigo-500"
        >
          Send
        </Button>
      </div>
    </Card>
  );
};