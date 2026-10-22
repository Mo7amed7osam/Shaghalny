const path = require('path');
const fs = require('fs');
const User = require('../models/User');
const TopUpRequest = require('../models/TopUpRequest');
const WithdrawalRequest = require('../models/WithdrawalRequest');
const { paymentsEnabled } = require('../middleware/payments');

const getWalletBalance = async (req, res) => {
    try {
        const user = await User.findById(req.user?.id).select('balance role');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const demoMode = process.env.DEMO_MODE === 'true';
        const payload = { balance: Number(user.balance || 0), demoMode, paymentsEnabled: paymentsEnabled() };
        if (user.role === 'Client') {
            payload.instapayReceiver = demoMode || !payload.paymentsEnabled ? '' : process.env.INSTAPAY_RECEIVER_NUMBER || '';
        }

        res.status(200).json(payload);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching balance', error });
    }
};

const createDemoTopUpRequest = async (req, res) => {
    if (process.env.DEMO_MODE !== 'true') return res.status(404).json({ message: 'Not found' });
    const amount = Number(req.body?.amount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 100000) {
        return res.status(400).json({ message: 'Demo amount must be between 0 and 100,000 credits.' });
    }
    try {
        const topup = await TopUpRequest.create({
            clientId: req.user.id, amount, screenshotPath: 'assets/demo-payment.svg',
            note: 'DEMO ONLY — simulated top-up. No real transfer or receipt.',
        });
        return res.status(201).json(topup);
    } catch {
        return res.status(500).json({ message: 'Could not create demo top-up.' });
    }
};

const createTopUpRequest = async (req, res) => {
    try {
        const amountValue = Number(req.body?.amount);
        if (!Number.isFinite(amountValue) || amountValue <= 0) {
            return res.status(400).json({ message: 'Amount must be a positive number.' });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'Screenshot is required.' });
        }

        const relativePath = path.join('private', 'topups', req.file.filename);

        const topup = new TopUpRequest({
            clientId: req.user?.id,
            amount: amountValue,
            screenshotPath: relativePath,
            note: req.body?.note,
        });
        await topup.save();

        res.status(201).json(topup);
    } catch (error) {
        res.status(500).json({ message: 'Error submitting top-up request', error });
    }
};

const listTopUpRequests = async (req, res) => {
    try {
        const topups = await TopUpRequest.find({ clientId: req.user?.id })
            .sort({ createdAt: -1 });
        res.status(200).json(topups);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching top-up requests', error });
    }
};

const getTopUpScreenshot = async (req, res) => {
    try {
        const topup = await TopUpRequest.findById(req.params.id);
        if (!topup) {
            return res.status(404).json({ message: 'Top-up request not found' });
        }

        const isAdmin = req.user?.role === 'Admin';
        const isOwner = topup.clientId.toString() === req.user?.id;
        if (!isAdmin && !isOwner) {
            return res.status(403).json({ message: 'Not authorized to view this screenshot' });
        }

        const absolutePath = path.join(__dirname, '../../', topup.screenshotPath);
        if (!fs.existsSync(absolutePath)) {
            return res.status(404).json({ message: 'Screenshot not found' });
        }

        res.sendFile(absolutePath);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching screenshot', error });
    }
};

const createWithdrawalRequest = async (req, res) => {
    try {
        const amountValue = Number(req.body?.amount);
        if (!Number.isFinite(amountValue) || amountValue <= 0) {
            return res.status(400).json({ message: 'Amount must be a positive number.' });
        }

        const student = await User.findById(req.user?.id).select('balance');
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        const currentBalance = Number(student.balance || 0);
        if (amountValue > currentBalance) {
            return res.status(400).json({ message: 'Withdrawal amount exceeds available balance.' });
        }

        const bankAccount = (req.body?.bankAccount || '').trim();
        const instapayHandle = (req.body?.instapayHandle || '').trim();
        if (!bankAccount && !instapayHandle) {
            return res.status(400).json({ message: 'Provide bank account or Instapay handle.' });
        }

        const payoutMethod = bankAccount ? 'BANK' : 'INSTAPAY';

        const withdrawal = new WithdrawalRequest({
            studentId: req.user?.id,
            amount: amountValue,
            payoutMethod,
            bankAccount: bankAccount || undefined,
            instapayHandle: instapayHandle || undefined,
            note: req.body?.note,
        });
        await withdrawal.save();

        res.status(201).json(withdrawal);
    } catch (error) {
        res.status(500).json({ message: 'Error submitting withdrawal request', error });
    }
};

const listWithdrawalRequests = async (req, res) => {
    try {
        const withdrawals = await WithdrawalRequest.find({ studentId: req.user?.id })
            .sort({ createdAt: -1 });
        res.status(200).json(withdrawals);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching withdrawal requests', error });
    }
};

module.exports = {
    createDemoTopUpRequest,
    getWalletBalance,
    createTopUpRequest,
    listTopUpRequests,
    getTopUpScreenshot,
    createWithdrawalRequest,
    listWithdrawalRequests,
};
