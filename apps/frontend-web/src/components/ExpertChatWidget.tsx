import React, { useState, useRef, useEffect } from 'react';
import { FloatButton, Drawer, Input, Button, Spin, Typography } from 'antd';
import { CustomerServiceOutlined, SendOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useSelector } from '../redux/hooks';
import { Http } from '../net/http';

const { Text } = Typography;

interface ChatMessage {
  role: 'user' | 'expert';
  content: string;
}

export const ExpertChatWidget: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([{
    role: 'expert',
    content: i18n.language === 'zh' 
      ? '您好！我是您的专属育儿专家。如果您在任何环节遇到关于育儿、儿童心理或情绪指导的问题，都可以随时问我！'
      : 'Hello! I am your personal Parenting Expert. Feel free to ask me any questions about parenting, child psychology, or emotion coaching anytime!'
  }]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const token = useSelector((state) => state.auth.token);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (open) {
      scrollToBottom();
    }
  }, [messages, open]);

  const handleSend = async () => {
    if (!inputValue.trim() || loading) return;

    const userMessage: ChatMessage = { role: 'user', content: inputValue.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputValue('');
    setLoading(true);

    try {
      const response = await Http.axios.post(
        '/expert/chat',
        {
          newMessage: userMessage.content,
          chatHistory: messages.filter(m => m.role !== 'expert' || m.content !== (i18n.language === 'zh' ? '您好！我是您的专属育儿专家。如果您在任何环节遇到关于育儿、儿童心理或情绪指导的问题，都可以随时问我！' : 'Hello! I am your personal Parenting Expert. Feel free to ask me any questions about parenting, child psychology, or emotion coaching anytime!')), // omit initial greeting
          language: i18n.language
        },
        {
          headers: Http.makeSignedInHeader(token || '')
        }
      );

      setMessages([...newMessages, { role: 'expert', content: response.data.response }]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages([...newMessages, { 
        role: 'expert', 
        content: i18n.language === 'zh' ? '抱歉，我现在有点开小差，请稍后再试。' : 'Sorry, I am having trouble connecting right now. Please try again later.' 
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <FloatButton
        icon={<CustomerServiceOutlined />}
        type="primary"
        style={{ right: 24, bottom: 24, width: 56, height: 56 }}
        onClick={() => setOpen(true)}
        tooltip={i18n.language === 'zh' ? '育儿专家' : 'Expert'}
      />
      <Drawer
        title={i18n.language === 'zh' ? '育儿专家 (AI)' : 'Parenting Expert (AI)'}
        placement="right"
        onClose={() => setOpen(false)}
        open={open}
        width={400}
        styles={{
            body: {
                display: 'flex',
                flexDirection: 'column',
                padding: 0
            }
        }}
      >
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
          {messages.map((msg, idx) => (
            <div key={idx} className={`mb-4 flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-white border border-slate-200 text-slate-700 rounded-tl-sm'}`}>
                <Text className={msg.role === 'user' ? 'text-white' : 'text-slate-700'} style={{ whiteSpace: 'pre-wrap' }}>
                  {msg.content}
                </Text>
              </div>
            </div>
          ))}
          {loading && (
            <div className="mb-4 flex justify-start">
              <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-white border border-slate-200 shadow-sm rounded-tl-sm">
                <Spin size="small" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className="p-4 bg-white border-t border-slate-200">
          <Input.Search
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onSearch={handleSend}
            placeholder={i18n.language === 'zh' ? '向专家提问...' : 'Ask the expert...'}
            enterButton={<Button type="primary" icon={<SendOutlined />} />}
            size="large"
            disabled={loading}
          />
        </div>
      </Drawer>
    </>
  );
};
