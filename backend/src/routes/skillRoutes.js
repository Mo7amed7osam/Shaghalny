const router = require('express').Router();
const { getSkills, deleteSkill } = require('../controllers/skillController');
const { authenticate } = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');
router.get('/', getSkills);
router.delete('/:id', authenticate, checkRole(['Admin']), deleteSkill);
module.exports = router;