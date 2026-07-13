import { useEffect, useState } from 'react';
import { Button, Spin, Typography, Tabs, Carousel } from 'antd';
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
            <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 flex-1 flex flex-col">
              <Tabs defaultActiveKey="1" className="h-full flex flex-col [&_.ant-tabs-content]:h-full [&_.ant-tabs-tabpane]:h-full">
                <Tabs.TabPane tab={i18n.language === 'en' ? 'Learning Materials' : '学习资料'} key="1">
                  <Carousel arrows dotPosition="bottom" className="h-full bg-slate-50 rounded-lg pb-10">
                    {/* Slide 1: Theory */}
                    <div className="p-8 h-full flex flex-col justify-center items-center text-center">
                      <Title level={3} className="text-indigo-600">
                        {i18n.language === 'en' ? 'The Theory: Emotion Coaching' : '理论基础：情绪辅导'}
                      </Title>
                      <div className="max-w-2xl text-left mt-4 text-lg text-slate-700 leading-relaxed">
                        {i18n.language === 'en' ? (
                          <div className="space-y-4">
                            <p><strong>Emotion Coaching</strong>, developed by Dr. John Gottman, is a parenting technique that helps children understand and regulate their emotions. The 5 key steps are:</p>
                            <ol className="list-decimal pl-6 space-y-2">
                              <li><strong>Notice the emotion:</strong> Be aware of the child's emotion, even at low intensity.</li>
                              <li><strong>Recognize as opportunity:</strong> See the emotion as a chance for intimacy and teaching.</li>
                              <li><strong>Listen and validate:</strong> Empathize and validate their feelings without judgment.</li>
                              <li><strong>Help label emotions:</strong> Help the child find words to describe what they are feeling.</li>
                              <li><strong>Set limits & strategies:</strong> Explore solutions while setting boundaries on inappropriate behavior.</li>
                            </ol>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <p>由约翰·戈特曼博士提出的<strong>“情绪辅导”</strong>是一种帮助孩子理解和调节情绪的教养方式。其核心五步法包括：</p>
                            <ol className="list-decimal pl-6 space-y-2">
                              <li><strong>觉察情绪：</strong> 在孩子情绪强度较低时就能敏锐察觉。</li>
                              <li><strong>把握机会：</strong> 将情绪危机视为建立亲密关系和教导的良机。</li>
                              <li><strong>倾听接纳：</strong> 积极倾听，不带评判地接纳孩子的感受。</li>
                              <li><strong>标记情绪：</strong> 帮助孩子找到合适的词汇来描述他们的感受。</li>
                              <li><strong>设定界限：</strong> 在规范不当行为的同时，共同探讨解决问题的策略。</li>
                            </ol>
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Slide 2: Examples */}
                    <div className="p-8 h-full flex flex-col justify-center items-center text-center">
                      <Title level={3} className="text-indigo-600">
                        {i18n.language === 'en' ? 'Examples of Application' : '应用案例'}
                      </Title>
                      <div className="max-w-3xl text-left mt-4 text-lg text-slate-700 leading-relaxed">
                        {i18n.language === 'en' ? (
                          <div className="space-y-6">
                            <p className="italic text-slate-500 border-l-4 border-slate-300 pl-4">Scenario: Child refuses to go to school because no one plays with them.</p>
                            <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                              <div className="font-bold text-red-700 mb-1">❌ Dismissing (Novice Parent)</div>
                              <p>"Stop crying. It's not a big deal. You'll make friends eventually, but you must go to school now."</p>
                              <p className="text-sm text-red-600 mt-2"><strong>Result:</strong> Child feels unheard and their emotional distress escalates.</p>
                            </div>
                            <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                              <div className="font-bold text-green-700 mb-1">✅ Emotion Coaching (Expert Parent)</div>
                              <p>"I can see you are feeling really sad and lonely. It hurts when you feel left out by your classmates. It is completely okay to feel that way. Let's think about what we can do, but we still need to get dressed for school."</p>
                              <p className="text-sm text-green-600 mt-2"><strong>Result:</strong> Child feels understood, calms down, and is more willing to cooperate.</p>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-6">
                            <p className="italic text-slate-500 border-l-4 border-slate-300 pl-4">场景：孩子因为没人一起玩而哭闹着拒绝上学。</p>
                            <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                              <div className="font-bold text-red-700 mb-1">❌ 否定情绪（新手家长）</div>
                              <p>“别哭了，这有什么大不了的。你总会交到朋友的，现在赶紧去上学！”</p>
                              <p className="text-sm text-red-600 mt-2"><strong>结果：</strong> 孩子觉得不被理解，挫败感加重，情绪进一步升级。</p>
                            </div>
                            <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                              <div className="font-bold text-green-700 mb-1">✅ 情绪辅导（专家家长）</div>
                              <p>“我看到你现在觉得很伤心、很孤独。被同学冷落确实让人难受，你有这种感觉是很正常的。我们一起来想办法，但现在还是得穿好衣服去学校。”</p>
                              <p className="text-sm text-green-600 mt-2"><strong>结果：</strong> 孩子感到被接纳，情绪逐渐平复，更愿意配合家长的引导。</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Slide 3: How to Use */}
                    <div className="p-8 h-full flex flex-col justify-center items-center text-center">
                      <Title level={3} className="text-indigo-600">
                        {i18n.language === 'en' ? 'How to Use This Module' : '如何使用本模块'}
                      </Title>
                      <div className="max-w-2xl text-left mt-4 text-lg text-slate-700 leading-relaxed">
                        {i18n.language === 'en' ? (
                          <div className="space-y-4">
                            <p>This module uses Dual-Agent AI to simulate real-world interactions:</p>
                            <ul className="list-disc pl-6 space-y-2">
                              <li><strong>Practice 1 (Novice):</strong> You play the child. Experience the frustration of being misunderstood by an AI parent.</li>
                              <li><strong>Practice 2 (Expert):</strong> You play the child. Experience the calming effect of proper Emotion Coaching from the AI.</li>
                              <li><strong>Practice 3 (Real Practice):</strong> You play the parent. Apply the 5 steps to soothe the AI child.</li>
                              <li><strong>Evaluation:</strong> You must complete at least 3 turns to be evaluated. Scores are strictly based on your usage of the 5 steps.</li>
                            </ul>
                            <div className="mt-4 p-4 bg-amber-50 rounded border border-amber-200 text-amber-800">
                              💡 <strong>Need Help?</strong> Type <code>@coach</code> in the chat anytime to ask for real-time advice from the AI Coach!
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <p>本模块使用双智能体 AI 模拟真实的互动场景：</p>
                            <ul className="list-disc pl-6 space-y-2">
                              <li><strong>练习 1（新手）：</strong> 您扮演孩子，体验被 AI 家长忽视情绪的挫败感。</li>
                              <li><strong>练习 2（专家）：</strong> 您扮演孩子，体验 AI 家长标准情绪辅导带来的平复感。</li>
                              <li><strong>练习 3（实战）：</strong> 您扮演家长，亲自尝试运用五步法安抚 AI 扮演的暴躁孩子。</li>
                              <li><strong>系统评分：</strong> 必须对话至少 3 轮才能获取反馈，系统将根据您对五步法的应用进行严格打分。</li>
                            </ul>
                            <div className="mt-4 p-4 bg-amber-50 rounded border border-amber-200 text-amber-800">
                              💡 <strong>寻求帮助：</strong> 遇到困难时，随时在对话框输入 <code>@coach</code> 或 <code>@教练</code> 提问，AI 教练会为您提供实时指导！
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </Carousel>
                </Tabs.TabPane>
                <Tabs.TabPane tab={i18n.language === 'en' ? 'Scenario Video' : '场景视频'} key="2" className="flex flex-col">
                  <div className="flex-1 flex flex-col justify-center items-center">
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
                    <Paragraph className="text-slate-600 mt-8 text-xl max-w-2xl mx-auto leading-relaxed text-center">
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
                </Tabs.TabPane>
              </Tabs>
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