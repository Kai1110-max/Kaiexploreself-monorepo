import React, { useState, useEffect, useRef } from 'react';
import { Card, Input, Button, List, Typography, Space, Spin, Avatar, Modal, Progress, Tag, message as antdMessage, Popover } from 'antd';
import { SendOutlined, UserOutlined, RobotOutlined, SafetyCertificateOutlined, CheckCircleOutlined, BulbOutlined, CloseOutlined } from '@ant-design/icons';
import { useSelector } from '../../../redux/hooks';
import { startRoleplaySession, sendRoleplayMessage, evaluateRoleplaySession, getAdvisorsAdvice, IRoleplayEvaluation } from '../../../api_call/roleplay';
import { chatWithHelper } from '../../../api_call/helper';
import { IRoleplaySessionPopulated, RoleplayAgentType } from '@core';
import { useTranslation } from 'react-i18next';

const { Text } = Typography;

export const RoleplayChat = ({ tid, practiceMode = 3, onPracticeComplete }: { tid: string, practiceMode?: number, onPracticeComplete?: () => void }) => {
  const { i18n } = useTranslation();
  const token = useSelector(state => state.auth.token);
  const agendaId = useSelector(state => state.agenda.agendaId);
  const [session, setSession] = useState<IRoleplaySessionPopulated | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<IRoleplayEvaluation | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  
  const [advisorsAdvice, setAdvisorsAdvice] = useState<{ expert: string, peer: string } | null>(null);
  const [askingAdvisors, setAskingAdvisors] = useState(false);
  const [message, setMessage] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Helper Agent States
  const [isHelperOpen, setIsHelperOpen] = useState(false);
  const [helperHistory, setHelperHistory] = useState<{role: string, content: string}[]>([]);
  const [isHelperLoading, setIsHelperLoading] = useState(false);
  const [helperInput, setHelperInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const helperChatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isHelperOpen) {
      helperChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [helperHistory, isHelperOpen]);

  useEffect(() => {
    const initSession = async () => {
      if (token && agendaId && tid) {
        setLoading(true);
        try {
          const res = await startRoleplaySession(token, agendaId, tid, i18n.language, practiceMode);
          if (res) {
            setSession(res);
          }
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

  const isMessageTooShort = () => {
    const text = message.trim();
    if (!text) return false; // If empty, we handle it separately
    const isEnglish = i18n.language.startsWith('en');
    return isEnglish 
      ? text.split(/\s+/).length < 8 // Less than 8 words for English
      : text.length < 8;             // Less than 8 characters for Chinese
  };

  const handleSend = async () => {
    if (!message.trim() || !token || !agendaId) return;

    if (isMessageTooShort() && (practiceMode === 1 || practiceMode === 2)) {
      Modal.confirm({
        title: i18n.language === 'en' ? 'Tip' : '提示',
        content: i18n.language === 'en' 
          ? 'Your reflection is very concise! It would be great if you could share a bit more detail. If you are not sure how to answer, please click the lightbulb button for a hint.' 
          : '您的反思非常精炼！如果能多分享一点细节就更好了，如果不知道如何回答请点击输入框右侧的小灯泡按钮。',
        okText: i18n.language === 'en' ? 'Send Anyway' : '继续发送',
        cancelText: i18n.language === 'en' ? 'Add More' : '去补充',
        onOk: () => {
          executeSend();
        }
      });
      return;
    }
    
    executeSend();
  };

  const executeSend = async () => {
    const userMsg = message;
    setMessage('');
    setSending(true);
    setIsHelperOpen(false); // Close helper if it was open
    setHelperHistory([]); // Reset helper history for the next question

    const userRole = RoleplayAgentType.Parent;

    // Optimistically add user message
    const tempId = `temp-${Date.now()}`;
    if (session) {
      setSession({
        ...session,
        messages: [
          ...(session.messages || []),
          { _id: tempId, sender: userRole, content: userMsg, timestamp: new Date() } as any
        ]
      });
    }

    try {
      if (token && agendaId && tid) {
        const updatedSession = await sendRoleplayMessage(token, agendaId, tid, userMsg, i18n.language, practiceMode);
        if (updatedSession && !('error' in updatedSession)) {
          setSession(updatedSession);
        } else {
          antdMessage.error(i18n.language === 'en' ? 'Failed to get response from AI. Please try again.' : 'AI 响应失败，请重试。');
          // Rollback optimistic update
          setSession(prev => prev ? { ...prev, messages: (prev.messages || []).filter(m => m._id !== tempId) } : prev);
        }
      }
    } catch (e) {
      console.error(e);
      antdMessage.error(i18n.language === 'en' ? 'Network error. Please check your connection and try again.' : '网络错误，请检查连接后重试。');
      // Rollback optimistic update
      setSession(prev => prev ? { ...prev, messages: (prev.messages || []).filter(m => m._id !== tempId) } : prev);
    }
    setSending(false);
  };

  if (loading) {
    const tipText = practiceMode === 3 
      ? (i18n.language === 'en' ? "Initializing Roleplay Environment..." : "正在初始化角色扮演环境...")
      : (i18n.language === 'en' ? "Initializing Reflection Session..." : "正在初始化反思环节...");
    return <div className="p-8 text-center"><Spin tip={tipText} /></div>;
  }

  const handleEvaluate = async () => {
    if (!token || !agendaId || !tid) return;
    setEvaluating(true);
    try {
      const result = await evaluateRoleplaySession(token, agendaId, tid, i18n.language, practiceMode);
      if (result && !('error' in result)) {
        setEvaluation(result);
        setIsModalVisible(true);
      } else {
        antdMessage.error(i18n.language === 'en' ? 'Failed to evaluate. Please try again.' : '评估失败，请重试。');
      }
    } catch (e) {
      console.error(e);
      antdMessage.error(i18n.language === 'en' ? 'Network error. Please try again.' : '网络错误，请重试。');
    }
    setEvaluating(false);
  };

  const toggleHelper = async () => {
    const newState = !isHelperOpen;
    setIsHelperOpen(newState);
    
    if (newState && helperHistory.length === 0 && session?.messages) {
      setIsHelperLoading(true);
      const coachMsgs = session.messages.filter(m => m.sender === RoleplayAgentType.Moderator);
      const lastCoachMsg = coachMsgs.length > 0 ? coachMsgs[coachMsgs.length - 1].content : "";
      
      try {
        console.log("Calling helper with:", { lastCoachMsg, language: i18n.language, practiceMode });
        const reply = await chatWithHelper(lastCoachMsg, [], i18n.language, practiceMode);
        setHelperHistory([{ role: 'helper', content: reply }]);
      } catch (e) {
        console.error("Failed to get initial helper response:", e);
        antdMessage.error(i18n.language === 'en' ? 'Failed to connect to Helper.' : '无法连接到小助手。');
      }
      setIsHelperLoading(false);
    }
  };

  const handleHelperSend = async () => {
    if (!helperInput.trim() || isHelperLoading) return;
    
    const userText = helperInput;
    setHelperInput("");
    const newHistory = [...helperHistory, { role: 'user', content: userText }];
    setHelperHistory(newHistory);
    setIsHelperLoading(true);
    
    const coachMsgs = session?.messages?.filter(m => m.sender === RoleplayAgentType.Moderator) || [];
    const lastCoachMsg = coachMsgs.length > 0 ? coachMsgs[coachMsgs.length - 1].content : "";

    try {
      const reply = await chatWithHelper(lastCoachMsg, newHistory, i18n.language, practiceMode);
      setHelperHistory([...newHistory, { role: 'helper', content: reply }]);
    } catch (e) {
      console.error(e);
    }
    setIsHelperLoading(false);
  };

  const renderScenarioDescription = () => {
    if (practiceMode === 1) {
      return i18n.language === 'en'
        ? "You just watched the first video. Now, reflect on this video with the AI Coach. Explore how the child might feel in this situation, and discuss the potential long-term impacts."
        : "您刚才观看了第一段视频。现在，请与 AI 教练一起反思这段视频。探讨如果孩子处于这种情况下会有什么感受，以及长期的影响。";
    } else if (practiceMode === 2) {
      return i18n.language === 'en'
        ? "You just watched the second video. Now, reflect on the differences with the AI Coach. Discuss how the child's feelings might change after their emotions are validated."
        : "您刚才观看了第二段视频。现在，请与 AI 教练一起反思两次视频的差异。探讨孩子感受到被理解后的变化。";
    } else {
      return i18n.language === 'en'
        ? "In this final practice, YOU are the Parent. The AI is playing the role of 6-year-old Lele who refuses to go to school. Your goal is to practice the '5-Step Emotion Coaching Method' (Notice, Connect, Empathize, Label, Set Limits). The AI Coach will observe your responses and provide guidance. If you do well, Lele will calm down!"
        : "在最终的练习中，您将回归“家长”的角色。AI将扮演那个哭闹着不想去上学的乐乐。您的目标是亲自实践刚才学到的“情绪辅导五步法”（觉察、链接、共情、表达、界限）。AI教练会在一旁观察并给予提示。如果您做得好，乐乐的情绪就会逐渐平复！";
    }
  };

  const handleAskAdvisors = async () => {
    if (!session || !agendaId || !tid || !token) return;
    setAskingAdvisors(true);
    setAdvisorsAdvice(null);
    try {
      const advice = await getAdvisorsAdvice(token, agendaId, tid, i18n.language, practiceMode);
      if (!advice) throw new Error("Failed to fetch advice");
      setAdvisorsAdvice(advice);
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      antdMessage.error(i18n.language === 'en' ? 'Failed to get advice' : '获取智囊团建议失败');
    } finally {
      setAskingAdvisors(false);
    }
  };

  return (
    <Card title={
      practiceMode === 1 || practiceMode === 2 
        ? (i18n.language === 'en' ? "Reflection Chat" : "反思对话")
        : (i18n.language === 'en' ? "Dual-Agent Roleplay Simulator" : "双智能体角色扮演模拟器")
    } className="shadow-md rounded-xl overflow-hidden border-indigo-200">
      <div className="bg-slate-50 p-4 rounded-lg mb-4 text-sm text-slate-700 border border-slate-200 shadow-inner shrink-0">
        <div className="font-bold text-indigo-700 mb-2 text-base">
          {i18n.language === 'en' ? "Your Mission in this Practice:" : "您在此练习中的任务："}
        </div>
        <div className="leading-relaxed">
          {renderScenarioDescription()}
        </div>
        {practiceMode === 3 && (
          <div className="mt-2 text-xs font-semibold text-indigo-500 bg-indigo-50 p-2 rounded border border-indigo-100">
            💡 {i18n.language === 'en' ? "Tip: You can ask the coach a direct question anytime by including '@coach' in your message. The child will ignore it." : "提示：如果您不知道该怎么回复，可以在消息中包含 '@教练' 来直接向教练提问，模拟角色会自动忽略这句话。"}
          </div>
        )}
      </div>

      {(() => {
        return (
          <div className="chat-container h-96 overflow-y-auto p-4 border border-gray-100 rounded-lg shadow-inner mb-4 flex flex-col gap-4 transition-colors duration-1000 bg-white">
            {session?.messages?.map((msg, idx) => {
              const isUser = msg.sender === RoleplayAgentType.Parent;
          const isModerator = msg.sender === RoleplayAgentType.Moderator;
          const isPartner = !isUser && !isModerator;

          // Emotion visual styling
          let bubbleColorClass = isUser ? 'bg-blue-500 text-white' : isModerator ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-rose-50 border-rose-200 text-rose-900';
          let avatarClass = isModerator ? 'bg-amber-500' : 'bg-rose-500';
          
          // Emotion Sticker Mapping
          let stickerUrl = null;

          if (isPartner && (msg as any).emotion) {
            const emotion = (msg as any).emotion;
            if (emotion === 'angry') {
              bubbleColorClass = 'bg-red-100 border-red-400 text-red-900 shadow-md';
              avatarClass = 'bg-red-600 animate-pulse';
              // Fire/Angry animated emoji
              stickerUrl = 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f621/512.webp';
            } else if (emotion === 'sad') {
              bubbleColorClass = 'bg-blue-50 border-blue-200 text-blue-900';
              avatarClass = 'bg-blue-400 opacity-80';
              // Crying animated emoji
              stickerUrl = 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f62d/512.webp';
            } else if (emotion === 'resistant') {
              bubbleColorClass = 'bg-orange-100 border-orange-400 text-orange-900';
              avatarClass = 'bg-orange-500';
              // Arms crossed / No animated emoji (using an exasperated/huffing face)
              stickerUrl = 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f624/512.webp';
            } else if (emotion === 'calm' || emotion === 'neutral') {
              bubbleColorClass = 'bg-green-50 border-green-200 text-green-900';
              avatarClass = 'bg-green-500';
              // Calm / Smiling animated emoji
              stickerUrl = 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f60c/512.webp';
            }
          }

          const actionText = (msg as any).action;
          const isValidAction = actionText && !['n/a', 'none', 'null'].includes(actionText.toLowerCase().trim());

          return (
            <div key={msg._id || idx} className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} items-end relative`}>
              {!isUser && (
                <div className="flex flex-col items-center mr-2">
                  <Avatar 
                    icon={isModerator ? <SafetyCertificateOutlined /> : <RobotOutlined />} 
                    className={`${avatarClass} transition-all duration-500 ${actionText?.includes('turns away') ? 'scale-x-[-1]' : ''}`} 
                  />
                </div>
              )}
              
              <div className={`relative max-w-[75%] p-3 rounded-xl border ${bubbleColorClass} ${isUser ? 'rounded-br-none' : 'rounded-bl-none'}`}>
                {/* Sticker rendering */}
                {stickerUrl && !isModerator && !isUser && (
                  <div className="absolute -top-8 -right-8 w-16 h-16 pointer-events-none z-10 animate-bounce">
                    <img src={stickerUrl} alt="emotion-sticker" className="w-full h-full object-contain drop-shadow-md" />
                  </div>
                )}
                <div className="text-xs opacity-70 mb-1 font-semibold uppercase tracking-wider flex justify-between">
                  <span>
                    {isUser 
                      ? (i18n.language === 'en' ? 'You' : '您') 
                      : isModerator 
                        ? (i18n.language === 'en' ? 'Coach' : '教练') 
                        : (practiceMode === 1 || practiceMode === 2) 
                          ? (i18n.language === 'en' ? 'Simulated Parent' : '模拟家长')
                          : (i18n.language === 'en' ? 'Simulated Child' : '模拟孩子')}
                  </span>
                  {!isUser && !isModerator && (msg as any).emotion && (
                    <span className="ml-2 capitalize opacity-80">{(msg as any).emotion}</span>
                  )}
                </div>
                
                {isValidAction && (
                  <div className="text-xs italic bg-white/50 px-2 py-1 rounded mb-2 inline-block shadow-sm">
                    *{actionText}*
                  </div>
                )}
                
                <div className="whitespace-pre-wrap">{msg.content}</div>
              </div>

              {isUser && <Avatar icon={<UserOutlined />} className="ml-2 bg-blue-600 mb-0" />}
            </div>
          );
        })}
            {sending && (() => {
              const lastMsg = session?.messages[session.messages.length - 1];
              const isToCoach = lastMsg?.content?.toLowerCase().includes('@coach') || lastMsg?.content?.includes('@教练');
              
              return (
                <div className="flex w-full justify-start">
                  <Avatar icon={isToCoach ? <SafetyCertificateOutlined /> : <RobotOutlined />} className={`mr-2 animate-pulse ${isToCoach ? 'bg-amber-500' : 'bg-rose-300'}`} />
                  <div className="bg-gray-100 p-3 rounded-xl rounded-tl-none text-gray-500 italic">
                    {isToCoach
                      ? (i18n.language === 'en' ? 'Coach is typing...' : '教练正在思考...')
                      : practiceMode === 1 || practiceMode === 2 
                        ? (i18n.language === 'en' ? 'Coach is typing...' : '教练正在思考...')
                        : (i18n.language === 'en' ? 'Simulated Child is typing...' : '模拟孩子正在输入...')
                    }
                  </div>
                </div>
              );
            })()}
            
            {advisorsAdvice && practiceMode === 3 && (
              <div className="flex flex-col gap-3 my-4 mx-2 p-4 bg-slate-50 border border-slate-200 rounded-xl shadow-inner">
                <div className="text-center font-bold text-slate-600 mb-2">
                  {i18n.language === 'en' ? "💡 Board of Advisors" : "💡 智囊团建议"}
                </div>
                
                <div className="flex gap-4 items-start">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0 border border-blue-200">
                    🧑‍🏫
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-bold text-blue-700 mb-1">
                      {i18n.language === 'en' ? "Expert (Psychologist)" : "专家（儿童心理学家）"}
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-slate-200 text-sm text-slate-700">
                      {advisorsAdvice.expert}
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 items-start mt-2">
                  <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0 border border-rose-200">
                    👩‍👧‍👦
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-bold text-rose-700 mb-1">
                      {i18n.language === 'en' ? "Peer (Experienced Mom)" : "过来人（二胎妈妈）"}
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-slate-200 text-sm text-slate-700">
                      {advisorsAdvice.peer}
                    </div>
                  </div>
                </div>
                
                <div className="text-center text-xs text-slate-400 mt-2 italic">
                  {i18n.language === 'en' 
                    ? "Choose one to follow, or combine them to craft your own response below." 
                    : "请结合他们的建议，在下方输入您的回复。"}
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>
        );
      })()}

      <div className="flex gap-2 shrink-0 mt-4">
        {practiceMode === 3 && (
          <Button
            type="dashed"
            icon={<BulbOutlined />}
            onClick={handleAskAdvisors}
            loading={askingAdvisors}
            disabled={sending || evaluating}
            className="h-auto rounded-lg text-amber-600 border-amber-300 hover:text-amber-700 hover:border-amber-400 hover:bg-amber-50 shrink-0"
            title={i18n.language === 'en' ? "Ask Board of Advisors" : "求助智囊团"}
          />
        )}
        <div className="relative flex-1">
          <Input.TextArea 
            value={message}
            onChange={e => {
              setMessage(e.target.value);
              setIsTyping(true);
              setTimeout(() => setIsTyping(false), 1500);
            }}
            placeholder={
              practiceMode === 1 || practiceMode === 2 
                ? (i18n.language === 'en' ? "Share your thoughts with the Coach..." : "与教练分享您的感受和想法...")
                : (i18n.language === 'en' ? "Type your response to the child here..." : "作为家长，在此输入您对孩子的回应...")
            }
            autoSize={{ minRows: 2, maxRows: 4 }}
            onPressEnter={(e) => {
              if (!e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            disabled={sending || evaluating}
            className="rounded-lg pr-12"
          />
          {(practiceMode === 1 || practiceMode === 2) && (
            <Popover
              content={
                <div className="w-80 h-96 flex flex-col">
                  <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-100">
                    <span className="font-bold text-amber-600 flex items-center gap-1">
                      <BulbOutlined /> {i18n.language === 'en' ? "Reflection Helper" : "反思小助手"}
                    </span>
                    <Button type="text" size="small" icon={<CloseOutlined />} onClick={() => setIsHelperOpen(false)} />
                  </div>
                  <div className="flex-1 overflow-y-auto mb-3 flex flex-col gap-2 p-1">
                    {helperHistory.map((msg, idx) => (
                      <div key={idx} className={`max-w-[85%] p-2 rounded-lg text-sm ${msg.role === 'helper' ? 'bg-amber-50 text-amber-900 self-start border border-amber-100' : 'bg-blue-500 text-white self-end'}`}>
                        {msg.content}
                      </div>
                    ))}
                    {isHelperLoading && (
                      <div className="self-start text-amber-500 text-xs italic"><Spin size="small" className="mr-1" /> {i18n.language === 'en' ? "Thinking..." : "思考中..."}</div>
                    )}
                    <div ref={helperChatEndRef} />
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Input 
                      size="small" 
                      value={helperInput} 
                      onChange={e => setHelperInput(e.target.value)}
                      onPressEnter={handleHelperSend}
                      disabled={isHelperLoading}
                      placeholder={i18n.language === 'en' ? "Ask the helper..." : "向小助手提问..."} 
                    />
                    <Button size="small" type="primary" className="bg-amber-500 hover:bg-amber-400 border-none" icon={<SendOutlined />} onClick={handleHelperSend} loading={isHelperLoading} />
                  </div>
                </div>
              }
              trigger="click"
              open={isHelperOpen}
              onOpenChange={(open) => {
                if (!open) setIsHelperOpen(false);
              }}
              placement="topRight"
            >
              <Button 
                type="text" 
                icon={<BulbOutlined className={`text-xl ${isTyping && isMessageTooShort() ? 'animate-bounce text-amber-500' : 'text-slate-400'}`} />} 
                className="absolute right-2 bottom-2 hover:bg-amber-50" 
                onClick={toggleHelper}
                title={i18n.language === 'en' ? "Get a hint" : "获取提示"}
              />
            </Popover>
          )}
        </div>
        <Button 
          type="primary" 
          icon={<SendOutlined />} 
          onClick={handleSend}
          loading={sending}
          className="h-auto px-6 rounded-lg bg-indigo-600 hover:bg-indigo-500"
        >
          {i18n.language === 'en' ? 'Send' : '发送'}
        </Button>
        {(() => {
          if (!session) return null;
          const userRole = RoleplayAgentType.Parent;
          // Filter out @coach messages from the round count
          const userMsgCount = session.messages.filter(m => 
            m.sender === userRole && 
            !m.content.toLowerCase().includes('@coach') && 
            !m.content.includes('@教练')
          ).length;
          
          // Phase 1, 2, and 3 all require 6 turns to manually skip
          const requiredTurns = 6;
          
          let canEvaluate = false;
          if (practiceMode === 1 || practiceMode === 2) {
             const hasConclusion = session.messages.some(m => m.content.includes("The reflection phase is complete") || m.content.includes("反思阶段已完成"));
             // For reflection phases, user must complete all topics to proceed
             canEvaluate = hasConclusion;
             
             // Auto trigger evaluation when conclusion is reached and modal isn't already visible
             if (canEvaluate && !evaluating && !isModalVisible && !evaluation) {
               // Use setTimeout to avoid React state update during render warning
               setTimeout(() => {
                 handleEvaluate();
               }, 1000);
             }
          } else {
             canEvaluate = userMsgCount >= requiredTurns;
          }
          
          if (userMsgCount >= 0) { // Changed from > 0 to >= 0 so the button always shows
            return (
              <Button 
                type="default" 
                onClick={handleEvaluate} 
                loading={evaluating}
                disabled={!canEvaluate}
                title={!canEvaluate ? (i18n.language === 'en' ? `Please complete all topics before evaluation` : `请完成所有反思话题后再获取反馈`) : ""}
                className={`h-auto px-6 rounded-lg border-indigo-600 text-indigo-600 hover:bg-indigo-50 ${!canEvaluate ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {i18n.language === 'en' 
                  ? (canEvaluate ? "Finish & Get Feedback" : (practiceMode === 1 || practiceMode === 2 ? "Reflecting..." : `Reflecting... (${userMsgCount}/${requiredTurns})`)) 
                  : (canEvaluate ? "结束并获取反馈" : (practiceMode === 1 || practiceMode === 2 ? "反思探讨中..." : `反思探讨中 (${userMsgCount}/${requiredTurns})`))}
              </Button>
            );
          }
          return null;
        })()}
      </div>

      <Modal
        title={i18n.language === 'en' ? "Feedback Report" : "反馈报告"}
        open={isModalVisible}
        onOk={() => setIsModalVisible(false)}
        onCancel={() => setIsModalVisible(false)}
        footer={[
          (!evaluation?.passed) && (
            <Button key="retry" onClick={() => setIsModalVisible(false)}>
              {i18n.language === 'en' ? "Try Again" : "再试一次"}
            </Button>
          ),
          <Button 
            key="ok" 
            type="primary" 
            onClick={() => {
              setIsModalVisible(false);
              if (evaluation?.passed && onPracticeComplete) {
                onPracticeComplete();
              }
            }} 
            className="bg-indigo-600"
          >
            {evaluation?.passed 
              ? (i18n.language === 'en' ? "Proceed to Next Step" : "继续下一步")
              : (i18n.language === 'en' ? "Got it" : "好的，知道了")
            }
          </Button>
        ]}
        width={600}
      >
        {evaluation && (
          <div className="flex flex-col gap-6 py-4">
            {practiceMode !== 1 && practiceMode !== 2 && (
              <div className="text-center">
                <Progress type="dashboard" percent={evaluation.score} strokeColor={evaluation.passed ? '#52c41a' : '#ff4d4f'} />
                <Typography.Title level={4} className="mt-4">
                  {evaluation.passed 
                    ? (i18n.language === 'en' ? "Practice Passed! 🎉" : "练习通过！🎉")
                    : (i18n.language === 'en' ? "Practice Failed 😢" : "练习未通过 😢")
                  }
                </Typography.Title>
              </div>
            )}

            {(practiceMode === 1 || practiceMode === 2) && (
              <div className="text-center">
                <Typography.Title level={4} className="mt-2 text-indigo-600">
                  {i18n.language === 'en' ? "Reflection Completed 🎉" : "反思完成！🎉"}
                </Typography.Title>
                <Typography.Text type="secondary">
                  {i18n.language === 'en' 
                    ? "Here is the summary and educational feedback based on your reflection." 
                    : "以下是基于您反思内容的教育性指导与建议。"}
                </Typography.Text>
              </div>
            )}

            <div>
              <Typography.Title level={5} className="text-indigo-600 mb-3">
                {(practiceMode === 1 || practiceMode === 2)
                  ? (i18n.language === 'en' ? "Reflection Feedback" : "反思维度反馈")
                  : (i18n.language === 'en' ? "5-Step Method Breakdown" : "五步法详细得分")
                }
              </Typography.Title>
              <List
                dataSource={evaluation.stepScores || []}
                renderItem={(item) => (
                  <List.Item className="!py-3 border-b border-slate-100 last:border-none flex-col items-start">
                    <div className="w-full flex justify-between items-center mb-1">
                      <Typography.Text strong className="text-slate-700">{item.stepName}</Typography.Text>
                      {practiceMode !== 1 && practiceMode !== 2 && (
                        <Typography.Text className="font-semibold text-indigo-600">{item.score}/20</Typography.Text>
                      )}
                    </div>
                    {practiceMode !== 1 && practiceMode !== 2 && (
                      <Progress 
                        percent={(item.score / 20) * 100} 
                        showInfo={false} 
                        strokeColor={item.score >= 15 ? '#52c41a' : item.score >= 10 ? '#faad14' : '#ff4d4f'} 
                        className="mb-1"
                      />
                    )}
                    <Typography.Text type="secondary" className="text-sm mt-1">
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