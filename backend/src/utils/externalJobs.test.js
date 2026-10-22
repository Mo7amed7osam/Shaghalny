const { classifyJob, normalizeExternalJob, plainText, isSourceUrl } = require("./externalJobs");

const fetchedAt = new Date("2026-10-21T12:00:00Z");
const listing = {
  title: "Freelance React Developer", slug: "react-contract-123", company_name: "Example source company",
  url: "https://www.arbeitnow.com/jobs/companies/example/react-contract-123",
  description: "<p>Build accessible interfaces &amp; tests.</p>",
  created_at: fetchedAt.getTime() / 1000 - 3600, remote: true, location: "Berlin, Germany", tags: ["React"],
};

test.each(["Senior permanent developer", "Junior full-time designer", "Sales contractor"])("does not relabel unrelated employment: %s", (title) => {
  expect(classifyJob(title)).toBeNull();
});

test.each(["Intern Software Engineer", "Werkstudent Frontend", "Praktikum Design"])("recognizes student opportunities: %s", (title) => {
  expect(classifyJob(title)).toBe("internship");
});

test.each(["javascript:alert(1)", "https://www.arbeitnow.com.evil.test/jobs/x", "http://www.arbeitnow.com/jobs/x", "https://user:pass@www.arbeitnow.com/jobs/x"])("rejects unsafe source URL: %s", (url) => {
  expect(isSourceUrl(url)).toBe(false);
  expect(normalizeExternalJob({ ...listing, url }, fetchedAt)).toBeNull();
});

test("imports provenance without inventing employer accounts, pay or global eligibility", () => {
  const result = normalizeExternalJob(listing, fetchedAt);
  expect(result.sourceCompanyName).toBe(listing.company_name);
  expect(result.sourceLocation).toBe("Berlin, Germany");
  expect(result.description).toBe("Build accessible interfaces & tests.");
  expect(result).not.toHaveProperty("employer");
  expect(result).not.toHaveProperty("budgetMin");
  expect(result).not.toHaveProperty("budgetMax");
  expect(result.workMode).toBe("online");
});

test("preserves known publication date and rejects invalid/future dates", () => {
  expect(normalizeExternalJob(listing, fetchedAt).sourcePublishedAt.getTime()).toBe(listing.created_at * 1000);
  expect(normalizeExternalJob({ ...listing, created_at: "bad" }, fetchedAt)).toBeNull();
  expect(normalizeExternalJob({ ...listing, created_at: fetchedAt.getTime() / 1000 + 1 }, fetchedAt)).toBeNull();
});

test("removes source markup and script content without interpreting HTML", () => {
  expect(plainText('<script>steal()</script><p>Text &#38; &#x41;</p>')).toBe("Text & A");
});

describe("multi-source normalizers", () => {
  const { normalizeHimalayas, normalizeJobicy, normalizeRemoteOk, dedupeJobs, categorize, classifyEmploymentType } = require("./externalJobs");
  const himalayas = {
    title: "Freelance Spanish Translator", companyName: "Example Co", employmentType: "Contractor",
    minSalary: 20, maxSalary: 30, currency: "USD", salaryPeriod: "hourly", locationRestrictions: ["Spain"],
    categories: ["Translator"], parentCategories: ["Writing"], description: "<p>Translate docs</p>",
    pubDate: fetchedAt.getTime() / 1000 - 60, expiryDate: fetchedAt.getTime() / 1000 + 86400,
    applicationLink: "https://himalayas.app/companies/example/jobs/translator?utm_source=api",
    guid: "https://himalayas.app/companies/example/jobs/translator",
  };

  test("keeps published compensation as the source states it and links the original apply URL", () => {
    const job = normalizeHimalayas(himalayas, fetchedAt);
    expect(job.sourceCompensation).toBe("USD 20–30 per hour");
    expect(job.sourceApplyUrl).toBe(himalayas.applicationLink);
    expect(job.category).toBe("Translation");
    expect(job.type).toBe("freelance");
    expect(job).not.toHaveProperty("budgetMin");
  });

  test("drops expired, full-time, placeholder and off-host listings", () => {
    expect(normalizeHimalayas({ ...himalayas, expiryDate: fetchedAt.getTime() / 1000 - 1 }, fetchedAt)).toBeNull();
    expect(normalizeHimalayas({ ...himalayas, employmentType: "Full Time" }, fetchedAt)).toBeNull();
    expect(normalizeHimalayas({ ...himalayas, title: "TEST Interpreter" }, fetchedAt)).toBeNull();
    expect(normalizeHimalayas({ ...himalayas, guid: "https://evil.test/companies/x" }, fetchedAt)).toBeNull();
  });

  test("Jobicy and Remote OK keep source URLs and omit unknown pay", () => {
    const jobicy = normalizeJobicy({ id: 1, url: "https://jobicy.com/jobs/1-intern", jobTitle: "Design Intern", companyName: "A",
      jobIndustry: ["Design"], jobType: ["Internship"], jobGeo: "Europe", pubDate: "2026-10-20T00:00:00+00:00" }, fetchedAt);
    expect(jobicy.type).toBe("internship");
    expect(jobicy).not.toHaveProperty("sourceCompensation");
    const remoteOk = normalizeRemoteOk({ id: "9", position: "Freelance Video Editor", company: "B",
      url: "https://remoteOK.com/remote-jobs/remote-video-9", date: "2026-10-20T00:00:00+00:00", tags: ["video"] }, fetchedAt);
    expect(remoteOk.sourceUrl).toBe("https://remoteok.com/remote-jobs/remote-video-9");
    expect(remoteOk.category).toBe("Media");
  });

  test("deduplicates by source ID, URL and company/title", () => {
    const a = normalizeHimalayas(himalayas, fetchedAt);
    const b = { ...a, sourceName: "Jobicy", sourceId: "x", sourceUrl: "https://jobicy.com/jobs/x" };
    expect(dedupeJobs([a, a, b]).kept).toHaveLength(1);
  });

  test("employment labels are not stretched", () => {
    expect(classifyEmploymentType("Full Time")).toBeNull();
    expect(classifyEmploymentType("Fixed-term contract (befristeter arbeitsvertrag)")).toBeNull();
    expect(categorize("Senior Software Engineer")).toBe("Programming");
  });
});
