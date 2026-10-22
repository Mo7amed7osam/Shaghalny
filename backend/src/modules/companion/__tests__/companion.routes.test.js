// Jest 26 cannot load express-rate-limit's node: imports; limits are covered by config, not this test.
jest.mock('express-rate-limit', () => ({ rateLimit: () => (req, res, next) => next(), ipKeyGenerator: (ip) => ip }));
jest.mock('../../../models/User', () => ({ exists: jest.fn() }));
jest.mock('../companion.service', () => {
  class CompanionInputError extends Error {}
  return { respond: jest.fn(), status: jest.fn(() => ({ aiConfigured: false, fallbackEnabled: true })), CompanionInputError };
});
const express = require('express');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const User = require('../../../models/User');
const service = require('../companion.service');
const { JWT_SECRET } = require('../../../config/jwt');
const router = require('../companion.routes');

let server;
let base;
beforeAll((done) => {
  const app = express();
  app.use(express.json());
  app.use('/api/companion', router);
  server = app.listen(0, () => { base = `http://127.0.0.1:${server.address().port}/api/companion`; done(); });
});
afterAll((done) => server.close(done));
beforeEach(() => jest.clearAllMocks());

const token = (role) => jwt.sign({ id: 'a'.repeat(24), role }, JWT_SECRET, { expiresIn: '1h' });
const post = (auth, payload = { messages: [{ role: 'user', content: 'hi' }] }) =>
  axios.post(`${base}/chat`, payload, {
    headers: auth ? { Authorization: `Bearer ${auth}` } : {},
    validateStatus: () => true,
    adapter: require('axios/lib/adapters/http'),
  });

test('requires a session', async () => {
  const res = await post(null);
  expect(res.status).toBe(401);
  expect(service.respond).not.toHaveBeenCalled();
});

test('rejects non-student roles', async () => {
  User.exists.mockResolvedValue({ _id: 'x' });
  const res = await post(token('Client'));
  expect(res.status).toBe(403);
  expect(service.respond).not.toHaveBeenCalled();
});

test('passes the session identity, not body fields, to the service', async () => {
  User.exists.mockResolvedValue({ _id: 'x' });
  service.respond.mockResolvedValue({ mode: 'demo', reply: 'ok', cards: [] });
  const res = await post(token('Student'), { messages: [{ role: 'user', content: 'hi' }], userId: 'b'.repeat(24) });
  expect(res.status).toBe(200);
  expect(service.respond.mock.calls[0][0].user).toEqual({ id: 'a'.repeat(24), role: 'Student' });
});

test('maps provider errors to retryable responses without leaking details', async () => {
  User.exists.mockResolvedValue({ _id: 'x' });
  const { ProviderError } = require('../companion.provider');
  service.respond.mockRejectedValue(new ProviderError('quota', 'The AI provider quota is exhausted.'));
  const res = await post(token('Student'));
  expect(res.status).toBe(503);
  expect(res.data).toEqual({ message: 'The AI provider quota is exhausted.', code: 'quota', retryable: true });
});
