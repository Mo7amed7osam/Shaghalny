jest.mock('../companion.provider', () => {
  class ProviderError extends Error { constructor(code, m) { super(m); this.code = code; } }
  return { createChatCompletion: jest.fn(), isConfigured: jest.fn(), ProviderError };
});
jest.mock('../companion.tools', () => {
  const actual = jest.requireActual('../companion.tools');
  return { ...actual, loadStudent: jest.fn() };
});
jest.mock('../companion.fallback', () => ({ fallbackEnabled: jest.fn(), demoRespond: jest.fn() }));
jest.mock('../companion.jobs', () => ({ searchJobsForStudent: jest.fn(), getJobForStudent: jest.fn() }));
jest.mock('../../../models/User', () => ({}));

const provider = require('../companion.provider');
const tools = require('../companion.tools');
const fallback = require('../companion.fallback');
const jobs = require('../companion.jobs');
const { respond, parseRequest, parseCvReview, CompanionInputError } = require('../companion.service');

const user = { id: 'a'.repeat(24), role: 'Student' };
const student = { _id: user.id, name: 'Mona Ali', verifiedSkills: [], portfolioLinks: [], reviews: [] };
const body = (extra = {}) => ({ messages: [{ role: 'user', content: 'Find React work for me' }], intent: 'find_jobs', ...extra });

beforeEach(() => {
  jest.clearAllMocks();
  tools.loadStudent.mockResolvedValue(student);
  fallback.demoRespond.mockResolvedValue({ reply: 'demo reply', cards: [{ id: 'j1', title: 'Real job' }] });
});

describe('fallback behaviour', () => {
  test('no key + demo fallback configured -> labelled demo response', async () => {
    provider.isConfigured.mockReturnValue(false);
    fallback.fallbackEnabled.mockReturnValue(true);
    const result = await respond({ user, body: body() });
    expect(result.mode).toBe('demo');
    expect(result.notice).toBe('not_configured');
    expect(result.cards).toEqual([{ id: 'j1', title: 'Real job' }]);
    expect(provider.createChatCompletion).not.toHaveBeenCalled();
  });

  test('no key and no fallback -> not_configured error, never fake content', async () => {
    provider.isConfigured.mockReturnValue(false);
    fallback.fallbackEnabled.mockReturnValue(false);
    await expect(respond({ user, body: body() })).rejects.toMatchObject({ code: 'not_configured' });
    expect(fallback.demoRespond).not.toHaveBeenCalled();
  });

  test('provider quota error -> demo response flagged with the reason', async () => {
    provider.isConfigured.mockReturnValue(true);
    fallback.fallbackEnabled.mockReturnValue(true);
    provider.createChatCompletion.mockRejectedValue(new provider.ProviderError('quota', 'quota'));
    const result = await respond({ user, body: body() });
    expect(result.mode).toBe('demo');
    expect(result.notice).toBe('quota');
  });

  test('provider error without fallback is surfaced', async () => {
    provider.isConfigured.mockReturnValue(true);
    fallback.fallbackEnabled.mockReturnValue(false);
    provider.createChatCompletion.mockRejectedValue(new provider.ProviderError('timeout', 'slow'));
    await expect(respond({ user, body: body() })).rejects.toMatchObject({ code: 'timeout' });
  });
});

describe('AI tool loop', () => {
  test('forces a job search, returns backend cards and strips model URLs', async () => {
    provider.isConfigured.mockReturnValue(true);
    fallback.fallbackEnabled.mockReturnValue(true);
    jobs.searchJobsForStudent.mockResolvedValue({ jobs: [{ id: 'j9', title: 'React dashboard' }] });
    provider.createChatCompletion
      .mockResolvedValueOnce({ content: '', tool_calls: [{ id: 'c1', function: { name: 'search_jobs', arguments: '{"query":"react"}' } }] })
      .mockResolvedValueOnce({ content: 'Try this one: https://fake.example/job' });
    const result = await respond({ user, body: body() });
    expect(result.mode).toBe('ai');
    expect(result.cards).toEqual([{ id: 'j9', title: 'React dashboard' }]);
    expect(result.reply).not.toMatch(/https?:/);
    const first = provider.createChatCompletion.mock.calls[0][0];
    expect(first.toolChoice).toEqual({ type: 'function', function: { name: 'search_jobs' } });
    const toolMsg = provider.createChatCompletion.mock.calls[1][0].messages.find((m) => m.role === 'tool');
    expect(toolMsg.content).toContain('untrusted_data');
  });

  test('invalid tool arguments are returned to the model as errors, not executed', async () => {
    provider.isConfigured.mockReturnValue(true);
    provider.createChatCompletion
      .mockResolvedValueOnce({ content: '', tool_calls: [{ id: 'c1', function: { name: 'search_jobs', arguments: '{"userId":"x"}' } }] })
      .mockResolvedValueOnce({ content: 'Sorry, let me try differently.' });
    await respond({ user, body: body() });
    expect(jobs.searchJobsForStudent).not.toHaveBeenCalled();
    const toolMsg = provider.createChatCompletion.mock.calls[1][0].messages.find((m) => m.role === 'tool');
    expect(toolMsg.content).toMatch(/Unexpected argument/);
  });

  test('tool iterations are bounded', async () => {
    provider.isConfigured.mockReturnValue(true);
    jobs.searchJobsForStudent.mockResolvedValue({ jobs: [] });
    provider.createChatCompletion.mockResolvedValue({ content: 'done?', tool_calls: [{ id: 'c', function: { name: 'search_jobs', arguments: '{}' } }] });
    await respond({ user, body: body({ intent: 'chat' }) }).catch(() => {});
    expect(provider.createChatCompletion.mock.calls.length).toBeLessThanOrEqual(5);
    const last = provider.createChatCompletion.mock.calls.at(-1)[0];
    expect(last.tools).toBeUndefined();
  });
});

describe('input bounds', () => {
  test('rejects malformed or oversized input', () => {
    expect(() => parseRequest({})).toThrow(CompanionInputError);
    expect(() => parseRequest({ messages: [{ role: 'system', content: 'x' }] })).toThrow(CompanionInputError);
    expect(() => parseRequest({ messages: [{ role: 'user', content: 'x'.repeat(4001) }] })).toThrow(/limited/);
    expect(() => parseRequest(body({ cvText: 'x'.repeat(15001) }))).toThrow(/CV text/);
  });

  test('keeps only recent history and safe context', () => {
    const messages = Array.from({ length: 30 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: `m${i}` }));
    messages.push({ role: 'user', content: 'last' });
    const req = parseRequest({ messages, context: { path: 'javascript:alert(1)', jobId: '{"$gt":""}' }, lang: 'xx' });
    expect(req.messages.length).toBeLessThanOrEqual(12);
    expect(req.path).toBeNull();
    expect(req.jobId).toBeNull();
    expect(req.lang).toBe('en');
  });

  test('CV review JSON is validated and capped', () => {
    expect(parseCvReview('not json')).toBeNull();
    const review = parseCvReview('```json\n{"strengths":["Clear"],"issues":[{"section":"Skills","problem":"Vague"}],"rewrites":[{"section":"Summary","before":"a","after":"b","note":"c"}],"extra":"x"}\n```');
    expect(review).toMatchObject({ example: false, strengths: ['Clear'], issues: [{ section: 'Skills', problem: 'Vague' }] });
    expect(review.extra).toBeUndefined();
  });
});
