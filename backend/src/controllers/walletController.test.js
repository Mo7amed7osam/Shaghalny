jest.mock('../models/User', () => ({ findById: jest.fn() }));
jest.mock('../models/TopUpRequest', () => ({ create: jest.fn() }));
jest.mock('../models/WithdrawalRequest', () => ({}));
const TopUpRequest = require('../models/TopUpRequest');
const { createDemoTopUpRequest } = require('./walletController');
const originalMode = process.env.DEMO_MODE;
let res;

beforeEach(() => {
  jest.clearAllMocks();
  res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
});
afterEach(() => {
  if (originalMode === undefined) delete process.env.DEMO_MODE;
  else process.env.DEMO_MODE = originalMode;
});

test('demo funding is unavailable in ordinary production mode', async () => {
  delete process.env.DEMO_MODE;
  await createDemoTopUpRequest({ body: { amount: 1000 }, user: { id: 'client' } }, res);
  expect(res.status).toHaveBeenCalledWith(404);
  expect(TopUpRequest.create).not.toHaveBeenCalled();
});

test.each([0, -1, Infinity, 'invalid', 100001])('rejects unsafe demo funding amount %s', async amount => {
  process.env.DEMO_MODE = 'true';
  await createDemoTopUpRequest({ body: { amount }, user: { id: 'client' } }, res);
  expect(res.status).toHaveBeenCalledWith(400);
  expect(TopUpRequest.create).not.toHaveBeenCalled();
});

test('creates a pending request with an explicitly synthetic receipt, without crediting a balance', async () => {
  process.env.DEMO_MODE = 'true';
  TopUpRequest.create.mockResolvedValue({ status: 'PENDING' });
  await createDemoTopUpRequest({ body: { amount: 1500 }, user: { id: 'client' } }, res);
  expect(TopUpRequest.create).toHaveBeenCalledWith({ clientId: 'client', amount: 1500, screenshotPath: 'assets/demo-payment.svg', note: 'DEMO ONLY — simulated top-up. No real transfer or receipt.' });
  expect(res.status).toHaveBeenCalledWith(201);
});
