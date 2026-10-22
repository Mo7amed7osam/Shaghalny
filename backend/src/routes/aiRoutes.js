const router = require("express").Router();
const axios = require("axios");
const { authenticate } = require("../middleware/auth");
const { checkRole } = require("../middleware/roleCheck");
const Skill = require("../models/Skill");

const OPENROUTER_MODEL =
  process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";

const stripDecorativeCharacters = (text = "") =>
  text
    .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}\uFE0F]/gu, "")
    .replace(/[^\S\r\n]+$/gm, "")
    .trim();

router.post("/improve-text", authenticate, async (req, res) => {
  try {
    const { text, jobTitle } = req.body;
    if (!text) {
      return res.status(400).json({ message: "Text is required" });
    }

    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: OPENROUTER_MODEL,
        max_tokens: 300,
        messages: [
          {
            role: "user",
            content: `Improve this cover letter for a "${jobTitle}" job. Make it professional, concise, and compelling. Return only the improved text, nothing else:\n\n${text}`,
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      },
    );

    const improved =
      response.data?.choices?.[0]?.message?.content?.trim() || text;
    return res.status(200).json({ improved });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "AI improvement failed", error: error.message });
  }
});
router.post("/career-roadmap", authenticate, async (req, res) => {
  try {
    const { goal } = req.body;
    if (!goal) {
      return res.status(400).json({ message: "Goal is required" });
    }

    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: OPENROUTER_MODEL,
        max_tokens: 800,
        messages: [
          {
            role: "user",
            content: `You are a career advisor for Egyptian university students who want to work as freelancers.
          
The student's goal: "${goal}"

Generate a clear, structured career roadmap including exactly these sections:
1. Required Skills (list them)
2. Step-by-step Learning Path (3-6 months plan)
3. Recommended Projects to build
4. Tips for getting first freelance job

Rules:
- Use simple English.
- Return plain text only.
- Do not use emojis.
- Do not add a title before section 1.
- Do not use markdown bold, decorative symbols, or introductory sentences.
- Start directly with: "1. Required Skills"
- Keep the output practical, short, and suitable for a university student.`,
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 45000,
      },
    );

    const roadmap = stripDecorativeCharacters(
      response.data?.choices?.[0]?.message?.content?.trim() || "",
    );
    return res.status(200).json({ roadmap });
  } catch (error) {
    console.error(
      "CAREER ROADMAP ERROR:",
      error.response?.data || error.message,
    );
    return res
      .status(500)
      .json({ message: "Failed to generate roadmap", error: error.message });
  }
});
// Drafts a full job post from a one-line idea. Skills are limited to the
// platform taxonomy; budgets are suggestions the client must review.
router.post("/job-brief", authenticate, checkRole("Client"), async (req, res) => {
  const idea = typeof req.body?.idea === "string" ? req.body.idea.trim() : "";
  if (idea.length < 8 || idea.length > 500) {
    return res.status(400).json({ message: "Describe the job in 8 to 500 characters." });
  }
  if (!process.env.OPENROUTER_API_KEY) {
    return res.status(503).json({ message: "AI writer is not configured." });
  }
  try {
    const skills = await Skill.find().select("name category").lean();
    const skillNames = skills.map((skill) => skill.name);
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: OPENROUTER_MODEL,
        max_tokens: 700,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `You write clear job posts for Shaghalny, an Egyptian marketplace where clients hire university students.
Return only a JSON object with these keys:
- "title": short job title, max 70 characters
- "description": 80-160 words: goal, deliverables as short lines starting with "- ", and what the student will receive or learn. Plain text, no markdown headings, no emojis.
- "skills": 1-4 names chosen ONLY from this list: ${JSON.stringify(skillNames)}
- "type": "freelance" or "internship"
- "budgetMin" and "budgetMax": realistic EGP amounts for Egyptian student freelancers (numbers), or null for an unpaid internship
- "duration": e.g. "1 week", "2 weeks", "1 month"
Never invent facts about the client.`,
          },
          { role: "user", content: idea },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 45000,
      },
    );
    const raw = response.data?.choices?.[0]?.message?.content || "";
    const parsed = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
    const byName = new Map(skills.map((skill) => [skill.name.toLowerCase(), skill]));
    const matchedSkills = (Array.isArray(parsed.skills) ? parsed.skills : [])
      .map((name) => byName.get(String(name).toLowerCase()))
      .filter(Boolean)
      .slice(0, 4)
      .map((skill) => ({ _id: skill._id, name: skill.name, category: skill.category }));
    const money = (value) => (Number.isFinite(Number(value)) && Number(value) >= 0 ? Math.round(Number(value)) : null);
    let budgetMin = money(parsed.budgetMin);
    let budgetMax = money(parsed.budgetMax);
    if (budgetMin !== null && budgetMax !== null && budgetMin > budgetMax) [budgetMin, budgetMax] = [budgetMax, budgetMin];
    const brief = {
      title: stripDecorativeCharacters(String(parsed.title || "")).slice(0, 80),
      description: stripDecorativeCharacters(String(parsed.description || "")).slice(0, 3000),
      skills: matchedSkills,
      type: parsed.type === "internship" ? "internship" : "freelance",
      budgetMin,
      budgetMax,
      duration: String(parsed.duration || "").slice(0, 40),
    };
    if (brief.title.length < 3 || brief.description.length < 20) throw new Error("Incomplete draft");
    return res.status(200).json(brief);
  } catch (error) {
    console.error("JOB BRIEF ERROR:", error.response?.data?.error?.message || error.message);
    return res.status(502).json({ message: "The AI writer could not draft this job. Please try again." });
  }
});

router.post("/match-score", authenticate, async (req, res) => {
  try {
    const { proposal, job } = req.body;
    const reqSkills = (job?.requiredSkills || []).map((s) => s._id || s);
    const verSkills = (proposal?.studentId?.verifiedSkills || []).map(
      (s) => s.skill?._id || s.skill,
    );

    const skillsMatch =
      reqSkills.length > 0
        ? (verSkills.filter((s) => reqSkills.includes(s)).length /
            reqSkills.length) *
          40
        : 0;

    const interviewScore =
      (proposal?.studentId?.verifiedSkills || []).reduce(
        (acc, s) => acc + (s.score || 0),
        0,
      ) / Math.max((proposal?.studentId?.verifiedSkills || []).length, 1);
    const normalizedInterviewScore = (interviewScore / 100) * 30;

    const proposalScore = proposal?.details?.length > 100 ? 20 : 10;
    const portfolioScore =
      proposal?.studentId?.portfolioLinks?.length > 0 ? 10 : 0;

    const score = Math.min(
      Math.round(
        skillsMatch + normalizedInterviewScore + proposalScore + portfolioScore,
      ),
      100,
    );

    return res.status(200).json({ score });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to calculate match score",
      error: error.message,
    });
  }
});
module.exports = router;
