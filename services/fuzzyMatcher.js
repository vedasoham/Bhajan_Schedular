/**
 * services/fuzzyMatcher.js
 *
 * Pure-JS fuzzy string similarity for the Missing Bhajan Catcher.
 * No external dependencies — uses character bigram Dice coefficient
 * plus a normalisation pass so minor formatting differences don't
 * prevent a good match.
 */

/**
 * Normalise a bhajan title for comparison:
 *  - trim & collapse whitespace
 *  - lowercase
 *  - remove common punctuation that shouldn't affect identity
 */
function normalizeBhajanTitle(title) {
  return String(title || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/[''`".,;:!?()\[\]{}\/\\-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Build the set of character bigrams in a string.
 * "abcd" -> { "ab", "bc", "cd" }
 */
function getBigrams(str) {
  const bigrams = new Set();
  for (let i = 0; i < str.length - 1; i++) {
    bigrams.add(str.slice(i, i + 2));
  }
  return bigrams;
}

/**
 * Dice coefficient similarity between two strings, range [0, 1].
 * 1.0 = identical, 0.0 = no shared bigrams.
 */
function diceSimilarity(a, b) {
  const na = normalizeBhajanTitle(a);
  const nb = normalizeBhajanTitle(b);

  // Exact match after normalisation
  if (na === nb) return 1.0;
  if (na.length < 2 || nb.length < 2) return 0;

  const bigramsA = getBigrams(na);
  const bigramsB = getBigrams(nb);

  let intersection = 0;
  for (const bg of bigramsA) {
    if (bigramsB.has(bg)) intersection++;
  }

  return (2 * intersection) / (bigramsA.size + bigramsB.size);
}

/**
 * Token-overlap bonus: what fraction of words in the shorter title appear
 * in the longer title? Boosts short-title comparisons where bigrams alone
 * are weak.
 */
function tokenOverlapScore(a, b) {
  const tokA = normalizeBhajanTitle(a).split(' ').filter(Boolean);
  const tokB = normalizeBhajanTitle(b).split(' ').filter(Boolean);
  if (!tokA.length || !tokB.length) return 0;
  const setB = new Set(tokB);
  const matches = tokA.filter(t => setB.has(t)).length;
  return matches / Math.max(tokA.length, tokB.length);
}

/**
 * Combined score: weighted average of Dice + token overlap.
 */
function combinedScore(a, b) {
  const dice = diceSimilarity(a, b);
  const token = tokenOverlapScore(a, b);
  return dice * 0.6 + token * 0.4;
}

/**
 * Find the top matching master bhajans for a submitted title.
 *
 * @param {string} submittedTitle - The title from BhajanSubmission that is NOT in master DB.
 * @param {Array<{id, title, deity, raga, shruti}>} masterBhajans - All MasterBhajan records.
 * @param {number} threshold - Minimum score to include (default 0.55).
 * @param {number} topN - Maximum candidates to return (default 5).
 * @returns {Array<{master, score}>} Sorted highest-score first.
 */
function findSimilarBhajans(submittedTitle, masterBhajans, threshold = 0.60, topN = 3) {
  const normSubmitted = normalizeBhajanTitle(submittedTitle);
  if (!normSubmitted || normSubmitted.length < 3) return [];

  const results = [];
  for (let i = 0; i < masterBhajans.length; i++) {
    const master = masterBhajans[i];
    const normMaster = normalizeBhajanTitle(master.title);

    // Fast length difference check: skip expensive bigram comparison if lengths differ significantly
    if (Math.abs(normSubmitted.length - normMaster.length) > 12) continue;

    const score = combinedScore(submittedTitle, master.title);
    if (score >= threshold) {
      results.push({ master, score });
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, topN);
}

module.exports = {
  normalizeBhajanTitle,
  diceSimilarity,
  combinedScore,
  findSimilarBhajans
};
