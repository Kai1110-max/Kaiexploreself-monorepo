import { ChatPromptTemplate, HumanMessagePromptTemplate, SystemMessagePromptTemplate } from "@langchain/core/prompts"
import { z } from "zod";
import { chatModel } from "../config/config";
import { IUserORM, IThreadORM, IAgendaORM } from "../config/schema";
import nunjucks from 'nunjucks'
import {summarizePrevThreads, summarizeProfilicInfo} from './summary'


const generateQuestions = async (user: IUserORM, agenda: IAgendaORM, thread: IThreadORM, opt:number=1, prevQ: Array<string>=[]) => {

  const threadLength = agenda.threads.length;
  const language = user.isKorean ? "in KOREAN": "in English"

  const systemTemplate = nunjucks.renderString(`
  [Role]
  You are an Action Research Mentor specializing in generating Socratic questions to facilitate teachers in formulating and designing Action Research in their teaching practice. 
  Per each session within the system, the teacher brings up a Theme in their teaching context that they would like to navigate about.
  
  [Task]
  Given a teacher's context and narrative, your task is to generate a list of "just ${opt}" Socratic questions and the intention of the question ${language}. 
  Try at most to follow up with the teacher's previous response (if there is any). 
  These questions should guide the teacher from finding a new action research problem, designing that action research, or implementing Action Research Theory in their field.

  [Input type and format]
  <initial_information/>: Client's initial brief introductory of difficulty, and the client's background.
  <previous_session_log>: Logs of sessions before the current session. "DO NOT" overlap with the previously selected questions!!
  <theme_of_session/>: Theme of the current session. 
  {% if prevQLen > 0 %}
    <existing_questions/>: The questions that are already provided to the users as options. Do not overlap with these existing questions. 
  {% endif %}
  `,{prevQLen: prevQ.length})

   // TODO: design prompt
  const systemMessage = SystemMessagePromptTemplate.fromTemplate(systemTemplate)

  const humanTemplate = nunjucks.renderString(`
  <initial_information/>: {init_info}
  <previous_session_log>: {prev_session_log}
  <theme_of_session/>: {theme}
  {% if prevQLen > 0 %}
    <existing_questions/>: {{ prevQ }}
  {% endif %}
  `,{prevQLen: prevQ.length, prevQ: prevQ.join(', ')})

  const humanMessage = HumanMessagePromptTemplate.fromTemplate(humanTemplate)

  const finalPromptTemplate = ChatPromptTemplate.fromMessages([
    systemMessage,
    humanMessage
  ])

  const questionSchema = z.object({
    questions: z.array(z.object({
      question: z.string().describe(`Socratic question to be provided to the user. (${language}). Use honorific ${language}. Do not overlap with previous questions`),
      intention: z.string().describe(`Therapeutic intention of asking the question to the client. (${language})`)
    }))
  })
  
  const structuredLlm = chatModel.withStructuredOutput(questionSchema)

  const chain = finalPromptTemplate.pipe(structuredLlm)
  const init_info = summarizeProfilicInfo(agenda.initialNarrative)
  
  const prev_session_log = await summarizePrevThreads(agenda, "question")
  console.log("Q: ", prev_session_log)
  const result = await chain.invoke({init_info: init_info, prev_session_log: prev_session_log, theme: thread.theme})
  return (result as any).questions;
}

export default generateQuestions;