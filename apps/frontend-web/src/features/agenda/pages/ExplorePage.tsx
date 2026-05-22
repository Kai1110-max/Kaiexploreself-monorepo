import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { OutlinePanel, PinnedThemesPanel } from '../components/sidebar-views';
import ThemeBox from '../components/ThemeBox';
import { ThreadBox } from '../components/ThreadBox';
import { Card,  Button } from 'antd';
import { useDispatch, useSelector } from '../../../redux/hooks';
import { Navigate, useNavigate } from 'react-router-dom';
import {enterReviewStage, getNewThemes, resetNewThemes, selectFloatingHeader, setThemeSelectorOpen, threadSelectors, getNewSummary, selectedQuestionsSelector } from '../reducer';
import { LightBulbIcon } from '@heroicons/react/24/solid';
import { useInView } from 'react-intersection-observer';
import { ShortcutManager } from '../../../services/shortcut';
import useScrollbarSize from 'react-scrollbar-size';
import { useTranslation } from 'react-i18next';
import classNames from 'classnames'
import { SessionStatus } from '@core';
import { InfoPopover } from '../../../components/InfoPopover';
import { ChevronDoubleLeftIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/20/solid';
import LinesEllipsis from 'react-lines-ellipsis'
import responsiveHOC from 'react-lines-ellipsis/lib/responsiveHOC'
import { SummaryPanel } from '../components/SummaryPanel';
const ResponsiveEllipsis = responsiveHOC()(LinesEllipsis)

const SidePanel = () => {

  const dispatch = useDispatch();
  const isThemeSelectorOpen = useSelector(state => state.agenda.isThemeSelectorOpen)

  const title = useSelector(state => state.agenda.title || '')

  const [t] = useTranslation()
  const navigate = useNavigate();

  const handleEndSession = useCallback(async () => {
    await dispatch(enterReviewStage())
    navigate("./summary")
  },[])

  const onReturnClick = useCallback(()=>{
    navigate("../")
  }, [])

  return (
    <>
      <div
        id="sidebar-header"
        className="flex justify-between items-center  border-b-[1px]"
      >
        <Button
              type="text"
              className='p-2 rounded-none justify-start'
              size='large'
              onClick={onReturnClick}
            ><ChevronDoubleLeftIcon className="w-6 h-6" />
            </Button>
            <ResponsiveEllipsis text={title || ''} maxLine={1} className='w-full text-base select-none px-1 text-gray-500'/>
      </div>
      <div className={classNames(
        'flex-1 overflow-y-auto bg-gray-400/2',
        {
          'pointer-events-none opacity-50': isThemeSelectorOpen,
        },
        {
          'opacity-100': !isThemeSelectorOpen,
        }
      )}>
        <OutlinePanel />
        {false && <PinnedThemesPanel />}
      </div>
    </>
  );
};

const NewThemeButtonPopover = () => {
  const [t] = useTranslation()
  return <InfoPopover content={t("Info.NewTheme")} iconColor='white'/>
}

const EMPTY_ARRAY: any[] = [];

export const ExplorerPage = () => {

  const [t] = useTranslation()
  const navigate = useNavigate()

  const title = useSelector(state => state.agenda.title || '')

  const initialNarrative = useSelector(
    (state) => state.agenda.initialNarrative || ''
  );

  const sessionStatus = useSelector(state => state.agenda.sessionStatus)

  const threadIds = useSelector(threadSelectors.selectIds);

  const isThemeSelectorOpen = useSelector(state => state.agenda.isThemeSelectorOpen)

  const floatingHeader = useSelector(selectFloatingHeader)

  const { ref, inView } = useInView({
    /* Optional options */
    threshold: 0,
  });

  const dispatch = useDispatch();

  const onThemeSelectionButtonClick = useCallback(() => {
    dispatch(resetNewThemes())
    dispatch(getNewThemes(3))
    dispatch(setThemeSelectorOpen(true));
  }, []);

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const maxStepIndex = threadIds.length;
  const prevThreadCount = useRef(threadIds.length);

  const currentTid = currentStepIndex > 0 && currentStepIndex <= maxStepIndex ? threadIds[currentStepIndex - 1] : undefined;
  const currentQuestions = useSelector(state => currentTid ? selectedQuestionsSelector(state, currentTid as string) : EMPTY_ARRAY);
  const isCurrentStepDone = currentStepIndex === 0 || (currentQuestions.length > 0 && currentQuestions.some(q => q.response && q.response.length > 0));

  useEffect(() => {
    // When a new theme is added, jump to the new step
    if (threadIds.length > prevThreadCount.current) {
      setCurrentStepIndex(threadIds.length);
    }
    prevThreadCount.current = threadIds.length;
  }, [threadIds.length]);

  const goNext = useCallback(() => {
    if (currentStepIndex < maxStepIndex) {
      setCurrentStepIndex(prev => prev + 1);
      dispatch(getNewSummary());
    } else {
      onThemeSelectionButtonClick();
    }
  }, [currentStepIndex, maxStepIndex, onThemeSelectionButtonClick, dispatch]);

  const goPrev = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  }, [currentStepIndex]);

  const scrollViewRef = useRef<HTMLDivElement>(null);

  const narrativeCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const focusRequestSubscription =
      ShortcutManager.instance.onFocusRequestedEvent.subscribe((event) => {
        switch (event.type) {
          case 'narrative':
            {
              setCurrentStepIndex(0);
              scrollViewRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
            }
            break;
          case 'thread':
            {
              const index = threadIds.indexOf(event.id);
              if (index >= 0) {
                setCurrentStepIndex(index + 1);
              }
            }
            break;
        }
      });

    return () => {
      focusRequestSubscription.unsubscribe();
    };
  }, [threadIds]);

  const {width: scrollBarWidth} = useScrollbarSize()

  const scrollbarSafeRightStyle = useMemo(()=>{
    return {right: scrollBarWidth}
  }, [scrollBarWidth])

  const focusOnThemeButton = threadIds.length === 0 && isThemeSelectorOpen === false

  if (sessionStatus == SessionStatus.Reviewing || sessionStatus == SessionStatus.Terminated){
    return <Navigate to="./summary"/>;
  } else {
    const themeButtonIcon = <LightBulbIcon className={`w-5 h-5 ${focusOnThemeButton ? "animate-bounce-emphasized text-yellow-200":""}`} />
    const themeButtonLabel = <div className={`${focusOnThemeButton ? 'animate-pulse font-semibold':''} inline`}>{threadIds.length == 0 ? t("Exploration.ShowMoreThemesInitial") : t("Exploration.ShowMoreThemes")}</div>
    return (
      <div className="h-screen flex justify-stretch">
        <div className="basis-1/6 min-w-[200px] md:min-w-[300px] bg-white border-r-[1px] flex flex-col">
          <SidePanel />
        </div>
        <div className="flex-1 flex overflow-hidden relative bg-gray-50">
          <div className="flex-1 flex flex-col relative border-r border-gray-200">
            {/* Header with Prev/Next buttons */}
            <div className="flex items-center justify-between p-4 border-b bg-white shadow-sm z-10">
              <Button 
                icon={<ChevronLeftIcon className="w-5 h-5" />} 
                onClick={goPrev} 
                disabled={currentStepIndex === 0}
                className="flex items-center"
              >
                {t("Navigation.Previous") || "Previous"}
              </Button>
              <span className="font-semibold text-gray-600">
                Step {currentStepIndex + 1} of {maxStepIndex + 1}
              </span>
              <Button 
                type={isCurrentStepDone ? "primary" : "default"}
                onClick={goNext}
                className={`flex items-center ${isCurrentStepDone ? 'animate-pulse shadow-md bg-blue-600 hover:bg-blue-500 border-none' : ''}`}
              >
                {currentStepIndex === maxStepIndex ? t("Exploration.ShowMoreThemes") || "Explore Other Themes" : t("Navigation.Next") || "Next Step"}
                {currentStepIndex !== maxStepIndex && <ChevronRightIcon className="w-5 h-5 ml-1" />}
              </Button>
            </div>

            <div
              className="overflow-y-auto flex-1 p-4 md:p-8"
              ref={scrollViewRef}
            >
              <ThemeBox />
              
              <div className="relative">
                {currentStepIndex === 0 && (
                  <Card ref={narrativeCardRef} title={`${t("Narrative.InitialNarrative")} - ${title || ''}`}>
                    <span className="text-gray-600 leading-7">
                      {initialNarrative}
                    </span>
                  </Card>
                )}

                {currentStepIndex > 0 && currentStepIndex <= maxStepIndex && currentTid && (
                  <ThreadBox key={currentTid as string} tid={currentTid as string} />
                )}
                
                {currentStepIndex === maxStepIndex && (
                  <Button
                    key={'new-theme-btn-bottom'}
                    ref={ref}
                    type="primary"
                    className={`w-full border-none shadow-lg h-12 mt-8 ${focusOnThemeButton ? 'outline animate-focus-indicate':''}`}
                    icon={themeButtonIcon}
                    onClick={onThemeSelectionButtonClick}
                  >{themeButtonLabel}
                    <NewThemeButtonPopover/>
                  </Button>
                )}
              </div>
            </div>
          </div>
          
          <div className="w-[40%] min-w-[300px] bg-white p-4 md:p-8 overflow-y-auto shadow-inner z-0">
            <SummaryPanel />
            <div className="mt-8 pt-8 border-t border-gray-100">
               <Button 
                 type="primary" 
                 className='w-full h-12 text-base font-semibold shadow-md bg-emerald-600 hover:bg-emerald-500 border-none' 
                 onClick={async () => {
                   await dispatch(enterReviewStage());
                   navigate("./summary");
                 }}
               >
                 {t("Summary.Open") || "Finish & Go to Live Document"}
               </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }
};

export default ExplorerPage