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
