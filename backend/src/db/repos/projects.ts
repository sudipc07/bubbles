import { and, eq, sql } from 'drizzle-orm';
import { db } from '../index.js';
import { projectMembers, projects, type Project } from '../schema.js';
import { newId, newSlugSuffix, slugify } from '../../lib/id.js';
import { env } from '../../config/env.js';

export type ProjectListItem = Project & { role: 'owner' | 'member' };

export async function listProjectsForUser(userId: string): Promise<ProjectListItem[]> {
  const rows = await db
    .select({
      project: projects,
      role: projectMembers.role,
    })
    .from(projectMembers)
    .innerJoin(projects, eq(projectMembers.projectId, projects.id))
    .where(eq(projectMembers.userId, userId))
    .orderBy(sql`${projects.createdAt} desc`);
  return rows.map((r) => ({ ...r.project, role: r.role }));
}

export async function findProjectByIdForMember(
  projectId: string,
  userId: string,
): Promise<ProjectListItem | undefined> {
  const rows = await db
    .select({ project: projects, role: projectMembers.role })
    .from(projectMembers)
    .innerJoin(projects, eq(projectMembers.projectId, projects.id))
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)))
    .limit(1);
  const r = rows[0];
  return r ? { ...r.project, role: r.role } : undefined;
}

export async function updateProjectBrief(
  projectId: string,
  ownerUserId: string,
  patch: { brief?: string | null; logoUrl?: string | null; publicUrl?: string | null; channels?: string[] },
): Promise<Project | undefined> {
  const updates: Partial<typeof projects.$inferInsert> = { updatedAt: new Date() };
  if (patch.brief !== undefined) updates.brief = patch.brief;
  if (patch.logoUrl !== undefined) updates.logoUrl = patch.logoUrl;
  if (patch.publicUrl !== undefined) updates.publicUrl = patch.publicUrl;
  if (patch.channels !== undefined) updates.channels = patch.channels;

  const rows = await db
    .update(projects)
    .set(updates)
    .where(and(eq(projects.id, projectId), eq(projects.ownerUserId, ownerUserId)))
    .returning();
  return rows[0];
}

export async function createProject(input: { name: string; ownerUserId: string }): Promise<Project> {
  const id = newId();
  const slug = `${slugify(input.name)}-${newSlugSuffix()}`;
  await db.transaction(async (tx) => {
    await tx.insert(projects).values({
      id,
      slug,
      name: input.name,
      ownerUserId: input.ownerUserId,
      monthlyCostCeilingUsd: env.DEFAULT_MONTHLY_COST_CEILING_USD,
    });
    await tx.insert(projectMembers).values({
      projectId: id,
      userId: input.ownerUserId,
      role: 'owner',
    });
  });
  const rows = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  return rows[0]!;
}
