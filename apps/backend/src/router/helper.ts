import { Router } from "express";
import { generateHelperResponse } from "../utils/generateHelperResponse";

const router = Router();

router.post("/chat", async (req, res) => {
    try {
        console.log("Helper route hit:", req.body);
        const { coachQuestion, chatHistory, language, practiceMode } = req.body;
        
        if (!coachQuestion) {
             console.log("Missing coachQuestion");
             return res.status(400).json({ error: "coachQuestion is required" });
        }

        const reply = await generateHelperResponse(coachQuestion, chatHistory || [], language || 'en', practiceMode);
        res.json({ reply });
    } catch (err) {
        console.error("Helper route error:", err);
        res.status(500).json({ error: "Failed to generate helper response" });
    }
});

export default router;