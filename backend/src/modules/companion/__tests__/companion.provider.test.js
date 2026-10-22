const mockGenerate = jest.fn();
jest.mock('@google/genai', () => ({ GoogleGenAI: jest.fn(() => ({ models: { generateContent: mockGenerate } })) }));
jest.mock('axios', () => ({ post: jest.fn() }));

const ORIGINAL = { ...process.env };
afterEach(() => {
  process.env = { ...ORIGINAL };
  jest.clearAllMocks();
});

const load = () => {
  jest.resetModules();
  return require('../companion.provider');
};

const tools = [{ name: 'search_jobs', description: 'd', parameters: { type: 'object', properties: { query: { type: 'string' } } } }];

describe('provider selection', () => {
  test('Gemini by default, OpenRouter only when configured, no silent switching', () => {
    delete process.env.COMPANION_PROVIDER;
    process.env.OPENROUTER_API_KEY = 'or-key';
    delete process.env.GEMINI_API_KEY;
    let p = load();
    expect(p.providerName()).toBe('gemini');
    expect(p.isConfigured()).toBe(false); // an OpenRouter key does not activate Gemini
    process.env.COMPANION_PROVIDER = 'openrouter';
    p = load();
    expect(p.providerName()).toBe('openrouter');
    expect(p.isConfigured()).toBe(true);
  });

  test('model is configurable and info never includes secrets', () => {
    process.env.GEMINI_API_KEY = 'secret-value';
    process.env.COMPANION_GEMINI_MODEL = 'gemini-custom';
    const info = load().providerInfo();
    expect(info).toEqual({ provider: 'gemini', model: 'gemini-custom' });
    expect(JSON.stringify(info)).not.toContain('secret');
  });
});

describe('Gemini conversation', () => {
  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test-key';
    delete process.env.COMPANION_GEMINI_MODEL;
  });

  test('missing key fails as not_configured without calling the API', async () => {
    delete process.env.GEMINI_API_KEY;
    const gemini = (load(), require('../companion.provider.gemini'));
    await expect(gemini.createConversation({ system: 's', messages: [{ role: 'user', content: 'hi' }] }).send()).rejects.toMatchObject({ code: 'not_configured' });
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  test('sends system instruction, tools and forced tool mode in the SDK format', async () => {
    load();
    const gemini = require('../companion.provider.gemini');
    mockGenerate.mockResolvedValue({ candidates: [{ content: { role: 'model', parts: [{ text: 'hello' }] } }] });
    const convo = gemini.createConversation({ system: 'sys', messages: [{ role: 'assistant', content: 'intro' }, { role: 'user', content: 'a' }, { role: 'user', content: 'b' }], tools });
    const res = await convo.send({ toolChoice: { name: 'search_jobs' } });
    expect(res).toEqual({ text: 'hello', toolCalls: [] });
    const req = mockGenerate.mock.calls[0][0];
    expect(req.model).toBe('gemini-3.5-flash-lite');
    // Leading model turn dropped, consecutive user turns merged.
    expect(req.contents[0]).toEqual({ role: 'user', parts: [{ text: 'a' }, { text: 'b' }] });
    expect(req.config.systemInstruction).toBe('sys');
    expect(req.config.tools[0].functionDeclarations[0]).toMatchObject({ name: 'search_jobs', parametersJsonSchema: tools[0].parameters });
    expect(req.config.toolConfig.functionCallingConfig).toEqual({ mode: 'ANY', allowedFunctionNames: ['search_jobs'] });
  });

  test('keeps model parts (thought signatures) verbatim and answers calls by id', async () => {
    load();
    const gemini = require('../companion.provider.gemini');
    const modelParts = [{ functionCall: { id: 'fc-1', name: 'search_jobs', args: { query: 'react' } }, thoughtSignature: 'sig-abc' }];
    mockGenerate
      .mockResolvedValueOnce({ candidates: [{ content: { role: 'model', parts: modelParts } }] })
      .mockResolvedValueOnce({ candidates: [{ content: { role: 'model', parts: [{ text: 'thinking', thought: true }, { text: 'Done.' }] } }] });
    const convo = gemini.createConversation({ system: 's', messages: [{ role: 'user', content: 'find' }], tools });
    const first = await convo.send();
    expect(first.toolCalls).toEqual([expect.objectContaining({ id: 'fc-1', name: 'search_jobs', args: { query: 'react' } })]);
    convo.addToolResults([{ call: first.toolCalls[0], content: '{"untrusted_data":[]}' }]);
    const second = await convo.send();
    expect(second.text).toBe('Done.'); // thought text is not shown
    const contents = mockGenerate.mock.calls[1][0].contents;
    expect(contents[1]).toEqual({ role: 'model', parts: modelParts });
    expect(contents[2]).toEqual({ role: 'user', parts: [{ functionResponse: { name: 'search_jobs', id: 'fc-1', response: { result: '{"untrusted_data":[]}' } } }] });
  });

  test('toolChoice none and JSON mode', async () => {
    load();
    const gemini = require('../companion.provider.gemini');
    mockGenerate.mockResolvedValue({ candidates: [{ content: { parts: [{ text: '{}' }] } }] });
    await gemini.createConversation({ system: 's', messages: [{ role: 'user', content: 'x' }], tools }).send({ toolChoice: 'none', json: true });
    const { config } = mockGenerate.mock.calls[0][0];
    expect(config.tools).toBeUndefined();
    expect(config.responseMimeType).toBe('application/json');
  });

  test.each([
    [{ status: 429, message: 'RESOURCE_EXHAUSTED: quota exceeded' }, 'quota'],
    [{ status: 429, message: 'Too many requests' }, 'rate_limited'],
    [{ name: 'AbortError', message: 'aborted' }, 'timeout'],
    [{ status: 500, message: 'internal' }, 'provider_error'],
    [{ status: 403, message: 'API key not valid' }, 'provider_error'],
  ])('classifies %o as %s', async (err, code) => {
    load();
    const gemini = require('../companion.provider.gemini');
    mockGenerate.mockRejectedValue(Object.assign(new Error(err.message), err));
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(gemini.createConversation({ system: 's', messages: [{ role: 'user', content: 'x' }] }).send()).rejects.toMatchObject({ code });
    expect(warn.mock.calls.flat().join(' ')).not.toContain('test-key');
    warn.mockRestore();
  });

  test('empty or blocked responses are provider errors', async () => {
    load();
    const gemini = require('../companion.provider.gemini');
    mockGenerate.mockResolvedValue({ candidates: [{ finishReason: 'SAFETY', content: { parts: [] } }] });
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(gemini.createConversation({ system: 's', messages: [{ role: 'user', content: 'x' }] }).send()).rejects.toMatchObject({ code: 'provider_error' });
  });
});

describe('OpenRouter conversation', () => {
  test('keeps tool_calls and answers them by id', async () => {
    process.env.COMPANION_PROVIDER = 'openrouter';
    process.env.OPENROUTER_API_KEY = 'or-key';
    load();
    const axios = require('axios');
    const openrouter = require('../companion.provider.openrouter');
    axios.post
      .mockResolvedValueOnce({ data: { choices: [{ message: { content: '', tool_calls: [{ id: 't1', function: { name: 'search_jobs', arguments: '{}' } }] } }] } })
      .mockResolvedValueOnce({ data: { choices: [{ message: { content: 'ok' } }] } });
    const convo = openrouter.createConversation({ system: 's', messages: [{ role: 'user', content: 'x' }], tools });
    const first = await convo.send({ toolChoice: { name: 'search_jobs' } });
    expect(axios.post.mock.calls[0][1].tool_choice).toEqual({ type: 'function', function: { name: 'search_jobs' } });
    convo.addToolResults([{ call: first.toolCalls[0], content: 'r' }]);
    await convo.send();
    const msgs = axios.post.mock.calls[1][1].messages;
    expect(msgs.at(-1)).toEqual({ role: 'tool', tool_call_id: 't1', content: 'r' });
    expect(msgs.at(-2).tool_calls[0].id).toBe('t1');
  });
});
