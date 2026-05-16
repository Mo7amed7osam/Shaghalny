const router = require('express').Router();

const { authenticate } = require('../../middleware/auth');
const { checkRole } = require('../../middleware/roleCheck');
const { upload } = require('../../middleware/uploadMiddleware');
const {
  getInterviewResult,
  getInterviewSession,
  getMyInterviewSessions,
  startInterview,
  submitInterviewAnswer,
} = require('./interview.controller');
router.post('/start', authenticate, checkRole(['Student']), startInterview);
router.get('/:sessionId', authenticate, checkRole(['Student', 'Admin']), getInterviewSession);
router.post(
  '/:sessionId/answer',
  authenticate,
  checkRole(['Student']),
  upload.fields([
    { name: 'cameraVideo', maxCount: 1 },
    { name: 'screenVideo', maxCount: 1 },
  ]),
  submitInterviewAnswer
);
router.get('/:sessionId/result', authenticate, checkRole(['Student', 'Admin']), getInterviewResult);
router.get('/my/sessions', authenticate, checkRole(['Student']), getMyInterviewSessions);
module.exports = router;
