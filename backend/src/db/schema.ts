import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  numeric,
  uniqueIndex,
  index,
  primaryKey,
  jsonb,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ───────── Identity ─────────

export const users = pgTable(
  'users',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull(),
    name: text('name'),
    isAdmin: boolean('is_admin').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  },
  (t) => ({
    emailUnique: uniqueIndex('users_email_unique').on(sql`lower(${t.email})`),
  }),
);

export const sessions = pgTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byUser: index('sessions_user_idx').on(t.userId),
    byExpiry: index('sessions_expires_idx').on(t.expiresAt),
  }),
);

export const loginCodes = pgTable(
  'login_codes',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull(),
    codeHash: text('code_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    attempts: integer('attempts').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byEmail: index('login_codes_email_idx').on(sql`lower(${t.email})`),
    byExpiry: index('login_codes_expires_idx').on(t.expiresAt),
  }),
);

// ───────── Projects (brands) ─────────

export const projects = pgTable(
  'projects',
  {
    id: text('id').primaryKey(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    ownerUserId: text('owner_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    status: text('status', { enum: ['active', 'paused', 'archived'] }).notNull().default('active'),
    monthlyCostCeilingUsd: integer('monthly_cost_ceiling_usd').notNull().default(20),

    // Brief — pasted PRD / product description, logo URL, and the channels
    // this project publishes to. Setup wizard agents consume these in Phase 4.
    brief: text('brief'),
    logoUrl: text('logo_url'),
    channels: text('channels').array().notNull().default(sql`ARRAY['linkedin','instagram']`),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    slugUnique: uniqueIndex('projects_slug_unique').on(t.slug),
    byOwner: index('projects_owner_idx').on(t.ownerUserId),
  }),
);

export const projectMembers = pgTable(
  'project_members',
  {
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: text('role', { enum: ['owner', 'member'] }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.projectId, t.userId] }),
    byUser: index('project_members_user_idx').on(t.userId),
  }),
);

// ───────── Setup outputs (audiences, voices, personas, themes, brand kit, samples) ─────────

export const audiences = pgTable(
  'audiences',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    summary: text('summary').notNull(),
    traits: text('traits').array().notNull().default(sql`ARRAY[]::text[]`),
    isSelected: boolean('is_selected').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ byProject: index('audiences_project_idx').on(t.projectId) }),
);

export const voices = pgTable(
  'voices',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description').notNull(),
    examples: text('examples').array().notNull().default(sql`ARRAY[]::text[]`),
    isSelected: boolean('is_selected').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ byProject: index('voices_project_idx').on(t.projectId) }),
);

export const personas = pgTable(
  'personas',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description').notNull(),
    formatMixCarouselPct: integer('format_mix_carousel_pct').notNull().default(70),
    formatMixSinglePct: integer('format_mix_single_pct').notNull().default(30),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ byProject: index('personas_project_idx').on(t.projectId) }),
);

export const themes = pgTable(
  'themes',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    label: text('label').notNull(),
    description: text('description').notNull(),
    exampleAngles: text('example_angles').array().notNull().default(sql`ARRAY[]::text[]`),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ byProject: index('themes_project_idx').on(t.projectId) }),
);

export const brandKits = pgTable(
  'brand_kits',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    palette: jsonb('palette').notNull(),       // { primary, secondary, accent, background, text }
    fonts: jsonb('fonts').notNull(),           // { heading, body }
    logoUrl: text('logo_url'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ byProjectUnique: uniqueIndex('brand_kits_project_unique').on(t.projectId) }),
);

export const samples = pgTable(
  'samples',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    personaId: text('persona_id')
      .notNull()
      .references(() => personas.id, { onDelete: 'cascade' }),
    format: text('format', { enum: ['carousel', 'single_image'] }).notNull(),
    title: text('title').notNull(),
    body: text('body').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ byProject: index('samples_project_idx').on(t.projectId) }),
);

// ───────── Pipeline runs & instrumentation ─────────

export const agentRuns = pgTable(
  'agent_runs',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    pipeline: text('pipeline', { enum: ['setup', 'runtime'] }).notNull(),
    status: text('status', { enum: ['running', 'completed', 'failed'] }).notNull().default('running'),
    triggeredByUserId: text('triggered_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
    error: text('error'),
  },
  (t) => ({
    byProject: index('agent_runs_project_idx').on(t.projectId, sql`${t.startedAt} desc`),
    byStatus: index('agent_runs_status_idx').on(t.status),
  }),
);

export const agentEvents = pgTable(
  'agent_events',
  {
    id: text('id').primaryKey(),
    runId: text('run_id')
      .notNull()
      .references(() => agentRuns.id, { onDelete: 'cascade' }),
    projectId: text('project_id').notNull(),
    nodeId: text('node_id').notNull(),
    agentName: text('agent_name').notNull(),
    eventType: text('event_type', { enum: ['started', 'finished', 'failed', 'skipped'] }).notNull(),
    input: jsonb('input'),
    output: jsonb('output'),
    errorMessage: text('error_message'),
    durationMs: integer('duration_ms'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byRun: index('agent_events_run_idx').on(t.runId, t.createdAt),
    byProject: index('agent_events_project_idx').on(t.projectId, sql`${t.createdAt} desc`),
  }),
);

export const llmCalls = pgTable(
  'llm_calls',
  {
    id: text('id').primaryKey(),
    runId: text('run_id').references(() => agentRuns.id, { onDelete: 'set null' }),
    projectId: text('project_id').notNull(),
    nodeId: text('node_id').notNull(),
    kind: text('kind', { enum: ['complete', 'embed'] }).notNull(),
    model: text('model').notNull(),
    promptTokens: integer('prompt_tokens').notNull().default(0),
    completionTokens: integer('completion_tokens').notNull().default(0),
    totalTokens: integer('total_tokens').notNull().default(0),
    usdCost: numeric('usd_cost', { precision: 12, scale: 6 }).notNull().default('0'),
    latencyMs: integer('latency_ms').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byProject: index('llm_calls_project_idx').on(t.projectId, sql`${t.createdAt} desc`),
    byRun: index('llm_calls_run_idx').on(t.runId),
  }),
);

// ───────── Inferred types for the rest of the app ─────────

export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type LoginCode = typeof loginCodes.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type ProjectMember = typeof projectMembers.$inferSelect;
export type AgentRun = typeof agentRuns.$inferSelect;
export type AgentEvent = typeof agentEvents.$inferSelect;
export type LlmCall = typeof llmCalls.$inferSelect;
export type Audience = typeof audiences.$inferSelect;
export type Voice = typeof voices.$inferSelect;
export type Persona = typeof personas.$inferSelect;
export type Theme = typeof themes.$inferSelect;
export type BrandKit = typeof brandKits.$inferSelect;
export type Sample = typeof samples.$inferSelect;
