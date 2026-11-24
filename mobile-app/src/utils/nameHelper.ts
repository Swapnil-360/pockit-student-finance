/**
 * Name Helper Utility for Bangladeshi Student Names
 * Handles honorifics (Md., Mohammad, Mst., etc.) and provides
 * calling name / nickname (ডাকনাম) extraction and suggestions.
 */

const HONORIFICS = new Set([
  'md', 'md.', 'mohammad', 'mohammed', 'muhammad', 'muhammed',
  'mst', 'mst.', 'most', 'most.', 'kazi', 'syed', 'mirza',
  'al', 'haji', 'dr', 'dr.', 'engr', 'engr.'
]);

/**
 * Returns the preferred calling name to address the student across the app.
 * If user set a custom calling name (e.g. "Swapnil"), uses that.
 * Otherwise, smartly extracts the natural calling name from their full name.
 */
export function getCallingName(
  fullName?: string | null,
  customCallingName?: string | null
): string {
  if (customCallingName && customCallingName.trim()) {
    return customCallingName.trim();
  }
  if (!fullName || !fullName.trim()) return 'Friend';

  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0];

  // Filter out common Bangladeshi honorific prefixes
  const significant = parts.filter(
    (p) => !HONORIFICS.has(p.toLowerCase().replace(/[\.,]/g, ''))
  );

  if (significant.length === 0) return parts[0];

  // If 3+ total words (e.g., "Md. Miftahur Rahman Swapnil"),
  // the final word is almost always the student's common calling name / daknam
  if (parts.length >= 3 && significant.length >= 2) {
    return significant[significant.length - 1]; // "Swapnil"
  }

  // For 2 words like "Tanvir Ahmed", "Tanvir" is the first name
  return significant[0];
}

/**
 * Generates quick 1-tap suggestion chips from the user's full name
 * so the user can easily select how they want to be called.
 */
export function suggestCallingNames(fullName?: string | null): string[] {
  if (!fullName || !fullName.trim()) return [];
  const parts = fullName.trim().split(/\s+/).filter(Boolean);

  const candidates: string[] = [];
  parts.forEach((p) => {
    const clean = p.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '');
    if (clean && !HONORIFICS.has(clean.toLowerCase()) && !candidates.includes(clean)) {
      candidates.push(clean);
    }
  });

  // If we have multiple significant parts, prioritize the last one (common in BD)
  if (candidates.length >= 2) {
    const last = candidates[candidates.length - 1];
    return [last, ...candidates.filter((c) => c !== last)];
  }

  return candidates.length ? candidates : parts;
}

