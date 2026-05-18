import { AggregateBox } from "../components/AggregateBox"
import { SummaryPanel } from "../components/SummaryPanel"
import { LiveActionPlanPanel } from "../components/LiveActionPlanPanel"
import { useSelector } from "../../../redux/hooks"
import { questionSelectors } from "../reducer"
import { useCallback, useRef, useState } from "react"
import Debriefing from "../components/Debriefing"
import { SessionStatus } from "@core"
import { Navigate, useNavigate } from "react-router-dom"
import { useAgendaIdInRoute } from "../hooks"
import { Button, Tooltip } from "antd"
import { ChevronDoubleLeftIcon } from "@heroicons/react/20/solid"
import { MenuFoldOutlined, MenuUnfoldOutlined } from "@ant-design/icons"

type QuestionRefs = {
  [key: string]: HTMLDivElement | null;
};

export const SummaryPage = () => {

  const navigate = useNavigate()

  const agendaId = useAgendaIdInRoute()

  const title = useSelector(state => state.agenda.title)

  const [isHistoryVisible, setIsHistoryVisible] = useState(true);

  const allQuestions = useSelector((state) => questionSelectors.selectAll(state));
  const filteredQuestions = allQuestions
    .filter(q => q.response && q.response.length > 0)
  const questionRefs = useRef<QuestionRefs>({});
  const scrollToQuestion = (id: string) => {
    questionRefs.current[id]?.scrollIntoView({ behavior: 'smooth' });
  };

  const sessionStatus = useSelector(state => state.agenda.sessionStatus)

  const onReturnClick = useCallback(()=>{
    navigate("/app/agendas")
  }, [])

  if(sessionStatus == SessionStatus.Exploring){
    return <Navigate to={`/app/agendas/${agendaId}`}/>
  }else{
    return (<>
      <div className="flex justify-between items-center border-b pr-4">
        {title != null && <Button
                type="text"
                className='p-2 font-semibold text-base rounded-none justify-start'
                size='large'
                iconPosition='start'
                icon={<ChevronDoubleLeftIcon className="w-6 h-6" />}
                onClick={onReturnClick}
              >
                {title}
              </Button>}
        <Tooltip title={isHistoryVisible ? "Hide Exploration History" : "Show Exploration History"}>
          <Button 
            type="text" 
            icon={isHistoryVisible ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />} 
            onClick={() => setIsHistoryVisible(!isHistoryVisible)}
            className="text-gray-500 hover:text-blue-600"
          />
        </Tooltip>
      </div>
        <div className="container-wide flex h-full transition-all duration-300">
          <div className={`${isHistoryVisible ? 'flex-1 opacity-100 max-w-[50%]' : 'w-0 opacity-0 overflow-hidden'} transition-all duration-300 !pl-8 ${isHistoryVisible ? '!pr-4' : '!pr-0'} py-10 overflow-y-scroll`}>
            <AggregateBox/>
          </div>
          
          <div className={`${isHistoryVisible ? 'flex-1' : 'w-full'} transition-all duration-300 flex flex-col !pl-4 !pr-8 py-10 overflow-y-scroll`}>
            <div className="pb-10">
              <SummaryPanel/>
            </div>
            <div className="pb-10">
              <LiveActionPlanPanel/>
            </div>
            <div>
              <Debriefing/>
            </div>
          </div>
        </div>
    </>)
  }
}

export default SummaryPage