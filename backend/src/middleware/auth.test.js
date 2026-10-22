jest.mock('../models/User', () => ({ exists: jest.fn() }));
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authenticate } = require('./auth');
const { JWT_SECRET } = require('../config/jwt');

const userId = '507f1f77bcf86cd799439011';
let req;
let res;
let next;

beforeEach(() => {
  jest.clearAllMocks();
  const token = jwt.sign({ id: userId, role: 'Student' }, JWT_SECRET, { expiresIn: '1h' });
  req = { header: () => `Bearer ${token}` };
  res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
  next = jest.fn();
});

test('requires an account with the current token role to still exist', async () => {
  User.exists.mockResolvedValue({ _id: userId });
  await authenticate(req, res, next);
  expect(User.exists).toHaveBeenCalledWith({ _id: userId, role: 'Student' });
  expect(next).toHaveBeenCalledTimes(1);
});

test('revokes sessions for deleted accounts or changed roles after cutover', async () => {
  User.exists.mockResolvedValue(null);
  await authenticate(req, res, next);
  expect(res.status).toHaveBeenCalledWith(401);
  expect(next).not.toHaveBeenCalled();
});

test('fails closed without exposing database errors during an outage', async () => {
  User.exists.mockRejectedValue(new Error('private database diagnostic'));
  await authenticate(req, res, next);
  expect(res.status).toHaveBeenCalledWith(503);
  expect(res.json).toHaveBeenCalledWith({ message: 'Unable to verify your session. Please try again.' });
  expect(next).not.toHaveBeenCalled();
});

test('rejects invalid JWTs before querying accounts', async () => {
  req.header = () => 'Bearer invalid';
  await authenticate(req, res, next);
  expect(res.status).toHaveBeenCalledWith(400);
  expect(User.exists).not.toHaveBeenCalled();
});
