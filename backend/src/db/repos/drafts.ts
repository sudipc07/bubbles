import { and, asc, count, desc, eq, gte, sql } from 'drizzle-orm';
import { db } from '../index.js';
import { draftSlides, drafts, type Draft, type DraftSlide } from '../schema.js';
import { newId } from '../../lib/id.js';

export interface DraftWithSlides {
  draft: Draft;
  slides: DraftSlide[];
}

export interface NewDraftInput {
  projectId: string;
  runId: string;
  personaId: string | null;
  themeId: string | null;
  format: 'carousel' | 'single_image';
  topicTitle: string;
  angle: string | null;
  kind: 'utility' | 'promo';
  empathyVerdict: 'helpful' | 'performative' | 'tone_deaf' | null;
  safetyVerdict: 'pass' | 'fail' | null;
  safetyReasons: string[];
  linkedinCaption: string | null;
  instagramCaption: string | null;
  slides: Array<{
    slideIndex: number;
    kind: 'cover' | 'bullet-list' | 'quote' | 'stat' | 'cta' | 'body';
    title: string | null;
    body: string;
  }>;
}

export async function createDraft(input: NewDraftInput): Promise<DraftWithSlides> {
  const id = newId();
  return db.transaction(async (tx) => {
    await tx.insert(drafts).values({
      id,
      projectId: input.projectId,
      runId: input.runId,
      personaId: input.personaId,
      themeId: input.themeId,
      format: input.format,
      topicTitle: input.topicTitle,
      angle: input.angle,
      kind: input.kind,
      empathyVerdict: input.empathyVerdict,
      safetyVerdict: input.safetyVerdict,
      safetyReasons: input.safetyReasons,
      linkedinCaption: input.linkedinCaption,
      instagramCaption: input.instagramCaption,
    });
    if (input.slides.length > 0) {
      await tx.insert(draftSlides).values(
        input.slides.map((s) => ({
          id: newId(),
          draftId: id,
          slideIndex: s.slideIndex,
          kind: s.kind,
          title: s.title,
          body: s.body,
        })),
      );
    }
    const [d] = await tx.select().from(drafts).where(eq(drafts.id, id));
    const ss = await tx.select().from(draftSlides).where(eq(draftSlides.draftId, id)).orderBy(asc(draftSlides.slideIndex));
    return { draft: d!, slides: ss };
  });
}

export async function listDraftsForProject(
  projectId: string,
  filter: 'all' | 'pending' | 'decided' = 'all',
  limit = 50,
): Promise<Draft[]> {
  let whereExpr = eq(drafts.projectId, projectId);
  if (filter === 'pending') {
    whereExpr = and(whereExpr, eq(drafts.status, 'pending'))!;
  } else if (filter === 'decided') {
    whereExpr = and(whereExpr, sql`${drafts.status} <> 'pending'`)!;
  }
  return db.select().from(drafts).where(whereExpr).orderBy(desc(drafts.createdAt)).limit(limit);
}

export async function getDraftForMember(
  draftId: string,
  projectId: string,
): Promise<DraftWithSlides | undefined> {
  const [d] = await db
    .select()
    .from(drafts)
    .where(and(eq(drafts.id, draftId), eq(drafts.projectId, projectId)))
    .limit(1);
  if (!d) return undefined;
  const slides = await db
    .select()
    .from(draftSlides)
    .where(eq(draftSlides.draftId, draftId))
    .orderBy(asc(draftSlides.slideIndex));
  return { draft: d, slides };
}

export async function decideDraft(input: {
  draftId: string;
  projectId: string;
  userId: string;
  decision: 'approved' | 'rejected';
}): Promise<Draft | undefined> {
  const rows = await db
    .update(drafts)
    .set({
      status: input.decision,
      decidedByUserId: input.userId,
      decidedAt: new Date(),
    })
    .where(and(eq(drafts.id, input.draftId), eq(drafts.projectId, input.projectId), eq(drafts.status, 'pending')))
    .returning();
  return rows[0];
}

export async function markPosted(input: {
  draftId: string;
  projectId: string;
  postedUrl: string;
}): Promise<Draft | undefined> {
  const rows = await db
    .update(drafts)
    .set({ status: 'posted', postedAt: new Date(), postedUrl: input.postedUrl })
    .where(and(eq(drafts.id, input.draftId), eq(drafts.projectId, input.projectId)))
    .returning();
  return rows[0];
}

/**
 * Helpfulness ratio enforcement (locked owner decision in CLAUDE.md):
 * default 9 utility : 1 promo over rolling 30 days. Returns the count of
 * promo posts in the last 30 days for the project.
 */
export async function promoCountLast30d(projectId: string): Promise<number> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [row] = await db
    .select({ n: count() })
    .from(drafts)
    .where(
      and(
        eq(drafts.projectId, projectId),
        eq(drafts.kind, 'promo'),
        gte(drafts.createdAt, thirtyDaysAgo),
        sql`${drafts.status} <> 'rejected'`,
      ),
    );
  return Number(row?.n ?? 0);
}

export async function utilityCountLast30d(projectId: string): Promise<number> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [row] = await db
    .select({ n: count() })
    .from(drafts)
    .where(
      and(
        eq(drafts.projectId, projectId),
        eq(drafts.kind, 'utility'),
        gte(drafts.createdAt, thirtyDaysAgo),
        sql`${drafts.status} <> 'rejected'`,
      ),
    );
  return Number(row?.n ?? 0);
}
