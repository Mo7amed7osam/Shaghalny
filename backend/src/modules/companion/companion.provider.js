// Provider selection for Shaghol only. COMPANION_PROVIDER picks the backend
// ("gemini" by default, or "openrouter"); there is no automatic switch to
// another provider. Gemini retries on its fallback models when out of quota;
// anything still failing goes to the demo fallback.
// API keys stay server-side and are never logged.

class ProviderError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code; // not_configured | quota | rate_limited | timeout | provider_error
  }
}

const PROVIDERS = ["gemini", "openrouter"];

const providerName = () => {
  const name = String(process.env.COMPANION_PROVIDER || "gemini").trim().toLowerCase();
  return PROVIDERS.includes(name) ? name : "gemini";
};

const load = (name) =>
  name === "openrouter" ? require("./companion.provider.openrouter") : require("./companion.provider.gemini");

const getProvider = () => load(providerName());

const isConfigured = () => getProvider().isConfigured();

/** Non-secret description for status/diagnostics. */
const providerInfo = () => {
  const p = getProvider();
  return { provider: providerName(), model: p.model() };
};

const timeoutMs = () => Number(process.env.COMPANION_TIMEOUT_MS) || 30000;

module.exports = { ProviderError, getProvider, isConfigured, providerInfo, providerName, timeoutMs };
