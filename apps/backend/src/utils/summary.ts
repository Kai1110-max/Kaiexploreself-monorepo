import { ChatPromptTemplate, HumanMessagePromptTemplate, SystemMessagePromptTemplate } from '@langchain/core/prompts';
import z from "zod"
import { chatModel } from '../config/config';
import { IAgendaORM, IUserORM } from '../config/schema';

import mongoose from "mongoose"
import { ThreadItem, User } from "../config/schema"
import nunjucks from 'nunjucks'
import { IMappedSummarySentence } from '@core';


export const summarizeProfilicInfo = (init_nar: string) => {

    return `
    The client describes one's narrative of difficulty as: "${init_nar}".
    `
  }

export async function generateTitleFromNarrative(user: IUserORM, narrative: string) {
  const user_name = user.name
  const isKorean = user.isKorean

  const systemTemplae = `
  [Context]
  The user has inserted their own story. 

  [Task]
  Provide a brief title text from the story.

  [Output Note]
  ${isKorean? "- The title should be in Korean.":""}
  - Refer to the user in the 1st person, if necessary.
  - Keep it concise and grounded in the user’s actual input.
  `

  const systemMessage = SystemMessagePromptTemplate.fromTemplate(systemTemplae)

  const humanTemplate = `
  <story/>: {story}
  <user_name/>: {user_name}
  `

  const humanMessage = HumanMessagePromptTemplate.fromTemplate(humanTemplate)

  const finalPromptTemplate = ChatPromptTemplate.fromMessages([
    systemMessage,
    humanMessage
  ])

  const summarySchema = z.object({
    title: z.string().min(1).describe('A result title derived from the user\'s story.')
  })

  const structuredLlm = chatModel.withStructuredOutput(summarySchema)
  const chain = finalPromptTemplate.pipe(structuredLlm)
  
  try {
    const result = await chain.invoke({ story: narrative, user_name: user_name })
    return result.title
  } catch (error) {
    const trimmed = (narrative || '').replace(/\s+/g, ' ').trim()
    const base = trimmed.length ? trimmed.slice(0, 48) : (isKorean ? '새 세션' : 'New Session')
    return trimmed.length > 48 ? `${base}...` : base
  }
}

export async function summarizeThread(tid: string, option='default') {
  /*
  
  */
  const threadItem = await ThreadItem.findById(tid).populate('questions')
  
  const summary = nunjucks.renderString(`
  Theme: {{ theme }}\n
  {% if questions.length > 0 %}
    {% for set in questions %}
      {% if set.selected %}
        Q: {{ set.question.content }}\n
        {% if option == "keyword" and set.keywords %}
          Provided Keywords: {{ set.keywords.join(', ')}}\n
        {% elif option == "comment" and set.aiGuides %}
          Previously provided comments: {{ set.aiGuides.join('| ')}}\n
        {% endif %}
        A: {{ set.response }}\n
      {% endif %}
    {% endfor %}
  {% else %}
    The session doesn't have log yet.\n
  {% endif %}
  `,{theme: threadItem.theme, questions: threadItem.questions, option: option})

  return summary
}

async function summarizeThreadWithQid (tid: string, option='default') {

  const threadItem = await ThreadItem.findById(tid).populate('questions')
  
  const summary = nunjucks.renderString(`
  Theme: {{ theme }}\n
  {% if questions.length > 0 %}
    {% for set in questions %}
      {% if set.selected %}
        [QID: {{ set._id }}]: {{ set.question.content }}\n
        {% if option == "keyword" and set.keywords %}
          Provided Keywords: {{ set.keywords.join(', ')}}\n
        {% elif option == "comment" and set.aiGuides %}
          Previously provided comments: {{ set.aiGuides.join('| ')}}\n
        {% endif %}
        A: {{ set.response }}\n
      {% endif %}
      {% if not set.selected %}
        {% if option == "question" %}
          [Unselected question] set.question.content
        {% endif %}
      {% endif %}
    {% endfor %}
  {% else %}
    The session doesn't have log yet.\n
  {% endif %}
  `,{theme: threadItem.theme, questions: threadItem.questions, option: option})

  return summary
}

export async function summarizePrevThreads (agenda: IAgendaORM, option: string='default') {
  if (agenda.threads.length) {
    const summaries = await Promise.all(agenda.threads.map(async (ref) => {
      if(option=='qid'){
        return summarizeThreadWithQid(ref.toString(), option)
      }
      return summarizeThread(ref.toString(), option);
    }));
    
    return summaries.join();
  } else {
    return ''
  }
}


export async function generateSummary (user: IUserORM, agenda: IAgendaORM, opt: number=1) {
  const user_name = user.name
  const isKorean = user.isKorean

  const systemTemplae = `
  [Context]
  The teacher is participating in a professional development session through an LLM-driven system, responding to Socratic questions on a selected Action Research theme.

  [Role]
  You are an Action Research Mentor helping the teacher reflect on their teaching practice and action research progress.

  [Task]
  Summarize the teacher's experiences and insights from their Q&A log into a coherent and concise narrative. Focus on the essence of their reflections without overemphasizing any one aspect.

  [Guidelines]
  - Capture the key pedagogical points, teaching challenges, and proposed action research steps without unnecessary detail.
  - Use the teacher's own language and expressions where appropriate.
  - Keep the summary realistic, proportional to the content of the teacher's log, and based on evidence.
  - Feel free to draw on the following as needed:
    - Major pedagogical themes or teaching challenges
    - Notable progress in designing the Action Research
    - Encouragement to implement and measure teaching improvement
    - Recognition of the teacher's strengths and educational resources

  [Output Note]
  ${isKorean? "- The summary should be in Korean and use honorifics.":""}
  - Refer to the user by name, in the 3rd person.
  - Keep it concise and grounded in the user’s actual input.
  `

  const systemMessage = SystemMessagePromptTemplate.fromTemplate(systemTemplae)

  const humanTemplate = `
  <initial_information/>: {init_info}
  <previous_q&a_log/>: {prev_log}
  <user_name/>: {user_name}
  `

  const humanMessage = HumanMessagePromptTemplate.fromTemplate(humanTemplate)

  const finalPromptTemplate = ChatPromptTemplate.fromMessages([
    systemMessage,
    humanMessage
  ])

  const summarySchema = z.object({
    summary: z.string().describe('A cohesive narrative that ties together the user’s experiences, reflections, and insights into a coherent story that help user gain deeper insights into their experiences, recognize their progress, and feel empowered to continue their journey of personal growth')
  })

  const structuredLlm = chatModel.withStructuredOutput(summarySchema)
  const chain = finalPromptTemplate.pipe(structuredLlm)
  const init_info = summarizeProfilicInfo(agenda.initialNarrative)

  const prev_log = await summarizePrevThreads(agenda)

  const result = await chain.invoke({init_info: init_info, prev_log: prev_log, user_name: user_name})

  return result.summary

}


export async function mapSummaryToQIDs(agenda: IAgendaORM, summary: string): Promise<Array<IMappedSummarySentence>>{
    const systemTemplate = `
    [Context]
    The user has completed a self-help session and a narrative summary has been generated based on their Q&A log. Each Q&A set in the log has a unique identifier (QID).
  
    [Role]
    You are a therapeutic assistant facilitating the user's self-reflection and therapeutic growth.
  
    [Task]
    For each sentence (or set of sentences) in the provided summary, map it to the relevant QID(s) from the Q&A log.
  
    [Goal]
    Ensure that each part of the summary can be linked to the corresponding Q&A interaction for reference.
  
    [Input type and format]
    <summary/>: The narrative summary generated in the previous step.
    <previous_q&a_log/>: Log of previous self-help sessions with QIDs.
  
    [Output Format]
    - Each sentence (or set of sentences) from the summary followed by the mapped QID(s).
    `;
  
    const systemMessage = SystemMessagePromptTemplate.fromTemplate(systemTemplate);
  
    const humanTemplate = `
    <summary/>: {summary}
    <previous_q&a_log/>: {prev_log}
    `;
  
    const humanMessage = HumanMessagePromptTemplate.fromTemplate(humanTemplate);
  
    const finalPromptTemplate = ChatPromptTemplate.fromMessages([
      systemMessage,
      humanMessage
    ]);
  
    const mappingSchema = z.object({
      mappings: z.array(z.object({
        sentence: z.string().describe('A sentence or set of sentences from the summary'),
        qids: z.array(z.string()).describe('List of QID(s) that the sentence maps to')
      })).describe('List of sentences with their corresponding QID(s)')
    });
  
    const structuredLlm = chatModel.withStructuredOutput(mappingSchema);
    const chain = finalPromptTemplate.pipe(structuredLlm);
  
    const prev_log = await summarizePrevThreads(agenda, 'qid');
  
    const result = await chain.invoke({ summary, prev_log: prev_log });

  return (result as any).mappings;
};

export async function generateActionPlan(user: IUserORM, agenda: IAgendaORM) {
  const user_name = user.name;
  const isKorean = user.isKorean;

  const systemTemplae = `
  [Context]
  The teacher is participating in a professional development session through an LLM-driven system, responding to Socratic questions on a selected Action Research theme.

  [Role]
  You are an Action Research Mentor helping the teacher generate a concrete Action Research Plan.

  [Task]
  Based on the teacher's Q&A log and reflections, generate a structured, professional Action Research Plan. 

  [Guidelines]
  The Action Plan MUST include:
  1. Research Problem (what is the specific issue?)
  2. Literature/Theory Context (what pedagogical theory supports this?)
  3. Intervention Design (what specific action will the teacher take?)
  4. Data Collection Method (how will the teacher measure improvement?)
  
  - Use the teacher's own context and proposed ideas where available.
  - Make it actionable, practical, and directly relevant to their discipline.
  - Output format: A well-formatted Markdown string.

  [Output Note]
  ${isKorean ? "- The output MUST be in Korean and use professional, encouraging tone." : "- The output MUST be in English."}
  `

  const systemMessage = SystemMessagePromptTemplate.fromTemplate(systemTemplae)

  const humanTemplate = `
  <initial_information/>: {init_info}
  <previous_q&a_log/>: {prev_log}
  <user_name/>: {user_name}
  `

  const humanMessage = HumanMessagePromptTemplate.fromTemplate(humanTemplate)

  const finalPromptTemplate = ChatPromptTemplate.fromMessages([
    systemMessage,
    humanMessage
  ])

  const actionPlanSchema = z.object({
    actionPlan: z.string().describe('A structured Action Research Plan in Markdown format containing Research Problem, Theory Context, Intervention Design, and Data Collection.')
  })

  const structuredLlm = chatModel.withStructuredOutput(actionPlanSchema)
  const chain = finalPromptTemplate.pipe(structuredLlm)
  const init_info = summarizeProfilicInfo(agenda.initialNarrative)

  const prev_log = await summarizePrevThreads(agenda)

  const result = await chain.invoke({init_info: init_info, prev_log: prev_log, user_name: user_name})

  return result.actionPlan
}

export async function generateActionPlanDoc(user: IUserORM, agenda: IAgendaORM) {
  const user_name = user.name;
  const isKorean = user.isKorean;

  const systemTemplate = `
  [Context]
  The teacher is participating in a professional development session on Action Research. The system follows the AMTI (Analytics Model for Teacher Inquiry) framework as its operational backbone, heavily integrated with CAR (Canonical Action Research) quality checks.

  [Role]
  You are an Action Research Mentor guiding the teacher through explicit computational steps of practitioner inquiry.

  [Task]
  Based on the teacher's Q&A log, generate a structured Action Research Plan Document across 10 specific sub-dimensions.

  [Output Note]
  ${isKorean ? "- Output in Korean." : "- Output in English."}
  `
  const systemMessage = SystemMessagePromptTemplate.fromTemplate(systemTemplate)

  const humanTemplate = `
  <initial_information/>: {init_info}
  <previous_q&a_log/>: {prev_log}
  <user_name/>: {user_name}
  `
  const humanMessage = HumanMessagePromptTemplate.fromTemplate(humanTemplate)

  const finalPromptTemplate = ChatPromptTemplate.fromMessages([systemMessage, humanMessage])

  const actionPlanDocSchema = z.object({
    charter: z.string().describe('Charter & Researcher Agreement: Course, goals, stakeholders, data boundaries, publication targets.'),
    motivation: z.string().describe('Motivation: Why is this topic important? (Internal drive).'),
    purpose: z.string().describe('Purpose: What is the specific research goal? (Distinct from motivation).'),
    inquiryQuestion: z.string().describe('Inquiry Question: Specific, answerable research questions and sub-questions.'),
    theoryBridging: z.string().describe('Theory Bridging: Pedagogical theories and AIED/CHI publication targeting.'),
    dataAndTools: z.string().describe('Data & Tools: Evidence requirements (LMS logs, video, notes) and specific research tools (rubrics, surveys).'),
    interventionDesign: z.string().describe('Intervention Design: Structured instructional intervention plan with confounding variable control.'),
    senseMaking: z.string().describe('Sense-making: Cross-cycle data analysis and candidate pattern generation.'),
    reflection: z.string().describe('Interpretation & Reflection: Data interpretation with cognitive guardrails to avoid over-generalization.'),
    decisionMaking: z.string().describe('Decision Making: Evidence-based next cycle recommendations with risk notes.')
  })

  const structuredLlm = chatModel.withStructuredOutput(actionPlanDocSchema)
  const chain = finalPromptTemplate.pipe(structuredLlm)
  
  const init_info = summarizeProfilicInfo(agenda.initialNarrative)
  const prev_log = await summarizePrevThreads(agenda)

  const result = await chain.invoke({init_info, prev_log, user_name})
  return result
}

export async function evaluateActionPlan(actionPlanDoc: any, isKorean: boolean) {
  const systemTemplate = `
  [Role] You are an Academic Reviewer evaluating an Action Research Plan using Canonical Action Research (CAR) principles.
  [Task] Evaluate the plan for publishable rigor based on CAR quality checks (e.g., rigorous problem diagnosis, collaborative intervention, careful evaluation). Return a publication score (0-100) indicating publishable rigor and a step-by-step future timeline (3-5 steps).
  
  [Scoring Criteria (CAR Principles)]:
  1. RCA (Researcher-Client Agreement): Are stakeholders and ethical boundaries clearly defined in Charter & Motivation?
  2. CPM (Cyclical Process Model): Does the Intervention Design show a clear plan-act-observe-reflect cycle?
  3. PT (Principle of Theory): Is the classroom problem explicitly bridged to pedagogical literature in Theory Bridging?
  4. PCA (Principle of Change through Action): Does the design aim for tangible pedagogical change rather than just observation?
  5. PLR (Principle of Learning through Reflection): Does the Sense-making and Reflection section avoid over-generalization and use triangulation?
  
  Deduct points proportionally if these principles are weak or missing.
  
  ${isKorean ? "- The timeline MUST be in Korean." : "- The timeline MUST be in English."}
  `
  const finalPromptTemplate = ChatPromptTemplate.fromMessages([
    SystemMessagePromptTemplate.fromTemplate(systemTemplate),
    HumanMessagePromptTemplate.fromTemplate("Action Plan (AMTI Format): {plan}")
  ])
  
  const evaluationSchema = z.object({
    publicationScore: z.number().min(0).max(100).describe('Estimated chance of publication or CAR rigor score (0-100)'),
    futurePlan: z.array(z.string()).describe('A timeline of 3-5 practical next steps ensuring Canonical Action Research principles')
  })

  const structuredLlm = chatModel.withStructuredOutput(evaluationSchema)
  const chain = finalPromptTemplate.pipe(structuredLlm)
  const result = await chain.invoke({plan: JSON.stringify(actionPlanDoc)})
  return result
}

export async function improveActionPlanSection(sectionName: string, currentContent: string, isKorean: boolean) {
  const systemTemplate = `
  [Role] You are an Action Research Mentor helping a teacher refine a specific section of their plan. The system uses the AMTI (Analytics Model for Teacher Inquiry) framework.
  [Task] Improve the following text for the section "${sectionName}". Scaffold the teacher's inquiry by making it more explicit, actionable, and aligned with AMTI computational steps.
  ${isKorean ? "- Output in Korean." : "- Output in English."}
  `
  const finalPromptTemplate = ChatPromptTemplate.fromMessages([
    SystemMessagePromptTemplate.fromTemplate(systemTemplate),
    HumanMessagePromptTemplate.fromTemplate("Current Content: {content}")
  ])
  
  const improveSchema = z.object({
    improvedText: z.string().describe('The improved and refined text for the section aligned with AMTI principles.')
  })

  const structuredLlm = chatModel.withStructuredOutput(improveSchema)
  const chain = finalPromptTemplate.pipe(structuredLlm)
  const result = await chain.invoke({content: currentContent})
  return result.improvedText
}

export async function mapInquiryConsistency(actionPlanDoc: any, isKorean: boolean) {
  const systemTemplate = `
  [Role] You are an Academic Consistency Reviewer.
  [Task] Analyze the Action Research Plan to identify consistency gaps across the 10 dimensions (e.g., does the data actually answer the inquiry question? Is the theory bridged to the intervention?). Return a node-link mapping matrix marking strong connections and weak/missing links.
  ${isKorean ? "- Output MUST be in Korean." : "- Output MUST be in English."}
  `
  const finalPromptTemplate = ChatPromptTemplate.fromMessages([
    SystemMessagePromptTemplate.fromTemplate(systemTemplate),
    HumanMessagePromptTemplate.fromTemplate("Action Plan: {plan}")
  ])
  
  const consistencySchema = z.object({
    strongLinks: z.array(z.string()).describe('List of strongly connected elements (e.g., "Inquiry Question perfectly aligns with Data Tools").'),
    weakLinks: z.array(z.string()).describe('List of missing or weak connections that need fixing (e.g., "Theory Bridging is disconnected from Intervention Design").')
  })

  const structuredLlm = chatModel.withStructuredOutput(consistencySchema)
  const chain = finalPromptTemplate.pipe(structuredLlm)
  const result = await chain.invoke({plan: JSON.stringify(actionPlanDoc)})
  return result
}

export async function validatePeerReview(section: string, comment: string, isKorean: boolean) {
  const systemTemplate = `
  [Role] You are an AI-mediated Peer Review Validator in an Action Research community.
  [Task] Based on Canonical Action Research (CAR) principles, validate the human peer review comment for the section "${section}". Provide constructive feedback to the reviewer to ensure the review is academic, constructive, and structurally sound.
  ${isKorean ? "- Output MUST be in Korean." : "- Output MUST be in English."}
  `
  const finalPromptTemplate = ChatPromptTemplate.fromMessages([
    SystemMessagePromptTemplate.fromTemplate(systemTemplate),
    HumanMessagePromptTemplate.fromTemplate("Peer Review Comment: {comment}")
  ])
  
  const validationSchema = z.object({
    aiValidation: z.string().describe('Constructive feedback on the quality of the peer review.')
  })

  const structuredLlm = chatModel.withStructuredOutput(validationSchema)
  const chain = finalPromptTemplate.pipe(structuredLlm)
  const result = await chain.invoke({comment: comment})
  return result.aiValidation
}

export async function agenticSync(sectionName: string, currentContent: string, entireDoc: any, isKorean: boolean) {
  const systemTemplate = `
  [Role] You are a proactive, human-like Action Research Consultant (Agentic AI).
  [Context] The user is editing the "${sectionName}" section of their action research plan. 
  [Task] Your goal is to move beyond rigid chatbot prompting. Recognize the user's intent in their recent edit, and provide context-aware consultation.
  - If the text is too brief or vague, ask a specific, probing follow-up question (like a human consultant would) to help them refine it.
  - If the text lacks rigor (based on AMTI/CAR principles), gently point out the gap and suggest how to fix it.
  - If the text is solid, provide a brief encouraging approval.
  
  [Output Note]
  ${isKorean ? "- Output MUST be in Korean." : "- Output MUST be in English."}
  `
  const finalPromptTemplate = ChatPromptTemplate.fromMessages([
    SystemMessagePromptTemplate.fromTemplate(systemTemplate),
    HumanMessagePromptTemplate.fromTemplate("Current Content of {sectionName}: {content}\n\n(For context, here is the full document so far: {doc})")
  ])
  
  const syncSchema = z.object({
    type: z.enum(['question', 'feedback', 'approval']).describe('The type of your response.'),
    message: z.string().describe('Your conversational, human-like response to the user.')
  })

  const structuredLlm = chatModel.withStructuredOutput(syncSchema)
  const chain = finalPromptTemplate.pipe(structuredLlm)
  const result = await chain.invoke({
    sectionName: sectionName, 
    content: currentContent, 
    doc: JSON.stringify(entireDoc)
  })
  
  return result
}
