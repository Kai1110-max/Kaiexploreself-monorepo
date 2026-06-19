import express from 'express';
import { ThreadItem, QASet } from '../../../config/schema';
import { assertThemeIdParamMiddleward, RequestWithAgenda } from '../../middlewares';
import generateThemeSteps from '../../../utils/generateThemeSteps';
import { body, validationResult } from 'express-validator';
import questionRouter from './question'
import roleplayRouter from './roleplay'
import generateThemes from 'apps/backend/src/utils/generateThemes';

const router = express.Router();

router.post(
  '/new',
  body('theme').exists(),
  async (req: RequestWithAgenda, res) => {

    const validationErrors = validationResult(req)
    if(validationErrors.isEmpty()){
      const newThreadItem = new ThreadItem({
        aid: req.agenda._id,
        theme: req.body.theme,
      });

      const newThread = await newThreadItem.save();
      req.agenda.threads.push(newThread._id)
      await req.agenda.save()

      res.json(newThread.toJSON());
    }else{
      res.status(400).send("No valid theme in body.")
    }
  }
);



router.post('/recommendation', body('prevThemes').optional().isArray(), body('opt').optional(), async (req: RequestWithAgenda, res) => {
  const validationErrors = validationResult(req)
  
  if(validationErrors.isEmpty()){
    const prevThemes = req.body.prevThemes
    const opt = req.body.opt
    try {
      const themes = await generateThemes(req.user, req.agenda, prevThemes, opt)
      console.log(themes)
      res.json({
        themes: themes
      })
    } catch (err) {
      res.json({
        err: err.message
      })
    }
  }else{
    res.send(400).json(validationErrors.array())
  }
})

router.post('/:tid/populate', async (req: RequestWithAgenda, res) => {
  const tid = req.params.tid;
  try {
    const thread = await ThreadItem.findById(tid);
    if (thread?.questions.length == 0 || !thread.questions) {
      console.log('Generating dynamic steps for theme....');
      
      let generatedSteps;
      let theoryName;

      try {
        const generationResult = await generateThemeSteps(req.user, req.agenda, thread);
        generatedSteps = (generationResult as any).steps;
        theoryName = (generationResult as any).theoryName;
      } catch (error) {
        console.error("LLM Generation failed entirely, falling back to static steps:", error);
        theoryName = "General Problem Solving Framework";
        generatedSteps = [
          {
            label: "Step 1: Identify the Root Cause",
            description: "Understand the underlying reasons behind the teaching challenge.",
            question: "What do you think is the main root cause of this issue in your classroom?"
          },
          {
            label: "Step 2: Brainstorm Solutions",
            description: "Generate potential pedagogical interventions.",
            question: "What are 1-2 specific actions or interventions you could try to address this?"
          },
          {
            label: "Step 3: Plan for Evaluation",
            description: "Determine how to measure the success of the intervention.",
            question: "How will you know if your intervention is successful? What evidence will you collect?"
          }
        ];
      }

      const qaPromises = generatedSteps.map(async (step: any) => {
        const newQASet = new QASet({
          tid: tid,
          question: { label: step.label, content: step.question, description: step.description },
          selected: true, // ALWAYS TRUE so they are all active
        });
        return newQASet.save();
      });
      const savedQASets = await Promise.all(qaPromises);
      const qaSetIds = savedQASets.map((qa) => qa._id);

      console.log('Generated dynamic steps - ', qaSetIds);

      const updatedThread = await ThreadItem.findByIdAndUpdate(
        tid,
        { 
          $push: { questions: { $each: qaSetIds } },
          theoryName: theoryName
        },
        { new: true }
      ).populate('questions');

      console.log(updatedThread);

      return res.json({
        threadData: updatedThread,
        questions: updatedThread?.questions || savedQASets
      });
    }

    // If it's already populated, return the thread and its populated questions
    const populatedThread = await ThreadItem.findById(tid).populate('questions');
    return res.json({
      threadData: populatedThread,
      questions: populatedThread?.questions || []
    });
  } catch (err) {
    return res
      .status(500)
      .json({ message: 'Error fetching thread data' + err });
  }
});

router.use("/:tid/questions", assertThemeIdParamMiddleward, questionRouter)
router.use("/:tid/roleplay", assertThemeIdParamMiddleward, roleplayRouter)

export default router;
