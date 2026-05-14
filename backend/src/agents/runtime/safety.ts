// LLM: mostly no — regex bans + numeric-claim flagging + helpfulness ratio (SQL).

import type { RunContext } from '../runAgent.js';
import type { DraftContent } from './writer.js';
import { promoCountLast30d, utilityCountLast30d } from '../../db/repos/drafts.js';

export interface SafetyReport {
  verdict: 'pass' | 'fail';
  reasons: string[];
}

// Conservative starter list. Operator can grow this from Brand Safety settings later.
const BANNED_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /\b(guaranteed|100% guaranteed)\b/i, label: 'absolutist claim ("guaranteed")' },
  { pattern: /\b(get rich|six.figure|7.figure|six figures|seven figures)\b/i, label: 'wealth-bait phrasing' },
  { pattern: /\b(secret|hack|nobody.{0,20}talks about|trick(s)?)\b/i, label: 'hype-y "secret/hack" phrasing' },
  { pattern: /\bAI replaces?\b/i, label: 'reductionist "AI replaces X" claim' },
];

const NUMERIC_CLAIM = /\b(\d{1,3}(?:[.,]\d+)?\s?%|\d{1,3}x|\d{2,}\s*(million|billion|users|customers|companies))\b/i;

export async function safetyCheck(
  ctx: RunContext,
  draft: DraftContent,
  kind: 'utility' | 'promo',
): Promise<SafetyReport> {
  const reasons: string[] = [];
  const allText = draft.slides.map((s) => `${s.title ?? ''} ${s.body}`).join('\n');

  for (const { pattern, label } of BANNED_PATTERNS) {
    if (pattern.test(allText)) reasons.push(label);
  }

  // Numeric claims are flagged but not auto-failed; let the editor verify or rewrite.
  const numericMatches = allText.match(NUMERIC_CLAIM);
  if (numericMatches) {
    reasons.push(`unverified numeric claim ("${numericMatches[0]}")`);
  }

  if (kind === 'promo') {
    const [promo, utility] = await Promise.all([
      promoCountLast30d(ctx.projectId),
      utilityCountLast30d(ctx.projectId),
    ]);
    // Locked owner default: 9 utility : 1 promo over 30 days.
    if (promo >= 1 && utility / Math.max(1, promo) < 9) {
      reasons.push(
        `helpfulness ratio breached (${utility} utility : ${promo + 1} promo over 30d would fall below 9:1)`,
      );
    }
  }

  return {
    verdict: reasons.length === 0 ? 'pass' : 'fail',
    reasons,
  };
}
