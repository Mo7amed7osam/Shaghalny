const mongoose = require("mongoose");
const Contract = require("../models/Contract");
const ContractMessage = require("../models/ContractMessage");
const WorkSubmission = require("../models/WorkSubmission");
const Escrow = require("../models/Escrow");
const Transaction = require("../models/Transaction");
const Job = require("../models/Job");
const User = require("../models/User");

const getContract = async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id)
      .populate(
        "jobId",
        "title status type isUnpaid workMode budgetMin budgetMax duration",
      )
      .populate("clientId", "name email")
      .populate("studentId", "name email");
    if (!contract) {
      return res.status(404).json({ message: "Contract not found" });
    }

    if (
      req.user?.role !== "Admin" &&
      contract.clientId?._id.toString() !== req.user?.id &&
      contract.studentId?._id.toString() !== req.user?.id
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to view this contract" });
    }

    const submissions = await WorkSubmission.find({
      contractId: contract._id,
    }).sort({ createdAt: -1 });

    const messages = await ContractMessage.find({
      contractId: contract._id,
    }).sort({ createdAt: 1 });

    res.status(200).json({ contract, submissions, messages });
  } catch (error) {
    res.status(500).json({ message: "Error fetching contract", error });
  }
};
const listContracts = async (req, res) => {
  try {
    const status = (req.query.status || "").toString().toLowerCase();
    const query = {};

    if (req.user?.role === "Client") {
      query.clientId = req.user?.id;
    } else if (req.user?.role === "Student") {
      query.studentId = req.user?.id;
    }

    if (status) {
      query.status = status;
    }

    const contracts = await Contract.find(query)
      .populate("jobId", "title status type isUnpaid")
      .populate("clientId", "name email")
      .populate("studentId", "name email")
      .sort({ updatedAt: -1 });

    res.status(200).json(contracts);
  } catch (error) {
    res.status(500).json({ message: "Error fetching contracts", error });
  }
};

const submitWork = async (req, res) => {
  try {
    const { message, links, attachments } = req.body;
    const contract = await Contract.findById(req.params.id);
    if (!contract) {
      return res.status(404).json({ message: "Contract not found" });
    }
    if (contract.studentId.toString() !== req.user?.id) {
      return res
        .status(403)
        .json({ message: "Not authorized to submit work for this contract" });
    }
    if (!["active", "submitted"].includes(contract.status)) {
      return res
        .status(400)
        .json({ message: "Contract is not accepting submissions" });
    }
    if (!message || !message.trim()) {
      return res
        .status(400)
        .json({ message: "Submission message is required" });
    }

    const normalizeList = (value) => {
      if (Array.isArray(value)) {
        return value.map((item) => item.toString().trim()).filter(Boolean);
      }
      if (typeof value === "string") {
        return value
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean);
      }
      return [];
    };

    const submission = new WorkSubmission({
      contractId: contract._id,
      studentId: contract.studentId,
      message: message.trim(),
      links: normalizeList(links),
      attachments: normalizeList(attachments),
    });
    await submission.save();

    contract.status = "submitted";
    contract.submittedAt = new Date();
    await contract.save();

    res
      .status(201)
      .json({ message: "Work submitted successfully", submission });
  } catch (error) {
    res.status(500).json({ message: "Error submitting work", error });
  }
};

const requestChanges = async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id);
    if (!contract) {
      return res.status(404).json({ message: "Contract not found" });
    }
    if (contract.clientId.toString() !== req.user?.id) {
      return res
        .status(403)
        .json({ message: "Not authorized to update this contract" });
    }
    if (contract.status !== "submitted") {
      return res
        .status(400)
        .json({ message: "Contract is not in a submitted state" });
    }

    contract.status = "active";
    await contract.save();

    res.status(200).json({ message: "Changes requested", contract });
  } catch (error) {
    res.status(500).json({ message: "Error requesting changes", error });
  }
};

const acceptWork = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const contract = await Contract.findById(req.params.id).session(session);
    if (!contract) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Contract not found" });
    }
    if (contract.clientId.toString() !== req.user?.id) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(403)
        .json({ message: "Not authorized to accept this work" });
    }
    if (contract.status !== "submitted") {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json({ message: "Contract is not in a submitted state" });
    }

    // العقد unpaid (انترنشيب): مفيش escrow ولا فلوس
    const isUnpaidContract = Number(contract.agreedBudget) === 0;

    let escrow = null;
    if (!isUnpaidContract) {
      escrow = await Escrow.findOne({ contractId: contract._id }).session(
        session,
      );
      if (!escrow) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({ message: "Escrow record not found" });
      }
      if (escrow.status !== "held_in_escrow") {
        await session.abortTransaction();
        session.endSession();
        return res
          .status(400)
          .json({ message: "Escrow already released for this contract" });
      }
    }

    const student = await User.findById(contract.studentId).session(session);
    if (!student) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Student not found" });
    }

    if (escrow) {
      escrow.status = "released";
      escrow.releasedAt = new Date();
      await escrow.save({ session });
    }

    contract.status = "completed";
    contract.acceptedAt = new Date();
    contract.completedAt = new Date();
    contract.escrowStatus = "released";
    await contract.save({ session });

    const job = await Job.findById(contract.jobId).session(session);
    if (job) {
      // الوظيفة تتقفل بس لو كل المقاعد اتملت وكل العقود خلصت
      const totalPositions = job.positions || 1;
      const allFilled =
        totalPositions === 1 || (job.positionsFilled || 0) >= totalPositions;
      const otherOpenContracts = await Contract.countDocuments({
        jobId: job._id,
        _id: { $ne: contract._id },
        status: { $ne: "completed" },
      }).session(session);
      if (allFilled && otherOpenContracts === 0) {
        job.status = "completed";
        await job.save({ session });
      }
    }

    if (escrow) {
      student.balance = Number(student.balance || 0) + escrow.amount;
    }
    student.jobsCompleted = (student.jobsCompleted || 0) + 1;
    await student.save({ session });

    if (escrow) {
      const transaction = new Transaction({
        fromUserId: contract.clientId,
        toUserId: contract.studentId,
        amount: escrow.amount,
        type: "ESCROW_RELEASE",
        contractId: contract._id,
      });
      await transaction.save({ session });
    }

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      message: isUnpaidContract
        ? "Internship work accepted"
        : "Work accepted and funds released",
      contract,
      escrow,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ message: "Error accepting work", error });
  }
};
const submitReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const contract = await Contract.findById(req.params.id).populate(
      "jobId",
      "title type",
    );
    if (!contract) {
      return res.status(404).json({ message: "Contract not found" });
    }
    if (contract.clientId.toString() !== req.user?.id) {
      return res
        .status(403)
        .json({ message: "Not authorized to review this contract" });
    }
    if (
      contract.status !== "completed" ||
      contract.escrowStatus !== "released"
    ) {
      return res
        .status(400)
        .json({ message: "Contract must be completed before review" });
    }

    const ratingValue = Number(rating);
    if (!Number.isFinite(ratingValue) || ratingValue < 1 || ratingValue > 5) {
      return res
        .status(400)
        .json({ message: "Rating must be between 1 and 5." });
    }

    const student = await User.findById(contract.studentId);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const existingReview = (student.reviews || []).find(
      (review) => review.contractId?.toString() === contract._id.toString(),
    );
    if (existingReview) {
      return res
        .status(400)
        .json({ message: "Review already submitted for this contract." });
    }

    const client = await User.findById(req.user?.id).select("name");
    student.reviews = student.reviews || [];
    student.reviews.push({
      jobId: contract.jobId?._id,
      contractId: contract._id,
      jobTitle: contract.jobId?.title,
      jobType: contract.jobId?.type || "freelance",
      clientName: client?.name || "Client",
      rating: ratingValue,
      comment,
      createdAt: new Date(),
    });
    student.jobsCompleted = Math.max(
      student.jobsCompleted || 0,
      student.reviews.length,
    );
    await student.save();

    res.status(201).json({ message: "Review submitted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error submitting review", error });
  }
};

const sendMessage = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ message: "Message text is required" });
    }

    const contract = await Contract.findById(req.params.id);
    if (!contract) {
      return res.status(404).json({ message: "Contract not found" });
    }

    const isClientOnContract = contract.clientId.toString() === req.user?.id;
    const isStudentOnContract = contract.studentId.toString() === req.user?.id;
    if (!isClientOnContract && !isStudentOnContract) {
      return res
        .status(403)
        .json({ message: "Not authorized to message on this contract" });
    }

    const newMessage = new ContractMessage({
      contractId: contract._id,
      senderId: req.user?.id,
      senderRole: isClientOnContract ? "Client" : "Student",
      message: message.trim(),
    });
    await newMessage.save();

    res.status(201).json({ message: "Message sent", data: newMessage });
  } catch (error) {
    res.status(500).json({ message: "Error sending message", error });
  }
};

module.exports = {
  getContract,
  listContracts,
  submitWork,
  acceptWork,
  requestChanges,
  submitReview,
  sendMessage,
};
