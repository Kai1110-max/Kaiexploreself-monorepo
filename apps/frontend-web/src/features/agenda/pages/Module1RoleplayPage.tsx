import { useEffect, useState } from 'react';
import { Button, Spin, Typography, Steps } from 'antd';
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
  
  // Stages: 0: Video, 1: Practice 1, 2: Practice 2, 3: Practice 3, 4: Done
  const [currentStage, setCurrentStage] = useState<number>(0);

  useEffect(() => {
    // We expect exactly 1 thread to be generated for Module 1
    if (threadIds && threadIds.length > 0) {
      setTid(threadIds[0] as string);
    }
  }, [threadIds]);

  const handleNextStage = () => {
    if (currentStage < 4) {
      setCurrentStage(prev => prev + 1);
    }
  };

  const handlePrevStage = () => {
    if (currentStage > 0) {
      setCurrentStage(prev => prev - 1);
    }
  };

  const getPageTitle = () => {
    if (currentStage === 0) return i18n.language === 'en' ? 'Module 1: Video Scenario' : '模块 1：场景引入';
    if (currentStage === 1) return i18n.language === 'en' ? 'Practice 1: Novice Parent' : '练习 1：新手家长';
    if (currentStage === 2) return i18n.language === 'en' ? 'Practice 2: Expert Parent' : '练习 2：专家家长';
    if (currentStage === 3) return i18n.language === 'en' ? 'Practice 3: Your Turn' : '练习 3：实战演练';
    return i18n.language === 'en' ? 'Module 1: Completed' : '模块 1：已完成';
  };

  return (
    <div className='flex flex-col h-screen bg-slate-50'>
      <div className='shadow-sm z-10 bg-white border-b border-slate-200'>
        <div className="max-w-4xl mx-auto flex items-center justify-between p-4 !px-8">
          <Button size="middle" type='text' icon={<ArrowLeftIcon className="w-4 h-4" />} className='px-2 text-slate-500' onClick={() => {
            if (currentStage > 0 && currentStage < 4) {
              handlePrevStage();
            } else {
              navigate('/app/agendas');
            }
          }}>
            {currentStage > 0 && currentStage < 4 
              ? (i18n.language === 'en' ? 'Back to Previous Step' : '返回上一环节') 
              : t("Narrative.Back")}
          </Button>
          <div className="font-semibold text-lg text-slate-700">
            {getPageTitle()}
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

          {currentStage === 0 && (
            <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 text-center flex-1 flex flex-col justify-center">
              <Title level={2} className="!mb-6 text-indigo-700">
                {i18n.language === 'en' ? 'Watch: Lele Going to School' : '观看场景：乐乐上学'}
              </Title>
              <div className="w-full max-w-3xl mx-auto aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center border border-slate-300 shadow-lg">
                <video 
                  src="/lele-scenario.mp4" 
                  controls 
                  className="w-full h-full object-contain"
                  poster=""
                >
                  {i18n.language === 'en' ? 'Your browser does not support the video tag.' : '您的浏览器不支持视频播放。'}
                </video>
              </div>
              <Paragraph className="text-slate-600 mt-8 text-xl max-w-2xl mx-auto leading-relaxed">
                {i18n.language === 'en' 
                  ? "6-year-old Lele wakes up crying and refuses to go to school because a classmate told others not to play with him. After watching the video, you will enter separate practices to respond to this situation."
                  : "6岁的乐乐一早起来哭闹，因为同学不跟他玩，他拒绝去上学。看完视频后，您将进入独立的练习环节，尝试以不同的方式应对这种情况。"}
              </Paragraph>
              <div className="mt-10">
                <Button type="primary" size="large" className="bg-indigo-600 px-12 h-14 text-xl rounded-xl shadow-md hover:bg-indigo-500" onClick={handleNextStage}>
                  {i18n.language === 'en' ? 'I have finished watching, Start Practice 1' : '我已看完视频，进入练习 1'}
                </Button>
              </div>
            </div>
          )}

          {currentStage > 0 && currentStage <= 3 && (
            <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-[600px]">
              {tid ? (
                <div className="flex-1 overflow-y-auto [&_.ant-card]:h-full [&_.ant-card]:border-none [&_.ant-card]:shadow-none [&_.ant-card-body]:flex [&_.ant-card-body]:flex-col [&_.ant-card-body]:h-[calc(100%-64px)] [&_.chat-container]:flex-1">
                  <RoleplayChat 
                    key={currentStage} 
                    tid={tid} 
                    practiceMode={currentStage} 
                    onPracticeComplete={handleNextStage} 
                  />
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center flex-col p-10 text-center">
                  <Spin size="large" />
                  <div className="mt-4 text-slate-500 text-lg">
                    {i18n.language === 'en' ? 'Initializing roleplay scenario...' : '正在初始化角色扮演场景...'}
                  </div>
                </div>
              )}
            </div>
          )}

          {currentStage === 4 && (
            <div className="bg-white p-12 rounded-xl shadow-sm border border-slate-200 text-center flex-1 flex flex-col justify-center items-center">
              <div className="text-8xl mb-6">🎉</div>
              <Title level={1} className="text-indigo-700 mb-6">
                {i18n.language === 'en' ? 'Congratulations!' : '恭喜完成！'}
              </Title>
              <Paragraph className="text-slate-600 text-xl max-w-lg leading-relaxed">
                {i18n.language === 'en' 
                  ? "You have successfully completed all 3 practice modes and demonstrated great Emotion Coaching skills."
                  : "您已成功完成了所有 3 个练习模式，并展现了出色的情绪辅导技巧！"}
              </Paragraph>
              <Button type="primary" size="large" className="mt-10 bg-indigo-600 px-10 h-12 text-lg rounded-xl shadow-md hover:bg-indigo-500" onClick={() => navigate('/app/agendas')}>
                {i18n.language === 'en' ? 'Return to Modules' : '返回课程列表'}
              </Button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Module1RoleplayPage;