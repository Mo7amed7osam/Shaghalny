jest.mock('../companion.provider', () => {
  class ProviderError extends Error { constructor(code, m) { super(m); this.code = code; } }
  return { getProvider: jest.fn(), isConfigured: jest.fn(), providerInfo: jest.fn(() => ({ provider: 'gemini', model: 'm' })), ProviderError };
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
const { respond, parseRequest, parseCvReview, parseCareerPlan, CompanionInputError } = require('../companion.service');

const user = { id: 'a'.repeat(24), role: 'Student' };
const student = { _id: user.id, name: 'Test Student', verifiedSkills: [], portfolioLinks: [], reviews: [] };
const body = (extra = {}) => ({ messages: [{ role: 'user', content: 'Find React work for me' }], intent: 'find_jobs', ...extra });

// A scripted provider conversation: each send() returns the next response.
let sends; let conversations;
const script = (...responses) => {
  sends = jest.fn();
  responses.forEach((r) => (r instanceof Error ? sends.mockRejectedValueOnce(r) : sends.mockResolvedValueOnce(r)));
  conversations = [];
  provider.getProvider.mockReturnValue({
    createConversation: jest.fn((opts) => {
      const convo = { opts, send: sends, addToolResults: jest.fn() };
      conversations.push(convo);
      return convo;
    }),
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  tools.loadStudent.mockResolvedValue(student);
  fallback.demoRespond.mockResolvedValue({ reply: 'demo reply', cards: [{ id: 'j1', title: 'Real job' }] });
  provider.isConfigured.mockReturnValue(true);
  fallback.fallbackEnabled.mockReturnValue(true);
});

describe('fallback behaviour', () => {
  test('missing key + demo fallback configured -> labelled demo response', async () => {
    provider.isConfigured.mockReturnValue(false);
    script();
    const result = await respond({ user, body: body() });
    expect(result).toMatchObject({ mode: 'demo', notice: 'not_configured', cards: [{ id: 'j1', title: 'Real job' }] });
    expect(sends).not.toHaveBeenCalled();
  });

  test('missing key and no fallback -> not_configured error, never fake content', async () => {
    provider.isConfigured.mockReturnValue(false);
    fallback.fallbackEnabled.mockReturnValue(false);
    await expect(respond({ user, body: body() })).rejects.toMatchObject({ code: 'not_configured' });
    expect(fallback.demoRespond).not.toHaveBeenCalled();
  });

  test('provider quota error -> demo response flagged with the reason', async () => {
    script(new provider.ProviderError('quota', 'quota'));
    const result = await respond({ user, body: body() });
    expect(result).toMatchObject({ mode: 'demo', notice: 'quota' });
  });

  test('provider error without fallback is surfaced', async () => {
    fallback.fallbackEnabled.mockReturnValue(false);
    script(new provider.ProviderError('timeout', 'slow'));
    await expect(respond({ user, body: body() })).rejects.toMatchObject({ code: 'timeout' });
  });

  test('a genuine AI answer is not labelled as demo', async () => {
    jobs.searchJobsForStudent.mockResolvedValue({ jobs: [] });
    script({ text: '', toolCalls: [{ id: 'c1', name: 'search_jobs', args: {} }] }, { text: 'No matches right now.', toolCalls: [] });
    const result = await respond({ user, body: body() });
    expect(result.mode).toBe('ai');
    expect(result.notice).toBeUndefined();
  });
});

describe('AI tool loop', () => {
  test('forces a job search, returns backend cards and strips model URLs', async () => {
    jobs.searchJobsForStudent.mockResolvedValue({ jobs: [{ id: 'j9', title: 'React dashboard' }] });
    script(
      { text: '', toolCalls: [{ id: 'c1', name: 'search_jobs', args: '{"query":"react"}' }] },
      { text: 'Try this one: https://fake.example/job', toolCalls: [] },
    );
    const result = await respond({ user, body: body({ preferences: { type: 'internship', workMode: 'nope' } }) });
    expect(result.mode).toBe('ai');
    expect(result.cards).toEqual([{ id: 'j9', title: 'React dashboard' }]);
    expect(result.reply).not.toMatch(/https?:/);
    expect(sends.mock.calls[0][0].toolChoice).toEqual({ name: 'search_jobs' });
    const convo = conversations[0];
    expect(convo.opts.system).toContain('type internship');
    expect(convo.opts.system).not.toContain('nope');
    const [[results]] = convo.addToolResults.mock.calls;
    expect(results[0].call.id).toBe('c1');
    expect(results[0].content).toContain('untrusted_data');
  });

  test('invalid tool arguments are returned to the model as errors, not executed', async () => {
    script({ text: '', toolCalls: [{ id: 'c1', name: 'search_jobs', args: { userId: 'x' } }] }, { text: 'Let me try differently.', toolCalls: [] });
    await respond({ user, body: body() });
    expect(jobs.searchJobsForStudent).not.toHaveBeenCalled();
    expect(conversations[0].addToolResults.mock.calls[0][0][0].content).toMatch(/Unexpected argument/);
  });

  test('extra calls in one step are refused, iterations are bounded and the last round has no tools', async () => {
    jobs.searchJobsForStudent.mockResolvedValue({ jobs: [] });
    const many = { text: '', toolCalls: Array.from({ length: 5 }, (_, i) => ({ id: `c${i}`, name: 'search_jobs', args: {} })) };
    script(many, many, many, many, many, { text: 'done', toolCalls: [] });
    await respond({ user, body: body({ intent: 'chat' }) });
    expect(sends.mock.calls.length).toBe(5);
    expect(sends.mock.calls[4][0].toolChoice).toBe('none');
    expect(jobs.searchJobsForStudent).toHaveBeenCalledTimes(3 * 4);
    expect(conversations[0].addToolResults.mock.calls[0][0][4].content).toMatch(/Too many tool calls/);
  });
});

describe('career planning', () => {
  test('plan is grounded in real job data and validated', async () => {
    jobs.searchJobsForStudent.mockResolvedValue({
      jobs: [{ id: 'j1', title: 'Frontend intern', sourceType: 'internal', requiredSkills: [], missingVerifiedSkills: ['React'], cautions: [] }],
    });
    script({
      text: JSON.stringify({ goal: 'Frontend developer', summary: 'ok', steps: [{ title: 'Verify React', detail: 'Needed by 1 job', page: 'skill_verification' }, { title: 'x', page: '/admin' }], missingFacts: [] }),
      toolCalls: [],
    });
    const result = await respond({ user, body: { messages: [{ role: 'user', content: 'I want to become a frontend developer' }], intent: 'plan_career' } });
    expect(result.mode).toBe('ai');
    expect(result.careerPlan.steps).toEqual([
      { title: 'Verify React', detail: 'Needed by 1 job', page: 'skill_verification' },
      { title: 'x', detail: '', page: null },
    ]);
    expect(result.actions).toEqual(['skill_verification']);
    expect(conversations[0].opts.messages.at(-1).content).toContain('"skill":"React"');
    expect(sends.mock.calls[0][0]).toMatchObject({ toolChoice: 'none', json: true });
  });

  test('invalid plan JSON is not shown as a plan', () => {
    expect(parseCareerPlan('nope')).toBeNull();
    expect(parseCareerPlan('{"steps":[]}')).toBeNull();
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
    const req = parseRequest({ messages, context: { path: 'javascript:alert(1)', jobId: '{"$gt":""}' }, lang: 'xx', intent: 'evil' });
    expect(req.messages.length).toBeLessThanOrEqual(12);
    expect(req.path).toBeNull();
    expect(req.jobId).toBeNull();
    expect(req.lang).toBe('en');
    expect(req.intent).toBe('chat');
  });

  test('CV review JSON is validated and capped', () => {
    expect(parseCvReview('not json')).toBeNull();
    const review = parseCvReview('```json\n{"strengths":["Clear"],"issues":[{"section":"Skills","problem":"Vague"}],"rewrites":[{"section":"Summary","before":"a","after":"b","note":"c"}],"extra":"x"}\n```');
    expect(review).toMatchObject({ example: false, strengths: ['Clear'], issues: [{ section: 'Skills', problem: 'Vague' }] });
    expect(review.extra).toBeUndefined();
  });
});
