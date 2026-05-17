import { and, desc, eq } from 'drizzle-orm';
import { db } from '../index.js';
import {
  audiences,
  brandKits,
  personas,
  samples,
  themes,
  voices,
  type Audience,
  type BrandKit,
  type Persona,
  type Sample,
  type Theme,
  type Voice,
} from '../schema.js';

// ───────── Selection / activation flags (curated by the Brand wizard) ─────────

/**
 * Audience is single-select per project: setting one to true flips all
 * others to false in the same transaction. Voice has the same shape.
 */
export async function setSelectedAudience(projectId: string, audienceId: string): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.update(audiences).set({ isSelected: false }).where(eq(audiences.projectId, projectId));
    await tx
      .update(audiences)
      .set({ isSelected: true })
      .where(and(eq(audiences.projectId, projectId), eq(audiences.id, audienceId)));
  });
}

export async function setSelectedVoice(projectId: string, voiceId: string): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.update(voices).set({ isSelected: false }).where(eq(voices.projectId, projectId));
    await tx
      .update(voices)
      .set({ isSelected: true })
      .where(and(eq(voices.projectId, projectId), eq(voices.id, voiceId)));
  });
}

// Personas and themes are multi-select (operator keeps several active);
// just toggle the row.
export async function setPersonaActive(projectId: string, personaId: string, active: boolean): Promise<void> {
  await db
    .update(personas)
    .set({ isActive: active })
    .where(and(eq(personas.projectId, projectId), eq(personas.id, personaId)));
}

export async function setThemeActive(projectId: string, themeId: string, active: boolean): Promise<void> {
  await db
    .update(themes)
    .set({ isActive: active })
    .where(and(eq(themes.projectId, projectId), eq(themes.id, themeId)));
}

export interface BrandKitPatch {
  palette?: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  fonts?: { heading: string; body: string };
}

export async function updateBrandKit(projectId: string, patch: BrandKitPatch): Promise<BrandKit | undefined> {
  const updates: Partial<typeof brandKits.$inferInsert> = {};
  if (patch.palette) updates.palette = patch.palette;
  if (patch.fonts) updates.fonts = patch.fonts;
  if (Object.keys(updates).length === 0) return undefined;
  const rows = await db
    .update(brandKits)
    .set(updates)
    .where(eq(brandKits.projectId, projectId))
    .returning();
  return rows[0];
}

export async function deleteAudience(projectId: string, id: string): Promise<boolean> {
  const rows = await db
    .delete(audiences)
    .where(and(eq(audiences.id, id), eq(audiences.projectId, projectId)))
    .returning({ id: audiences.id });
  return rows.length > 0;
}

export async function deleteVoice(projectId: string, id: string): Promise<boolean> {
  const rows = await db
    .delete(voices)
    .where(and(eq(voices.id, id), eq(voices.projectId, projectId)))
    .returning({ id: voices.id });
  return rows.length > 0;
}

export async function deletePersona(projectId: string, id: string): Promise<boolean> {
  // Cascades samples via FK on delete cascade; drafts' persona_id becomes null
  // via FK on delete set null (configured in schema).
  const rows = await db
    .delete(personas)
    .where(and(eq(personas.id, id), eq(personas.projectId, projectId)))
    .returning({ id: personas.id });
  return rows.length > 0;
}

export async function deleteTheme(projectId: string, id: string): Promise<boolean> {
  const rows = await db
    .delete(themes)
    .where(and(eq(themes.id, id), eq(themes.projectId, projectId)))
    .returning({ id: themes.id });
  return rows.length > 0;
}

export interface SetupOutputs {
  audiences: Audience[];
  voices: Voice[];
  personas: Persona[];
  themes: Theme[];
  brandKit: BrandKit | null;
  samples: Sample[];
}

export async function loadSetupOutputs(projectId: string): Promise<SetupOutputs> {
  const [audRows, voiceRows, personaRows, themeRows, kitRows, sampleRows] = await Promise.all([
    db.select().from(audiences).where(eq(audiences.projectId, projectId)).orderBy(desc(audiences.createdAt)),
    db.select().from(voices).where(eq(voices.projectId, projectId)).orderBy(desc(voices.createdAt)),
    db.select().from(personas).where(eq(personas.projectId, projectId)).orderBy(desc(personas.createdAt)),
    db.select().from(themes).where(eq(themes.projectId, projectId)).orderBy(desc(themes.createdAt)),
    db.select().from(brandKits).where(eq(brandKits.projectId, projectId)).limit(1),
    db.select().from(samples).where(eq(samples.projectId, projectId)).orderBy(desc(samples.createdAt)),
  ]);

  return {
    audiences: audRows,
    voices: voiceRows,
    personas: personaRows,
    themes: themeRows,
    brandKit: kitRows[0] ?? null,
    samples: sampleRows,
  };
}
