const { requirePayments, paymentsEnabled } = require("./payments");

const run = () => {
  const res = { status: jest.fn(() => res), json: jest.fn(() => res) };
  const next = jest.fn();
  requirePayments({}, res, next);
  return { res, next };
};

afterEach(() => { delete process.env.DEMO_MODE; delete process.env.PAYMENTS_ENABLED; });

test("blocks money movement when no payment provider is configured", () => {
  const { res, next } = run();
  expect(paymentsEnabled()).toBe(false);
  expect(next).not.toHaveBeenCalled();
  expect(res.status).toHaveBeenCalledWith(503);
});

test("allows money movement only when explicitly enabled", () => {
  process.env.PAYMENTS_ENABLED = "true";
  expect(run().next).toHaveBeenCalled();
});
