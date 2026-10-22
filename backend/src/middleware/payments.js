// Money movement needs a configured payment provider. Demo mode uses clearly
// labelled simulated credits; otherwise PAYMENTS_ENABLED must be set explicitly.
const paymentsEnabled = () => process.env.DEMO_MODE === 'true' || process.env.PAYMENTS_ENABLED === 'true';

const PAYMENTS_DISABLED_MESSAGE = 'Payments are not available yet: no payment provider is configured. No money can be added, held or withdrawn.';

const requirePayments = (req, res, next) => {
    if (paymentsEnabled()) return next();
    return res.status(503).json({ message: PAYMENTS_DISABLED_MESSAGE, code: 'PAYMENTS_DISABLED' });
};

module.exports = { paymentsEnabled, requirePayments, PAYMENTS_DISABLED_MESSAGE };
