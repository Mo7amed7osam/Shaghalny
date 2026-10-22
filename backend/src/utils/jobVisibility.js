// Conditions every publicly listed job must meet. Shared by the job board and
// the companion so both show exactly the same set of open listings.
const EXTERNAL_FRESHNESS_MS = 14 * 86400000;

const visibleJobConditions = (now = new Date()) => [
  { status: "open" },
  { $or: [
    { sourceType: { $ne: "external" } },
    { sourceLastSeenAt: { $gte: new Date(now.getTime() - EXTERNAL_FRESHNESS_MS) } },
  ] },
  // Sources such as Himalayas require expired listings to be removed.
  { $or: [{ sourceExpiresAt: null }, { sourceExpiresAt: { $gt: now } }] },
];

module.exports = { visibleJobConditions, EXTERNAL_FRESHNESS_MS };
