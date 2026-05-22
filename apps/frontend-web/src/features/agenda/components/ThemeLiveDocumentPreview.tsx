import { useSelector } from '../../../redux/hooks';
import { Card, Steps } from 'antd';
import { threadSelectors, questionSelectors } from '../reducer';
import { IQASetWithIds } from '@core';

export const ThemeLiveDocumentPreview = ({ tid }: { tid: string }) => {
  const thread = useSelector(state => threadSelectors.selectById(state, tid));
  const questions = useSelector(state => 
    thread ? thread.questions.map(qid => questionSelectors.selectById(state, qid)).filter(q => q !== undefined) : []
  ) as IQASetWithIds[];

  if (!thread) return null;

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

  return (
    <div className="bg-white rounded-lg p-2">
      <div className="text-xl font-bold text-blue-800 mb-4 border-b pb-2">
        Theme Draft: {thread.theme}
      </div>
      
      <div className="space-y-6">
        {questions.map((q, idx) => {
          const sectionTitle = sectionsList[idx]?.title || q.question.label || \`Step \${idx + 1}\`;
          const content = q.response || '';
          
          return (
            <Card 
              key={q._id} 
              size="small" 
              title={<span className="text-blue-700 text-sm whitespace-normal">{sectionTitle}</span>}
              className="shadow-sm border-gray-200"
              styles={{ body: { padding: '12px' } }}
            >
              {content ? (
                <div className="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed">
                  {content}
                </div>
              ) : (
                <div className="text-gray-400 italic text-sm">
                  Not filled yet. Complete this step on the left.
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
};
