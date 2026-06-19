# Research Proposal: AI-Mediated Role-Play for Parent Training

## 1. Core Empirical Problem to Solve
**"How does the level of 'Agentic Realism' (AI acting as a resistant child vs. AI acting as an objective moderator) affect parents' emotional regulation and skill acquisition in simulated parenting training?"**

## 2. Background & Rationale
Current parent training programs (e.g., Parent Management Training - PMT) often rely on manual role-playing among parents. However, human-to-human simulations often lack the intense emotional realism of an actual child experiencing a tantrum. This leads to a **Skill Transfer Gap**, where parents learn theoretical skills (e.g., active listening, emotion validation) but fail to apply them in high-stress, real-world situations.

Drawing inspiration from recent CHI literature:
*   *Can LLM-Simulated Practice and Feedback Upskill Human Counselors?* demonstrates the efficacy of LLMs simulating difficult patients.
*   *AI-induced Sexual Harassment...* highlights the intense contextual and emotional reactions users have to AI personas, raising questions about psychological safety when AI behaves adversarially.

## 3. The Proposed System: Dual-Agent Architecture
We propose modifying the existing co-writing platform into a **Dual-Agent Role-Play Simulator**:
*   **Agent 1: The Simulated Child:** An LLM prompted to exhibit specific challenging behaviors (e.g., opposition, defiance, tantrums) based on psychological profiles.
*   **Agent 2: The Moderator/Coach:** An overarching LLM that analyzes the parent's textual responses to the "Child" in real-time, providing scaffolding, structural checks, and pedagogical feedback based on PMT frameworks.

## 4. Experimental Design (Empirical Study)
A between-subjects or mixed-methods experiment comparing different training paradigms:

### Conditions:
*   **Condition A (Single Moderator Agent - Baseline):** The system acts solely as a rational coach. The parent describes a scenario ("My child is crying in the store"), and the AI guides them to write an intervention plan.
*   **Condition B (Dual Agents - Immersive Role-Play):** The parent directly converses with the "Simulated Child". 
    *   *Child:* "I'm not leaving! You're a bad mom!"
    *   *(Parent types response)*
    *   *Moderator (Interrupting/Guiding):* "Your response uses rhetorical questions which may escalate the situation. Try validating their emotion first."

### Key Metrics to Measure:
1.  **Skill Acquisition & Transfer:** Pre- and post-test evaluations where experts blindly score the parents' written responses to novel child conflict scenarios based on standardized psychological rubrics.
2.  **Emotional Reactivity:** Measuring anxiety and frustration levels before, during, and after interacting with the adversarial "Child" agent (e.g., using PANAS or similar scales) to assess the psychological impact of "Agentic Realism."
3.  **Parental Self-Efficacy:** Changes in the parents' confidence in their ability to manage difficult behaviors in reality.

## 5. Significance for CHI/CSCW
This research explores a critical tension in Human-AI Interaction: designing for **Psychological Safety vs. Training Realism**. By intentionally designing an AI to be "difficult" for training purposes, we investigate how to balance adversarial interactions with supportive scaffolding, contributing novel insights to the design of AI for mental health and behavioral training.