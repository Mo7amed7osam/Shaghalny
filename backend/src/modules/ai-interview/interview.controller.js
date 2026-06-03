const interviewService = require('./interview.service');
const Skill = require('../../models/Skill');
const InterviewSession = require('./interview.model');

const handleError = (res, error) => {
  const status = error.status || 500;
  return res.status(status).json({
    success: false,
    message: error.message || 'Unexpected server error.',
  });
};

const startInterview = async (req, res) => {
  try {
    const result = await interviewService.startInterviewSession(req.user, req.body || {});
    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const getInterviewSession = async (req, res) => {
  try {
    const result = await interviewService.getInterviewSession(req.params.sessionId, req.user);
    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const submitInterviewAnswer = async (req, res) => {
  try {
    const cameraFile = req.files?.cameraVideo?.[0] || null;
    const screenFile = req.files?.screenVideo?.[0] || null;
    const result = await interviewService.submitAnswer({
      sessionId: req.params.sessionId,
      user: req.user,
      questionId: req.body?.questionId,
      cameraFile,
      screenFile,
    });
    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const getInterviewResult = async (req, res) => {
  try {
    const result = await interviewService.getInterviewResult(req.params.sessionId, req.user);
    return res.status(200).json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

const getMyInterviewSessions = async (req, res) => {
  try {
    let sessions = await InterviewSession.find({ user: req.user.id })
      .populate('skillRef', 'name')
      .sort({ updatedAt: -1 });

    const legacySessions = sessions.filter((session) => !session.skillRef && session.skill);
    if (legacySessions.length > 0) {
      const skills = await Skill.find({
        name: { $in: legacySessions.map((session) => session.skill).filter(Boolean) },
      }).select('_id name');

      const skillMap = new Map(skills.map((skill) => [String(skill.name).toLowerCase(), skill]));

      await Promise.all(
        legacySessions.map(async (session) => {
          const matchedSkill = skillMap.get(String(session.skill).toLowerCase());
          if (!matchedSkill) return;
          session.skillRef = matchedSkill._id;
          await session.save();
        }),
      );

      sessions = await InterviewSession.find({ user: req.user.id })
        .populate('skillRef', 'name')
        .sort({ updatedAt: -1 });
    }

    return res.status(200).json(sessions);
  } catch (error) {
    return handleError(res, error);
  }
};

module.exports = {
  getInterviewResult,
  getInterviewSession,
  getMyInterviewSessions,
  startInterview,
  submitInterviewAnswer,
};
