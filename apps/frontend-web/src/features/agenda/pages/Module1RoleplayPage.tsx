import { useEffect, useState } from 'react';
import { Button, Spin, Typography, Tabs } from 'antd';
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
  const [practiceMode, setPracticeMode] = useState<number>(1);

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
          
          {/* Video Section */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6 text-center">
            <Title level={4} className="!mb-4 text-indigo-700">
              {i18n.language === 'en' ? 'Watch: Lele Going to School' : '观看场景：乐乐上学'}
            </Title>
            <div className="w-full max-w-2xl mx-auto aspect-video bg-slate-200 rounded-lg overflow-hidden flex items-center justify-center border border-slate-300">
              {/* Placeholder for video. Could be a <video> or <iframe> tag in production */}
              <div className="text-slate-500 flex flex-col items-center">
                <svg className="w-16 h-16 mb-2 text-slate-400" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4l12 6-12 6z"/></svg>
                <span>{i18n.language === 'en' ? '[Video Placeholder: Lele crying about not going to school]' : '[视频占位：乐乐因为不想上学而哭闹的动画]'}</span>
              </div>
            </div>
            <Paragraph className="text-slate-600 mt-4 text-left">
              {i18n.language === 'en' 
                ? "6-year-old Lele wakes up crying and refuses to go to school because a classmate told others not to play with him. Now, you will practice responding to this situation in three different ways."
                : "6岁的乐乐一早起来哭闹，因为同学不跟他玩，他拒绝去上学。接下来，您将通过三种不同的视角来练习应对这种情况。"}
            </Paragraph>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-6 px-6 pt-4">
            <Tabs 
              activeKey={practiceMode.toString()} 
              onChange={(key) => setPracticeMode(Number(key))}
              items={[
                { key: '1', label: i18n.language === 'en' ? 'Practice 1: Novice Parent' : '练习 1：新手家长' },
                { key: '2', label: i18n.language === 'en' ? 'Practice 2: Expert Parent' : '练习 2：专家家长' },
                { key: '3', label: i18n.language === 'en' ? 'Practice 3: You as Parent' : '练习 3：您作为家长' },
              ]}
            />
          </div>

          <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-[500px]">
            {tid ? (
              <div className="flex-1 overflow-y-auto [&_.ant-card]:h-full [&_.ant-card]:border-none [&_.ant-card]:shadow-none [&_.ant-card-body]:flex [&_.ant-card-body]:flex-col [&_.ant-card-body]:h-[calc(100%-57px)] [&_.chat-container]:flex-1">
                {/* Use key to force unmount/remount of RoleplayChat when practiceMode changes */}
                <RoleplayChat key={practiceMode} tid={tid} practiceMode={practiceMode} />
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