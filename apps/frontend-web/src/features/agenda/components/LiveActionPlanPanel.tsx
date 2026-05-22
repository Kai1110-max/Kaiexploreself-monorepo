import { useDispatch, useSelector } from '../../../redux/hooks';
import { LoadingIndicator } from '../../../components/LoadingIndicator';
import { useCallback, useEffect, useState, useRef } from 'react';
import { getNewActionPlanDoc, updateAndSaveActionPlanDoc, fetchEvaluation, fetchConsistency, postPeerReview } from '../reducer';
import { Button, Input, Progress, Timeline, Steps, Card, Space, message, Tag, List, Collapse, Form, Dropdown } from 'antd';
import { useAgendaIdInRoute } from '../hooks';
import { usePrevious } from '@uidotdev/usehooks';
import { improveActionPlanSection, agenticSync } from '../../../api_call/actionPlanDoc';
import { RobotOutlined, UserOutlined, QuestionCircleOutlined, CheckCircleOutlined, InfoCircleOutlined, DownloadOutlined, FileWordOutlined, FilePdfOutlined } from '@ant-design/icons';

import { IActionPlanDocument } from '@core';

const { TextArea } = Input;

export const LiveActionPlanPanel = () => {
  const agendaId = useAgendaIdInRoute()
  const prevAgendaId = usePrevious(agendaId)
  const actionPlanDocument = useSelector(state => state.agenda.actionPlanDocument) as IActionPlanDocument | undefined;
  const publicationScore = useSelector(state => state.agenda.publicationScore)
  const futurePlan = useSelector(state => state.agenda.futurePlan)
  const consistencyMap = useSelector(state => state.agenda.consistencyMap)
  const peerReviews = useSelector(state => state.agenda.peerReviews)
  const isCreatingActionPlan = useSelector(state => state.agenda.isCreatingActionPlan)
  const token = useSelector(state => state.auth.token)
  
  const dispatch = useDispatch();
  const [improvingSection, setImprovingSection] = useState<string | null>(null)
  
  // Agentic Consultant States
  const [agentFeedback, setAgentFeedback] = useState<Record<string, { type: string, message: string, isLoading: boolean }>>({});
  const typingTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});

  const [currentPhase, setCurrentPhase] = useState<number>(0);

  const sectionsList = [
    { title: '0. Charter & Researcher Agreement', key: 'charter' },
    { title: '1. Motivation & Purpose', key: 'motivation' },
    { title: '2. Specific Purpose', key: 'purpose' },
    { title: '3. Inquiry Question', key: 'inquiryQuestion' },
    { title: '4. Theory Bridging & Target', key: 'theoryBridging' },
    { title: '5. Data & Tools', key: 'dataAndTools' },
    { title: '6. Intervention Design', key: 'interventionDesign' },
    { title: '7. Sense-making & Interpretation', key: 'senseMaking' },
    { title: '8. Interpretation & Reflection', key: 'reflection' },
    { title: '9. Decision Making (Next Steps)', key: 'decisionMaking' }
  ];

  const exportToWord = useCallback(() => {
    if (!actionPlanDocument) return;
    let html = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>Action Research Plan</title>
        <style>
          body { font-family: 'Calibri', 'Times New Roman', serif; line-height: 1.6; }
          h1 { color: #1e3a8a; text-align: center; }
          h2 { color: #2563eb; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-top: 24px; }
          p { margin-bottom: 12px; white-space: pre-wrap; }
        </style>
      </head>
      <body>
        <h1>Action Research Plan</h1>
    `;
    sectionsList.forEach(sec => {
      const content = actionPlanDocument[sec.key as keyof IActionPlanDocument] || 'Not filled yet.';
      html += `<h2>${sec.title}</h2><p>${content}</p>`;
    });
    html += `</body></html>`;

    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Action_Research_Plan.doc';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [actionPlanDocument]);

  const exportToPDF = useCallback(() => {
    if (!actionPlanDocument) return;
    let html = `
      <html>
      <head>
        <title>Action Research Plan</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; color: #333; }
          h1 { color: #1e3a8a; text-align: center; margin-bottom: 30px; }
          h2 { color: #2563eb; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; margin-top: 30px; }
          p { margin-bottom: 16px; white-space: pre-wrap; background: #f9fafb; padding: 15px; border-radius: 8px; }
          @media print {
            body { margin: 0; }
            p { background: transparent; padding: 0; border: none; }
          }
        </style>
      </head>
      <body>
        <h1>Action Research Plan</h1>
    `;
    sectionsList.forEach(sec => {
      const content = actionPlanDocument[sec.key as keyof IActionPlanDocument] || 'Not filled yet.';
      html += `<h2>${sec.title}</h2><p>${content}</p>`;
    });
    html += `
        <script>
          window.onload = function() { window.print(); window.close(); }
        </script>
      </body></html>`;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
    } else {
      message.error("Please allow popups to generate PDF");
    }
  }, [actionPlanDocument]);

  const handleGenerateActionPlan = useCallback(async () => {
    dispatch(getNewActionPlanDoc())
  },[dispatch])

  const handleEvaluate = useCallback(async () => {
    dispatch(fetchEvaluation())
    dispatch(fetchConsistency())
  }, [dispatch])

  useEffect(()=>{
    if(prevAgendaId != agendaId && !actionPlanDocument){
      dispatch(getNewActionPlanDoc())
    }
  }, [prevAgendaId, agendaId, actionPlanDocument, dispatch])

  const handleChange = (section: keyof IActionPlanDocument, value: string) => {
    if (!actionPlanDocument) return;
    
    // 1. Update Redux store
    dispatch(updateAndSaveActionPlanDoc({
      ...actionPlanDocument,
      [section]: value
    }))

    // 2. Clear previous timeout for this section
    if (typingTimeoutRef.current[section]) {
      clearTimeout(typingTimeoutRef.current[section]);
    }

    // 3. Set a new timeout to trigger agentic sync (Bounded Autonomy)
    if (value.trim().length > 10) {
      // Show loading state for the agent
      setAgentFeedback(prev => ({
        ...prev,
        [section]: { ...prev[section], isLoading: true }
      }));

      typingTimeoutRef.current[section] = setTimeout(async () => {
        if (!token || !agendaId) return;
        try {
          const res = await agenticSync(token, agendaId, section, value, actionPlanDocument);
          if (res) {
            setAgentFeedback(prev => ({
              ...prev,
              [section]: { type: res.type, message: res.message, isLoading: false }
            }));
          }
        } catch (err) {
          console.error("Agentic sync failed", err);
          setAgentFeedback(prev => ({
            ...prev,
            [section]: { ...prev[section], isLoading: false }
          }));
        }
      }, 3000); // 3 seconds debounce after typing stops
    }
  }

  const handleImprove = async (section: keyof IActionPlanDocument, content: string) => {
    if (!token || !agendaId) return;
    setImprovingSection(section);
    try {
      const improvedText = await improveActionPlanSection(token, agendaId, section, content);
      if (improvedText) {
        handleChange(section, improvedText);
        message.success('Section improved by AI');
      }
    } catch (err) {
      message.error('Failed to improve section');
    } finally {
      setImprovingSection(null);
    }
  }

  const handleReviewSubmit = (section: string, values: any) => {
    dispatch(postPeerReview(section, values.comment));
    message.success('Peer review submitted!');
  }

  const renderPeerReviews = (sectionKey: string) => {
    const reviewsForSection = peerReviews?.filter((r: any) => r.section === sectionKey) || [];
    
    return (
      <div className="mt-4 bg-gray-50 p-4 rounded-lg border">
        <div className="font-bold text-gray-700 mb-2 flex items-center">
          <span className="mr-2">👥 Critical Friend Reviews</span>
          <Tag color="blue">{reviewsForSection.length}</Tag>
        </div>
        
        {reviewsForSection.length > 0 && (
          <List
            className="mb-4"
            size="small"
            dataSource={reviewsForSection}
            renderItem={(item: any) => (
              <List.Item className="flex flex-col items-start bg-white mb-2 p-3 rounded shadow-sm">
                <div className="text-gray-800">{item.comment}</div>
                {item.aiValidation && (
                  <div className="mt-2 text-xs text-blue-600 bg-blue-50 p-2 rounded w-full">
                    <strong>AI Structural Check:</strong> {item.aiValidation}
                  </div>
                )}
              </List.Item>
            )}
          />
        )}
        
        <Form onFinish={(values) => handleReviewSubmit(sectionKey, values)} layout="inline">
          <Form.Item name="comment" className="flex-1 mb-0">
            <Input placeholder="Add a constructive review..." />
          </Form.Item>
          <Form.Item className="mb-0">
            <Button type="primary" htmlType="submit">Submit Review</Button>
          </Form.Item>
        </Form>
      </div>
    );
  }

  const renderAgenticFeedback = (sectionKey: string) => {
    const feedback = agentFeedback[sectionKey];
    if (!feedback) return null;

    if (feedback.isLoading) {
      return (
        <div className="mt-3 flex items-center text-gray-400 text-sm italic">
          <RobotOutlined className="animate-spin mr-2" /> 
          Consultant is reviewing your edits...
        </div>
      );
    }

    let bgColor = 'bg-gray-50';
    let icon = <RobotOutlined />;
    
    if (feedback.type === 'question') {
      bgColor = 'bg-blue-50 border-blue-200 text-blue-800';
      icon = <QuestionCircleOutlined className="text-blue-500" />;
    } else if (feedback.type === 'feedback') {
      bgColor = 'bg-amber-50 border-amber-200 text-amber-800';
      icon = <InfoCircleOutlined className="text-amber-500" />;
    } else if (feedback.type === 'approval') {
      bgColor = 'bg-green-50 border-green-200 text-green-800';
      icon = <CheckCircleOutlined className="text-green-500" />;
    }

    return (
      <div className={`mt-3 p-3 rounded-lg border flex items-start shadow-sm transition-all duration-500 ${bgColor}`}>
        <div className="mr-3 mt-1 text-lg">
          {icon}
        </div>
        <div className="flex-1">
          <div className="text-xs font-bold uppercase tracking-wider opacity-70 mb-1">
            Agentic Consultant
          </div>
          <div className="text-sm leading-relaxed">
            {feedback.message}
          </div>
        </div>
      </div>
    );
  }

  const renderSection = (title: string, sectionKey: keyof IActionPlanDocument) => {
    const content = actionPlanDocument?.[sectionKey] || '';
    return (
      <Card 
        title={<span className="whitespace-normal break-words">{title}</span>} 
        className="mb-4 shadow-sm" 
        extra={
          <Button 
            type="dashed" 
            loading={improvingSection === sectionKey}
            onClick={() => handleImprove(sectionKey, content)}
            className="ml-2"
          >
            ✨ Ask AI to Improve
          </Button>
        }
        styles={{ header: { whiteSpace: 'normal', height: 'auto', padding: '12px 24px' } }}
      >
        <TextArea 
          autoSize={{ minRows: 3, maxRows: 10 }}
          value={content}
          onChange={(e) => handleChange(sectionKey, e.target.value)}
          className="text-gray-700 leading-relaxed"
        />
        {renderAgenticFeedback(sectionKey)}
        {/* Temporarily hiding peer reviews per user request */}
        {/* {renderPeerReviews(sectionKey)} */}
      </Card>
    )
  }

  return (
    <div className='bg-white p-8 rounded-xl mt-4 border border-blue-200'>
      <div className='flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4'>
        <div className='font-bold text-2xl text-blue-800 break-words'>Live Action Research Document</div>
        <Space className="flex-wrap">
          {actionPlanDocument && (
            <Dropdown 
              menu={{
                items: [
                  { key: 'word', label: 'Export as Word (.doc)', icon: <FileWordOutlined />, onClick: exportToWord },
                  { key: 'pdf', label: 'Export as PDF', icon: <FilePdfOutlined />, onClick: exportToPDF }
                ]
              }}
              placement="bottomRight"
            >
              <Button type="dashed" icon={<DownloadOutlined />}>
                Export
              </Button>
            </Dropdown>
          )}
          {actionPlanDocument && (
            <Button onClick={handleEvaluate} type="default">
              Evaluate Publication Chance
            </Button>
          )}
          {isCreatingActionPlan ? (
            <LoadingIndicator title="Generating Document..."/>
          ) : (
            <Button onClick={handleGenerateActionPlan} disabled={isCreatingActionPlan} type="primary">
              Regenerate Document
            </Button>
          )}
        </Space>
      </div>

      {!actionPlanDocument && !isCreatingActionPlan && (
        <div className="text-gray-500 italic">No Action Research Document generated yet.</div>
      )}

      {actionPlanDocument && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Steps 
              current={currentPhase} 
              onChange={setCurrentPhase}
              size="small" 
              className="mb-6 cursor-pointer"
              items={[
                { title: 'Plan', description: 'Charter & Design' },
                { title: 'Act', description: 'Intervention' },
                { title: 'Observe & Reflect', description: 'Data & Decision' }
              ]} 
            />
            
            {currentPhase === 0 && (
              <div className="animate-fade-in">
                <div className="mb-4 text-blue-800 font-semibold text-lg border-b pb-2">Phase 1: Plan</div>
                {renderSection('0. Charter & Researcher Agreement', 'charter')}
                {renderSection('1. Motivation & Purpose', 'motivation')}
                {renderSection('2. Specific Purpose', 'purpose')}
                {renderSection('3. Inquiry Question', 'inquiryQuestion')}
                {renderSection('4. Theory Bridging & Target', 'theoryBridging')}
                {renderSection('5. Data & Tools', 'dataAndTools')}
              </div>
            )}

            {currentPhase === 1 && (
              <div className="animate-fade-in">
                <div className="mb-4 text-blue-800 font-semibold text-lg border-b pb-2">Phase 2: Act</div>
                {renderSection('6. Intervention Design', 'interventionDesign')}
              </div>
            )}

            {currentPhase === 2 && (
              <div className="animate-fade-in">
                <div className="mb-4 text-blue-800 font-semibold text-lg border-b pb-2">Phase 3: Observe & Reflect</div>
                {renderSection('7. Sense-making & Interpretation', 'senseMaking')}
                {renderSection('8. Interpretation & Reflection', 'reflection')}
                {renderSection('9. Decision Making (Next Steps)', 'decisionMaking')}
              </div>
            )}
            
            <div className="flex flex-col sm:flex-row justify-between mt-6 gap-4">
              <Button 
                disabled={currentPhase === 0} 
                onClick={() => setCurrentPhase(prev => prev - 1)}
                className="w-full sm:w-auto"
              >
                Previous Phase
              </Button>
              <Button 
                type="primary" 
                disabled={currentPhase === 2} 
                onClick={() => setCurrentPhase(prev => prev + 1)}
                className="w-full sm:w-auto"
              >
                Next Phase
              </Button>
            </div>
          </div>

          <div className="lg:col-span-1 space-y-6">
            {consistencyMap && (
              <Card title="Inquiry Consistency Map" className="shadow-sm border-blue-200">
                {consistencyMap.weakLinks?.length > 0 && (
                  <div className="mb-4">
                    <div className="text-red-500 font-bold mb-2">Weak/Missing Links:</div>
                    <List
                      size="small"
                      dataSource={consistencyMap.weakLinks}
                      renderItem={(item: string) => <List.Item><Tag color="red">Fix</Tag>{item}</List.Item>}
                    />
                  </div>
                )}
                {consistencyMap.strongLinks?.length > 0 && (
                  <div>
                    <div className="text-green-600 font-bold mb-2">Strong Connections:</div>
                    <List
                      size="small"
                      dataSource={consistencyMap.strongLinks}
                      renderItem={(item: string) => <List.Item><Tag color="green">Good</Tag>{item}</List.Item>}
                    />
                  </div>
                )}
              </Card>
            )}

            {publicationScore !== undefined && (
              <Card title="Publication Rigor Score" className="text-center shadow-sm">
                <Progress type="dashboard" percent={publicationScore} strokeColor={{
                  '0%': '#108ee9',
                  '100%': '#87d068',
                }} />
                <div className="mt-2 text-gray-500 text-sm">Based on academic standards</div>
              </Card>
            )}

            {futurePlan && futurePlan.length > 0 && (
              <Card title="Future Action Timeline" className="shadow-sm">
                <Timeline items={futurePlan.map((step: string) => ({ children: step }))} />
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
