const { respond, status, CompanionInputError } = require("./companion.service");
const { ProviderError } = require("./companion.provider");

const PROVIDER_STATUS = { not_configured: 503, quota: 503, rate_limited: 429, timeout: 504, provider_error: 502 };

const chat = async (req, res) => {
  try {
    const result = await respond({ user: req.user, body: req.body });
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof CompanionInputError) {
      return res.status(400).json({ message: error.message, code: "invalid_input" });
    }
    if (error instanceof ProviderError) {
      return res.status(PROVIDER_STATUS[error.code] || 502).json({
        message: error.message,
        code: error.code,
        retryable: error.code !== "not_configured",
      });
    }
    console.error("[companion] chat failed:", error.message);
    return res.status(500).json({ message: "The companion could not answer right now.", code: "server_error", retryable: true });
  }
};

const getStatus = (req, res) => res.status(200).json(status());

module.exports = { chat, getStatus };
