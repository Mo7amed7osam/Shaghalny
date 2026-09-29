const mongoose = require("mongoose");
const { Schema } = mongoose;

// Create the Job schema
const JobSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    requiredSkills: {
      type: [Schema.Types.ObjectId],
      ref: "Skill",
      required: true,
    },
    budgetMin: {
      type: Number,
      min: 0,
    },
    budgetMax: {
      type: Number,
      min: 0,
    },
    duration: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      enum: ["freelance", "internship"],
      default: "freelance",
    },
    isUnpaid: {
      type: Boolean,
      default: false,
    },
    workMode: {
      type: String,
      enum: ["online", "onsite", "hybrid"],
    },
    positions: {
      type: Number,
      default: 1,
      min: 1,
    },
    positionsFilled: {
      type: Number,
      default: 0,
      min: 0,
    },
    applicants: {
      type: [Schema.Types.ObjectId],
      ref: "User",
      default: [],
    },
    employer: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    selectedStudent: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    activeContract: {
      type: Schema.Types.ObjectId,
      ref: "Contract",
      default: null,
    },
    status: {
      type: String,
      enum: ["open", "in_progress", "completed", "closed"],
      default: "open",
    },
  },
  {
    timestamps: true, // Automatically manage createdAt and updatedAt fields
  },
);

JobSchema.index({ title: "text", description: "text" });

// Export the Job model
const Job = mongoose.model("Job", JobSchema);
module.exports = Job;
