const fs = require("fs");
const path = require("path");
const { SOURCES, NORMALIZERS, dedupeJobs } = require("../utils/externalJobs");

const USER_AGENT = "Shaghalny-Job-Importer/2.0 (+https://shaghalny.quantara-eg.com)";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
// Keep each source's footprint small; all feeds ask for infrequent polling.
const PER_COMPANY_LIMIT = 5;

async function getJson(url) {
  const response = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`${new URL(url).hostname} returned HTTP ${response.status}`);
  return response.json();
}

const FEEDS = {
  async Arbeitnow() {
    const records = [];
    for (let page = 1; page <= 5; page += 1) {
      const body = await getJson(`https://www.arbeitnow.com/api/job-board-api?page=${page}`);
      if (!Array.isArray(body.data)) throw new Error("Arbeitnow returned an unexpected response.");
      records.push(...body.data);
      if (!body.links?.next) break;
      await sleep(1000);
    }
    return records;
  },
  async Himalayas() {
    const records = [];
    // Broad pulls plus targeted searches for fields the broad pull under-represents.
    const queries = [["Intern", "", 8], ["Contractor", "", 5],
      ["Contractor", "translator", 2], ["Contractor", "localization", 1], ["Intern", "translation", 1],
      ["Contractor", "designer", 2], ["Contractor", "video", 2], ["Contractor", "writer", 1],
      ["Contractor", "developer", 2], ["Intern", "mechanical", 1], ["Intern", "civil", 1], ["Intern", "electrical", 1]];
    for (const [type, q, pages] of queries) {
      for (let page = 1; page <= pages; page += 1) {
        const search = new URLSearchParams({ employment_type: type, page: String(page), ...(q ? { q } : {}) });
        const body = await getJson(`https://himalayas.app/jobs/api/search?${search}`);
        if (!Array.isArray(body.jobs)) throw new Error("Himalayas returned an unexpected response.");
        records.push(...body.jobs);
        if (body.jobs.length === 0) break;
        await sleep(1500);
      }
    }
    return records;
  },
  async Jobicy() {
    const body = await getJson("https://jobicy.com/api/v2/remote-jobs?count=200");
    if (!Array.isArray(body.jobs)) throw new Error("Jobicy returned an unexpected response.");
    return body.jobs;
  },
  async "Remote OK"() {
    const body = await getJson("https://remoteok.com/api");
    if (!Array.isArray(body)) throw new Error("Remote OK returned an unexpected response.");
    return body.filter((record) => record && record.id && record.position);
  },
};

// Confirms the original listing still resolves. Never retries around blocks.
async function checkLink(url) {
  try {
    const response = await fetch(url, {
      method: "GET", redirect: "follow",
      headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
      signal: AbortSignal.timeout(20000),
    });
    await response.body?.cancel();
    return { status: response.status, finalUrl: response.url };
  } catch (error) {
    return { status: 0, error: error.name };
  }
}

// Himalayas listing pages answer automated clients with HTTP 403 (bot protection).
// Their API only returns active, unexpired jobs, so the API record is the liveness
// evidence; the page block is recorded, never circumvented.
const API_LIVENESS_SOURCES = new Set(["Himalayas"]);

// One request at a time per host, so link checks never trip a source's rate limit.
async function checkLinks(jobs) {
  const results = new Map();
  const byHost = new Map();
  for (const job of jobs) {
    if (API_LIVENESS_SOURCES.has(job.sourceName)) {
      results.set(`${job.sourceName}#${job.sourceId}`, {
        status: null, method: "source API lists job as active", expiresAt: job.sourceExpiresAt || null,
        checkedAt: new Date().toISOString(),
      });
      continue;
    }
    const host = new URL(job.sourceUrl).hostname;
    byHost.set(host, [...(byHost.get(host) || []), job]);
  }
  await Promise.all([...byHost.values()].map(async (hostJobs) => {
    for (const job of hostJobs) {
      let check = await checkLink(job.sourceUrl);
      if (check.status === 429) { await sleep(15000); check = await checkLink(job.sourceUrl); }
      results.set(`${job.sourceName}#${job.sourceId}`, { ...check, method: "HTTP GET", checkedAt: new Date().toISOString() });
      await sleep(1500);
    }
  }));
  return results;
}

const linkPasses = (check) => Boolean(check && (check.method === "source API lists job as active"
  || (check.status >= 200 && check.status < 400)));

async function fetchExternalJobs({ sources = Object.keys(FEEDS) } = {}) {
  const fetchedAt = new Date();
  const raw = {}; const stats = {}; const candidates = [];
  for (const name of sources) {
    try {
      raw[name] = await FEEDS[name]();
      const normalized = raw[name].map((record) => NORMALIZERS[name](record, fetchedAt)).filter(Boolean);
      stats[name] = { fetched: raw[name].length, eligible: normalized.length, terms: SOURCES[name].terms };
      const perCompany = new Map(); const seenIds = new Set();
      for (const job of normalized) {
        if (seenIds.has(job.sourceId)) continue;
        seenIds.add(job.sourceId);
        const key = job.sourceCompanyName.toLowerCase();
        perCompany.set(key, (perCompany.get(key) || 0) + 1);
        if (perCompany.get(key) <= PER_COMPANY_LIMIT) candidates.push(job);
      }
    } catch (error) {
      stats[name] = { error: error.message, terms: SOURCES[name].terms };
      raw[name] = [];
    }
  }
  const { kept, dropped } = dedupeJobs(candidates);
  const links = await checkLinks(kept);
  const linkChecks = Object.fromEntries(links);
  const live = kept.filter((job) => {
    return linkPasses(links.get(`${job.sourceName}#${job.sourceId}`));
  });
  for (const name of sources) {
    if (!stats[name].error) {
      stats[name].afterCompanyCapAndDedupe = kept.filter((j) => j.sourceName === name).length;
      stats[name].linkVerified = live.filter((j) => j.sourceName === name).length;
    }
  }
  // Raw records are kept so the importer can re-normalize instead of trusting this file.
  const keep = new Set(live.map((job) => `${job.sourceName}#${job.sourceId}`));
  const rawKept = Object.fromEntries(Object.entries(raw).map(([name, records]) => [name,
    records.filter((record) => {
      const job = NORMALIZERS[name](record, fetchedAt);
      return job && keep.has(`${name}#${job.sourceId}`);
    })]));
  return {
    version: 2, fetchedAt: fetchedAt.toISOString(), stats, duplicatesRemoved: dropped.length,
    linkChecks, raw: rawKept, jobs: live,
  };
}

if (require.main === module) {
  const destination = process.argv[2];
  if (!destination) {
    console.error("Usage: node src/scripts/fetchExternalJobs.js <snapshot.json>");
    process.exitCode = 1;
  } else {
    fetchExternalJobs().then((snapshot) => {
      if (!snapshot.jobs.length) throw new Error("No eligible listings found. Existing data was not changed.");
      fs.mkdirSync(path.dirname(path.resolve(destination)), { recursive: true });
      fs.writeFileSync(destination, JSON.stringify(snapshot, null, 2), { flag: "wx" });
      console.log(JSON.stringify({ snapshot: path.resolve(destination), stats: snapshot.stats, duplicatesRemoved: snapshot.duplicatesRemoved, jobs: snapshot.jobs.length }, null, 2));
    }).catch((error) => { console.error(error.message); process.exitCode = 1; });
  }
}

module.exports = { fetchExternalJobs, checkLink, linkPasses };
