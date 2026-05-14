import { desc, eq } from 'drizzle-orm';
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
