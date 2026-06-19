import React, { useCallback, useRef, useState } from "react"
import { useAgendaIdInRoute } from "../hooks"
import { Navigate, useNavigate } from "react-router-dom"
import { useDispatch, useSelector } from "../../../redux/hooks"
import { SessionStatus } from "@core"
import { Button, Tooltip, Card } from "antd"
import { ChevronDoubleLeftIcon } from "@heroicons/react/20/solid"
import { questionSelectors, threadSelectors } from "../reducer"
import { MenuFoldOutlined, MenuUnfoldOutlined } from "@ant-design/icons"

type QuestionRefs = {
  [key: string]: HTMLDivElement | null;
};

export const SummaryPage = () => {
  const navigate = useNavigate()
  const agendaId = useAgendaIdInRoute()
  const title = useSelector(state => state.agenda.title)
  const sessionStatus = useSelector(state => state.agenda.sessionStatus)
  const threads = useSelector(threadSelectors.selectAll)
  const questions = useSelector(questionSelectors.selectAll)

  const onReturnClick = useCallback(()=>{
    navigate("/app/agendas")
  }, [navigate])

  if(sessionStatus === SessionStatus.Exploring){
    return <Navigate to={`/app/agendas/${agendaId}`}/>
  }

  // Find all user-written documentation from the steps
  const userWrittenContent = threads.map(t => {
    const threadQuestions = questions.filter(q => q.tid === t._id && q.response && q.response.trim() !== "");
    return {
      thread: t,
      responses: threadQuestions
    };
  }).filter(t => t.responses.length > 0);

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="flex justify-between items-center border-b pr-4 bg-white shadow-sm">
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
      </div>
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800">Your Parent Training Portfolio</h1>
            <p className="text-gray-500 mt-2">This document is compiled entirely from the reflections and plans you wrote during the roleplay simulations.</p>
          </div>

          {userWrittenContent.length === 0 ? (
            <Card className="text-center text-gray-400 py-12">
              No training documentation found. Please complete the roleplay steps and write your reflections.
            </Card>
          ) : (
            <div className="flex flex-col gap-8">
              {userWrittenContent.map((data, idx) => (
                <Card key={data.thread._id} title={<span className="text-xl text-blue-800">Scenario {idx + 1}: {data.thread.theme}</span>} className="shadow-md">
                  {data.responses.map((q, qIdx) => (
                    <div key={q._id} className="mb-6 last:mb-0">
                      <div className="text-sm font-semibold text-gray-500 mb-2">{q.question?.label || `Step ${qIdx + 1}`}</div>
                      <div className="bg-blue-50 p-4 rounded-lg text-gray-800 whitespace-pre-wrap leading-relaxed border border-blue-100">
                        {q.response}
                      </div>
                    </div>
                  ))}
                  
                  {/* Peer Review Placeholder as requested */}
                  <div className="mt-6 pt-6 border-t border-dashed border-gray-200">
                    <div className="text-sm font-bold text-gray-700 mb-3">Peer Comments (Group Leaders / Other Parents)</div>
                    <div className="bg-gray-50 p-3 rounded text-gray-500 italic text-sm">
                      No peer comments yet. Share this portfolio with your group leader for feedback.
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SummaryPage