import React, { useState, useEffect, useRef } from 'react';
import { Card, Input, Button, List, Typography, Space, Spin, Avatar, Modal, Progress, Tag } from 'antd';
import { SendOutlined, UserOutlined, RobotOutlined, SafetyCertificateOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useSelector } from '../../../redux/hooks';
import { startRoleplaySession, sendRoleplayMessage, evaluateRoleplaySession, IRoleplayEvaluation } from '../../../api_call/roleplay';
import { IRoleplaySessionPopulated, RoleplayAgentType } from '@core';
import { useTranslation } from 'react-i18next';

const { Text } = Typography;

export const RoleplayChat = ({ tid, practiceMode = 3 }: { tid: string, practiceMode?: number }) => {
  const { i18n } = useTranslation();
  const token = useSelector(state => state.auth.token);
  const agendaId = useSelector(state => state.agenda.agendaId);
  const [session, setSession] = useState<IRoleplaySessionPopulated | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<IRoleplayEvaluation | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [message, setMessage] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initSession = async () => {
      if (token && agendaId && tid) {
        setLoading(true);
        try {
          const response = await fetch(`/api/v1/agendas/${agendaId}/themes/${tid}/roleplay/start`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ language: i18n.language, practiceMode })
          });
          const res = await response.json();
          setSession(res);
        } catch (e) {
          console.error(e);
        }
        setLoading(false);
      }
    };
    initSession();
  }, [token, agendaId, tid, i18n.language, practiceMode]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session?.messages]);

  const handleSend = async () => {
    if (!message.trim() || !token || !agendaId) return;
    
    const userMsg = message;
    setMessage('');
    setSending(true);

    const userRole = (practiceMode === 1 || practiceMode === 2) ? RoleplayAgentType.Child : RoleplayAgentType.Parent;

    // Optimistically add user message
    if (session) {
      setSession({
        ...session,
        messages: [
          ...session.messages,
          { _id: 'temp', sender: userRole, content: userMsg, timestamp: new Date() }
        ]
      });
    }

    try {
      const response = await fetch(`/api/v1/agendas/${agendaId}/themes/${tid}/roleplay/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content: userMsg, language: i18n.language, practiceMode })
      });
      const updatedSession = await response.json();
      if (updatedSession && !updatedSession.error) {
        setSession(updatedSession);
      }
    } catch (e) {
      console.error(e);
    }
    setSending(false);
  };

  if (loading) {
    return <div className="p-8 text-center"><Spin tip={i18n.language === 'en' ? "Initializing Roleplay Environment..." : "正在初始化角色扮演环境..."} /></div>;
  }

  const handleEvaluate = async () => {
    if (!token || !agendaId || !tid) return;
    setEvaluating(true);
    try {
      const response = await fetch(`/api/v1/agendas/${agendaId}/themes/${tid}/roleplay/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ language: i18n.language, practiceMode })
      });
      const result = await response.json();
      if (result && !result.error) {
        setEvaluation(result);
        setIsModalVisible(true);
      }
    } catch (e) {
      console.error(e);
    }
    setEvaluating(false);
  };

  return (
    <Card title={i18n.language === 'en' ? "Dual-Agent Roleplay Simulator" : "双智能体角色扮演模拟器"} className="shadow-md rounded-xl overflow-hidden border-indigo-200">
      <div className="bg-slate-50 p-3 rounded-lg mb-4 text-sm text-slate-600 border border-slate-200">
        <strong>{i18n.language === 'en' ? "Scenario:" : "场景设定："}</strong> {
          (!session?.childProfile || session.childProfile === "A child experiencing emotional distress.")
            ? (i18n.language === 'en' ? "A child experiencing emotional distress." : "一个正在经历情绪困扰的孩子。")
            : session.childProfile
        }
        <br/>
        {i18n.language === 'en' 
          ? "Practice your Parent Management Training (PMT) skills here. The Simulated Child will react realistically, and the AI Coach will provide guidance." 
          : "在此练习您的家长管理训练（PMT）技能。模拟孩子会做出真实的反应，AI教练会为您提供指导。"}
      </div>

      <div className="chat-container h-96 overflow-y-auto p-4 bg-white border border-gray-100 rounded-lg shadow-inner mb-4 flex flex-col gap-4">
        {session?.messages?.map((msg, idx) => {
          const isUser = (practiceMode === 1 || practiceMode === 2) ? msg.sender === RoleplayAgentType.Child : msg.sender === RoleplayAgentType.Parent;
          const isModerator = msg.sender === RoleplayAgentType.Moderator;
          const isPartner = !isUser && !isModerator;

          return (
            <div key={msg._id || idx} className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
              {!isUser && (
                <Avatar 
                  icon={isModerator ? <SafetyCertificateOutlined /> : <RobotOutlined />} 
                  className={`mr-2 ${isModerator ? 'bg-amber-500' : 'bg-rose-500'}`} 
                />
              )}
              
              <div className={`max-w-[75%] p-3 rounded-xl ${
                isUser ? 'bg-blue-500 text-white rounded-tr-none' : 
                isModerator ? 'bg-amber-50 border border-amber-200 text-amber-900 rounded-tl-none shadow-sm' : 
                'bg-rose-50 border border-rose-200 text-rose-900 rounded-tl-none font-medium shadow-sm'
              }`}>
                <div className="text-xs opacity-70 mb-1 font-semibold uppercase tracking-wider">
                  {isUser 
                    ? (i18n.language === 'en' ? 'You' : '您') 
                    : isModerator 
                      ? (i18n.language === 'en' ? 'Coach (Moderator)' : '教练（引导者）') 
                      : (practiceMode === 1 || practiceMode === 2) 
                        ? (i18n.language === 'en' ? 'Simulated Parent' : '模拟家长')
                        : (i18n.language === 'en' ? 'Simulated Child' : '模拟孩子')}
                </div>
                <div>{msg.content}</div>
              </div>

              {isUser && <Avatar icon={<UserOutlined />} className="ml-2 bg-blue-600" />}
            </div>
          );
        })}
        {sending && (
          <div className="flex w-full justify-start">
            <Avatar icon={<RobotOutlined />} className="mr-2 bg-rose-300 animate-pulse" />
            <div className="bg-gray-100 p-3 rounded-xl rounded-tl-none text-gray-500 italic">
              {i18n.language === 'en' ? 'Child is reacting...' : '孩子正在反应...'}
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="flex gap-2">
        <Input.TextArea 
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder={i18n.language === 'en' ? "Type your response to the child here..." : "在此输入您对孩子的回应..."}
          autoSize={{ minRows: 2, maxRows: 4 }}
          onPressEnter={(e) => {
            if (!e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          disabled={sending || evaluating}
          className="rounded-lg"
        />
        <Button 
          type="primary" 
          icon={<SendOutlined />} 
          onClick={handleSend}
          loading={sending}
          className="h-auto px-6 rounded-lg bg-indigo-600 hover:bg-indigo-500"
        >
          {i18n.language === 'en' ? 'Send' : '发送'}
        </Button>
        {session && session.messages.length > 2 && practiceMode === 3 && (
          <Button 
            type="default" 
            onClick={handleEvaluate} 
            loading={evaluating}
            className="h-auto px-6 rounded-lg border-indigo-600 text-indigo-600 hover:bg-indigo-50"
          >
            {i18n.language === 'en' ? "Finish & Get Feedback" : "结束并获取反馈"}
          </Button>
        )}
      </div>

      <Modal
        title={i18n.language === 'en' ? "Roleplay Evaluation Report" : "角色扮演评估报告"}
        open={isModalVisible}
        onOk={() => setIsModalVisible(false)}
        onCancel={() => setIsModalVisible(false)}
        footer={[
          <Button key="ok" type="primary" onClick={() => setIsModalVisible(false)} className="bg-indigo-600">
            {i18n.language === 'en' ? "Got it" : "好的，知道了"}
          </Button>
        ]}
        width={600}
      >
        {evaluation && (
          <div className="flex flex-col gap-6 py-4">
            <div className="text-center">
              <Progress type="dashboard" percent={evaluation.score} strokeColor={evaluation.score >= 80 ? '#52c41a' : '#faad14'} />
              <Typography.Title level={4} className="mt-4">
                {i18n.language === 'en' ? "Overall Score" : "综合得分"}
              </Typography.Title>
            </div>

            <div>
              <Typography.Title level={5} className="text-indigo-600 mb-3">
                {i18n.language === 'en' ? "5-Step Method Breakdown" : "五步法详细得分"}
              </Typography.Title>
              <List
                dataSource={evaluation.stepScores || []}
                renderItem={(item) => (
                  <List.Item className="!py-3 border-b border-slate-100 last:border-none flex-col items-start">
                    <div className="w-full flex justify-between items-center mb-1">
                      <Typography.Text strong className="text-slate-700">{item.stepName}</Typography.Text>
                      <Typography.Text className="font-semibold text-indigo-600">{item.score}/20</Typography.Text>
                    </div>
                    <Progress 
                      percent={(item.score / 20) * 100} 
                      showInfo={false} 
                      strokeColor={item.score >= 15 ? '#52c41a' : item.score >= 10 ? '#faad14' : '#ff4d4f'} 
                      className="mb-1"
                    />
                    <Typography.Text type="secondary" className="text-sm">
                      {item.feedback}
                    </Typography.Text>
                  </List.Item>
                )}
              />
            </div>

            <div>
              <Typography.Title level={5} className="text-green-600">
                <CheckCircleOutlined className="mr-2" />
                {i18n.language === 'en' ? "What You Did Well (Strengths)" : "做得好的地方（优势）"}
              </Typography.Title>
              <List
                dataSource={evaluation.strengths}
                renderItem={(item) => (
                  <List.Item className="!py-2 border-none">
                    <Tag color="success" className="text-sm px-3 py-1 whitespace-normal h-auto">{item}</Tag>
                  </List.Item>
                )}
              />
            </div>

            <div>
              <Typography.Title level={5} className="text-amber-600">
                <SafetyCertificateOutlined className="mr-2" />
                {i18n.language === 'en' ? "Areas for Improvement" : "有待提升的地方"}
              </Typography.Title>
              <List
                dataSource={evaluation.improvements}
                renderItem={(item) => (
                  <List.Item className="!py-2 border-none">
                    <Tag color="warning" className="text-sm px-3 py-1 whitespace-normal h-auto">{item}</Tag>
                  </List.Item>
                )}
              />
            </div>

            <div className="bg-indigo-50 p-4 rounded-lg">
              <Typography.Text className="text-indigo-900 italic">
                "{evaluation.coachMessage}"
              </Typography.Text>
            </div>
          </div>
        )}
      </Modal>
    </Card>
  );
};