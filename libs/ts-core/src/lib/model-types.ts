export enum InteractionType {

  UserStartsBrowserSession = "UserStartsBrowswerSession",
  UserEndsBrowserSession = "UserEndsBrowswerSession",

  LLMElicitedTheme = 'LLMElicitedTheme', // O
  UserRequestExpression = 'UserRequestExpression', // O
  UserPinsTheme = 'UserPinsTheme', //  O 
  UserUnpinsTheme = 'UserUnpinsTheme', // O
  UserSelectsTheme = 'UserSelectsTheme', // O
  UserAddsTheme = 'UserAddsTheme', // O
  UserRequestsTheme = 'UserRequestsTheme',
  UserRequestsQuestion='UserRequestsQuestion', // O
  UserSelectsQuestion = 'UserSelectsQuestion', // O
  UserFocusQuestion = "UserFocusQuestion",
  UserBlurQuestion = "UserBlurQuestion",
  UpdateInResponse = 'UpdateInResponse', // O
  ImportKeyword='ImportKeyword',
  LLMGeneratedKeyword = 'LLMGeneratedKeyword', // O

  UserToggleKeywords = "UserToggleKeywords",

  UserRequestsSummary = 'UserRequestsSummary',
  UserChangeSessionStatus = "UserChangeSessionStatus",
  UserTerminateExploration = "UserTerminateExploration",
  UserRevertTermination = "UserRevertTermination"
}

export interface InteractionBase {
  type: InteractionType;
  metadata?: Record<string, any> | {};
  data?: Record<string, any> | {};
  timestamp?: Date
}

export interface InteractionObj extends InteractionBase{
  _id: string
}

export interface IAIGuide {
  content: string;
  rateGood?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IQASetBase {
  question: {label?: string; content: string; description?: string},
  keywords: string[],
  selected: boolean,
  response: string,
  aiGuides: IAIGuide[];
  createdAt?: Date;
  updatedAt?: Date;
  selectedAt?: Date;
}


export interface IQASetWithIds extends IQASetBase {
  _id: string,
  tid: string
}

export interface IThreadBase {
  theme: string;
  summary?: string;
  theoryName?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IThreadWithQuestionIds extends IThreadBase {
  _id: string,
  questions: Array<string>,
  roleplaySessionId?: string,
  aid: string
}


export interface IThreadAllPopulated extends IThreadBase {
  _id: string,
  questions: Array<IQASetWithIds>,
  roleplaySession?: IRoleplaySessionPopulated,
  aid: string
}

export enum RoleplayAgentType {
  Child = 'child',
  Moderator = 'moderator',
  Parent = 'parent'
}

export interface IRoleplayMessageBase {
  sender: RoleplayAgentType;
  content: string;
  action?: string;
  emotion?: 'angry' | 'sad' | 'resistant' | 'calm' | 'neutral';
  ambient_weather?: 'stormy' | 'neutral' | 'sunny';
  timestamp: Date;
}

export interface IRoleplayMessageObj extends IRoleplayMessageBase {
  _id: string;
}

export interface IRoleplaySessionBase {
  tid: string; // Thread ID
  practiceMode?: number;
  childProfile: string; // e.g. "7 year old, prone to tantrums"
  status: 'active' | 'completed';
  cachedEvaluation?: IRoleplayEvaluation; // Add this to store the evaluation
  createdAt: Date;
  updatedAt: Date;
}

export interface IRoleplaySessionPopulated extends IRoleplaySessionBase {
  _id: string;
  messages: Array<IRoleplayMessageObj>;
}

export interface IRoleplayEvaluation {
  score: number;
  passed?: boolean;
  stepScores?: { stepName: string; score: number; feedback: string }[];
  strengths: string[];
  improvements: string[];
  coachMessage: string;
}

export enum SessionStatus{
  Exploring = "Exploring", 
  Reviewing = "Reviewing",
  Terminated = "Terminated"
}


export interface IActionPlanDocument {
  charter: string; // 探究章程与研究者协议 (Charter & Researcher Agreement)
  motivation: string; // 动机 (Motivation)
  purpose: string; // 目的 (Purpose - separated from motivation)
  inquiryQuestion: string; // 探究问题 (Inquiry Question)
  theoryBridging: string; // 理论桥接 (Theory Bridging & Publication Targeting)
  dataAndTools: string; // 数据与工具 (Data & Tools Requirements)
  interventionDesign: string; // 干预设计 (Intervention Design)
  senseMaking: string; // 意义建构 (Sense Making)
  reflection: string; // 解读与反思 (Interpretation & Reflection)
  decisionMaking: string; // 决策与下一步 (Decision Making & Next Cycle)
}

export interface IPeerReview {
  reviewerId: string; // The ID of the "Critical Friend"
  section: keyof IActionPlanDocument; // The section being reviewed
  comment: string; // The actual review content
  aiValidation?: string; // AI-mediated structural check of the review
  status: 'pending' | 'resolved' | 'rejected';
  createdAt: Date;
}

export interface IAgendaBase {
  title: string | undefined;
  initialNarrative: string;
  pinnedThemes: Array<string>
  summaries: string[];
  actionPlans?: string[];
  actionPlanDocument?: IActionPlanDocument;
  publicationScore?: number;
  futurePlan?: string[];
  peerReviews?: IPeerReview[];
  coWriters?: string[]; // Array of User IDs allowed to co-write this document
  createdAt: Date;
  updatedAt: Date;
  debriefing: string | undefined;
  sessionStatus: SessionStatus;
}

export interface IAgendaWithThemeIds extends IAgendaBase {
  _id: string,
  threads: Array<string>
}

export interface IAgendaAllPopulated extends IAgendaBase {
  _id: string,
  threads: Array<IThreadAllPopulated>
}

export interface IUserBase {
  alias: string;
  passcode: string;
  name?: string | undefined;
  isKorean: boolean;
  createdAt: Date;
  updatedAt: Date;
  didTutorial: {themeBox: boolean, explore: boolean};
}

export interface IUserWithAgendaIds extends IUserBase {
  _id: string,
  agendas: Array<string>
}

export interface IUserWithAgendaPopulated extends IUserBase {
  _id: string,
  agendas: Array<IAgendaWithThemeIds>
}

export interface IUserAllPopulated extends IUserBase {
  _id: string,
  threads: Array<IThreadAllPopulated>
  browserSessions: Array<IUserBrowserSessionObj>
}

export interface ThemeWithExpressions {
  expressions: string[];
  main_theme: string;
  quote: string;
}

export interface IUserBrowserSessionBase {
  localTimezone: string
  startedTimestamp: number
  endedTimestamp?: number
}

export interface IUserBrowserSessionObj extends IUserBrowserSessionBase {
  _id: string
  interactionLogs: Array<InteractionBase>
}

export interface IDidTutorial {
  themeBox: boolean;
  explore: boolean;
};

export interface IMappedSummarySentence{
  sentence: string
  qids: Array<string>
}