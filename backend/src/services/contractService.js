const mongoose = require("mongoose");
const Proposal = require("../models/Proposal");
const Job = require("../models/Job");
const User = require("../models/User");
const Contract = require("../models/Contract");
const Escrow = require("../models/Escrow");
const Transaction = require("../models/Transaction");

const acceptProposalWithEscrow = async ({
  proposalId,
  clientId,
  agreedBudget,
}) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const proposal = await Proposal.findById(proposalId).session(session);
    if (!proposal) {
      const error = new Error("Proposal not found");
      error.status = 404;
      throw error;
    }
    if (!["submitted", "shortlisted", "pending"].includes(proposal.status)) {
      const error = new Error("Proposal is not eligible for acceptance");
      error.status = 400;
      throw error;
    }

    const job = await Job.findById(proposal.jobId).session(session);
    if (!job) {
      const error = new Error("Job not found");
      error.status = 404;
      throw error;
    }
    if (job.employer.toString() !== clientId) {
      const error = new Error(
        "Not authorized to accept proposals for this job",
      );
      error.status = 403;
      throw error;
    }
    if (job.status !== "open") {
      const error = new Error("Job is not open for acceptance");
      error.status = 400;
      throw error;
    }

    const totalPositions = job.positions || 1;
    const filledPositions = job.positionsFilled || 0;
    if (filledPositions >= totalPositions) {
      const error = new Error(
        "All positions for this job have already been filled",
      );
      error.status = 400;
      throw error;
    }

    const alreadyHired = await Contract.findOne({
      jobId: job._id,
      studentId: proposal.studentId,
    }).session(session);
    if (alreadyHired) {
      const error = new Error(
        "This student already has a contract for this job",
      );
      error.status = 400;
      throw error;
    }

    const isUnpaidInternship =
      job.type === "internship" && job.isUnpaid === true;

    let contract;
    let escrow = null;

    if (isUnpaidInternship) {
      // انترنشيب unpaid: من غير رصيد ولا escrow ولا transaction
      contract = new Contract({
        jobId: job._id,
        clientId,
        studentId: proposal.studentId,
        proposalId: proposal._id,
        agreedBudget: 0,
        status: "active",
        escrowStatus: "released",
      });
      await contract.save({ session });
    } else {
      let budgetValue =
        agreedBudget !== undefined ? Number(agreedBudget) : undefined;
      if (budgetValue === undefined || Number.isNaN(budgetValue)) {
        budgetValue = proposal.proposedBudget ?? job.budgetMax ?? job.budgetMin;
      }
      if (
        budgetValue === undefined ||
        !Number.isFinite(budgetValue) ||
        budgetValue <= 0
      ) {
        const error = new Error(
          "Agreed budget must be provided to accept a proposal",
        );
        error.status = 400;
        throw error;
      }

      const client = await User.findById(clientId).session(session);
      if (!client) {
        const error = new Error("Client not found");
        error.status = 404;
        throw error;
      }
      const currentBalance = Number(client.balance || 0);
      if (currentBalance < budgetValue) {
        const error = new Error("Insufficient client balance to hold escrow");
        error.status = 400;
        throw error;
      }

      contract = new Contract({
        jobId: job._id,
        clientId,
        studentId: proposal.studentId,
        proposalId: proposal._id,
        agreedBudget: budgetValue,
        status: "active",
        escrowStatus: "held_in_escrow",
      });
      await contract.save({ session });

      escrow = new Escrow({
        contractId: contract._id,
        clientId,
        studentId: proposal.studentId,
        amount: budgetValue,
        status: "held_in_escrow",
      });
      await escrow.save({ session });

      client.balance = currentBalance - budgetValue;
      await client.save({ session });

      const transaction = new Transaction({
        fromUserId: client._id,
        toUserId: proposal.studentId,
        amount: budgetValue,
        type: "ESCROW_HOLD",
        contractId: contract._id,
      });
      await transaction.save({ session });
    }
    proposal.status = "accepted";
    await proposal.save({ session });

    job.positionsFilled = filledPositions + 1;
    job.selectedStudent = proposal.studentId;
    job.activeContract = contract._id;

    if (job.positionsFilled >= totalPositions) {
      job.status = "in_progress";
      await Proposal.updateMany(
        {
          jobId: job._id,
          status: { $in: ["submitted", "shortlisted", "pending"] },
        },
        { status: "rejected" },
        { session },
      );
    }

    await job.save({ session });
    await session.commitTransaction();
    session.endSession();

    return {
      message: isUnpaidInternship
        ? "Intern accepted successfully"
        : "Proposal accepted and escrow held successfully",
      contract,
      escrow,
    };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

module.exports = {
  acceptProposalWithEscrow,
};
