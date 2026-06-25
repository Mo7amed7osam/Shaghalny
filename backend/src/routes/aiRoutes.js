const router = require("express").Router();
const axios = require("axios");
const { authenticate } = require("../middleware/auth");

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
