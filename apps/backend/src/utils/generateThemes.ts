import {ChatPromptTemplate, HumanMessagePromptTemplate} from "@langchain/core/prompts"
import {SystemMessage} from "@langchain/core/messages"
import {z} from "zod";
import { chatModel } from '../config/config';
import nunjucks from 'nunjucks'
import { IUserORM, IAgendaORM, ThreadItem } from '../config/schema';
import {summarizePrevThreads, summarizeProfilicInfo} from './summary'

async function generateThemes(user: IUserORM, agenda: IAgendaORM, prev_themes: Array<string> = [], opt: number=1): Promise<any> {

  const threads = await ThreadItem.find({aid: agenda._id})

  const themeList = threads.map(item => item.theme)

  const pinnedThemes = agenda.pinnedThemes
  const language = user.isKorean ? "in KOREAN": "in English"
  
  const system_message = nunjucks.renderString(`
  [Role] You are an Action Research Mentor helping teachers in multiple disciplines learn how to do Action Research (research that involves teaching improvement) starting from finding a new action research problem to be implemented, to designing that action research, as well as implementing Action Research Theory in the teacher's field. Your approach is encouraging, educational, and rooted in the principles of Action Research. 

  [Task] 
  Your primary task is to identify new Action Research themes/topics "${language}" for the teacher to explore/navigate, based on their initial problem statement or previous responses. 
  These themes should serve as potential areas for teaching improvement, action research design, and implementation. 
  Ensure that these new themes align closely with the teacher's context, discipline, and the specific teaching challenges they described. 

  [Caution]
  When the teacher expresses confusion or difficulty in formulating a research problem, your role is to generate themes that encourage exploration of their teaching practices "without altering the teacher's original context". 
  Focus on prompting the teacher to delve into the underlying pedagogical challenges and potential interventions. 
  When appropriate, introduce phrasing that prompts the teacher to reflect on why they use certain teaching methods or how they can measure improvement.
  For example, when a teacher says 'My students are not engaged', you might elicit themes such as 'understanding the root causes of student disengagement', or 'exploring active learning strategies to boost engagement'. 

  Avoid imposing research topics that might stray from the teacher's own experiences or field. 
  It is crucial to remain in sync with the teacher's context. 
  Use the teacher's terminology when proposing new themes, ensuring that your suggestions resonate with their specific classroom situation. 
  When appropriate, introduce Action Research terminology or pedagogical concepts that might provide additional educational value, but always anchor these in the teacher's original phrasing and context.


  [Input type and format]
  <initial_information/>: Client’s initial brief introductory of difficulty narrative, and the client’s background.
  {% if threadLength > 0 %}
    <previous_session_log>: Logs of sessions before the current session. “DO NOT” overlap with the previously selected themes.
  {% endif %}
  {% if pinnedLength > 0 %}
    <already_pinned_themes>: The themes that the user has already selected. “DO NOT” overlap with the previously selected themes.
  {% endif %}

    [Output]
    Produce a list of ${opt} themes based on the provided input. If no additional themes can be reasonably elicited, return an empty themes array instead of returning overlapping themes. 
    Ensure that new themes "DO NOT" overlap with previously selected ones, focusing instead on unique aspects of the client’s ongoing narrative. 
  `,{threadLength: themeList.length, pinnedLength: pinnedThemes.length})


  const systemMessage = new SystemMessage(system_message);

  const humanTemplate = nunjucks.renderString(`
  <initial_information> : {init_info}\n
  {% if threadLength > 0 %}
    <previous_session_log>: {prev_log}
  {% endif %}
  {% if pinnedLength > 0 %}
    <already_pinned_themes>: {pinned_themes}
  {% endif %}
  `, {threadLength: themeList.length, pinnedLength: pinnedThemes.length})


  const humanMessage = HumanMessagePromptTemplate.fromTemplate(humanTemplate)


  const edgeSchema = z.object({
    themes: z.array(z.object({
      main_theme: z.string().describe(`Each theme from the user's initial narrative and previous log. (${language}). Align closely with the user's language, expressions.`),
      expressions: z.array(z.string()).describe(`An array of diverse different expressions of the main_theme (${language}). When appropriate, introduce metaphoric expressions or nuanced language that might provide additional therapeutic value, but always anchor these in the client’s original phrasing and emotional context.`),
      quote: z.string().describe("Most relevant part of the user's log to the theme")
    }))
  })

  const finalPromptTemplate = ChatPromptTemplate.fromMessages([
    systemMessage,
    humanMessage
  ])

  const structuredLlm = chatModel.withStructuredOutput(edgeSchema);

  const chain = finalPromptTemplate.pipe(structuredLlm);
  const init_info = summarizeProfilicInfo(agenda.initialNarrative)
  const prev_session_log = await summarizePrevThreads(agenda)

  const result = await chain.invoke({init_info: init_info, prev_log: prev_session_log, pinned_themes: themeList.concat(pinnedThemes).concat(prev_themes).join(', ')});

  return (result as any).themes;
} 

export default generateThemes;