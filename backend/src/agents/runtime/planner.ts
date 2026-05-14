// LLM: no — arithmetic against persona format weights + theme rotation.
// Picks the persona least-recently used, picks a theme they haven't covered
// in the last N posts, and decides the format from the persona's weighted mix.

import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { drafts, personas, themes, type Persona, type Theme } from '../../db/schema.js';

export interface Plan {
  persona: Persona;
  theme: Theme;
  format: 'carousel' | 'single_image';
  kind: 'utility' | 'promo';
}

function weightedFormat(p: Persona): 'carousel' | 'single_image' {
  const r = Math.random() * 100;
  return r < p.formatMixCarouselPct ? 'carousel' : 'single_image';
}

export async function plan(projectId: string): Promise<Plan> {
  const activePersonas = await db
    .select()
    .from(personas)
    .where(and(eq(personas.projectId, projectId), eq(personas.isActive, true)));
  if (activePersonas.length === 0) {
    throw new Error('plan: no active personas — run setup first');
  }

  const activeThemes = await db
    .select()
    .from(themes)
    .where(and(eq(themes.projectId, projectId), eq(themes.isActive, true)));
  if (activeThemes.length === 0) {
    throw new Error('plan: no active themes — run setup first');
  }

  // Persona pick: least-recently used. SELECT persona_id, max(created_at) FROM drafts...
  const lastUsage = await db
    .select({
      personaId: drafts.personaId,
      lastAt: sql<string>`max(${drafts.createdAt})`,
    })
    .from(drafts)
    .where(eq(drafts.projectId, projectId))
    .groupBy(drafts.personaId);

  const lastByPersona = new Map(lastUsage.map((r) => [r.personaId, r.lastAt]));
  const personaSorted = [...activePersonas].sort((a, b) => {
    const aLast = lastByPersona.get(a.id) ?? '';
    const bLast = lastByPersona.get(b.id) ?? '';
    return aLast.localeCompare(bLast);
  });
  const persona = personaSorted[0]!;

  // Theme pick: least-recently used by *this persona*; fallback to random unused.
  const recentThemeIds = await db
    .select({ themeId: drafts.themeId })
    .from(drafts)
    .where(and(eq(drafts.projectId, projectId), eq(drafts.personaId, persona.id)))
    .orderBy(desc(drafts.createdAt))
    .limit(5);
  const recentlyUsed = new Set(recentThemeIds.map((r) => r.themeId).filter(Boolean) as string[]);
  const eligible = activeThemes.filter((t) => !recentlyUsed.has(t.id));
  const themePool = eligible.length > 0 ? eligible : activeThemes;
  const theme = themePool[Math.floor(Math.random() * themePool.length)]!;

  return {
    persona,
    theme,
    format: weightedFormat(persona),
    // MVP: every planner pick is utility. Promo posts are added manually for now.
    // Phase 9 swaps in the helpfulness-ratio gate that auto-blocks the 10th promo.
    kind: 'utility',
  };
}
