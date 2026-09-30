// Plain JavaScript on purpose: Node older than 22.18 can't read the TypeScript checkers, but it can read this.
export const minimum = '22.18.0';

export function tooOld(version) {
  const have = version.replace(/^v/, '').split('.').map(Number);
  const need = minimum.split('.').map(Number);
  for (let i = 0; i < need.length; i++) if (have[i] !== need[i]) return have[i] < need[i];
  return false;
}
