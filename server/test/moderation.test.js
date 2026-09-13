import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeCommentBody, findModerationViolation } from '../src/lib/moderation.js';

test('strips script tags and HTML entirely', () => {
  const dirty = '<script>alert(1)</script>hello <b>world</b>';
  assert.equal(sanitizeCommentBody(dirty), 'hello world');
});

test('collapses excess whitespace', () => {
  assert.equal(sanitizeCommentBody('hi   \n\n  there'), 'hi there');
});

test('blocks urls', () => {
  assert.ok(findModerationViolation('check out https://evil.example for a deal'));
  assert.ok(findModerationViolation('visit www.example.com'));
  assert.equal(findModerationViolation('no links here, just vibes'), null);
});

test('blocks obviously spammy phrases', () => {
  assert.ok(findModerationViolation('click here now'));
  assert.equal(findModerationViolation('this portal gave me chills'), null);
});
