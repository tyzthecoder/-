import test from 'node:test';
import assert from 'node:assert/strict';
import { computeRarity } from '../src/lib/rarity.js';

test('a template discovered by almost nobody is legendary', () => {
  const r = computeRarity(1, 1000);
  assert.equal(r.id, 'legendary');
});

test('a template discovered by everyone is common', () => {
  const r = computeRarity(1000, 1000);
  assert.equal(r.id, 'common');
});

test('rarity ratio boundaries are inclusive of their tier', () => {
  assert.equal(computeRarity(10, 1000).id, 'legendary'); // ratio 0.01
  assert.equal(computeRarity(50, 1000).id, 'rare'); // ratio 0.05
  assert.equal(computeRarity(200, 1000).id, 'uncommon'); // ratio 0.20
});

test('handles zero total users without dividing by zero', () => {
  const r = computeRarity(1, 0);
  assert.equal(Number.isFinite(r.ratio), true);
});
