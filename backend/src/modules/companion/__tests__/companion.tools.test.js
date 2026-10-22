jest.mock('../companion.jobs', () => ({
  searchJobsForStudent: jest.fn(),
  getJobForStudent: jest.fn(),
}));
jest.mock('../../../models/User', () => ({}));
const { searchJobsForStudent } = require('../companion.jobs');
const { validateArgs, executeTool, ToolArgumentError, toolDeclarations } = require('../companion.tools');

const student = { _id: 'aaaaaaaaaaaaaaaaaaaaaaaa', verifiedSkills: [] };
const makeCtx = (role = 'Student') => ({
  user: { id: 'aaaaaaaaaaaaaaaaaaaaaaaa', role },
  getStudent: jest.fn().mockResolvedValue(student),
  addCards: jest.fn(),
  addAction: jest.fn(),
});

describe('validateArgs', () => {
  test('rejects identity fields the model tries to add', () => {
    expect(() => validateArgs('search_jobs', { query: 'react', userId: 'bbbbbbbbbbbbbbbbbbbbbbbb' })).toThrow(ToolArgumentError);
    expect(() => validateArgs('get_my_profile', '{"student_id":"bbbbbbbbbbbbbbbbbbbbbbbb"}')).toThrow(/Unexpected argument/);
  });

  test('rejects unknown tools, bad enums, bad ids and oversized input', () => {
    expect(() => validateArgs('run_sql', {})).toThrow(/Unknown tool/);
    expect(() => validateArgs('search_jobs', { type: 'fulltime' })).toThrow(/type must be one of/);
    expect(() => validateArgs('get_job_details', { job_id: '{"$ne":null}' })).toThrow(/valid id/);
    expect(() => validateArgs('get_job_details', {})).toThrow(/Missing argument/);
    expect(() => validateArgs('search_jobs', { query: 'x'.repeat(101) })).toThrow(/too long/);
    expect(() => validateArgs('search_jobs', { limit: 50 })).toThrow(/integer/);
    expect(() => validateArgs('search_jobs', 'not json')).toThrow(/JSON object/);
    expect(() => validateArgs('suggest_page', { page: '/admin' })).toThrow(/page must be one of/);
  });

  test('accepts valid JSON-string arguments from the provider', () => {
    expect(validateArgs('search_jobs', '{"query":" react ","type":"internship","limit":3}')).toEqual({ query: 'react', type: 'internship', limit: 3 });
    expect(validateArgs('get_my_profile', '')).toEqual({});
  });

  test('declarations forbid extra properties', () => {
    const decl = toolDeclarations();
    expect(decl.map((d) => d.function.name).sort()).toEqual(['get_job_details', 'get_my_profile', 'get_skill_requirements', 'search_jobs', 'suggest_page']);
    decl.forEach((d) => expect(d.function.parameters.additionalProperties).toBe(false));
  });
});

describe('executeTool authorization', () => {
  beforeEach(() => jest.clearAllMocks());

  test('only students can run tools', async () => {
    await expect(executeTool('get_my_profile', {}, makeCtx('Client'))).rejects.toThrow(/Only students/);
  });

  test('searches as the session student and collects cards', async () => {
    searchJobsForStudent.mockResolvedValue({ jobs: [{ id: '1' }] });
    const ctx = makeCtx();
    await executeTool('search_jobs', { query: 'react' }, ctx);
    expect(ctx.getStudent).toHaveBeenCalled();
    expect(searchJobsForStudent).toHaveBeenCalledWith(student, expect.objectContaining({ query: 'react' }));
    expect(ctx.addCards).toHaveBeenCalledWith([{ id: '1' }]);
  });

  test('a model-supplied user id never reaches the data layer', async () => {
    const ctx = makeCtx();
    await expect(executeTool('search_jobs', { query: 'react', user_id: 'bbbbbbbbbbbbbbbbbbbbbbbb' }, ctx)).rejects.toThrow(ToolArgumentError);
    expect(searchJobsForStudent).not.toHaveBeenCalled();
  });
});
