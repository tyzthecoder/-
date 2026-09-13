import sanitizeHtml from 'sanitize-html';

// Comments are plain text — strip every tag/attribute rather than trying to
// allow a safe subset. This kills XSS payloads (<script>, onerror=, etc.)
// at the point of storage, so every consumer of `comments.body` is safe by
// construction even if a template forgets to escape.
export function sanitizeCommentBody(raw) {
  const stripped = sanitizeHtml(raw, { allowedTags: [], allowedAttributes: {} });
  return stripped.replace(/\s+/g, ' ').trim();
}

const URL_PATTERN = /\b((https?:\/\/)|(www\.)|([a-z0-9-]+\.(com|net|org|io|xyz|ru|tk|gg|ly|link)\b))/i;

// A tiny, obviously-incomplete slur/spam wordlist. Real deployments should
// swap this for a maintained list or a moderation API — this exists to show
// the shape of the check, not to be a complete filter.
const BLOCKED_PATTERNS = [/\bviagra\b/i, /\bfree\s*money\b/i, /\bclick\s*here\b/i];

export function findModerationViolation(text) {
  if (URL_PATTERN.test(text)) {
    return 'Links are not allowed in comments.';
  }
  if (BLOCKED_PATTERNS.some((re) => re.test(text))) {
    return 'This comment was blocked by our content filter.';
  }
  return null;
}

export const MAX_COMMENT_LENGTH = 500;
export const MIN_COMMENT_LENGTH = 1;
