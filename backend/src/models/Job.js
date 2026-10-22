const mongoose = require("mongoose");
const { Schema } = mongoose;

// Create the Job schema
const JobSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    isDemo: { type: Boolean, default: false },
    location: { type: String, trim: true, maxlength: 240 },
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
      required: function () { return this.sourceType !== "external"; },
    },
    sourceType: { type: String, enum: ["internal", "external"], default: "internal" },
    category: { type: String, trim: true, maxlength: 30 },
    sourceName: { type: String, enum: require("../utils/externalJobs").SOURCE_NAMES },
    sourceId: { type: String },
    sourceUrl: { type: String },
    sourceApplyUrl: { type: String },
    sourceEmploymentType: { type: String },
    sourceCompensation: { type: String },
    sourceExpiresAt: { type: Date },
    sourceLinkCheckedAt: { type: Date },
    sourceLinkStatus: { type: Number },
    sourceCompanyName: { type: String },
    sourceLocation: { type: String },
    sourceTags: { type: [String], default: [] },
    sourcePublishedAt: { type: Date },
    sourceLastSeenAt: { type: Date },
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
JobSchema.index(
  { sourceName: 1, sourceId: 1 },
  { unique: true, partialFilterExpression: { sourceType: "external" } },
);

JobSchema.pre("validate", function () {
  if (this.sourceType !== "external") return;
  const { isSourceUrl, isApplyUrl } = require("../utils/externalJobs");
  for (const field of ["sourceName", "sourceId", "sourceCompanyName", "sourceLastSeenAt"]) {
    if (!this[field]) this.invalidate(field, `${field} is required for imported jobs.`);
  }
  if (!isSourceUrl(this.sourceUrl, this.sourceName)) this.invalidate("sourceUrl", "Invalid original listing URL.");
  if (this.sourceApplyUrl && !isApplyUrl(this.sourceApplyUrl)) this.invalidate("sourceApplyUrl", "Invalid application URL.");
  if (this.employer) this.invalidate("employer", "External employers are not Shaghalny client accounts.");
});

// Export the Job model
const Job = mongoose.model("Job", JobSchema);
module.exports = Job;
