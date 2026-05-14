// LLM: mixed — palette suggestion via LLM for MVP (cheap, deterministic-enough for samples).
// Phase 4.5: replace with real palette extraction from the logo image via node-vibrant.

import { z } from 'zod';
import { completeJson } from '../../llm/index.js';
import type { RunContext } from '../runAgent.js';
import type { ProductSummary } from './parser.js';

const HexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export const PaletteSchema = z.object({
  primary: HexColor,
  secondary: HexColor,
  accent: HexColor,
  background: HexColor,
  text: HexColor,
});

export const FontsSchema = z.object({
  heading: z.string(),
  body: z.string(),
});

export const BrandKitSchema = z.object({
  palette: PaletteSchema,
  fonts: FontsSchema,
  rationale: z.string(),
});

export type BrandKitOutput = z.infer<typeof BrandKitSchema>;

const SAFE_FONTS = [
  'Inter',
  'Source Sans 3',
  'Manrope',
  'Plus Jakarta Sans',
  'IBM Plex Sans',
  'Lora',
  'Source Serif 4',
  'Playfair Display',
  'Merriweather',
  'Space Grotesk',
  'JetBrains Mono',
];

export async function runBrandKit(
  ctx: RunContext,
  input: { summary: ProductSummary; logoUrl: string | null },
): Promise<BrandKitOutput> {
  const { data } = await completeJson(
    { projectId: ctx.projectId, runId: ctx.runId, nodeId: 'brandkit' },
    {
      system:
        'You are a brand designer. Given a product summary, propose a tight 5-colour palette and a heading/body font pair. ' +
        'Palette must satisfy WCAG AA contrast for text on background. Colours in #RRGGBB hex, lowercase. ' +
        'Fonts MUST be chosen from this list (no others): ' +
        SAFE_FONTS.join(', ') +
        '. Return ONLY valid JSON.',
      user:
        `Product: ${input.summary.productName}\n` +
        `Brand tone: ${input.summary.brandTone}\n` +
        `Primary benefit: ${input.summary.primaryBenefit}\n` +
        `Logo URL (may be null): ${input.logoUrl ?? 'none provided'}\n\n` +
        `Return JSON: { "palette": {"primary": "#...", "secondary": "#...", "accent": "#...", "background": "#...", "text": "#..."}, "fonts": {"heading": "...", "body": "..."}, "rationale": "one sentence on why this palette fits the brand" }.`,
      maxTokens: 600,
      temperature: 0.4,
    },
    BrandKitSchema,
  );

  // Defence-in-depth: snap fonts to the safe list even if the model strays.
  const snap = (f: string) => (SAFE_FONTS.includes(f) ? f : 'Inter');
  return {
    ...data,
    fonts: { heading: snap(data.fonts.heading), body: snap(data.fonts.body) },
  };
}
