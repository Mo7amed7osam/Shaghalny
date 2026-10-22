const axios = require("axios");

// OpenRouter (OpenAI-compatible chat completions with tool calling), the
// platform's existing AI integration. Selected with COMPANION_PROVIDER=openrouter.
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const apiKey = () => process.env.OPENROUTER_API_KEY || "";
const model = () => process.env.COMPANION_MODEL || process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";
const isConfigured = () => Boolean(apiKey());

const classify = (error) => {
  const { ProviderError } = require("./companion.provider");
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
 * A conversation keeps OpenAI-format messages, including assistant
 * `tool_calls`, so tool results can be sent back with matching ids.
 */
const createConversation = ({ system, messages, tools = [] }) => {
  const { ProviderError, timeoutMs } = require("./companion.provider");
  const convo = [{ role: "system", content: system }, ...messages.map((m) => ({ role: m.role, content: m.content }))];
  const declarations = tools.map((t) => ({ type: "function", function: { name: t.name, description: t.description, parameters: t.parameters } }));

  return {
    async send({ toolChoice = "auto", json = false, maxTokens = 900, temperature = 0.4 } = {}) {
      if (!isConfigured()) throw new ProviderError("not_configured", "No AI provider key is configured.");
      const useTools = declarations.length && toolChoice !== "none";
      try {
        const response = await axios.post(
          OPENROUTER_URL,
          {
            model: model(),
            messages: convo,
            max_tokens: maxTokens,
            temperature,
            ...(useTools
              ? {
                  tools: declarations,
                  tool_choice: typeof toolChoice === "object" ? { type: "function", function: { name: toolChoice.name } } : "auto",
                  parallel_tool_calls: false,
                }
              : {}),
            ...(json ? { response_format: { type: "json_object" } } : {}),
          },
          {
            headers: { Authorization: `Bearer ${apiKey()}`, "Content-Type": "application/json", "X-Title": "Shaghalny Companion" },
            timeout: timeoutMs(),
            maxContentLength: 2 * 1024 * 1024,
          },
        );
        if (response.data?.error) {
          const status = Number(response.data.error.code);
          throw classify({ response: { status: Number.isFinite(status) ? status : 500 } });
        }
        const message = response.data?.choices?.[0]?.message;
        if (!message) throw new ProviderError("provider_error", "The AI provider returned an empty response.");
        const calls = Array.isArray(message.tool_calls) ? message.tool_calls : [];
        if (calls.length) convo.push({ role: "assistant", content: message.content || "", tool_calls: calls });
        return {
          text: message.content || "",
          toolCalls: calls.map((c) => ({ id: c.id, name: c.function?.name, args: c.function?.arguments })),
        };
      } catch (error) {
        const normalized = classify(error);
        console.warn("[companion] openrouter error:", normalized.code, error.response?.status || "");
        throw normalized;
      }
    },
    addToolResults(results) {
      results.forEach(({ call, content }) => convo.push({ role: "tool", tool_call_id: call.id, content }));
    },
  };
};

module.exports = { name: "openrouter", model, isConfigured, createConversation };
