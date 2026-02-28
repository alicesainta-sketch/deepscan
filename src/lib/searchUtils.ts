// Normalize search text for consistent matching across inputs and stored content.
// Core logic: trim whitespace and lower-case to avoid case-sensitivity mismatches.
export const normalizeSearchText = (value: string): string => {
  // Edge case: undefined/empty input should not break search matching.
  if (!value) return "";
  return value.trim().toLowerCase();
};
