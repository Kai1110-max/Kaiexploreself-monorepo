import { useSelector } from '../../../redux/hooks';
import { Card, Steps } from 'antd';
import { threadSelectors, questionSelectors } from '../reducer';
import { IQASetWithIds } from '@core';

export const ThemeLiveDocumentPreview = ({ tid }: { tid: string }) => {
  const thread = useSelector(state => threadSelectors.selectById(state, tid));
  const questions = useSelector(state => 
    thread ? (thread.questions || []).map(qid => questionSelectors.selectById(state, qid)).filter(q => q !== undefined) : []
  ) as IQASetWithIds[];

  if (!thread) return null;

  return (
    <div className="bg-white rounded-lg p-2">
      <div className="text-xl font-bold text-blue-800 mb-4 border-b pb-2">
        Theme Draft: {thread.theme}
        {thread.theoryName && (
          <div className="text-sm font-normal text-gray-500 mt-1">
            Based on: {thread.theoryName}
          </div>
        )}
      </div>
      
      <div className="space-y-6">
        {questions.map((q, idx) => {
          const sectionTitle = q?.question?.label || `Step ${idx + 1}`;
          const content = q?.response || '';
          
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
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-md text-blue-800 text-xs">
                    <strong>AI Evaluation:</strong> 
                    <div className="mt-1 opacity-80">
                      Based on your input for this step, your response effectively addresses the theoretical requirements of this phase.
                      To improve, consider providing more specific context or examples from your classroom.
                    </div>
                  </div>
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
