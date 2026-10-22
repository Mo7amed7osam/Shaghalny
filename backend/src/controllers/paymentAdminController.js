const mongoose = require('mongoose');
const User = require('../models/User');
const TopUpRequest = require('../models/TopUpRequest');
const WithdrawalRequest = require('../models/WithdrawalRequest');
const Transaction = require('../models/Transaction');

const normalizeStatus = (status) => {
    const value = (status || '').toString().toUpperCase();
    if (['PENDING', 'APPROVED', 'DECLINED'].includes(value)) {
        return value;
    }
    return '';
};

const listTopUps = async (req, res) => {
    try {
        const status = normalizeStatus(req.query.status);
        const query = status ? { status } : {};
        const topups = await TopUpRequest.find(query)
            .populate('clientId', 'name email profilePhotoUrl companyLogoUrl')
            .populate('adminId', 'name email')
            .sort({ createdAt: -1 });
        res.status(200).json(topups);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching top-ups', error });
    }
};

const approveTopUp = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const topup = await TopUpRequest.findById(req.params.id).session(session);
        if (!topup) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: 'Top-up request not found' });
        }
        if (topup.status !== 'PENDING') {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: 'Top-up request already processed' });
        }

        const client = await User.findById(topup.clientId).session(session);
        if (!client) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: 'Client not found' });
        }

        const currentBalance = Number(client.balance || 0);
        client.balance = currentBalance + topup.amount;
        await client.save({ session });

        topup.status = 'APPROVED';
        topup.adminId = req.user?.id;
        topup.processedAt = new Date();
        await topup.save({ session });

        const transaction = new Transaction({
            toUserId: client._id,
            amount: topup.amount,
            type: 'TOPUP_APPROVED',
            relatedRequestId: topup._id,
        });
        await transaction.save({ session });

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({ message: 'Top-up approved', topup });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        res.status(500).json({ message: 'Error approving top-up', error });
    }
};

const declineTopUp = async (req, res) => {
    try {
        const topup = await TopUpRequest.findById(req.params.id);
        if (!topup) {
            return res.status(404).json({ message: 'Top-up request not found' });
        }
        if (topup.status !== 'PENDING') {
            return res.status(400).json({ message: 'Top-up request already processed' });
        }

        topup.status = 'DECLINED';
        topup.adminId = req.user?.id;
        topup.decisionReason = req.body?.reason || '';
        topup.processedAt = new Date();
        await topup.save();

        res.status(200).json({ message: 'Top-up declined', topup });
    } catch (error) {
        res.status(500).json({ message: 'Error declining top-up', error });
    }
};

const listWithdrawals = async (req, res) => {
    try {
        const status = normalizeStatus(req.query.status);
        const query = status ? { status } : {};
        const withdrawals = await WithdrawalRequest.find(query)
            .populate('studentId', 'name email profilePhotoUrl')
            .populate('adminId', 'name email')
            .sort({ createdAt: -1 });
        res.status(200).json(withdrawals);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching withdrawals', error });
    }
};

const approveWithdrawal = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const withdrawal = await WithdrawalRequest.findById(req.params.id).session(session);
        if (!withdrawal) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: 'Withdrawal request not found' });
        }
        if (withdrawal.status !== 'PENDING') {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: 'Withdrawal request already processed' });
        }

        const student = await User.findById(withdrawal.studentId).session(session);
        if (!student) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: 'Student not found' });
        }

        const currentBalance = Number(student.balance || 0);
        if (withdrawal.amount > currentBalance) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: 'Insufficient student balance for withdrawal' });
        }

        student.balance = currentBalance - withdrawal.amount;
        await student.save({ session });

        withdrawal.status = 'APPROVED';
        withdrawal.adminId = req.user?.id;
        withdrawal.processedAt = new Date();
        await withdrawal.save({ session });

        const transaction = new Transaction({
            fromUserId: student._id,
            amount: withdrawal.amount,
            type: 'WITHDRAWAL_APPROVED',
            relatedRequestId: withdrawal._id,
        });
        await transaction.save({ session });

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({ message: 'Withdrawal approved', withdrawal });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        res.status(500).json({ message: 'Error approving withdrawal', error });
    }
};

const declineWithdrawal = async (req, res) => {
    try {
        const withdrawal = await WithdrawalRequest.findById(req.params.id);
        if (!withdrawal) {
            return res.status(404).json({ message: 'Withdrawal request not found' });
        }
        if (withdrawal.status !== 'PENDING') {
            return res.status(400).json({ message: 'Withdrawal request already processed' });
        }

        withdrawal.status = 'DECLINED';
        withdrawal.adminId = req.user?.id;
        withdrawal.decisionReason = req.body?.reason || '';
        withdrawal.processedAt = new Date();
        await withdrawal.save();

        res.status(200).json({ message: 'Withdrawal declined', withdrawal });
    } catch (error) {
        res.status(500).json({ message: 'Error declining withdrawal', error });
    }
};

module.exports = {
    listTopUps,
    approveTopUp,
    declineTopUp,
    listWithdrawals,
    approveWithdrawal,
    declineWithdrawal,
};
