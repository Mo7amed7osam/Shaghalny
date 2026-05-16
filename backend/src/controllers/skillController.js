const Skill = require('../models/Skill');

// Fetch all available skills
const getSkills = async (req, res) => {
    try {
        const skills = await Skill.find()
            .collation({ locale: 'en', strength: 2 })
            .sort({ name: 1 });
        res.status(200).json(skills);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching skills', error });
    }
};

const deleteSkill = async (req, res) => {
  try {
    const skill = await Skill.findByIdAndDelete(req.params.id);
    if (!skill) {
      return res.status(404).json({ message: 'Skill not found' });
    }
    return res.status(200).json({ message: 'Skill deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Error deleting skill', error });
  }
};

module.exports = {
  getSkills,
  deleteSkill,
};