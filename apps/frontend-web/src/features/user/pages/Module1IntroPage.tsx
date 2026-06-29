import { Button } from 'antd';
import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from '../../../redux/hooks';
import { ArrowLeftIcon } from '@heroicons/react/20/solid';
import { createAgenda } from '../reducer';

export const Module1IntroPage = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const isCreatingAgenda = useSelector(state => state.user.isCreatingAgenda);

  const startModule = useCallback(async () => {
    setLoading(true);
    // Use a pre-defined narrative for Module 1
    const moduleNarrative = "Module 1 Practice: The parent is practicing 'Emotional Radar' (觉察情绪). The child is throwing a severe tantrum. The parent needs to observe their own first emotional reaction (e.g., wanting to escape, getting angry, or wanting to comfort) before acting.";
    
    const newAgendaId = await dispatch(createAgenda(moduleNarrative));
    if (newAgendaId != null) {
      navigate(`/app/agendas/${newAgendaId}`, { replace: true });
    }
    setLoading(false);
  }, [dispatch, navigate]);

  return (
    <div className='flex flex-col h-full bg-white'>
      <div className="flex-1 overflow-y-scroll">
        <div className="container-narrow !px-4 !sm:px-8 py-8 h-full flex flex-col">
          <div className='text-xl font-bold pb-4 border-b mb-6 text-blue-600'>
            {i18n.language === 'en' ? 'Module 1: My Emotional Radar' : '模块 1：我的情感雷达'}
          </div>
          
          <div className="mb-6 p-6 bg-blue-50 rounded-lg text-gray-800 leading-relaxed text-lg shadow-sm border border-blue-100">
            {i18n.language === 'en' ? (
              <>
                <p className="mb-4">
                  Finally, here is this week's family practice task — <strong>"My Emotional Radar"</strong>.
                </p>
                <p className="mb-4">
                  This task is very simple: <strong>you just need to observe.</strong>
                </p>
                <p className="mb-4">
                  When your child throws a tantrum or cries again this week, I want you to pull back a little in your mind and observe: <strong>what is your first reaction?</strong>
                </p>
                <ul className="list-disc pl-6 mb-4 space-y-2">
                  <li>Is it a fire in your heart wanting to stop the child?</li>
                  <li>Wanting to escape the scene immediately?</li>
                  <li>Or wanting to approach the child and listen to their emotions?</li>
                </ul>
                <p className="font-bold text-blue-700">
                  Don't forget, awareness is the first step to change. Let's practice this with the AI simulator!
                </p>
              </>
            ) : (
              <>
                <p className="mb-4">
                  最后，是本周的家庭实践任务——<strong>“我的情感雷达”</strong>。
                </p>
                <p className="mb-4">
                  这个任务非常简单：<strong>您只需观察。</strong>
                </p>
                <p className="mb-4">
                  当您的孩子这周再次发脾气、哭闹时，我希望您能在脑海里拉开一点距离，观察一下：<strong>您的第一反应是什么？</strong>
                </p>
                <ul className="list-disc pl-6 mb-4 space-y-2">
                  <li>是心里升起一团火想要制止孩子？</li>
                  <li>想马上逃离现场？</li>
                  <li>还是想要去走进孩子，倾听他/她的情绪？</li>
                </ul>
                <p className="font-bold text-blue-700">
                  别忘了，觉察，是改变的第一步。让我们通过AI模拟器来练习吧！
                </p>
              </>
            )}
          </div>
        </div>
      </div>
      <div className='shadow-2xl shadow-black z-10'>
        <div className="container-narrow flex items-center justify-between p-4 !px-8">
          <Button disabled={loading || isCreatingAgenda} size="middle" type='text' icon={<ArrowLeftIcon className="w-4 h-4" />} className='px-2' onClick={() => navigate(-1)}>
            {t("Narrative.Back")}
          </Button>
          <Button loading={loading || isCreatingAgenda} size="large" type="primary" onClick={startModule}>
            {i18n.language === 'en' ? 'Start Roleplay Practice' : '开始角色扮演练习'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Module1IntroPage;