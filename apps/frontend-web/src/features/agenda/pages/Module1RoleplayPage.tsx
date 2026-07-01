import { useEffect, useState } from 'react';
import { Button, Spin, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSelector } from '../../../redux/hooks';
import { ArrowLeftIcon } from '@heroicons/react/20/solid';
import { RoleplayChat } from '../components/RoleplayChat';
import { threadSelectors } from '../reducer';

const { Title, Paragraph } = Typography;

export const Module1RoleplayPage = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  
  const threadIds = useSelector(threadSelectors.selectIds);
  const [tid, setTid] = useState<string | null>(null);

  useEffect(() => {
    // We expect exactly 1 thread to be generated for Module 1
    if (threadIds && threadIds.length > 0) {
      setTid(threadIds[0] as string);
    }
  }, [threadIds]);

  return (
    <div className='flex flex-col h-screen bg-slate-50'>
      <div className='shadow-sm z-10 bg-white border-b border-slate-200'>
        <div className="max-w-4xl mx-auto flex items-center justify-between p-4 !px-8">
          <Button size="middle" type='text' icon={<ArrowLeftIcon className="w-4 h-4" />} className='px-2 text-slate-500' onClick={() => navigate('/app/agendas')}>
            {t("Narrative.Back")}
          </Button>
          <div className="font-semibold text-lg text-slate-700">
            {i18n.language === 'en' ? 'Module 1: Roleplay Simulator' : '模块 1：角色扮演模拟器'}
          </div>
          <div className="flex items-center gap-2">
            <Button size="small" onClick={() => i18n.changeLanguage(i18n.language === 'en' ? 'zh' : 'en')}>
              {i18n.language === 'en' ? '中文' : 'English'}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto !px-4 !sm:px-8 py-8 h-full flex flex-col">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6">
            <Typography>
              <Title level={4} className="!mb-2 text-indigo-700">
                {i18n.language === 'en' ? 'Task: Tongtong\'s Tantrum' : '任务：童童的早晨危机'}
              </Title>
              <Paragraph className="text-slate-600 !mb-0">
                {i18n.language === 'en' 
                  ? 'It\'s 8:05 AM. Your 4-year-old child, Tongtong, just threw his shoe across the room and is crying on the floor because he couldn\'t put it on. Before you react, take a breath. Observe your own first emotional reaction. Then, talk to Tongtong and practice your Emotion Coaching skills.' 
                  : '早上8点05分，马上要迟到了。4岁的童童因为穿不好魔术贴鞋子，把鞋甩飞，躺在地上大哭。请不要立刻做出反应，尝试先觉察您自己的第一情绪反应（是想发火、逃避还是安抚？）。接下来，请试着与地上的童童对话，练习您的情绪辅导技巧。'}
              </Paragraph>
            </Typography>
          </div>

          <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
            {tid ? (
              <div className="flex-1 overflow-y-auto [&_.ant-card]:h-full [&_.ant-card]:border-none [&_.ant-card]:shadow-none [&_.ant-card-body]:flex [&_.ant-card-body]:flex-col [&_.ant-card-body]:h-[calc(100%-57px)] [&_.chat-container]:flex-1">
                <RoleplayChat tid={tid} />
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center flex-col p-10 text-center">
                <Spin size="large" />
                <div className="mt-4 text-slate-500">
                  {i18n.language === 'en' ? 'Initializing roleplay scenario...' : '正在初始化角色扮演场景...'}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Module1RoleplayPage;