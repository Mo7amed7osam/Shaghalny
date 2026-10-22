jest.mock('../../../models/Job', () => ({}));
jest.mock('../../../models/Skill', () => ({}));
jest.mock('../../../models/Proposal', () => ({}));
const { toJobCard } = require('../companion.jobs');

const react = { _id: 'r'.repeat(24), name: 'React' };
const node = { _id: 'n'.repeat(24), name: 'Node.js' };
const ctx = (verified = [], applied = []) => ({ verifiedIds: new Set(verified), appliedIds: new Set(applied) });

const internal = {
  _id: 'a'.repeat(24), title: 'React landing page', sourceType: 'internal', status: 'open', type: 'freelance',
  employer: { name: 'Acme', isVerified: true }, requiredSkills: [react, node], budgetMin: 1000, budgetMax: 3000, workMode: 'online',
};
const external = {
  _id: 'b'.repeat(24), title: 'Senior Frontend Engineer', sourceType: 'external', status: 'open', sourceName: 'Remote OK',
  sourceCompanyName: 'Globex', sourceUrl: 'https://remoteok.com/remote-jobs/123', sourceApplyUrl: 'https://jobs.globex.com/apply/1',
  sourceLocation: 'Remote (US only)', sourceCompensation: '$120k - $150k', requiredSkills: [react],
};

test('internal job: eligibility follows verified skills and existing proposals', () => {
  const missing = toJobCard(internal, ctx([react._id]));
  expect(missing.sourceType).toBe('internal');
  expect(missing.canApply).toBe(false);
  expect(missing.missingVerifiedSkills).toEqual(['Node.js']);
  expect(missing.budget).toEqual({ min: 1000, max: 3000, currency: 'EGP' });
  expect(missing.applyUrl).toBeNull();
  expect(missing.company).toBe('Acme');

  expect(toJobCard(internal, ctx([react._id, node._id])).canApply).toBe(true);
  const applied = toJobCard(internal, ctx([react._id, node._id], [internal._id]));
  expect(applied.canApply).toBe(false);
  expect(applied.cautions.map((c) => c.code)).toContain('already_applied');
});

test('external job: applies on the source, flags seniority and regional limits', () => {
  const card = toJobCard(external, ctx());
  expect(card.sourceType).toBe('external');
  expect(card.canApply).toBe(false);
  expect(card.listingUrl).toBe('https://remoteok.com/remote-jobs/123');
  expect(card.applyUrl).toBe('https://jobs.globex.com/apply/1');
  expect(card.budget).toEqual({ text: '$120k - $150k' });
  const codes = card.cautions.map((c) => c.code);
  expect(codes).toEqual(expect.arrayContaining(['external_apply', 'senior_role', 'remote_restrictions', 'unverified_listed']));
  expect(codes).not.toContain('missing_verified');
});

test('external job with an untrusted URL gets no links', () => {
  const card = toJobCard({ ...external, sourceUrl: 'https://evil.example/remote-jobs/1' }, ctx());
  expect(card.listingUrl).toBeNull();
  expect(card.applyUrl).toBeNull();
});

test('unpublished budget stays empty instead of being invented', () => {
  const card = toJobCard({ ...internal, budgetMin: undefined, budgetMax: undefined }, ctx());
  expect(card.budget).toBeNull();
});
