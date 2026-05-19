# AI-Mediated Action Research Platform: System Architecture & Theoretical Framework

This document outlines the core principles, logical architecture, and functional mechanics of the AI-Mediated Action Research Platform. It is designed to serve as a comprehensive reference for educational researchers, faculty trainers, and technical maintainers.

---

## 1. Executive Summary & Core Vision
The platform is designed to support faculty in a transnational Sino-British university to conduct rigorous action research. Moving beyond traditional "chatbot-style" generic prompting, this system acts as an **Agentic Academic Consultant**. It pairs human academic judgement with AI scaffolding to transform broad teaching concerns into workable, publication-ready study designs (targeting AIED/CHI standards).

---

## 2. The Three-Layered Theoretical Framework
To balance user accessibility with academic rigor, the system eschews a single off-the-shelf model in favor of a customized three-layered architecture:

### Layer 1: The User Experience (UX) Layer - Kemmis/Mertler Cycle
*   **Purpose:** To lower the cognitive barrier for disciplinary experts who may be new to action research.
*   **Implementation:** The complex computational steps are hidden behind a simplified, classic Action Research cycle presented in the UI:
    *   **Phase 1: Plan** (Identifying the issue, reviewing theory, planning data).
    *   **Phase 2: Act** (Designing the intervention).
    *   **Phase 3: Observe & Reflect** (Sense-making, reflecting, and deciding on future actions).

### Layer 2: The Computational Engine - AMTI (Analytics Model for Teacher Inquiry)
*   **Purpose:** To serve as the operational backbone. AMTI is exceptionally well-suited for AI because it turns abstract teacher inquiry into explicit, discrete computational steps.
*   **Implementation:** The system's data model and AI prompt chains are divided into 10 structured AMTI-aligned sub-modules:
    1.  `Charter & Researcher Agreement`
    2.  `Motivation` (The underlying drive)
    3.  `Purpose` (Specific research aim)
    4.  `Inquiry Question` (Formulating answerable questions)
    5.  `Theory Bridging` (Connecting to pedagogical literature)
    6.  `Data & Tools` (Planning evidence collection)
    7.  `Intervention Design` (Structuring the change)
    8.  `Sense Making` (Finding patterns in data)
    9.  `Reflection` (Evaluating the outcomes)
    10. `Decision Making` (Planning the next cycle)

### Layer 3: The Quality Assurance Layer - CAR (Canonical Action Research)
*   **Purpose:** To quietly enforce publishable rigor in the background.
*   **Implementation:** The AI agents are instructed to evaluate the teacher's input against the 5 Principles of CAR (Davison et al., 2004):
    *   **RCA (Researcher-Client Agreement):** Checked in Step 1 (Charter). Ensuring boundaries and ethical targets are set.
    *   **CPM (Cyclical Process Model):** Checked via the "Inquiry Consistency Map" to ensure Plan -> Act -> Reflect loops logically.
    *   **PT (Principle of Theory):** Enforced in Step 5. AI demands theoretical justification for interventions.
    *   **PCA (Principle of Change through Action):** Evaluated in the final "Publication Rigor Score".
    *   **PLR (Principle of Learning through Reflection):** AI acts as a guardrail against over-generalization during Step 9.

---

## 3. Agentic AI & Human-AI Collaboration Mechanics
To achieve true "Agentic AI" (Interactivity, Bounded Autonomy, and Adaptability), the platform implements the following features:

### 3.1. Live Collaborative Document (Non-linear Workflow)
Teachers do not just "chat" with the AI. The main interface is a structured, editable **Live Action Plan Document**. Teachers can jump to any section (e.g., refining an intervention without working through the whole process from the start). 

### 3.2. Bounded Autonomy & Silent Agentic Sync
*   **Mechanism:** When a teacher edits a text box and pauses for a few seconds, an invisible "Agentic Sync" is triggered. 
*   **Action:** The `CAR Reviewer Agent` reads the new edits, compares them against the global persistent memory (the rest of the document), and decides if an intervention is needed.
*   **Output:** The UI displays a dynamic feedback card:
    *   🔵 **Questioning (Intent Recognition):** If the input is too vague, the AI acts like a human consultant and asks follow-up questions (e.g., *"How exactly will you measure student engagement?"*).
    *   🟡 **Feedback:** Highlights methodological risks.
    *   🟢 **Approval:** Validates rigorous academic writing.

### 3.3. Inquiry Consistency Mapping (Visual Analytics)
An AI Orchestrator evaluates the 10 AMTI steps holistically to generate a visual matrix. It identifies:
*   `[Good] Strong Links:` (e.g., The data collection tool perfectly answers the inquiry question).
*   `[Fix] Weak Links:` (e.g., A theory is mentioned, but the intervention design completely ignores it).

### 3.4. Export & Report Generation
Once the Action Plan reaches a publishable standard, teachers can export the live document into standard offline formats.
*   **Export as Word (.doc):** Generates an editable Microsoft Word document for further formatting, local sharing, or institutional submission.
*   **Export as PDF:** Renders a clean, print-ready PDF version of the document, stripping away UI elements (buttons, chat history) to produce a finalized, immutable report.

---

## 4. User Guide: Step-by-Step Workflow
This section outlines the standard operating procedure for teachers using the app to conduct action research.

### Step 1: Secure Registration & Login
1. Navigate to the platform URL.
2. Select the **Register** tab. Enter your Name/Alias (for report attribution), set a **Passcode** (your key to access the system), and input the **Invite Secret Code** (e.g., `ACTION2026`).
3. Once registered, you will use *only your Passcode* to log in for all future sessions.

### Step 2: Project Scoping & Socratic Chat
1. Upon logging in, interact with the AI Consultant in the left-hand chat panel.
2. Describe your teaching context or a specific classroom challenge (e.g., *"My students are disengaged during 8 AM lectures."*).
3. The AI will ask Socratic follow-up questions to help you narrow down the scope and identify root causes.

### Step 3: Generating the Initial Action Plan
1. Once the problem is sufficiently explored, click the **"Regenerate Document"** button.
2. The AI will synthesize your chat history and populate the 10-step **Live Action Research Document** on the right side of the screen.

### Step 4: Non-Linear Co-Writing & Agentic Feedback
1. The document is divided into three navigable phases: **Plan**, **Act**, and **Observe & Reflect**.
2. **Direct Editing:** You can directly edit the text in any of the 10 AMTI modules. You do not need to go in order.
3. **Agentic Sync:** When you stop typing for 3 seconds, the AI silently reviews your edits. Look for the dynamic feedback card below the text box:
   * 🔵 **Question:** The AI prompts you for more specific details to meet CAR standards.
   * 🟡 **Feedback:** The AI warns you of methodological risks.
   * 🟢 **Approval:** The AI validates your rigorous academic writing.
4. **✨ Ask AI to Improve:** If you are stuck on a specific section, click this button to have the AI academically refine just that specific text block without altering the rest of your document.

### Step 5: Evaluation & Peer Review (CIDA)
1. **Evaluate Publication Chance:** Click this button to generate a rigorous academic score (0-100) based on CAR principles.
2. **Inquiry Consistency Map:** Review the generated diagnostic tags (e.g., `[Good]` or `[Fix]`) on the right sidebar to ensure your Research Questions, Interventions, and Data Collection methods align logically.
3. **Critical Friend Reviews:** Invite colleagues to review your plan. They can leave specific comments under each of the 10 modules. The AI will attach a "Structural Check" to their feedback to ensure it is academically constructive.

### Step 6: Exporting the Final Document
1. Click the **Export** button with the download icon.
2. Choose either **Export as Word (.doc)** for further editing or **Export as PDF** for a clean, print-ready submission.

---

## 5. CIDA Collaborative Framework (Community Extension)
To elevate the tool from a personal assistant to a community infrastructure, the system implements the **Critical Friend Peer Review** module:
*   **Peer Reviews:** Colleagues can leave targeted comments on specific modules (e.g., criticizing the Intervention Design).
*   **AI-Mediated Validation:** When a peer submits a review, the AI evaluates the review itself against CAR principles, attaching an "AI Structural Check" badge. This ensures community feedback remains academically constructive.

---

## 6. Technical Specifications & Deployment
*   **Tech Stack:** React (Frontend), Node.js/Express (Backend), MongoDB Atlas (Persistent Database).
*   **LLM Integration:** LangChain orchestrates `ChatZhipuAI` (ChatGLM) for structured JSON outputs and agentic reasoning.
*   **Security & Access:** 
    *   Passcode-only authentication (inherited design to lower login friction and protect privacy).
    *   Registration requires a `Secret Invite Code` to prevent unauthorized quota usage during beta testing.
*   **Deployment:** Fully containerized (`Dockerfile`) and currently deployed on Render.com as a monolithic Web Service, bypassing CORS issues by serving frontend static files via the Express backend.

---
*Document generated for Action Research Experts and System Maintainers.*