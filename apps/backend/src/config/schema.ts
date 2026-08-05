import { IThreadBase, IUserBase, IQASetBase, SessionStatus, IUserBrowserSessionBase, IAgendaBase, RoleplayAgentType, IRoleplaySessionBase, IRoleplayMessageBase } from "@core";
import mongoose, {Schema, Document, mongo} from "mongoose";
import { InteractionType, InteractionBase } from "@core";
import * as nanoid from 'nanoid'

export function emptyStringToUndefinedConverter(value: string | undefined){
  return value === '' ? undefined : value;
}

export interface IAIGuide extends Document {
  content: string;
  rateGood?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IQASetORM extends IQASetBase, Document {
  _id: mongoose.Types.ObjectId
  tid: mongoose.Types.ObjectId
}
export interface IThreadORM extends IThreadBase, Document {
  _id: mongoose.Types.ObjectId
  questions: Array<mongoose.Types.ObjectId | IQASetORM>
  roleplaySessionId?: mongoose.Types.ObjectId | IRoleplaySessionORM
  aid: mongoose.Types.ObjectId
  theoryName?: string;
}

export interface IRoleplayMessageORM extends IRoleplayMessageBase, Document {
  _id: mongoose.Types.ObjectId;
}

export interface IRoleplaySessionORM extends IRoleplaySessionBase, Document {
  _id: mongoose.Types.ObjectId;
  messages: Array<mongoose.Types.ObjectId | IRoleplayMessageORM>;
}

export interface IAgendaORM extends IAgendaBase, Document {
  _id: mongoose.Types.ObjectId
  threads: Array<mongoose.Types.ObjectId | IThreadORM>
  uid: mongoose.Types.ObjectId
}

export interface IUserORM extends IUserBase, Document {
  _id: mongoose.Types.ObjectId
  agendas: Array<mongoose.Types.ObjectId | IAgendaORM>

  threads: Array<mongoose.Types.ObjectId | IThreadORM>
  browserSessions: Array<mongoose.Types.ObjectId | BrowserSessionORM>
}
export interface InteractionORM extends InteractionBase, Document {
  _id: mongoose.Types.ObjectId;
  metadata: Record<string, any>;
  createdAt: Date
  user: mongoose.Types.ObjectId
}

export interface BrowserSessionORM extends IUserBrowserSessionBase, Document {
  _id: mongoose.Types.ObjectId;
  interactionLogs: Array<mongoose.Types.ObjectId | InteractionORM>
}


export const AIGuideSchema = new Schema({
  content: {type: String},
  rateGood: {type: Boolean},
  createdAt: {type: Date, default: Date.now},
  updatedAt: {type: Date}
 })

AIGuideSchema.set('timestamps', true)

export const QASetSchema = new Schema({
  tid: {type: Schema.Types.ObjectId, ref: 'ThreadItem', required: true},
  question: {
    type: {
      label: {type: String},
      content: {type: String, required: true},
      description: {type: String}
    },
    required: true
  },
  selected: {type: Boolean, default: false},
  aiGuides: {
    type: [AIGuideSchema],
    default: []
  },
  keywords: {type: [String], default: []},
  response: {type: String, default: ''},
  createdAt: {type: Date, default: Date.now},
  updatedAt: {type: Date},
  selectedAt: {type: Date, default: null}
 })

QASetSchema.set('timestamps', true);
 
export const ThreadItemSchema = new Schema({
   aid: {type: Schema.Types.ObjectId, ref: 'Agenda', required: true},
   theme: {type: String, required: true},
   theoryName: {type: String, required: false},
   questions: {type: [Schema.Types.ObjectId], ref: 'QASet', required: true, default: []},
   roleplaySessionId: {type: Schema.Types.ObjectId, ref: 'RoleplaySession', required: false},
   summary: {type: String, required: false, default: undefined},
   createdAt: {type: Date, default: Date.now},
   updatedAt: {type: Date}
 });
 
ThreadItemSchema.set('timestamps', true)

export const RoleplayMessageSchema = new Schema({
  sender: { type: String, enum: Object.values(RoleplayAgentType), required: true },
  content: { type: String, required: true },
  action: { type: String },
  emotion: { type: String, enum: ['angry', 'sad', 'resistant', 'calm', 'neutral'], default: 'neutral' },
  timestamp: { type: Date, default: Date.now }
});

export const RoleplaySessionSchema = new Schema({
  tid: {type: Schema.Types.ObjectId, ref: 'ThreadItem', required: true},
  practiceMode: {type: Number, default: 3}, // 1: User=Child/AI=Novice, 2: User=Child/AI=Expert, 3: User=Parent/AI=Child
  childProfile: {type: String, required: true, default: "A child experiencing emotional distress."},
  status: {type: String, enum: ['active', 'completed'], default: 'active'},
  messages: {type: [Schema.Types.ObjectId], ref: 'RoleplayMessage', default: []},
  cachedEvaluation: { type: Schema.Types.Mixed }, // Allow storing the JSON evaluation
  createdAt: {type: Date, default: Date.now},
  updatedAt: {type: Date}
});

RoleplaySessionSchema.set('timestamps', true);

export const BrowserSessionSchema = new Schema<BrowserSessionORM>({
  localTimezone: {type: String, nullable: true, default: null},
  interactionLogs: {type: [Schema.Types.ObjectId], ref: 'Interaction', default: []},
  startedTimestamp: {type: Number, index: true, default: Date.now},
  endedTimestamp: {type: Number, nullable: true, default: null, index: true},
})

export const AgendaSchema = new Schema({
  uid: {type: Schema.Types.ObjectId, ref: 'User', required: true},
  title: {type: String, required: false, default: null, set: emptyStringToUndefinedConverter},
  initialNarrative: {type: String, required: true, minLength: 1},
  threads: {type: [Schema.Types.ObjectId], ref: 'ThreadItem', required: true, default: []},
  summaries: {type: [String], required: true, default: []},
  actionPlans: {type: [String], required: true, default: []},
  actionPlanDocument: {
    type: {
      charter: {type: String, default: ''},
      motivation: {type: String, default: ''},
      purpose: {type: String, default: ''},
      inquiryQuestion: {type: String, default: ''},
      theoryBridging: {type: String, default: ''},
      dataAndTools: {type: String, default: ''},
      interventionDesign: {type: String, default: ''},
      senseMaking: {type: String, default: ''},
      reflection: {type: String, default: ''},
      decisionMaking: {type: String, default: ''}
    },
    default: null,
    required: false
  },
  publicationScore: {type: Number, default: 0, required: false},
  futurePlan: {type: [String], default: [], required: false},
  peerReviews: {
    type: [{
      reviewerId: {type: String, required: true},
      section: {type: String, required: true},
      comment: {type: String, required: true},
      aiValidation: {type: String, required: false},
      status: {type: String, enum: ['pending', 'resolved', 'rejected'], default: 'pending'},
      createdAt: {type: Date, default: Date.now}
    }],
    default: [],
    required: false
  },
  coWriters: {type: [Schema.Types.ObjectId], ref: 'User', default: [], required: false},
  pinnedThemes: {type: [String], required: true, default: []},
  createdAt: {type: Date, default: Date.now},
  updatedAt: {type: Date},
  debriefing: {type: String, required: false, default: null, set: emptyStringToUndefinedConverter},
  sessionStatus: {type: String, enum: Object.keys(SessionStatus), default: SessionStatus.Exploring},
  deleted: {type: Boolean, required: false}
});

AgendaSchema.set('timestamps', true);
AgendaSchema.set('toJSON', {
transform: function(doc, ret, options) {
    // delete ret.passcode;
    if(ret.initialNarrative != null && ret.initialNarrative == ''){
      ret.initialNarrative = undefined
    }
    return ret;
}
})

export const UserSchema = new Schema({
    alias: {type: String, required: true, unique: true},
    name: {type: String, required: false},
    passcode: {type: String, required: true, unique: true, default: () => nanoid.customAlphabet('1234567890', 6)() },
    isKorean: {type: Boolean, required: true, default: true},

    agendas: {type: [Schema.Types.ObjectId], ref: 'AgendaItem', required: true, default: []},

    createdAt: {type: Date, default: Date.now},
    updatedAt: {type: Date},
    browserSessions: {type: [Schema.Types.ObjectId], ref: 'BrowserSession', required: true, default: []},
    didTutorial: {type: {themeBox: Boolean, explore: Boolean}, default: {themeBox: false, explore: false}}
  });
 
UserSchema.set('timestamps', true);
UserSchema.set('toJSON', {
  transform: function(doc, ret, options) {
      // delete ret.passcode;
      if(ret.initialNarrative != null && ret.initialNarrative == ''){
        ret.initialNarrative = undefined
      }
      return ret;
  }
})

const InteractionSchema = new Schema<InteractionORM>({
  user: {type: Schema.Types.ObjectId, ref: 'User', required: true},
  type: { type: String, enum: Object.values(InteractionType), required: true },
  metadata: { type: Schema.Types.Mixed, required: false},
  data: { type: Schema.Types.Mixed, required: false},
  timestamp: {type: Date, default: Date.now},
  createdAt: {type: Date, default: Date.now},
});

InteractionSchema.set('timestamps', true);

export const QASet = mongoose.model<IQASetORM>('QASet', QASetSchema)
export const ThreadItem = mongoose.model<IThreadORM>('ThreadItem', ThreadItemSchema)
export const RoleplayMessage = mongoose.model<IRoleplayMessageORM>('RoleplayMessage', RoleplayMessageSchema);
export const RoleplaySession = mongoose.model<IRoleplaySessionORM>('RoleplaySession', RoleplaySessionSchema);
export const AgendaItem = mongoose.model<IAgendaORM>('AgendaItem', AgendaSchema)
export const User = mongoose.model<IUserORM>('User', UserSchema)
export const Interaction = mongoose.model<InteractionORM>('Interaction', InteractionSchema);
export const BrowserSession = mongoose.model<BrowserSessionORM>('BrowserSession', BrowserSessionSchema)
