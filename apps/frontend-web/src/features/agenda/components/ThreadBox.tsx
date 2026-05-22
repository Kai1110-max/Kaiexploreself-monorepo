import { useCallback, useEffect, useRef, MouseEventHandler, useState } from 'react';
import {
  Button,
  Card,
  Flex,
  Steps
} from 'antd';
import {
  DeleteOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { useDispatch, useSelector } from '../../../redux/hooks';
import { ShortcutManager } from '../../../services/shortcut';
import { getNewQuestions, questionSelectors, selectedQuestionIdsSelector, selectQuestion, setFloatingHeaderFlag, threadSelectors, updateQuestionResponse } from '../reducer';
import { useInView } from 'react-intersection-observer';
import { QuestionBox } from './QuestionBox';
import { LoadingIndicator } from '../../../components/LoadingIndicator';
import { useTranslation } from 'react-i18next';
import { ArrowDownIcon, PencilIcon } from '@heroicons/react/20/solid';
import { IQASetWithIds } from '@core';

export const ThreadBox = (props: { tid: string }) => {

  const dispatch = useDispatch()
  const [t] = useTranslation()

  const thread = useSelector(state => threadSelectors.selectById(state, props.tid))
  const allQuestions = useSelector(state => 
    thread ? thread.questions.map(qid => questionSelectors.selectById(state, qid)).filter(q => q !== undefined) : []
  ) as IQASetWithIds[];

  const [currentAmtiStep, setCurrentAmtiStep] = useState(0);

  const [ref, inView, entry] = useInView({
    threshold: buildThresholdList(20),
  })

  const scrollAnchorRef = useRef<HTMLDivElement>(null);

  const isHoveringInOutline = useSelector(state => state.agenda.hoveringOutlineThreadId == props.tid)

  useEffect(() => {
    const focusRequestSubscription =
      ShortcutManager.instance.onFocusRequestedEvent.subscribe((event) => {
        if (event.type == 'thread' && event.id == props.tid) {
          scrollAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });

    return () => {
      focusRequestSubscription.unsubscribe();
    };
  }, [props.tid]);

  useEffect(()=>{
    const isIntersectingTop = entry?.isIntersecting === true && entry.boundingClientRect && entry.boundingClientRect.top < -20 && entry.boundingClientRect.bottom > 64;
    dispatch(setFloatingHeaderFlag({tid: props.tid, intersecting: isIntersectingTop}))
  }, [props.tid, entry?.isIntersecting, entry?.boundingClientRect?.top, entry?.boundingClientRect?.bottom, inView])

  if (!thread || allQuestions.length === 0) {
    return <LoadingIndicator title="Loading AMTI Steps..." />;
  }

  const currentQ = allQuestions[currentAmtiStep];

  // Auto-select the question so it's considered "active" in the backend logic if needed
  useEffect(() => {
    if (currentQ && !currentQ.selected) {
      dispatch(selectQuestion(props.tid, currentQ._id));
    }
  }, [currentQ, dispatch, props.tid]);

  return (<Card
        ref={ref}
        title={<span className='font-bold text-blue-800 text-lg'>{thread.theme}</span>}
        className={`mt-4 relative rounded-xl transition-all outline outline-0 outline-orange-300 ${isHoveringInOutline === true ? 'outline outline-2 ' : ''} shadow-md`}
      >
        <div
          ref={scrollAnchorRef}
          className="scroll-anchor absolute -top-6 w-10 h-10"
        />
        
        <div className="mb-6">
          <Steps 
            size="small"
            current={currentAmtiStep}
            onChange={(c) => setCurrentAmtiStep(c)}
            className="overflow-x-auto whitespace-nowrap pb-2"
            items={allQuestions.map((q, idx) => ({
              title: q.question.label || `Step ${idx + 1}`,
              status: q.response && q.response.length > 5 ? 'finish' : (idx === currentAmtiStep ? 'process' : 'wait')
            }))}
          />
        </div>

        <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100 min-h-[300px]">
          {currentQ && (
             <QuestionBox key={currentQ._id} tid={props.tid} qid={currentQ._id} />
          )}
        </div>

        <div className="flex justify-between mt-6 pt-4 border-t border-gray-100">
          <Button 
            disabled={currentAmtiStep === 0} 
            onClick={() => setCurrentAmtiStep(prev => prev - 1)}
          >
            Previous Step
          </Button>
          <Button 
            type="primary" 
            disabled={currentAmtiStep === allQuestions.length - 1} 
            onClick={() => setCurrentAmtiStep(prev => prev + 1)}
            className="bg-blue-600"
          >
            Next Step
          </Button>
        </div>
      </Card>)
};

function buildThresholdList(numSteps: number): Array<number> {
  let thresholds = [];
  for (let i = 1.0; i <= numSteps; i++) {
    let ratio = i / numSteps;
    thresholds.push(ratio);
  }
  thresholds.push(0);
  return thresholds;
}
