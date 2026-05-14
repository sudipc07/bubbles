// LLM: no — pure string manipulation. Char limits, hashtag formatting, line breaks.

import type { DraftContent } from './writer.js';
import type { Plan } from './planner.js';

interface PackInput {
  draft: DraftContent;
  plan: Plan;
}

function hashtags(theme: Plan['theme']): string[] {
  const base = theme.label
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((w) => `#${w}`);
  return base;
}

function slidesToCopy(d: DraftContent): string {
  if (d.format === 'single_image') {
    const s = d.slides[0]!;
    return [s.title, s.body].filter(Boolean).join('\n\n');
  }
  // Carousel: lead with cover, body slides become numbered list
  const cover = d.slides[0];
  const restSlides = d.slides.slice(1, -1);
  const cta = d.slides[d.slides.length - 1];
  const numbered = restSlides
    .map((s, i) => {
      const head = s.title ? `${i + 1}. ${s.title}` : `${i + 1}.`;
      return `${head}\n${s.body}`;
    })
    .join('\n\n');
  const parts = [];
  if (cover) parts.push([cover.title, cover.body].filter(Boolean).join('\n\n'));
  if (numbered) parts.push(numbered);
  if (cta && cta !== cover) parts.push(cta.body);
  return parts.join('\n\n');
}

const LINKEDIN_MAX = 3000;
const INSTAGRAM_MAX = 2200;

export function packLinkedIn({ draft, plan }: PackInput): string {
  const body = slidesToCopy(draft);
  const tags = hashtags(plan.theme).join(' ');
  let out = `${body}\n\n${tags}`.trim();
  if (out.length > LINKEDIN_MAX) out = out.slice(0, LINKEDIN_MAX - 1) + '…';
  return out;
}

export function packInstagram({ draft, plan }: PackInput): string {
  const body = slidesToCopy(draft);
  // Instagram convention: tags grouped at end, slightly more aggressive count.
  const themeTags = hashtags(plan.theme);
  const extraTags = ['#linkedinpost', '#content']; // safe filler; can swap to brand-specific later
  const tags = [...themeTags, ...extraTags].slice(0, 8).join(' ');
  let out = `${body}\n\n${tags}`.trim();
  if (out.length > INSTAGRAM_MAX) out = out.slice(0, INSTAGRAM_MAX - 1) + '…';
  return out;
}
