import { useDispatch, useSelector } from '../../../redux/hooks';
import { LoadingIndicator } from '../../../components/LoadingIndicator';
import { useCallback, useEffect } from 'react';
import { getNewActionPlan } from '../reducer';
import { useTranslation } from 'react-i18next';
import { Button, Carousel } from 'antd';
import { useAgendaIdInRoute } from '../hooks';
import { usePrevious } from '@uidotdev/usehooks';
import ReactMarkdown from 'react-markdown';

export const ActionPlanPanel = () => {
  const agendaId = useAgendaIdInRoute()
  const prevAgendaId = usePrevious(agendaId)
  const actionPlanList: string[] = useSelector(state => state.agenda.actionPlans || [])
  const isCreatingActionPlan = useSelector(state => state.agenda.isCreatingActionPlan)
  const dispatch = useDispatch();
  
  const handleGenerateActionPlan = useCallback(async () => {
    dispatch(getNewActionPlan())
  },[dispatch])

  const [t] = useTranslation()

  useEffect(()=>{
    if(prevAgendaId != agendaId && actionPlanList.length == 0){
      dispatch(getNewActionPlan())
    }
  }, [prevAgendaId, agendaId, actionPlanList.length, dispatch])

  return (
    <div className='bg-white p-8 rounded-xl mt-4 border border-blue-200'>
      <div className='flex justify-between'>
        <div className='mb-5 font-bold text-xl text-blue-800'>Action Research Proposal</div>
        <div className='justify-end'>
          {isCreatingActionPlan ? (
            <LoadingIndicator title="Generating Proposal..."/>
          ) : (
            <Button onClick={handleGenerateActionPlan} disabled={isCreatingActionPlan} type="primary">
              Generate New Proposal
            </Button>
          )}
        </div>
      </div>
      {actionPlanList.length > 0 ? 
        <Carousel 
          arrows={actionPlanList.length > 1}
          className='custom-carousel h-full'
          initialSlide={actionPlanList.length > 0 ? actionPlanList.length - 1 : 0}
        >
          {actionPlanList?.map((item, i) => 
            <div className='rounded-lg flex flex-col justify-start' key={i}>
              <div className='px-10 pb-10 leading-loose prose max-w-none text-left'>
                <ReactMarkdown>{item}</ReactMarkdown>
              </div>
            </div>
          )}
        </Carousel> 
      : <div>No Action Research Proposal generated yet.</div>}
    </div>
  )
}