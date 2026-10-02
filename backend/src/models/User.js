const mongoose = require("mongoose");
const { Schema } = mongoose;

const VerifiedSkillSchema = new Schema({
  skill: { type: Schema.Types.ObjectId, ref: "Skill", required: true },
  score: { type: Number, required: true },
  verifiedAt: { type: Date, default: Date.now },
});

const ReviewSchema = new Schema({
  jobId: { type: Schema.Types.ObjectId, ref: "Job" },
  contractId: { type: Schema.Types.ObjectId, ref: "Contract" },
  clientName: { type: String, required: true },
  rating: { type: Number, min: 1, max: 5, required: true },
  comment: { type: String },
  jobTitle: { type: String },
  jobType: {
    type: String,
    enum: ["freelance", "internship"],
    default: "freelance",
  },
  createdAt: { type: Date, default: Date.now },
});

const UserSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["Student", "Client", "Admin"], required: true },
  verifiedSkills: { type: [VerifiedSkillSchema], default: [] },
  cvUrl: { type: String },
  profilePhotoUrl: { type: String },
  coverPhotoUrl: { type: String },
  description: { type: String },
  website: { type: String },
  companyLogoUrl: { type: String },
  isVerified: { type: Boolean, default: false },
  university: { type: String },
  portfolioLinks: { type: [String], default: [] },
  jobsCompleted: { type: Number, default: 0, min: 0 },
  reviews: { type: [ReviewSchema], default: [] },
  balance: { type: Number, default: 0, min: 0 },
});

// Export the User model
module.exports = mongoose.model("User", UserSchema);
