import express from 'express';
import { assertAgendaIdParamMiddleware, RequestWithAgenda, RequestWithUser, signedInUserMiddleware } from '../middlewares';
import { AgendaItem, User } from '../../config/schema';
import { body, validationResult } from 'express-validator';
import { generateSummary, generateTitleFromNarrative, mapSummaryToQIDs, generateActionPlan, generateActionPlanDoc, evaluateActionPlan, improveActionPlanSection, mapInquiryConsistency, validatePeerReview, agenticSync } from '../../utils/summary';
import { InteractionType, SessionStatus } from '@core';
import { logInteraction } from '../../utils/logInteraction';
import themeRouter from './theme'

const router = express.Router();

/*
router.get("/all", signedInUserMiddleware, async (req: RequestWithUser, res) => {
    const uid = req.user._id
    try{
        const agendas = (await AgendaItem.find({
            uid: uid,
            deleted: {$ne: true}
        })).map(doc => doc.toJSON())
        res.status(200).send({
            agendas
        })
    }catch (err) {
        res.status(500).send(err)
    }
})*/

router.get(
  '/:aid',
  signedInUserMiddleware,
  async (req: RequestWithUser, res) => {
    const uid = req.user._id;
    const aid = req.params.aid;

    try {
      const agenda = await AgendaItem.findOne({ _id: aid, uid: uid }).populate({
        path: 'threads',
        populate: {
          path: 'questions',
        },
      });
      res.json({
        agenda: agenda.toJSON(),
      });
    } catch (ex) {
      return res
        .status(500)
        .json({ message: `Error fetching agenda data ${aid}` + ex });
    }
  }
);

router.post(
  '/new',
  signedInUserMiddleware,
  body('narrative').isString().notEmpty(),
  body('title').optional().isString(),
  async (req: RequestWithUser, res) => {
    const uid = req.user._id;

    const validationErrors = validationResult(req);
    if (validationErrors.isEmpty()) {
      // Create a new agenda item and return the object
      const initialNarrative: string = req.body.narrative;

      let title: string = req.body.title;
      if (!title) {
        title = await generateTitleFromNarrative(
          req.user,
          initialNarrative
        );
      }

      const newAgenda = await new AgendaItem({
        uid: uid,
        initialNarrative,
        title,
      }).save();

      await User.findByIdAndUpdate(uid, { $push: { agendas: newAgenda._id } });

      res.json({
        agenda: newAgenda.toJSON(),
      })
    } else {
      res.send(400).send('InvalidNarrative');
    }
  }
);

router.post(
    '/:aid/pin',
    signedInUserMiddleware,
    body('theme').exists().trim(),
    async (req: RequestWithUser, res) => {
      const updatedAgenda = await AgendaItem.findOneAndUpdate(
        {_id: req.params.aid, uid: req.user._id},
        { $addToSet: { pinnedThemes: req.body.theme } },
        { new: true }
      );

      res.json({
        pinnedThemes: updatedAgenda.pinnedThemes,
      });
    }
  );
  
  router.post(
    '/:aid/unpin',
    signedInUserMiddleware,
    body('theme').exists().trim(),
    body("intentional").exists().isBoolean().toBoolean(),
    async (req: RequestWithUser, res) => {
      const updatedAgenda = await AgendaItem.findOneAndUpdate(
        {_id: req.params.aid, uid: req.user._id},
        { $pull: { pinnedThemes: req.body.theme } },
        { new: true }
      );
  
      if(req.body.intentional){
          //This is the case when the user unpinned a theme deliberately.
      }else{
          //This is the case when the system unpinned a theme; such as when generating a thread from the theme.
      }
  
      res.json({
        pinnedThemes: updatedAgenda.pinnedThemes,
      });
    }
  );

router.post(
  '/:aid/title',
  signedInUserMiddleware,
  body('title').isString().notEmpty(),
  async (req: RequestWithUser, res) => {
    const title = req.body.title;
    const updatedAgenda = await AgendaItem.findOneAndUpdate({
        _id: req.params.aid,
        uid: req.user._id
    }, {
        title
    }, { new: true });

    if (!updatedAgenda) {
      return res.status(404).json({ error: "Agenda not found" });
    }

    res.json({
      title: updatedAgenda.title
    });
  }
);

router.post(
  '/:aid/debriefing',
  signedInUserMiddleware,
  body('debriefing').exists().trim(),
  async (req: RequestWithUser, res) => {
    const debriefing = req.body.debriefing;

    const updatedAgenda = await AgendaItem.findOneAndUpdate({
        _id: req.params.aid,
        uid: req.user._id
    }, {
        debriefing
    })

    res.json({
      debriefing: updatedAgenda.debriefing
    });
  }
);

router.put(
  '/:aid/status',
  signedInUserMiddleware,
  body('status').exists().isIn(Object.keys(SessionStatus)),
  async (req: RequestWithUser, res) => {
    const newStatus = req.body.status;

    const agenda =  await AgendaItem.findOne({
        _id: req.params.aid,
        uid: req.user._id
    })
    const oldStatus = agenda.sessionStatus

    const updateResult = await AgendaItem.updateOne({
        _id: req.params.aid,
        uid: req.user._id
    }, {
        sessionStatus: newStatus
    })

    if(updateResult.modifiedCount > 0){
        await logInteraction(
            req.user,
            req.browserSessionId,
            InteractionType.UserChangeSessionStatus,
            { from: oldStatus, to: newStatus },
            undefined,
            Date.now()
          );
    }

    res.json({
      sessionStatus: newStatus,
    });
  }
);

router.post(
  '/:aid/terminate',
  signedInUserMiddleware,
  body('debriefing').optional().isString().trim(),
  async (req: RequestWithUser, res) => {
    const timestamp = Date.now();

    const debriefing = req.body.debriefing;

    const update = {} as any

    if (req.body.debriefing !== undefined) {
      update.debriefing = debriefing;
    }

    update.sessionStatus = SessionStatus.Terminated;

    const updatedAgenda = await AgendaItem.findOneAndUpdate({_id: req.params.aid, uid: req.user._id}, update, {new: true})

    await logInteraction(
      req.user,
      req.browserSessionId,
      InteractionType.UserTerminateExploration,
      { debriefing: updatedAgenda.debriefing },
      undefined,
      timestamp
    );

    res.json({
      debriefing: updatedAgenda.debriefing,
      sessionStatus: updatedAgenda.sessionStatus,
    });
  }
);

router.post(
  '/:aid/revert_terminate',
  signedInUserMiddleware,
  async (req: RequestWithUser, res) => {
    const timestamp = Date.now();

    await AgendaItem.updateOne({_id: req.params.aid, uid: req.user._id}, {
        sessionStatus: SessionStatus.Reviewing
    })

    await logInteraction(
      req.user,
      req.browserSessionId,
      InteractionType.UserRevertTermination,
      {},
      undefined,
      timestamp
    );

    res.json({
      sessionStatus: SessionStatus.Reviewing
    });
  }
);


router.put('/:aid/summarize', assertAgendaIdParamMiddleware, async(req: RequestWithAgenda, res) => {
  const user = req.user;
  try {
    const summary = await generateSummary(req.user, req.agenda)
    const mappings = await mapSummaryToQIDs(req.agenda, summary);
    req.agenda.summaries.push(summary)
    await req.agenda.save()
    // TODO: Add log interaction data
    res.json({summaryMappings: mappings})
  } catch (err) {
    res.json({
      err: err.message
    })
  }
})

router.put('/:aid/action-plan', assertAgendaIdParamMiddleware, async(req: RequestWithAgenda, res) => {
  try {
    const actionPlan = await generateActionPlan(req.user, req.agenda)
    req.agenda.actionPlans.push(actionPlan)
    await req.agenda.save()
    res.json({ actionPlan })
  } catch (err) {
    res.json({
      err: err.message
    })
  }
})

router.put('/:aid/action-plan-doc', assertAgendaIdParamMiddleware, async(req: RequestWithAgenda, res) => {
  try {
    const doc = await generateActionPlanDoc(req.user, req.agenda)
    req.agenda.actionPlanDocument = doc as any;
    await req.agenda.save()
    res.json({ actionPlanDocument: doc })
  } catch (err) {
    res.status(500).json({ err: err.message })
  }
})

router.post('/:aid/action-plan-doc/update', assertAgendaIdParamMiddleware, async(req: RequestWithAgenda, res) => {
  try {
    const { actionPlanDocument } = req.body;
    req.agenda.actionPlanDocument = actionPlanDocument;
    await req.agenda.save()
    res.json({ actionPlanDocument: req.agenda.actionPlanDocument })
  } catch (err) {
    res.status(500).json({ err: err.message })
  }
})

router.post('/:aid/action-plan-doc/evaluate', assertAgendaIdParamMiddleware, async(req: RequestWithAgenda, res) => {
  try {
    if (!req.agenda.actionPlanDocument) {
      return res.status(400).json({ err: "No action plan document exists" })
    }
    const evaluation = await evaluateActionPlan(req.agenda.actionPlanDocument, req.user.isKorean)
    req.agenda.publicationScore = evaluation.publicationScore;
    req.agenda.futurePlan = evaluation.futurePlan;
    await req.agenda.save()
    res.json({ 
      publicationScore: evaluation.publicationScore,
      futurePlan: evaluation.futurePlan
    })
  } catch (err) {
    res.status(500).json({ err: err.message })
  }
})

router.post('/:aid/action-plan-doc/improve', assertAgendaIdParamMiddleware, async(req: RequestWithAgenda, res) => {
  try {
    const { sectionName, content } = req.body;
    const improvedText = await improveActionPlanSection(sectionName, content, req.user.isKorean)
    res.json({ improvedText })
  } catch (err) {
    res.status(500).json({ err: err.message })
  }
})

router.post('/:aid/action-plan-doc/agent-sync', assertAgendaIdParamMiddleware, async(req: RequestWithAgenda, res) => {
  try {
    const { sectionName, content, actionPlanDocument } = req.body;
    const agentResponse = await agenticSync(sectionName, content, actionPlanDocument, req.user.isKorean)
    res.json({ agentResponse })
  } catch (err) {
    res.status(500).json({ err: err.message })
  }
})

router.post('/:aid/action-plan-doc/consistency', assertAgendaIdParamMiddleware, async(req: RequestWithAgenda, res) => {
  try {
    if (!req.agenda.actionPlanDocument) {
      return res.status(400).json({ err: "No action plan document exists" })
    }
    const consistencyMap = await mapInquiryConsistency(req.agenda.actionPlanDocument, req.user.isKorean)
    res.json({ consistencyMap })
  } catch (err) {
    res.status(500).json({ err: err.message })
  }
})

router.post('/:aid/peer-review', assertAgendaIdParamMiddleware, async(req: RequestWithAgenda, res) => {
  try {
    const { section, comment } = req.body;
    // AI validates the peer review
    const aiValidation = await validatePeerReview(section, comment, req.user.isKorean);
    
    const newReview = {
      reviewerId: req.user._id.toString(), // Using current user as reviewer for demonstration
      section,
      comment,
      aiValidation,
      status: 'pending',
      createdAt: new Date()
    };
    
    if (!req.agenda.peerReviews) {
      req.agenda.peerReviews = [];
    }
    req.agenda.peerReviews.push(newReview as any);
    await req.agenda.save();
    
    res.json({ peerReview: newReview });
  } catch (err) {
    res.status(500).json({ err: err.message });
  }
})

router.delete(
  '/:aid',
  signedInUserMiddleware,
  async (req: RequestWithUser, res) => {
    const uid = req.user._id;
    const aid: string = req.params.aid;
    const updateResult = await AgendaItem.updateOne(
      {
        _id: aid,
        uid,
      },
      {
        deleted: true,
      }
    );

    if (updateResult.matchedCount == 0) {
      res.status(400).send('WrongParameter');
    } else {
      res.sendStatus(200);
    }
  }
);

router.use('/:aid/themes', assertAgendaIdParamMiddleware, themeRouter)


export default router;
