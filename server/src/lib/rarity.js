// Rarity is computed from how many *distinct* users have ever discovered a
// given portal template, relative to the total diver population. Thresholds
// are ratios so the badge system stays meaningful as the community grows.
export const RARITY_TIERS = [
  { id: 'legendary', label: 'Legendary', maxRatio: 0.01, color: '#e11d48' },
  { id: 'rare', label: 'Rare', maxRatio: 0.05, color: '#a855f7' },
  { id: 'uncommon', label: 'Uncommon', maxRatio: 0.2, color: '#38bdf8' },
  { id: 'common', label: 'Common', maxRatio: 1, color: '#94a3b8' },
];

export function computeRarity(discoverCount, totalUsers) {
  const denom = Math.max(totalUsers, 1);
  const ratio = discoverCount / denom;
  const tier = RARITY_TIERS.find((t) => ratio <= t.maxRatio) || RARITY_TIERS[RARITY_TIERS.length - 1];
  return { ...tier, ratio, discoverCount, totalUsers };
}
