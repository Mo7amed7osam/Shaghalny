const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');
const { uploadTopupScreenshot } = require('../middleware/topupUpload');
const { requirePayments } = require('../middleware/payments');
const {
    getWalletBalance,
    createDemoTopUpRequest,
    createTopUpRequest,
    listTopUpRequests,
    getTopUpScreenshot,
    createWithdrawalRequest,
    listWithdrawalRequests,
} = require('../controllers/walletController');

// Balance for current user
router.get('/balance', authenticate, checkRole(['Student', 'Client']), getWalletBalance);

const handleTopupUpload = (req, res, next) => {
    uploadTopupScreenshot.single('screenshot')(req, res, (error) => {
        if (error) {
            return res.status(400).json({ message: error.message || 'Invalid screenshot upload.' });
        }
        next();
    });
};

// Client top-ups
router.post('/topups', authenticate, checkRole('Client'), requirePayments, handleTopupUpload, createTopUpRequest);
router.post('/demo-topups', authenticate, checkRole('Client'), createDemoTopUpRequest);
router.get('/topups', authenticate, checkRole('Client'), listTopUpRequests);
router.get('/topups/:id/screenshot', authenticate, checkRole(['Client', 'Admin']), getTopUpScreenshot);

// Student withdrawals
router.post('/withdrawals', authenticate, checkRole('Student'), requirePayments, createWithdrawalRequest);
router.get('/withdrawals', authenticate, checkRole('Student'), listWithdrawalRequests);

module.exports = router;
