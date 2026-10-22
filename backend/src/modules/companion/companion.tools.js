const User = require("../../models/User");
const { searchJobsForStudent, getJobForStudent } = require("./companion.jobs");

// Pages the companion may link to. The frontend maps these keys to routes;
// the model can only pick from this list.
const PAGES = ["jobs", "profile", "skill_verification", "career_roadmap", "dashboard", "contracts", "interview_history"];

const OBJECT_ID = /^[a-fA-F0-9]{24}$/;

/**
 * Allowlisted tools. `params` is the strict schema used both to describe the
 * tool to the model and to validate its arguments; unknown keys are rejected so
 * a model can never smuggle in identities such as a user id.
 */
const TOOL_SPECS = {
  search_jobs: {
    description:
      "Search open Shaghalny job listings (internal marketplace projects and imported external listings) for the signed-in student. Leave query empty to search by the student's verified skills.",
    params: {
      query: { type: "string", maxLength: 100, description: "Keywords such as a skill or role, e.g. 'react frontend'." },
      type: { type: "string", enum: ["freelance", "internship"] },
      work_mode: { type: "string", enum: ["online", "onsite", "hybrid"] },
      source: { type: "string", enum: ["internal", "external", "any"] },
      limit: { type: "integer", minimum: 1, maximum: 6 },
    },
  },
  get_my_profile: {
    description: "Get the signed-in student's profile summary: verified skills with scores, university, bio, portfolio links.",
    params: {},
  },
  get_job_details: {
    description: "Get one open job's details by its id (from search_jobs results).",
    params: { job_id: { type: "string", pattern: "objectId", required: true } },
  },
  get_skill_requirements: {
    description: "List a job's required skills and which of them the student has verified on Shaghalny.",
    params: { job_id: { type: "string", pattern: "objectId", required: true } },
  },
  suggest_page: {
    description: "Offer the student a button that opens an existing Shaghalny page.",
    params: { page: { type: "string", enum: PAGES, required: true } },
  },
};

class ToolArgumentError extends Error {}

const validateArgs = (name, rawArgs) => {
  const spec = TOOL_SPECS[name];
  if (!spec) throw new ToolArgumentError(`Unknown tool: ${String(name).slice(0, 40)}`);

  let args = rawArgs;
  if (typeof args === "string") {
    try {
      args = args.trim() ? JSON.parse(args) : {};
    } catch {
      throw new ToolArgumentError("Arguments must be a JSON object.");
    }
  }
  if (args === null || args === undefined) args = {};
  if (typeof args !== "object" || Array.isArray(args)) throw new ToolArgumentError("Arguments must be a JSON object.");

  const clean = {};
  for (const key of Object.keys(args)) {
    if (!Object.hasOwn(spec.params, key)) throw new ToolArgumentError(`Unexpected argument: ${key.slice(0, 40)}`);
  }
  for (const [key, rule] of Object.entries(spec.params)) {
    const value = args[key];
    if (value === undefined || value === null || value === "") {
      if (rule.required) throw new ToolArgumentError(`Missing argument: ${key}`);
      continue;
    }
    if (rule.type === "string") {
      if (typeof value !== "string") throw new ToolArgumentError(`${key} must be a string.`);
      const trimmed = value.trim();
      if (rule.maxLength && trimmed.length > rule.maxLength) throw new ToolArgumentError(`${key} is too long.`);
      if (rule.enum && !rule.enum.includes(trimmed)) throw new ToolArgumentError(`${key} must be one of: ${rule.enum.join(", ")}`);
      if (rule.pattern === "objectId" && !OBJECT_ID.test(trimmed)) throw new ToolArgumentError(`${key} is not a valid id.`);
      clean[key] = trimmed;
    } else if (rule.type === "integer") {
      if (!Number.isInteger(value) || value < rule.minimum || value > rule.maximum) {
        throw new ToolArgumentError(`${key} must be an integer from ${rule.minimum} to ${rule.maximum}.`);
      }
      clean[key] = value;
    }
  }
  return clean;
};

// OpenAI-compatible function declarations (OpenRouter `tools` parameter).
const toolDeclarations = () =>
  Object.entries(TOOL_SPECS).map(([name, spec]) => ({
    type: "function",
    function: {
      name,
      description: spec.description,
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: Object.fromEntries(
          Object.entries(spec.params).map(([key, rule]) => {
            const { required, pattern, ...schema } = rule;
            return [key, pattern === "objectId" ? { ...schema, description: "24-character job id" } : schema];
          }),
        ),
        required: Object.entries(spec.params).filter(([, r]) => r.required).map(([k]) => k),
      },
    },
  }));

/** Minimal profile for prompts: no email, password, balance or payment data. */
const loadStudent = async (userId) =>
  User.findOne({ _id: userId, role: "Student" })
    .select("name university description portfolioLinks verifiedSkills cvUrl jobsCompleted reviews.rating")
    .populate("verifiedSkills.skill", "name category");

const profileSummary = (student) => {
  const ratings = (student.reviews || []).map((r) => r.rating).filter(Number.isFinite);
  return {
    firstName: String(student.name || "").split(/\s+/)[0] || null,
    university: student.university || null,
    bio: student.description ? String(student.description).slice(0, 600) : null,
    verifiedSkills: (student.verifiedSkills || [])
      .filter((v) => v.skill && v.skill.name)
      .map((v) => ({ name: v.skill.name, category: v.skill.category || null, score: v.score })),
    portfolioLinks: (student.portfolioLinks || []).slice(0, 5).map((l) => String(l).slice(0, 200)),
    hasUploadedCv: Boolean(student.cvUrl),
    jobsCompleted: student.jobsCompleted || 0,
    reviewCount: ratings.length,
    averageRating: ratings.length ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : null,
    note: "Only verifiedSkills are verified by Shaghalny. Skills the student mentions in chat are self-reported.",
  };
};

/**
 * Executes one validated tool call for the authenticated student in `ctx`.
 * `ctx.user` always comes from the verified session, never from arguments.
 * Side effects are limited to collecting cards/actions for the response.
 */
const executeTool = async (name, rawArgs, ctx) => {
  if (ctx.user?.role !== "Student") throw new ToolArgumentError("Only students can use the companion.");
  const args = validateArgs(name, rawArgs);
  const student = await ctx.getStudent();
  if (!student) throw new ToolArgumentError("Student profile not found.");

  switch (name) {
    case "search_jobs": {
      const result = await searchJobsForStudent(student, {
        query: args.query,
        type: args.type,
        workMode: args.work_mode,
        source: args.source,
        limit: args.limit,
      });
      ctx.addCards(result.jobs);
      return result;
    }
    case "get_my_profile":
      return profileSummary(student);
    case "get_job_details": {
      const job = await getJobForStudent(student, args.job_id);
      if (!job) return { error: "Job not found or no longer open." };
      ctx.addCards([job.card]);
      return job;
    }
    case "get_skill_requirements": {
      const job = await getJobForStudent(student, args.job_id);
      if (!job) return { error: "Job not found or no longer open." };
      return {
        jobId: job.card.id,
        title: job.card.title,
        sourceType: job.card.sourceType,
        requiredSkills: job.card.requiredSkills,
        missingVerifiedSkills: job.card.missingVerifiedSkills,
        verificationRule:
          job.card.sourceType === "internal"
            ? "Internal jobs accept proposals only when every required skill is verified. Skills are verified through an AI video interview on the Skill Verification page; a reviewer makes the final decision."
            : "External listings are applied to on the source site; Shaghalny verification is not required there.",
      };
    }
    case "suggest_page":
      ctx.addAction(args.page);
      return { ok: true, page: args.page };
    default:
      throw new ToolArgumentError("Unknown tool.");
  }
};

module.exports = {
  TOOL_SPECS,
  PAGES,
  ToolArgumentError,
  validateArgs,
  toolDeclarations,
  executeTool,
  loadStudent,
  profileSummary,
};
