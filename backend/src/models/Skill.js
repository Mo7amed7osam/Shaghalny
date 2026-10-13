const mongoose = require("mongoose");
const { Schema } = mongoose;

const SKILL_CATEGORIES = [
  "Programming",
  "Design",
  "Business",
  "Engineering",
  "Media",
  "Other",
];

const SkillSchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  description: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    trim: true,
    maxlength: 30,
    default: "Other",
    index: true,
  },
});

const Skill = mongoose.model("Skill", SkillSchema);
Skill.CATEGORIES = SKILL_CATEGORIES;

module.exports = Skill;
