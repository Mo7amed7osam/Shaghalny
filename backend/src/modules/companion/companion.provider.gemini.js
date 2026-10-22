// Direct Gemini support through the official Google Gen AI SDK (@google/genai).
// Selected with COMPANION_PROVIDER=gemini (the default). Uses GEMINI_API_KEY
// from the server environment only; the model is COMPANION_GEMINI_MODEL
// (default gemini-3.6-flash: free tier, function calling; in production
// gemini-3.5-flash-lite was too slow/overloaded for multi-step tool calls).
// When the model is out of quota, rate limited or overloaded, the call is
// retried on COMPANION_GEMINI_FALLBACK_MODELS (comma-separated, default
// gemini-3.5-flash-lite; free-tier quota is per model) before giving up.

const DEFAULT_MODEL = "gemini-3.6-flash";
const DEFAULT_FALLBACK_MODELS = "gemini-3.5-flash-lite";

const apiKey = () => process.env.GEMINI_API_KEY || "";
const model = () => process.env.COMPANION_GEMINI_MODEL || DEFAULT_MODEL;
const fallbackModels = () =>
  String(process.env.COMPANION_GEMINI_FALLBACK_MODELS ?? DEFAULT_FALLBACK_MODELS)
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);

// Models that recently hit quota/rate limits are skipped for a while so every
// request does not pay for a failing call first.
const COOLDOWN_MS = { quota: 15 * 60 * 1000, rate_limited: 60 * 1000, overloaded: 60 * 1000 };
const cooldownUntil = new Map();
const coolingDown = (m) => (cooldownUntil.get(m) || 0) > Date.now();
const candidateModels = () => {
  const all = [...new Set([model(), ...fallbackModels()])];
  const ready = all.filter((m) => !coolingDown(m));
  return ready.length ? ready : all;
};
const SWITCHABLE = new Set(["quota", "rate_limited"]);
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
  if (status === 503) {
    const overloaded = new ProviderError("provider_error", "The AI provider is overloaded (HTTP 503).");
    overloaded.overloaded = true;
    return overloaded;
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
  let active = null;

  const callModel = async (m, { useTools, toolChoice, json, maxTokens, temperature }) => {
    const response = await getClient().models.generateContent({
      model: m,
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
  };

  return {
    async send({ toolChoice = "auto", json = false, maxTokens = 900, temperature = 0.4 } = {}) {
      if (!isConfigured()) throw new ProviderError("not_configured", "No AI provider key is configured.");
      const useTools = functionDeclarations.length && toolChoice !== "none";
      turn += 1;
      // A conversation stays on the model that last answered, so tool-call
      // turns are only split across models when that model runs out.
      const models = active ? [active, ...candidateModels().filter((m) => m !== active)] : candidateModels();
      let lastError;
      for (const m of models) {
        try {
          const result = await callModel(m, { useTools, toolChoice, json, maxTokens, temperature });
          active = m;
          return result;
        } catch (error) {
          lastError = classify(error);
          console.warn("[companion] gemini error:", m, lastError.code, Number.isFinite(Number(error?.status)) ? error.status : "");
          const switchable = SWITCHABLE.has(lastError.code) || lastError.overloaded;
          if (!switchable) throw lastError;
          cooldownUntil.set(m, Date.now() + COOLDOWN_MS[lastError.overloaded ? "overloaded" : lastError.code]);
        }
      }
      throw lastError;
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

module.exports = { name: "gemini", model, fallbackModels, isConfigured, createConversation, DEFAULT_MODEL, toContents };
