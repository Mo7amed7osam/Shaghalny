const mongoose = require("mongoose");

const Job = require("../../models/Job");
const Proposal = require("../../models/Proposal");
const Skill = require("../../models/Skill");
const User = require("../../models/User");
const InterviewSession = require("./interview.model");
const {
  cleanupUploadedFile,
  persistInterviewVideo,
  toAbsolutePath,
  toPublicUploadUrl,
} = require("./media.service");
const {
  evaluateVideoAnswer,
  generateInterviewQuestions,
} = require("./ai.service");

const buildError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const isValidId = (value) => mongoose.Types.ObjectId.isValid(value);
const escapeRegex = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const average = (numbers) => {
  if (!numbers.length) {
    return null;
  }
  return Math.round(
    numbers.reduce((sum, item) => sum + item, 0) / numbers.length,
  );
};

const recommendationFromScore = (score) => {
  if (score === null || score === undefined) {
    return "needs_review";
  }
  if (score >= 70) {
    return "pass";
  }
  if (score >= 50) {
    return "needs_review";
  }
  return "fail";
};

const populateSessionQuery = (query) =>
  query
    .populate("user", "name email")
    .populate("skillRef", "name description category")
    .populate("job", "title")
    .populate("proposal", "status");

const serializeSession = (session) => ({
  sessionId: String(session._id),
  user:
    session.user && typeof session.user === "object"
      ? {
          _id: String(session.user._id),
          name: session.user.name,
          email: session.user.email,
        }
      : String(session.user),
  skill: session.skill,
  skillRef: session.skillRef
    ? {
        _id: String(session.skillRef._id),
        name: session.skillRef.name,
        description: session.skillRef.description,
        category: session.skillRef.category || "Other",
      }
    : null,
  job:
    session.job && typeof session.job === "object"
      ? { _id: String(session.job._id), title: session.job.title }
      : session.job
        ? String(session.job)
        : null,
  proposal:
    session.proposal && typeof session.proposal === "object"
      ? { _id: String(session.proposal._id), status: session.proposal.status }
      : session.proposal
        ? String(session.proposal)
        : null,
  status: session.status,
  questions: (session.questions || []).map((question) => ({
    id: question.questionId,
    text: question.text,
    order: question.order,
  })),
  answers: (session.answers || []).map((answer) => ({
    answerId: String(answer._id),
    questionId: answer.questionId,
    question: answer.questionText,
    videoUrl: answer.cameraVideoUrl || answer.videoUrl,
    cameraVideoUrl: answer.cameraVideoUrl || answer.videoUrl,
    screenVideoUrl: answer.screenVideoUrl || null,
    transcript: answer.transcript,
    processingError: answer.processingError,
    score: answer.score,
    feedback: answer.feedback,
    strengths: answer.strengths || [],
    weaknesses: answer.weaknesses || [],
    recommendation: answer.recommendation,
    evaluationSource: answer.evaluationSource,
    createdAt: answer.createdAt,
  })),
  finalScore: session.finalScore,
  finalRecommendation: session.finalRecommendation,
  reviewStatus: session.reviewStatus,
  reviewedAt: session.reviewedAt,
  createdAt: session.createdAt,
  updatedAt: session.updatedAt,
});

const assertSessionAccess = (session, user) => {
  if (!session) {
    throw buildError(404, "Interview session not found.");
  }

  if (user.role === "Admin") {
    return;
  }

  const sessionUserId =
    session.user && typeof session.user === "object" && session.user._id
      ? String(session.user._id)
      : String(session.user);

  if (sessionUserId !== String(user.id)) {
    throw buildError(403, "Not authorized to access this interview session.");
  }
};

const resolveSkillContext = async ({ skill, skillId }) => {
  if (skillId) {
    if (!isValidId(skillId)) {
      throw buildError(400, "Invalid skillId.");
    }

    const skillDoc = await Skill.findById(skillId);
    if (!skillDoc) {
      throw buildError(404, "Skill not found.");
    }

    return {
      skillName: skillDoc.name,
      skillRef: skillDoc._id,
      skillCategory: skillDoc.category || "Other",
      skillDescription: skillDoc.description || "",
    };
  }

  const skillName = String(skill || "").trim();
  if (!skillName) {
    throw buildError(400, "Skill is required.");
  }

  const skillDoc = await Skill.findOne({
    name: new RegExp(`^${escapeRegex(skillName)}$`, "i"),
  });
  return {
    skillName,
    skillRef: skillDoc?._id || null,
    skillCategory: skillDoc?.category || "Other",
    skillDescription: skillDoc?.description || "",
  };
};

const resolveOptionalLinks = async ({ userId, jobId, proposalId }) => {
  let job = null;
  let proposal = null;

  if (proposalId) {
    if (!isValidId(proposalId)) {
      throw buildError(400, "Invalid proposalId.");
    }

    proposal = await Proposal.findById(proposalId);
    if (!proposal) {
      throw buildError(404, "Proposal not found.");
    }
    if (String(proposal.studentId) !== String(userId)) {
      throw buildError(403, "Proposal does not belong to current student.");
    }
    job = proposal.jobId;
  }

  if (jobId) {
    if (!isValidId(jobId)) {
      throw buildError(400, "Invalid jobId.");
    }

    const jobDoc = await Job.findById(jobId);
    if (!jobDoc) {
      throw buildError(404, "Job not found.");
    }

    if (proposal && String(proposal.jobId) !== String(jobDoc._id)) {
      throw buildError(400, "proposalId does not match jobId.");
    }

    job = jobDoc._id;
  }

  return {
    job: job || null,
    proposal: proposal?._id || null,
  };
};

const startInterviewSession = async (user, payload) => {
  const { skillName, skillRef, skillCategory, skillDescription } =
    await resolveSkillContext(payload);
  const { job, proposal } = await resolveOptionalLinks({
    userId: user.id,
    jobId: payload.jobId,
    proposalId: payload.proposalId,
  });

  const questions = await generateInterviewQuestions(skillName, {
    category: skillCategory,
    description: skillDescription,
  });
  const session = await InterviewSession.create({
    user: user.id,
    skill: skillName,
    skillRef,
    job,
    proposal,
    status: "started",
    questions: questions.map((question, index) => ({
      questionId: String(question.id || `q${index + 1}`),
      text: question.text,
      order: Number(question.order || index + 1),
    })),
  });

  return {
    success: true,
    sessionId: String(session._id),
    questions: session.questions.map((question) => ({
      id: question.questionId,
      text: question.text,
      order: question.order,
    })),
  };
};

const getInterviewSession = async (sessionId, user) => {
  if (!isValidId(sessionId)) {
    throw buildError(400, "Invalid sessionId.");
  }

  const session = await populateSessionQuery(
    InterviewSession.findById(sessionId),
  );
  assertSessionAccess(session, user);
  return { success: true, session: serializeSession(session) };
};

const updateVerifiedSkill = async (session, score) => {
  if (!session.skillRef) {
    return;
  }

  const student = await User.findById(session.user);
  if (!student) {
    return;
  }

  const existing = student.verifiedSkills.find(
    (entry) => String(entry.skill) === String(session.skillRef),
  );

  if (existing) {
    existing.score = score;
    existing.verifiedAt = new Date();
  } else {
    student.verifiedSkills.push({
      skill: session.skillRef,
      score,
      verifiedAt: new Date(),
    });
  }

  await student.save();
};

const submitAnswer = async ({
  sessionId,
  user,
  questionId,
  cameraFile,
  screenFile,
}) => {
  if (!cameraFile) {
    throw buildError(400, "Camera video file is required.");
  }
  if (!screenFile) {
    throw buildError(400, "Screen recording file is required.");
  }
  if (!isValidId(sessionId)) {
    throw buildError(400, "Invalid sessionId.");
  }

  const normalizedQuestionId = String(questionId || "").trim();
  if (!normalizedQuestionId) {
    throw buildError(400, "questionId is required.");
  }

  const session = await InterviewSession.findById(sessionId);
  assertSessionAccess(session, user);

  if (!["started", "in_progress"].includes(session.status)) {
    throw buildError(400, "Interview session is not accepting new answers.");
  }

  const question = session.questions.find(
    (item) => item.questionId === normalizedQuestionId,
  );
  if (!question) {
    throw buildError(404, "Question not found in this interview session.");
  }

  const existingAnswer = session.answers.find(
    (item) => item.questionId === normalizedQuestionId,
  );
  if (existingAnswer) {
    throw buildError(400, "Question already answered.");
  }

  const nextQuestion = [...session.questions].sort((a, b) => a.order - b.order)[
    session.answers.length
  ];
  if (!nextQuestion || nextQuestion.questionId !== normalizedQuestionId) {
    throw buildError(400, "Questions must be answered in order.");
  }

  const skillDoc = session.skillRef
    ? await Skill.findById(session.skillRef).select("category")
    : null;

  const evaluation = await evaluateVideoAnswer({
    skill: session.skill,
    category: skillDoc?.category || "Other",
    question: question.text,
    filePath: toAbsolutePath(cameraFile),
    mimeType: cameraFile.mimetype,
    originalName: cameraFile.originalname,
  });

  const cameraVideo = await persistInterviewVideo({
    filePath: cameraFile.path,
    sessionId: String(session._id),
    questionId: question.questionId,
    kind: "camera",
  });

  const screenVideo = await persistInterviewVideo({
    filePath: screenFile.path,
    sessionId: String(session._id),
    questionId: question.questionId,
    kind: "screen",
  });

  session.answers.push({
    questionId: question.questionId,
    questionText: question.text,
    videoUrl: cameraVideo.url || toPublicUploadUrl(cameraFile),
    cameraVideoUrl: cameraVideo.url || toPublicUploadUrl(cameraFile),
    screenVideoUrl: screenVideo.url || toPublicUploadUrl(screenFile),
    cameraVideoPublicId: cameraVideo.publicId || null,
    screenVideoPublicId: screenVideo.publicId || null,
    mimeType: cameraFile.mimetype,
    transcript: evaluation.transcript,
    processingError: evaluation.processingError || null,
    score: evaluation.score,
    feedback: evaluation.feedback,
    strengths: evaluation.strengths,
    weaknesses: evaluation.weaknesses,
    recommendation: evaluation.recommendation,
    evaluationSource: evaluation.evaluationSource,
  });

  if (session.answers.length === session.questions.length) {
    session.status = "completed";

    const scores = session.answers
      .map((answer) => (typeof answer.score === "number" ? answer.score : null))
      .filter((score) => score !== null);

    const finalScore =
      scores.length === session.answers.length ? average(scores) : null;

    session.finalScore = finalScore;
    session.finalRecommendation = recommendationFromScore(finalScore);
  } else {
    session.status = "in_progress";
  }

  await session.save();

  await cleanupUploadedFile(cameraFile?.path);
  await cleanupUploadedFile(screenFile?.path);

  const createdAnswer = session.answers[session.answers.length - 1];
  return {
    success: true,
    answerId: String(createdAnswer._id),
    evaluation: {
      score: createdAnswer.score,
      feedback: createdAnswer.feedback,
      strengths: createdAnswer.strengths,
      weaknesses: createdAnswer.weaknesses,
      recommendation: createdAnswer.recommendation,
      transcript: createdAnswer.transcript,
      processingError: createdAnswer.processingError,
      evaluationSource: createdAnswer.evaluationSource,
    },
    completed: session.status === "completed",
    finalScore: session.finalScore,
    finalRecommendation: session.finalRecommendation,
  };
};

const getInterviewResult = async (sessionId, user) => {
  if (!isValidId(sessionId)) {
    throw buildError(400, "Invalid sessionId.");
  }

  const session = await populateSessionQuery(
    InterviewSession.findById(sessionId),
  );
  assertSessionAccess(session, user);

  return {
    success: true,
    sessionId: String(session._id),
    status: session.status,
    skill: session.skill,
    finalScore: session.finalScore,
    category: session.skillRef?.category || null,
    recommendation: session.finalRecommendation,
    reviewStatus: session.reviewStatus,
    answers: (session.answers || []).map((answer) => ({
      answerId: String(answer._id),
      questionId: answer.questionId,
      question: answer.questionText,
      videoUrl: answer.cameraVideoUrl || answer.videoUrl,
      cameraVideoUrl: answer.cameraVideoUrl || answer.videoUrl,
      screenVideoUrl: answer.screenVideoUrl || null,
      transcript: answer.transcript,
      processingError: answer.processingError,
      score: answer.score,
      feedback: answer.feedback,
      strengths: answer.strengths || [],
      weaknesses: answer.weaknesses || [],
      recommendation: answer.recommendation,
      evaluationSource: answer.evaluationSource,
    })),
  };
};

const reviewInterviewSession = async ({
  sessionId,
  reviewerId,
  score,
  status,
}) => {
  if (!isValidId(sessionId)) {
    throw buildError(400, "Invalid interviewId.");
  }
  if (!["pass", "fail"].includes(status)) {
    throw buildError(400, "Status must be pass or fail.");
  }

  const session = await InterviewSession.findById(sessionId);
  if (!session) {
    throw buildError(404, "Interview session not found.");
  }
  if (session.status !== "completed") {
    throw buildError(400, "Interview session is not completed yet.");
  }

  session.reviewStatus = status;
  session.reviewedBy = reviewerId;
  session.reviewedAt = new Date();

  if (score !== undefined && score !== null && score !== "") {
    const numericScore = Number(score);
    if (Number.isNaN(numericScore) || numericScore < 0 || numericScore > 100) {
      throw buildError(400, "Score must be between 0 and 100.");
    }
    session.finalScore = Math.round(numericScore);
    session.finalRecommendation = recommendationFromScore(session.finalScore);
  }

  if (
    status === "pass" &&
    (session.finalScore === null || session.finalScore === undefined)
  ) {
    throw buildError(
      400,
      "Score is required before passing interview with no AI score.",
    );
  }

  await session.save();

  if (status === "pass") {
    await updateVerifiedSkill(session, session.finalScore ?? 0);
  }

  return { success: true, interview: serializeSession(session) };
};

const listCompletedInterviewsForAdmin = async (statusFilter) => {
  const query = { status: "completed" };

  if (statusFilter === "SUBMITTED") {
    query.reviewStatus = "pending";
  } else if (statusFilter === "PASSED") {
    query.reviewStatus = "pass";
  } else if (statusFilter === "FAILED") {
    query.reviewStatus = "fail";
  }

  const sessions = await populateSessionQuery(
    InterviewSession.find(query).sort({ updatedAt: -1 }),
  );

  return sessions.map((session) => serializeSession(session));
};

module.exports = {
  getInterviewResult,
  getInterviewSession,
  listCompletedInterviewsForAdmin,
  reviewInterviewSession,
  serializeSession,
  startInterviewSession,
  submitAnswer,
};
