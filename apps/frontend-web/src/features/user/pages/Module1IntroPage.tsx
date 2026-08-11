import { Button, Typography, Divider, Card, Space, message, Tag } from 'antd';
import { useCallback, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from '../../../redux/hooks';
import { ArrowLeftIcon } from '@heroicons/react/20/solid';
import { createAgenda } from '../reducer';
import moment from 'moment';

const { Title, Paragraph, Text } = Typography;

const QUESTION_BANK = [
  {
    id: 1,
    scenarioEn: "Scenario: Your 4-year-old child accidentally drops their ice cream on the ground and bursts into tears. How would an 'Emotion Coach' respond?",
    scenarioZh: "场景：您4岁的孩子不小心把刚买的冰淇淋掉在了地上，瞬间大哭起来。作为“情绪教练”，您会如何回应？",
    optionsEn: [
      { id: 1, text: "It's just ice cream, stop crying. I'll buy you another one right now.", type: 'Dismissing' },
      { id: 2, text: "Why weren't you careful? I told you to hold it tight!", type: 'Disapproving' },
      { id: 3, text: "Oh no, your ice cream fell! You must be so sad and disappointed. I'd be sad too.", type: 'Emotion Coaching' }
    ],
    optionsZh: [
      { id: 1, text: "别哭了，一个冰淇淋而已，妈妈马上再给你买一个就是了。", type: '忽视型' },
      { id: 2, text: "你怎么这么不小心？我刚才就跟你说要拿紧了吧！", type: '指责型' },
      { id: 3, text: "哎呀，冰淇淋掉地上了！你一定很难过、很失望吧，如果是我也会很伤心的。", type: '情绪辅导型' }
    ],
    correctId: 3,
    explanationEn: "Option 3 is the Emotion Coaching approach. It acknowledges and validates the child's feelings (sadness/disappointment) without immediately rushing to fix the problem (Option 1) or blaming them (Option 2).",
    explanationZh: "选项 3 才是情绪教练的回应方式。它第一反应是接纳并认可孩子的感受（伤心、失望），而不是立刻用物质去掩盖问题（选项 1 的忽视型），或者趁机指责孩子（选项 2 的指责型）。"
  },
  {
    id: 2,
    scenarioEn: "Scenario: Your 5-year-old child refuses to share their favorite toy with a visiting friend and starts shouting \"Mine!\"",
    scenarioZh: "场景：您5岁的孩子拒绝把最喜欢的玩具分享给来做客的小朋友，并大喊“这是我的！”",
    optionsEn: [
      { id: 1, text: "You are being selfish. Give it to your friend right now or I'll take it away.", type: 'Disapproving' },
      { id: 2, text: "It's hard to share your favorite toy. You're worried they might break it, right?", type: 'Emotion Coaching' },
      { id: 3, text: "Let's just go watch TV instead, forget about the toy.", type: 'Dismissing' }
    ],
    optionsZh: [
      { id: 1, text: "你太自私了。马上给小朋友玩，不然我就把它没收了。", type: '指责型' },
      { id: 2, text: "把最喜欢的玩具分享给别人确实很难。你是不是担心他会弄坏？", type: '情绪辅导型' },
      { id: 3, text: "我们去看电视吧，别管玩具了。", type: '忽视型' }
    ],
    correctId: 2,
    explanationEn: "Emotion coaching validates the difficulty of sharing and addresses the underlying fear, rather than punishing the child or distracting them.",
    explanationZh: "情绪辅导认可了分享的难度，并点出了孩子底层的担忧，而不是惩罚孩子或用其他事物转移注意力。"
  },
  {
    id: 3,
    scenarioEn: "Scenario: Your 6-year-old comes home from school looking downcast and says, \"Nobody wants to play with me.\"",
    scenarioZh: "场景：您6岁的孩子放学回家，垂头丧气地说：“没人和我玩。”",
    optionsEn: [
      { id: 1, text: "Don't worry, you'll make new friends tomorrow. It's no big deal.", type: 'Dismissing' },
      { id: 2, text: "That must feel really lonely and hurtful. Tell me more about what happened.", type: 'Emotion Coaching' },
      { id: 3, text: "What did you do to make them not want to play with you?", type: 'Disapproving' }
    ],
    optionsZh: [
      { id: 1, text: "别担心，明天就能交到新朋友了，这没什么大不了的。", type: '忽视型' },
      { id: 2, text: "听起来你感觉很孤单、很难过。能和妈妈多说说发生了什么吗？", type: '情绪辅导型' },
      { id: 3, text: "你是不是做了什么惹人家不高兴的事，他们才不和你玩的？", type: '指责型' }
    ],
    correctId: 2,
    explanationEn: "Emotion coaching provides a safe space for the child to share their painful feelings without minimizing the problem or blaming the child.",
    explanationZh: "情绪辅导为孩子提供了一个安全的空间来倾诉痛苦的感受，而不是贬低问题的重要性或指责孩子。"
  },
  {
    id: 4,
    scenarioEn: "Scenario: It's bedtime, but your 3-year-old is running around the room, refusing to put on pajamas.",
    scenarioZh: "场景：到了睡觉时间，您3岁的孩子却在房间里跑来跑去，拒绝穿睡衣。",
    optionsEn: [
      { id: 1, text: "If you don't put your pajamas on right now, no bedtime story!", type: 'Disapproving' },
      { id: 2, text: "Look at this cool new toy I bought! Come here!", type: 'Dismissing' },
      { id: 3, text: "You have so much energy and don't want to sleep yet! I get it. But it's bedtime now. Do you want the blue pajamas or the red ones?", type: 'Emotion Coaching' }
    ],
    optionsZh: [
      { id: 1, text: "如果你现在不穿睡衣，今晚就不讲睡前故事了！", type: '指责型' },
      { id: 2, text: "看我买的这个新玩具！快过来！", type: '忽视型' },
      { id: 3, text: "你现在精力充沛，还不想睡觉对不对？我理解。但现在是睡觉时间了，你想穿蓝色的睡衣还是红色的？", type: '情绪辅导型' }
    ],
    correctId: 3,
    explanationEn: "Emotion coaching validates the child's feeling (having energy/not wanting to sleep) while firmly holding the boundary (it's bedtime) and offering a limited choice.",
    explanationZh: "情绪辅导认可了孩子的感受（精力充沛/不想睡），同时坚定地守住界限（睡觉时间到了），并提供了一个有限的选择。"
  },
  {
    id: 5,
    scenarioEn: "Scenario: Your 7-year-old is struggling with a math puzzle and throws the pencil across the table in frustration.",
    scenarioZh: "场景：您7岁的孩子做数学题遇到困难，气愤地把铅笔扔在了桌子上。",
    optionsEn: [
      { id: 1, text: "Wow, you're really frustrated with this math problem. It looks really tough.", type: 'Emotion Coaching' },
      { id: 2, text: "Why are you throwing things? Go to your room until you calm down!", type: 'Disapproving' },
      { id: 3, text: "Just skip that question and do the easy ones. Don't get so worked up.", type: 'Dismissing' }
    ],
    optionsZh: [
      { id: 1, text: "哇，这道数学题让你觉得很挫败，它看起来确实很难。", type: '情绪辅导型' },
      { id: 2, text: "你为什么扔东西？回你房间去，冷静下来再出来！", type: '指责型' },
      { id: 3, text: "直接跳过这道题做简单的吧。别这么激动。", type: '忽视型' }
    ],
    correctId: 1,
    explanationEn: "Emotion coaching names the emotion (frustration) and validates the difficulty of the task, helping the child feel understood before addressing the behavior.",
    explanationZh: "情绪辅导说出了情绪（挫败感）并认可了任务的难度，帮助孩子在处理行为问题前先感受到被理解。"
  },
  {
    id: 6,
    scenarioEn: "Scenario: Your 4-year-old is terrified of a dog barking loudly across the street and hides behind your legs.",
    scenarioZh: "场景：您4岁的孩子被马路对面大声叫的狗吓坏了，躲在您的腿后。",
    optionsEn: [
      { id: 1, text: "It's on a leash, it won't hurt you. Stop being such a scaredy-cat.", type: 'Disapproving' },
      { id: 2, text: "That loud bark was really scary, wasn't it? I'm right here, you're safe.", type: 'Emotion Coaching' },
      { id: 3, text: "Look at the beautiful bird up in the tree!", type: 'Dismissing' }
    ],
    optionsZh: [
      { id: 1, text: "狗拴着绳子呢，不会咬你的。别这么胆小。", type: '指责型' },
      { id: 2, text: "刚才那声大叫真的好吓人，对不对？妈妈就在这里，你很安全。", type: '情绪辅导型' },
      { id: 3, text: "快看树上那只漂亮的小鸟！", type: '忽视型' }
    ],
    correctId: 2,
    explanationEn: "Emotion coaching validates the fear instead of dismissing it or shaming the child, providing comfort and a sense of safety.",
    explanationZh: "情绪辅导接纳了恐惧的情绪，而不是忽视它或让孩子感到羞耻，从而提供安慰和安全感。"
  }
];

const EmotionCoachingQuiz = ({ i18n }: { i18n: any }) => {
  const isEn = i18n.language === 'en';
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    const shuffled = [...QUESTION_BANK].sort(() => 0.5 - Math.random());
    setQuestions(shuffled.slice(0, 3));
  }, []);

  if (questions.length === 0) return null;

  if (isFinished) {
    return (
      <div className="my-10 p-6 bg-indigo-50 border border-indigo-100 rounded-xl shadow-sm text-center">
        <Title level={4} className="!text-indigo-800 !mt-0 !mb-4">
          {isEn ? 'Quiz Completed!' : '测验完成！'}
        </Title>
        <div className="text-4xl mb-4">{score === 3 ? '🏆' : '👏'}</div>
        <Paragraph className="text-lg">
          {isEn 
            ? `You scored ${score} out of 3.` 
            : `您答对了 3 题中的 ${score} 题。`}
        </Paragraph>
        <Button type="primary" size="large" className="mt-4 bg-indigo-600" onClick={() => {
          const shuffled = [...QUESTION_BANK].sort(() => 0.5 - Math.random());
          setQuestions(shuffled.slice(0, 3));
          setCurrentIndex(0);
          setSelected(null);
          setSubmitted(false);
          setScore(0);
          setIsFinished(false);
        }}>
          {isEn ? 'Try Again' : '再测一次'}
        </Button>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const options = isEn ? currentQuestion.optionsEn : currentQuestion.optionsZh;

  const handleSelect = (id: number) => {
    if (!submitted) setSelected(id);
  };

  const handleSubmit = () => {
    if (selected) {
      setSubmitted(true);
      if (selected === currentQuestion.correctId) {
        setScore(s => s + 1);
      }
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(i => i + 1);
      setSelected(null);
      setSubmitted(false);
    } else {
      setIsFinished(true);
    }
  };

  return (
    <div className="my-10 p-6 bg-indigo-50 border border-indigo-100 rounded-xl shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <Title level={4} className="!text-indigo-800 !mt-0 !mb-0">
          {isEn ? 'Mini Quiz: Identify the Emotion Coach' : '随堂小测：寻找情绪教练'}
        </Title>
        <Tag color="indigo" className="text-sm border-indigo-200">
          {currentIndex + 1} / {questions.length}
        </Tag>
      </div>
      <Paragraph className="text-lg mb-6">
        {isEn ? currentQuestion.scenarioEn : currentQuestion.scenarioZh}
      </Paragraph>
      <div className="space-y-3 mb-6">
        {options.map((opt: any) => {
          let itemClass = "p-4 border rounded-lg cursor-pointer transition-colors duration-200 ";
          if (submitted) {
            if (opt.id === currentQuestion.correctId) itemClass += "bg-emerald-100 border-emerald-400";
            else if (selected === opt.id) itemClass += "bg-rose-100 border-rose-400";
            else itemClass += "bg-white border-slate-200 opacity-60";
          } else {
            itemClass += selected === opt.id ? "bg-indigo-100 border-indigo-400" : "bg-white border-slate-200 hover:bg-slate-50";
          }
          
          return (
            <div key={opt.id} className={itemClass} onClick={() => handleSelect(opt.id)}>
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${selected === opt.id ? 'border-indigo-500' : 'border-slate-300'}`}>
                  {selected === opt.id && <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />}
                </div>
                <Text className="text-lg">{opt.text}</Text>
              </div>
            </div>
          );
        })}
      </div>
      
      {!submitted ? (
        <Button type="primary" size="large" onClick={handleSubmit} disabled={!selected} className="bg-indigo-600">
          {isEn ? 'Submit Answer' : '提交答案'}
        </Button>
      ) : (
        <div className={`p-4 rounded-lg ${selected === currentQuestion.correctId ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}`}>
          <div className="font-bold mb-2">
            {selected === currentQuestion.correctId 
              ? (isEn ? '🎉 Correct!' : '🎉 回答正确！') 
              : (isEn ? '💡 Not quite.' : '💡 再想想哦。')}
          </div>
          <Paragraph className="mb-0">
            {isEn ? currentQuestion.explanationEn : currentQuestion.explanationZh}
          </Paragraph>
          <Button type="primary" className="mt-4 bg-indigo-600" onClick={handleNext}>
            {currentIndex < questions.length - 1 
              ? (isEn ? 'Next Question' : '下一题') 
              : (isEn ? 'Finish Quiz' : '完成测验')}
          </Button>
        </div>
      )}
    </div>
  );
};

export const Module1IntroPage = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const isCreatingAgenda = useSelector((state: any) => state.user.isCreatingAgenda);
  const isEn = i18n.language === 'en';

  const existingAgendaId = location.state?.agendaId;

  const startModule = useCallback(async () => {
    if (existingAgendaId) {
      navigate(`/app/agendas/${existingAgendaId}/roleplay`);
      return;
    }

    setLoading(true);
    const moduleNarrative = "Module 1 Practice: 6-year-old Lele wakes up crying and refuses to go to school because a classmate told others not to play with him. The parent needs to practice Emotion Coaching skills.";
    const title = isEn ? `Module 1 Practice - ${moment().format('lll')}` : `模块 1 练习 - ${moment().format('lll')}`;
    const newAgendaId = await dispatch(createAgenda(moduleNarrative, title));
    if (newAgendaId != null) {
      navigate(`/app/agendas/${newAgendaId}/roleplay`, { replace: true });
    }
    setLoading(false);
  }, [dispatch, navigate, isEn, existingAgendaId]);

  return (
    <div className='flex flex-col h-full bg-slate-50'>
      <div className="flex-1 overflow-y-scroll">
        <div className="max-w-4xl mx-auto !px-4 !sm:px-8 py-10 h-full flex flex-col">
          <div className='bg-white p-10 rounded-2xl shadow-sm border border-slate-200'>
            {isEn ? (
              <Typography className="text-lg leading-loose">
                <Title level={2} className="!text-blue-800 text-center !mb-10">Module 1: Emotion & Coaching<br/><span className="text-2xl text-blue-600">"Recognize Emotions, Step into the Coach Role"</span></Title>
                
                {/* 1.1 */}
                <Divider orientation="left"><span className="text-xl font-bold text-slate-700">1.1 Introduction & Course Overview</span></Divider>
                <div className="bg-slate-50 p-5 rounded-lg border border-slate-200 mb-6">
                  <Text strong className="text-indigo-600 text-lg">Case Study: Tongtong's Morning Tantrum</Text><br/>
                  At 8:05 AM, facing another late arrival at kindergarten, a mother urges her 4-year-old son, Tongtong, to hurry up. Tongtong is struggling with his velcro shoes. After two failed attempts, his frustration explodes. He throws the shoes, lies on the floor, and screams: "I can't put them on! I don't want these stupid shoes! I'm not going! Waaah..." His anxious mother, holding her bag, frowns and immediately turns her anxiety into anger, shouting: "Oh no! We're going to be late! Why are you throwing a tantrum again? Put them on and stand up right now!"
                </div>
                <Paragraph>
                  Does this scene feel familiar? Every family faces emotional outbursts from their children. When faced with such challenges, parents' brains often immediately sound the alarm: "Why is this child so disobedient!" But how do we truly and effectively respond to, accept, and even resolve a child's emotions? This is the core pain point we will address together in this course.
                </Paragraph>

                {/* 1.2 */}
                <Divider orientation="left"><span className="text-xl font-bold text-slate-700">1.2 Rethinking the Role of "Emotions"</span></Divider>
                <Paragraph>
                  From a biological and evolutionary perspective, emotions are survival signals sent by our brains to help us cope with external challenges. Therefore, emotions themselves are not inherently good or bad. "Positive emotions" like joy and satisfaction drive us to explore; while "negative emotions" like anger, sadness, and fear actually have irreplaceable protective and communicative functions.
                </Paragraph>
                <Paragraph>
                  Looking back at Tongtong, he was screaming because he felt deeply frustrated and defeated by the shoes. He was asking for help in a terrible way: "Mom, I can't do this, I'm frustrated, please help me." Emotions are signals, and our job is to interpret them. We should stop classifying emotions as "good/bad" and instead think of them as <strong>"comfortable"</strong> and <strong>"uncomfortable"</strong> emotions. For uncomfortable emotions, they shouldn't be forcefully suppressed, but rather understood and patiently healed.
                </Paragraph>

                {/* 1.3 */}
                <Divider orientation="left"><span className="text-xl font-bold text-slate-700">1.3 Emotion ≠ Behavior</span></Divider>
                <Paragraph>
                  You might ask: "If I should accept uncomfortable emotions, does that mean I should let my child roll on the floor and throw tantrums?" Of course not! 
                </Paragraph>
                <Paragraph>
                  <Text strong className="bg-yellow-100 px-2 py-1 rounded">Core Concept: Emotion does not equal behavior.</Text> When a child is angry, "anger" is the emotion, and "hitting" or "throwing things" is the behavior. We can 100% accept all of a child's emotions because they occur naturally; but this absolutely does not mean we accept all inappropriate behaviors. Accepting emotions represents understanding and empathy; regulating behavior is the boundary and rule we must teach.
                </Paragraph>

                {/* 1.4 */}
                <Divider orientation="left"><span className="text-xl font-bold text-slate-700">1.4 The Toddler's Emotional World</span></Divider>
                <Paragraph>
                  Why are children's emotions often so intense? We can use Dr. Dan Siegel's "Brain Model": Our brain has two parts: the instinctive "Emotional Brain" and the thinking "Rational Brain". In young children, the "Emotional Brain" is highly developed, acting like a sensitive fire alarm. However, the "Rational Brain," responsible for controlling impulses and weighing consequences, won't be fully developed until their 20s. When a child loses control, it's not intentional defiance; their emotional alarm is screaming, and their rational control panel isn't working yet.
                </Paragraph>
                <div className="bg-slate-50 p-5 rounded-lg border border-slate-200 mb-6">
                  <Text strong className="text-indigo-600 text-lg">Case Study: Farewell at the Playground</Text><br/>
                  Yiyi (3 years old) is playing happily on the slide. Mom waves and says it's time to go home for dinner. Yiyi stiffens, lies flat on the ground at the slide exit, grabs the tiles, and cries loudly: "No! I'm not leaving! Bad Mom!"<br/><br/>
                  <Text className="text-slate-500 italic">Many parents think the child is stubborn. However, through the lens of brain science, Yiyi's brain hasn't developed the capacity for "state transition" (from playing to leaving) and self-soothing. Because toddlers have limited emotion vocabulary, they use big actions to release uncomfortable feelings.</Text>
                </div>

                {/* 1.5 */}
                <Divider orientation="left"><span className="text-xl font-bold text-slate-700">1.5 The 5-Step Emotion Coaching Method</span></Divider>
                <Paragraph>
                  Let's look at two different parenting styles handling a morning crisis where 6-year-old Lele refuses to go to school:
                </Paragraph>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <Card title="Style 1: Emotion Dismissing" className="bg-rose-50 border-rose-200 shadow-sm" headStyle={{color: '#be123c'}}>
                    <p><strong>Lele:</strong> I don't want to go! I hate school. (Crying)</p>
                    <p><strong>Parent:</strong> Hurry up! I have to drop you off and take your brother to the doctor. You love school! If you go, I'll buy you KFC.</p>
                    <p><strong>Lele:</strong> (Kicks bag, cries louder)</p>
                    <p><strong>Parent:</strong> Stop that! Get in the car right now! (Angry)</p>
                  </Card>
                  <Card title="Style 2: Emotion Coaching" className="bg-emerald-50 border-emerald-200 shadow-sm" headStyle={{color: '#047857'}}>
                    <p><strong>Lele:</strong> I don't want to go! I hate school. (Crying)</p>
                    <p><strong>Parent:</strong> You don't like school? Did something happen? (Hugs child)</p>
                    <p><strong>Lele:</strong> Taotao told others not to play with me.</p>
                    <p><strong>Parent:</strong> That's terrible, no wonder you're sad. You might be angry too. We still have to go, but let's get in the car and think of a way to make today better together.</p>
                  </Card>
                </div>

                <Paragraph>
                  To become like the second parent, Dr. John Gottman proposed a highly practical <strong>"5-Step Emotion Coaching Method"</strong>:
                </Paragraph>
                <div className="pl-4 border-l-4 border-blue-400 mb-8 space-y-3">
                  <div><Tag color="blue" className="text-sm px-2 py-1">Step 1. Notice</Tag> Become aware of the child's emotion, especially low-intensity ones.</div>
                  <div><Tag color="blue" className="text-sm px-2 py-1">Step 2. Connect</Tag> View the emotional moment as an opportunity for intimacy and teaching.</div>
                  <div><Tag color="blue" className="text-sm px-2 py-1">Step 3. Empathize</Tag> Listen to and validate the child's feelings.</div>
                  <div><Tag color="blue" className="text-sm px-2 py-1">Step 4. Express</Tag> Help the child use appropriate words to label their emotions.</div>
                  <div><Tag color="blue" className="text-sm px-2 py-1">Step 5. Set Boundaries</Tag> Guide the child to solve the problem while setting clear behavioral boundaries.</div>
                </div>
                
                <EmotionCoachingQuiz i18n={i18n} />

                {/* 1.6 */}
                <Divider orientation="left"><span className="text-xl font-bold text-slate-700">1.6 Module Summary & Family Practice</span></Divider>
                <div className="p-6 bg-blue-50 rounded-xl border border-blue-200 shadow-sm">
                  <Paragraph className="mb-4 text-lg">
                    This week's family practice task is <strong className="text-blue-800">"My Emotional Radar"</strong>.
                  </Paragraph>
                  <Paragraph className="text-lg">
                    The task is simple: <strong>you just need to observe.</strong> When your child throws a tantrum this week, pull back in your mind and observe: <strong>what is your first reaction?</strong> Is it an urge to stop them? To escape? Or to approach and listen? 
                  </Paragraph>
                  <Paragraph className="mb-0 text-lg font-bold text-blue-700">
                    Awareness is the first step to change. Let's practice with the AI simulator!
                  </Paragraph>
                </div>
              </Typography>
            ) : (
              <Typography className="text-lg leading-loose">
                <Title level={2} className="!text-blue-800 text-center !mb-10">模块一：情绪与情绪辅导<br/><span className="text-2xl text-blue-600">“认识情绪，走进教练角色”</span></Title>
                
                {/* 1.1 */}
                <Divider orientation="left"><span className="text-xl font-bold text-slate-700">1.1 导入与课程简介</span></Divider>
                <div className="bg-slate-50 p-5 rounded-lg border border-slate-200 mb-6">
                  <Text strong className="text-indigo-600 text-lg">场景 1：童童案例还原</Text><br/>
                  早上8点05分，眼看今天上幼儿园又要迟到了，妈妈催促着4岁的童童抓紧出门。童童正努力地与魔术贴鞋子“作斗争”，但两次尝试失败后，挫败感瞬间爆发。他愤怒地把鞋甩飞，仰面躺在垫子上大哭咆哮：“穿不上！我不要穿这个破鞋子！！我不去了！呜呜呜……” 一旁手里提着包、早已心急如焚的妈妈，看了一眼手表，眉头紧锁，焦虑瞬间转为愤怒，急躁地呵斥道：“哎呀！马上就要迟到了，你怎么又闹情绪？赶紧给我穿好站起来！”
                </div>
                <Paragraph>
                  各位家长，大家好。刚才画面中童童大哭的这一幕，您是不是觉得非常熟悉？在每天的育儿生活中，每个家庭都会遇到孩子情绪爆发的时刻。遇到这样的挑战，家长的大脑常常会立刻拉响警报：“这孩子怎么这么不听话！”其实，到底该怎么去真正有效地回应、接纳乃至化解孩子的情绪呢？ 这正是我们这门课程要和大家一起解决的核心痛点。
                </Paragraph>

                {/* 1.2 */}
                <Divider orientation="left"><span className="text-xl font-bold text-slate-700">1.2 重新认识“情绪”的作用</span></Divider>
                <Paragraph>
                  如果从生物学和进化的角度来看，情绪其实是我们大脑发出的一种生存信号，用来帮助我们应对外界的各种挑战。因此，情绪本身，并没有绝对的好坏之分。像快乐、满足这些所谓的“正面情绪”或“积极情绪”，能驱使我们去探索世界、靠近他人；而像愤怒、悲伤、恐惧这些常被我们拒之门外的“负面情绪”或“消极情绪”，其实也有着不可替代的保护和沟通功能。
                </Paragraph>
                <Paragraph>
                  让我们再回想一下童童。他那么大哭大叫，其实是因为自己穿不好鞋子，而感到深深的沮丧和挫败。童童是在通过糟糕的方式向大声求助：“妈妈，我做不好这件事，我很受挫，请帮帮我。” 情绪就是信号，而我们需要解读孩子的情绪信号。在这里，我也提议：我们以后把情绪改为——<strong>“舒服的情绪”</strong>和<strong>“不舒服的情绪”</strong>。对于孩子那些“不舒服”的情绪，不该再被强硬压制，而是需要我们的理解、接纳与耐心疗愈。
                </Paragraph>

                {/* 1.3 */}
                <Divider orientation="left"><span className="text-xl font-bold text-slate-700">1.3 情绪 ≠ 行为</span></Divider>
                <Paragraph>
                  听到这里，可能很多家长会在心里问：“难道我就应该任由孩子满地打滚、大发脾气吗？”当然不是！
                </Paragraph>
                <Paragraph>
                  我们需要确立一个核心理念，那就是：<Text strong className="bg-yellow-100 px-2 py-1 rounded">情绪并不等于行为。</Text> 当孩子生气时，“生气”是情绪，而“动手打人”或“乱扔东西”则是行为。我们可以百分之百地接纳孩子所有的情绪，因为情绪是自然发生、不以人的意志为转移的；但这绝对不意味着，我们要由着性子接纳孩子所有的不当行为。接纳情绪，代表着我们的理解与共情；而规范行为，则是我们要在这个过程中教给孩子的界限与规则。
                </Paragraph>

                {/* 1.4 */}
                <Divider orientation="left"><span className="text-xl font-bold text-slate-700">1.4 幼儿的情绪世界</span></Divider>
                <Paragraph>
                  到底为什么孩子的情绪经常会如此猛烈呢？我们可以借用美国心理学家丹·西格尔（Dan Siegel）提出的“大脑模型”来理解：我们的大脑中存在着两个分工截然不同的部分：一部分是本能的“情绪脑”，另一部分是负责思考的“理智脑”。在孩子很小的时候，掌管警惕和冲动的“情绪脑”就已经发育得非常成熟了。而负责控制本能冲动、权衡后果、进行理性思考的“理智脑”，要等到20多岁才能“完全竣工”。也就是说，当孩子情绪失控时，不是他们故意跟您作对，而是受到生理发育的限制。
                </Paragraph>
                <div className="bg-slate-50 p-5 rounded-lg border border-slate-200 mb-6">
                  <Text strong className="text-indigo-600 text-lg">场景 ：案例解析：游乐场的告别</Text><br/>
                  黄昏的公园。3岁的伊伊正在滑梯上玩得不亦乐乎。妈妈说要回家吃晚饭啦。伊伊听到后身体立刻僵硬，随后直接从滑梯出口趴在地上，双手扒住地砖，嚎啕大哭：“不要！我不走！我还要玩滑梯！(双脚乱踢) 坏妈妈！”<br/><br/>
                  <Text className="text-slate-500 italic">很多家长的第一反应可能是觉得“这孩子脾气太倔了”。但戴上脑科学的眼镜来看，这其实是因为伊伊的大脑中，负责处理“状态转换”（从玩耍切换到回家）的自我安抚能力还没发育成熟。由于掌握的情绪词汇少，他们只能通过最大的动作来释放内心的不舒服。</Text>
                </div>

                {/* 1.5 */}
                <Divider orientation="left"><span className="text-xl font-bold text-slate-700">1.5 情绪辅导五步法</span></Divider>
                <Paragraph>
                  让我们来看两个发生在我们生活中的冲突场景（6岁的乐乐一早起来哭闹不想去上学）：
                </Paragraph>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <Card title="第一位家长：情绪忽视型" className="bg-rose-50 border-rose-200 shadow-sm" headStyle={{color: '#be123c'}}>
                    <p><strong>乐乐：</strong> 我不想去！我讨厌学校。（呜咽）</p>
                    <p><strong>家长：</strong> 快点，时间到了。你怎么会讨厌学校呢？你乖乖去上学，放学后带你去吃肯德基。</p>
                    <p><strong>乐乐：</strong> （踢书包，开始嚎啕大哭）</p>
                    <p><strong>家长：</strong> 乐乐！不许这样！赶紧上车！（发火）</p>
                  </Card>
                  <Card title="第二位家长：情绪教练型" className="bg-emerald-50 border-emerald-200 shadow-sm" headStyle={{color: '#047857'}}>
                    <p><strong>乐乐：</strong> 我不想去！我讨厌学校。（呜咽）</p>
                    <p><strong>家长：</strong> 你不喜欢上学？发生什么事了吗？（抱了抱孩子）</p>
                    <p><strong>乐乐：</strong> 涛涛告诉其他人不要跟我玩。</p>
                    <p><strong>家长：</strong> 这真是太糟糕了，难怪你要伤心。你可能对涛涛也有些生气。我必须要带弟弟去看医生，所以你也需要去上学。我们要不先上车，然后一起想想可以怎么做让你今天在学校过得好一些。</p>
                  </Card>
                </div>

                <Paragraph>
                  为了成为第二位家长那样的情绪教练，我们可以使用美国心理学家约翰·戈特曼提出的<strong>“情绪辅导五步法”</strong>：
                </Paragraph>
                <div className="pl-4 border-l-4 border-blue-400 mb-8 space-y-3">
                  <div><Tag color="blue" className="text-sm px-2 py-1">第一步：觉察</Tag> 觉察孩子的情绪，尤其是低强度情绪。</div>
                  <div><Tag color="blue" className="text-sm px-2 py-1">第二步：链接</Tag> 将孩子情绪化的瞬间视为增进亲密感和进行指导的好机会。</div>
                  <div><Tag color="blue" className="text-sm px-2 py-1">第三步：共情与认可</Tag> 对孩子的情绪感同身受，倾听并认可孩子的情绪。</div>
                  <div><Tag color="blue" className="text-sm px-2 py-1">第四步：表达</Tag> 帮助孩子用恰当的词语表达情绪。</div>
                  <div><Tag color="blue" className="text-sm px-2 py-1">第五步：解决与界限</Tag> 指导孩子解决问题，并划定清晰的行为界限。</div>
                </div>
                
                <EmotionCoachingQuiz i18n={i18n} />

                {/* 1.6 */}
                <Divider orientation="left"><span className="text-xl font-bold text-slate-700">1.6 模块总结与家庭实践</span></Divider>
                <div className="p-6 bg-blue-50 rounded-xl border border-blue-200 shadow-sm">
                  <Paragraph className="mb-4 text-lg">
                    本周的家庭实践任务是——<strong className="text-blue-800">“我的情感雷达”</strong>。
                  </Paragraph>
                  <Paragraph className="text-lg">
                    这个任务非常简单：<strong>您只需观察。</strong> 当您的孩子这周再次发脾气、哭闹时，我希望您能在脑海里拉开一点距离，观察一下：<strong>您的第一反应是什么？</strong> 是心里升起一团火想要制止孩子？想马上逃离现场？还是想要去走进孩子，倾听他/她的情绪？
                  </Paragraph>
                  <Paragraph className="mb-0 text-lg font-bold text-blue-700">
                    别忘了，觉察，是改变的第一步。让我们通过AI模拟器来练习吧！
                  </Paragraph>
                </div>
              </Typography>
            )}
          </div>
        </div>
      </div>
      <div className='shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-10 bg-white'>
        <div className="max-w-4xl mx-auto flex items-center justify-between p-4 !px-8">
          <Button disabled={loading || isCreatingAgenda} size="middle" type='text' icon={<ArrowLeftIcon className="w-4 h-4" />} className='px-2' onClick={() => navigate('/app/agendas')}>
            {t("Narrative.Back")}
          </Button>
          <div className="flex items-center gap-2">
            <Button size="small" onClick={() => i18n.changeLanguage(i18n.language === 'en' ? 'zh' : 'en')}>
              {isEn ? '中文' : 'English'}
            </Button>
          </div>
          <Button loading={loading || isCreatingAgenda} size="large" type="primary" onClick={startModule} className="bg-indigo-600 hover:bg-indigo-500 shadow-md px-8">
            {existingAgendaId 
              ? (isEn ? 'Continue Roleplay Practice' : '继续角色扮演练习')
              : (isEn ? 'Start Roleplay Practice' : '开始角色扮演练习')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Module1IntroPage;