const mongoose = require("mongoose");
const { Schema } = mongoose;

const ContractSchema = new Schema(
  {
    jobId: {
      type: Schema.Types.ObjectId,
      ref: "Job",
      required: true,
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    proposalId: {
      type: Schema.Types.ObjectId,
      ref: "Proposal",
      required: true,
    },
    agreedBudget: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["active", "submitted", "accepted", "completed"],
      default: "active",
    },
    escrowStatus: {
      type: String,
      enum: ["held_in_escrow", "released"],
      default: "held_in_escrow",
    },
    submittedAt: {
      type: Date,
    },
    acceptedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

ContractSchema.index({ jobId: 1, studentId: 1 }, { unique: true });
module.exports = mongoose.model("Contract", ContractSchema);
