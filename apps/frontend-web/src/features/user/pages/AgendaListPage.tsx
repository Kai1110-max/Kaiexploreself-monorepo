import { useDispatch, useSelector } from "../../../redux/hooks"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Navigate, useNavigate } from "react-router-dom"
import { agendaSelectors, renameAgenda } from "../reducer"
import { Button, Input } from "antd"
import { PencilIcon } from '@heroicons/react/20/solid'
import LinesEllipsis from 'react-lines-ellipsis'

import responsiveHOC from 'react-lines-ellipsis/lib/responsiveHOC'
import moment from "moment"
const ResponsiveEllipsis = responsiveHOC()(LinesEllipsis)


const AgendaView = (props: {agendaId: string}) => {

    const agenda = useSelector(state => agendaSelectors.selectById(state, props.agendaId))

    const createdAtLabel = useMemo(()=>{
        return moment(agenda.createdAt).locale('es').format('lll')
    }, [agenda.createdAt])

    const [t] = useTranslation()
    const navigate = useNavigate()
    const dispatch = useDispatch()
    const [isEditing, setIsEditing] = useState(false)
    const [editTitle, setEditTitle] = useState(agenda?.title || '')

    const onClick = useCallback(async (e: React.MouseEvent)=>{
        if (isEditing) return;
        console.log(props.agendaId)
        // Navigate to the theory intro page, passing the agendaId so it can continue
        navigate("/app/agendas/module1", { state: { agendaId: props.agendaId } })
    }, [props.agendaId, isEditing, navigate])

    const handleSaveTitle = (e: React.MouseEvent | React.KeyboardEvent | React.FocusEvent<HTMLInputElement>) => {
        e.stopPropagation();
        if (editTitle.trim() && editTitle !== agenda.title) {
            dispatch(renameAgenda(props.agendaId, editTitle.trim()));
        }
        setIsEditing(false);
    }

    if (!agenda) return null;

    return <div className="card-button-wrapper" onClick={onClick}>
        <div className="flex justify-between items-baseline">
            <div className="select-none font-semibold flex-1 mr-4 flex items-center group">
                {isEditing ? (
                    <Input 
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        onPressEnter={handleSaveTitle}
                        onBlur={handleSaveTitle}
                        autoFocus
                        onClick={e => e.stopPropagation()}
                        size="small"
                        className="max-w-md"
                    />
                ) : (
                    <>
                        <span className="truncate">{agenda.title}</span>
                        <button 
                            className="ml-2 text-slate-300 hover:text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                                e.stopPropagation();
                                setEditTitle(agenda.title || '');
                                setIsEditing(true);
                            }}
                        >
                            <PencilIcon className="w-4 h-4" />
                        </button>
                    </>
                )}
            </div>
            <div className="select-none text-slate-400 text-sm whitespace-nowrap">{createdAtLabel}</div>
        </div>
        <ResponsiveEllipsis maxLine={1} trimRight basedOn="letters" className="select-none mt-3 text-sm text-slate-400" text={agenda.initialNarrative}/>
        <div className="mt-4 px-.5">
            <div className="text-xs font-semibold text-slate-400">{t("Agendas.ThemeCount", {count: agenda.threads?.length || 0})}</div>
        </div>
    </div>
}

export const AgendaListPage  = () => {

    const { t, i18n } = useTranslation()

    const navigate = useNavigate()

    const userName = useSelector(state => state.user.name)

    const agendaIds = useSelector(state => state.user.agendaEntityState.ids)

    const onNewAgendaClick = useCallback(()=>{
        navigate("new")
    }, [])
    
    useEffect(()=>{
        
    }, [])
    
    if (userName == null || userName.length == 0) {
        return <Navigate to="/app/profile" />;
      } else return <div className="h-full overflow-y-auto"><div className="container px-4">
        
        {/* Modules Section */}
        <h1 className="mt-6 mb-4 text-xl font-bold">{i18n.language === 'en' ? 'Training Modules' : '训练模块'}</h1>
        <div className="grid grid-cols-1 gap-4 mb-8">
            <div 
              className="card-button-wrapper bg-blue-50 border-blue-200 hover:bg-blue-100 transition cursor-pointer p-4 rounded-lg border"
              onClick={() => navigate("module1")}
            >
              <div className="flex justify-between items-baseline">
                  <div className="select-none font-semibold text-blue-700 text-lg">
                    {i18n.language === 'en' ? 'Module 1: My Emotional Radar' : '模块 1：我的情感雷达'}
                  </div>
              </div>
              <div className="select-none mt-2 text-sm text-blue-600">
                {i18n.language === 'en' 
                  ? 'Practice observing your first emotional reaction when your child throws a tantrum.' 
                  : '练习在孩子发脾气时，觉察并记录您的第一情绪反应。'}
              </div>
            </div>
        </div>

        <h1 className="mt-8 mb-4 text-xl font-bold">{i18n.language === 'en' ? 'History' : '历史记录'}</h1>
        <div className="grid grid-cols-1 gap-4 mb-8">
            <Button type="primary" size="large" onClick={onNewAgendaClick} style={{ display: 'none' }}>
                <div className="select-none">{t("Agendas.New")}</div>
            </Button>
            {
                agendaIds.map(id => <AgendaView key={id} agendaId={id}/>)
            }
        </div>
    </div></div>
}

export default AgendaListPage