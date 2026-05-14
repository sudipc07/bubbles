# Bubbles

A multi-tenant web platform that autonomously generates LinkedIn and Instagram content for multiple products using a multi-agent AI pipeline. Each project is a brand; each project has personas, themes, brand kit, and a runtime pipeline of specialist agents producing on-brand content on schedule. Humans review drafts in a queue and publish manually (no direct channel API integration in MVP).

**Full spec:** `docs/prd.md`

---

## Architecture at a Glance

**Two agent layers:**

- **Setup-time agents** (7) run once during the wizard: Parser, Audience Generator, Voice Generator, Persona Generator, Theme Generator, Brand Kit Generator, Sample Generator.
- **Runtime agents** (9) run on schedule per post: Planner → Researcher → Writer → Empathy Critic → Brand Safety → Editor → Designer → [LinkedInPackager ‖ InstagramPackager] → Analyst.

**Multi-tenant:** Users, Projects, ProjectMembers. Two roles per project: Owner and Member. A user can be Owner of some projects and Member of others.

**Setup is choice-driven, no free chat.** Each wizard step renders AI-generated options as cards; user picks. Free text only for corrections.

---

## Tech Stack Constraints

Pick the implementation that fits these constraints:

- Deployed on **EC2** (existing server, AWS Sydney region).
- **Multi-user**, project-level membership, email-based auth.
- **Postgres + object storage** required. Supabase is the preferred fit (auth + Postgres + storage + RLS in one) but not locked.
- **LLM provider**: OpenAI API (Anthropic API not currently available to Owner). Abstract the provider so swapping later is a config change, not a refactor.
- **Scheduled job runner** needed for the daily generation loop. Keep it inside the backend process for MVP (e.g., APScheduler-equivalent for whatever language); separate worker only if scale forces it.
- **Frontend**: SPA, mobile-friendly. React is owner's strongest stack; greenfield choice is open if there's a clear reason.

---

## Working Agreements

- **Roles are clear.** The product spec (PRD) is settled by the Owner in conversation with the PM/CMO (Claude in chat). Implementation choices are the build agent's call unless they contradict the PRD.
- **Australian / British English** in all user-facing copy: colour, optimise, behaviour, organisation, etc. American spellings in code identifiers are fine (`color: string` is acceptable).
- **No em-dashes between sentences** in user-facing copy; reserve them for inline asides. Owner's standing style preference.
- **Channels are channel-agnostic at the core.** Writer produces format-typed content (`carousel` or `single_image`); Designer renders visuals; Packagers adapt per channel. Adding a new channel = adding a Packager, nothing upstream changes.
- **Personas own the format mix, not the Planner.** Each persona has `format_mix_carousel_pct` and `format_mix_single_pct` summing to 100. Planner respects the weights but may override when topic clearly fits one format (e.g., a numbered framework is always a carousel).
- **Quality gates are hard, not advisory.** Empathy Critic and Brand Safety can block drafts entirely. No soft-pass; failed drafts trigger regeneration or kill.
- **Helpfulness ratio is enforced numerically.** Default 9 utility posts : 1 promo post over rolling 30 days per project. Brand Safety blocks the 10th promo.
- **Visual brand is logo-driven.** User provides logo only; system extracts palette and selects fonts. Advanced overrides live in Settings.
- **Memory of past posts matters.** Uniqueness gate checks similarity against last 10 posts per project before queueing.

---

## Commands

```
# Development (local)
- Install:    pnpm install
- Run dev:    pnpm dev                        # backend + frontend in parallel
- Build:      pnpm build
- Typecheck:  pnpm typecheck

# Database (Drizzle against local or EC2 Postgres)
- Push:       pnpm db:push                    # apply schema changes
- Studio:     pnpm db:studio                  # web UI for inspecting DB

# Deploy — bubbles.work on EC2 52.6.169.112
- SSH:        ssh -i ~/Store/ResumeFolio.pem ubuntu@52.6.169.112
- One-shot:   sudo /home/ubuntu/bubbles/deploy/setup.sh       # idempotent, run on first deploy and after infra changes
- Redeploy:   /home/ubuntu/bubbles/deploy/deploy.sh           # pull + build + restart
- PM2 logs:   pm2 logs bubbles-api
- Health:     curl https://bubbles.work/api/healthz
```

## Infrastructure (locked)

- EC2: `52.6.169.112` (Ubuntu, us-east-1). Co-located with ResumeFolio.
- Backend port: 3002 (ResumeFolio holds 3000).
- Postgres: local, DB `bubbles`, user `bubbles`. Password in `/home/ubuntu/bubbles/.env`.
- Repo on EC2: `/home/ubuntu/bubbles/`. Static files served from `/opt/bubbles/frontend/`.
- PM2 process: `bubbles-api`, runs as `ubuntu`.
- SES: instance-role auth, region `ap-south-1`, FROM `Bubbles <no-reply@resume-folio.app>` until bubbles.work is verified in SES.
- OpenAI key: shared with ResumeFolio, duplicated into `/home/ubuntu/bubbles/.env`.

Full architecture and decisions: see plan at `~/.claude/plans/exciting-times-new-modular-harbor.md`.

---

## Don't

- Don't hardcode personas, themes, or brand kits per project. Everything is configurable via the wizard; ResumeFolio is just the first project, not a special case.
- Don't write a direct LinkedIn or Instagram API integration in MVP. Humans publish manually; the system produces ready-to-publish bundles.
- Don't use chat-style Q&A in the wizard. Choice cards only, with free text reserved for correcting AI's understanding.
- Don't lock fonts or colours globally. They're derived from each project's logo and system selection.
- Don't reach for a multi-agent framework (LangGraph, CrewAI, etc.) for the runtime pipeline. Plain functions in a pipeline are sufficient and easier to reason about.
- Don't include video format in MVP. Deferred to v2.
- Don't add a Viewer role in MVP. Owner + Member only.
- Don't auto-pull engagement metrics in MVP. Manual entry by the publisher; auto-pull is v2 once channel APIs are integrated.

---

## File Structure (proposed)

```
bubbles/
├── backend/
│   ├── agents/
│   │   ├── setup/          # 7 setup-time agents
│   │   └── runtime/        # 9 runtime agents
│   ├── api/                # HTTP routes
│   ├── db/                 # models, migrations
│   ├── scheduler/          # daily job runner
│   └── config/
├── frontend/
│   ├── src/
│   │   ├── pages/          # Projects list, Dashboard, Wizard, Drafts, Personas, etc.
│   │   ├── components/
│   │   └── lib/
│   └── public/
├── docs/
│   ├── prd.md              # full product spec
│   └── decisions/          # ADRs for stack and design choices
├── deploy/
│   ├── nginx.conf
│   └── service files
├── CLAUDE.md               # this file
└── README.md
```

Build agent: confirm or revise this structure on first commit, document the choice in `docs/decisions/`.
