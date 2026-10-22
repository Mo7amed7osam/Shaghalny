// Direct Gemini support through the official Google Gen AI SDK (@google/genai).
// Selected with COMPANION_PROVIDER=gemini (the default). Uses GEMINI_API_KEY
// from the server environment only; the model is COMPANION_GEMINI_MODEL
// (default gemini-3.5-flash-lite: free tier, supports function calling).

const DEFAULT_MODEL = "gemini-3.5-flash-lite";

const apiKey = () => process.env.GEMINI_API_KEY || "";
const model = () => process.env.COMPANION_GEMINI_MODEL || DEFAULT_MODEL;
const isConfigured = () => Boolean(apiKey());

let client = null;
let clientKey = null;
const getClient = () => {
  const key = apiKey();
  if (!client || clientKey !== key) {
    const { GoogleGenAI } = require("@google/genai");
    client = new GoogleGenAI({ apiKey: key });
    clientKey = key;
  }
  return client;
};

const classify = (error) => {
  const { ProviderError } = require("./companion.provider");
  if (error instanceof ProviderError) return error;
  const status = Number(error?.status ?? error?.code ?? error?.response?.status);
  const text = String(error?.message || "");
  if (error?.name === "AbortError" || /timed? ?out|deadline/i.test(text) || status === 504) {
    return new ProviderError("timeout", "The AI provider took too long to respond.");
  }
  if (status === 429) {
    return /quota|exhaust/i.test(text)
      ? new ProviderError("quota", "The AI provider quota is exhausted.")
      : new ProviderError("rate_limited", "The AI provider is rate limiting requests.");
  }
  return new ProviderError("provider_error", `The AI provider failed${Number.isFinite(status) ? ` (HTTP ${status})` : ""}.`);
};

// Gemini expects alternating user/model turns that start with the user.
const toContents = (messages) => {
  const contents = [];
  for (const m of messages) {
    const role = m.role === "assistant" ? "model" : "user";
    if (!contents.length && role === "model") continue;
    const last = contents[contents.length - 1];
    if (last && last.role === role) last.parts.push({ text: m.content });
    else contents.push({ role, parts: [{ text: m.content }] });
  }
  return contents;
};

/**
 * A conversation keeps Gemini `contents`. The model's own content (including
 * function-call parts and any `thoughtSignature`) is appended verbatim, which
 * the API requires when function responses are sent back on the next turn.
 */
const createConversation = ({ system, messages, tools = [] }) => {
  const { ProviderError, timeoutMs } = require("./companion.provider");
  const contents = toContents(messages);
  const functionDeclarations = tools.map((t) => ({ name: t.name, description: t.description, parametersJsonSchema: t.parameters }));
  let turn = 0;

  return {
    async send({ toolChoice = "auto", json = false, maxTokens = 900, temperature = 0.4 } = {}) {
      if (!isConfigured()) throw new ProviderError("not_configured", "No AI provider key is configured.");
      const useTools = functionDeclarations.length && toolChoice !== "none";
      turn += 1;
      try {
        const response = await getClient().models.generateContent({
          model: model(),
          contents,
          config: {
            systemInstruction: system,
            temperature,
            // Thinking models spend part of the budget before answering.
            maxOutputTokens: Math.max(maxTokens * 2, 1024),
            ...(useTools
              ? {
                  tools: [{ functionDeclarations }],
                  toolConfig: {
                    functionCallingConfig:
                      typeof toolChoice === "object" ? { mode: "ANY", allowedFunctionNames: [toolChoice.name] } : { mode: "AUTO" },
                  },
                }
              : {}),
            ...(json ? { responseMimeType: "application/json" } : {}),
            httpOptions: { timeout: timeoutMs() },
          },
        });
        const content = response?.candidates?.[0]?.content;
        const parts = Array.isArray(content?.parts) ? content.parts : [];
        if (!parts.length) {
          const reason = response?.candidates?.[0]?.finishReason || response?.promptFeedback?.blockReason;
          throw new ProviderError("provider_error", `The AI provider returned no content${reason ? ` (${reason})` : ""}.`);
        }
        contents.push({ role: "model", parts });
        const toolCalls = parts
          .filter((p) => p.functionCall)
          .map((p, i) => ({ id: p.functionCall.id || `call_${turn}_${i}`, name: p.functionCall.name, args: p.functionCall.args || {}, native: p.functionCall }));
        const text = parts.filter((p) => typeof p.text === "string" && !p.thought).map((p) => p.text).join("");
        return { text, toolCalls };
      } catch (error) {
        const normalized = classify(error);
        console.warn("[companion] gemini error:", normalized.code, Number.isFinite(Number(error?.status)) ? error.status : "");
        throw normalized;
      }
    },
    addToolResults(results) {
      contents.push({
        role: "user",
        parts: results.map(({ call, content }) => ({
          functionResponse: {
            name: call.name,
            ...(call.native?.id ? { id: call.native.id } : {}),
            response: { result: content },
          },
        })),
      });
    },
  };
};

module.exports = { name: "gemini", model, isConfigured, createConversation, DEFAULT_MODEL, toContents };
