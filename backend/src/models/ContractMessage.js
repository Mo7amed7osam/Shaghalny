const mongoose = require("mongoose");
const { Schema } = mongoose;

const ContractMessageSchema = new Schema(
  {
    contractId: {
      type: Schema.Types.ObjectId,
      ref: "Contract",
      required: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    senderRole: {
      type: String,
      enum: ["Client", "Student"],
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

ContractMessageSchema.index({ contractId: 1, createdAt: 1 });

module.exports = mongoose.model("ContractMessage", ContractMessageSchema);
