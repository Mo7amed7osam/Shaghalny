const axios = require("axios");

// Reuses the platform's existing OpenRouter integration (OpenAI-compatible chat
// completions with tool calling). The key stays server-side.
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const config = () => ({
  apiKey: process.env.OPENROUTER_API_KEY || "",
  model: process.env.COMPANION_MODEL || process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini",
  timeoutMs: Number(process.env.COMPANION_TIMEOUT_MS) || 30000,
});

const isConfigured = () => Boolean(config().apiKey);

class ProviderError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code; // not_configured | quota | rate_limited | timeout | provider_error
  }
}

const classify = (error) => {
  if (error instanceof ProviderError) return error;
  if (error.code === "ECONNABORTED" || /timeout/i.test(error.message || "")) {
    return new ProviderError("timeout", "The AI provider took too long to respond.");
  }
  const status = error.response?.status;
  if (status === 402) return new ProviderError("quota", "The AI provider quota is exhausted.");
  if (status === 429) return new ProviderError("rate_limited", "The AI provider is rate limiting requests.");
  return new ProviderError("provider_error", `The AI provider failed${status ? ` (HTTP ${status})` : ""}.`);
};

/**
 * One chat completion. Returns the assistant message ({ content, tool_calls }).
 * Errors are normalized to ProviderError and never include the API key.
 */
const createChatCompletion = async ({ messages, tools, toolChoice = "auto", maxTokens = 900, temperature = 0.4, json = false }) => {
  const { apiKey, model, timeoutMs } = config();
  if (!apiKey) throw new ProviderError("not_configured", "No AI provider key is configured.");
  try {
    const response = await axios.post(
      OPENROUTER_URL,
      {
        model,
        messages,
        max_tokens: maxTokens,
        temperature,
        ...(tools?.length ? { tools, tool_choice: toolChoice, parallel_tool_calls: false } : {}),
        ...(json ? { response_format: { type: "json_object" } } : {}),
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "X-Title": "Shaghalny Companion",
        },
        timeout: timeoutMs,
        maxContentLength: 2 * 1024 * 1024,
      },
    );
    if (response.data?.error) {
      const status = Number(response.data.error.code);
      throw classify({ response: { status: Number.isFinite(status) ? status : 500 } });
    }
    const message = response.data?.choices?.[0]?.message;
    if (!message) throw new ProviderError("provider_error", "The AI provider returned an empty response.");
    return message;
  } catch (error) {
    const normalized = classify(error);
    console.warn("[companion] provider error:", normalized.code, error.response?.status || "");
    throw normalized;
  }
};

module.exports = { createChatCompletion, isConfigured, ProviderError, config };
