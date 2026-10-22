/**
 * @jest-environment node
 */
const { matchesAlert } = require("./jobAlertService");

const job = { title: "Freelance React developer", category: "Programming", requiredSkills: [{ category: "Design" }], sourceTags: ["frontend"] };

test("disabled or empty alerts never match", () => {
  expect(matchesAlert(job, { enabled: false, categories: ["Programming"] })).toBe(false);
  expect(matchesAlert(job, { enabled: true, categories: [], keywords: [] })).toBe(false);
});

test("matches by job category or skill category", () => {
  expect(matchesAlert(job, { enabled: true, categories: ["Programming"] })).toBe(true);
  expect(matchesAlert(job, { enabled: true, categories: ["Design"] })).toBe(true);
  expect(matchesAlert(job, { enabled: true, categories: ["Media"] })).toBe(false);
});

test("matches keywords at word starts, case-insensitively, without regex injection", () => {
  expect(matchesAlert(job, { enabled: true, keywords: ["react"] })).toBe(true);
  expect(matchesAlert(job, { enabled: true, keywords: ["front"] })).toBe(true);
  expect(matchesAlert(job, { enabled: true, keywords: ["act"] })).toBe(false);
  expect(matchesAlert(job, { enabled: true, keywords: ["(.*"] })).toBe(false);
});
