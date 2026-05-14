# 0004 — Designer (Playwright + S3) deferred; in-browser slide preview instead

## Context

Phase 5 in the plan calls for a server-side Designer agent that renders each
carousel slide via headless Chromium (Playwright), uploads the PNGs to S3
under `s3://bubbles/{project_id}/posts/{post_id}/slide-{n}.png`, and exposes
them to the packagers + operator.

Three pieces need to be true on the EC2 box for this to work:

1. **Chromium system deps installed.** Headless Chromium needs ~11 shared libs
   (`libnss3`, `libatk-bridge2.0-0`, `libdrm2`, `libxkbcommon0`,
   `libxcomposite1`, `libxdamage1`, `libxfixes3`, `libxrandr2`, `libgbm1`,
   `libasound2`, `libpango-1.0-0`). Probe on 14 May 2026 showed only 4 of 11
   present. Installing the rest is `sudo apt-get install -y …` (~200 MB).

2. **S3 bucket `s3://bubbles` exists** with the EC2 instance role having
   `s3:PutObject` + `s3:GetObject` + `s3:ListBucket` on it. Probe showed
   `aws s3 ls s3://bubbles` returns AccessDenied; bucket needs to be created
   in the right region, with the role granted access.

3. **Playwright npm dep installed**, with `npx playwright install chromium`
   pulling down the browser binary (~300 MB on disk).

## Decision

Defer Designer to Phase 5 proper. The platform owner runs the three
prerequisite tasks (apt-get, S3 bucket, role policy) during a supervised
window so a sandboxed apt install can't accidentally affect ResumeFolio.

In the meantime, the DraftDetail page renders **in-browser slide previews**
using HTML/CSS templates with the project's brand kit values (palette, font
pair) injected via CSS custom properties. This gives the operator a real
visual sense of the carousel before the server-side image pipeline ships.

When Phase 5 lands, the in-browser preview is the design source of truth: the
server-side templates are HTML/CSS files that render identically.

## Consequences

- Drafts produced today carry slide JSON and brand-kit-themed previews; no
  downloadable PNGs yet.
- The Designer node in the runtime DAG executes as a no-op pass-through for
  now (kept so the graph shape stays stable and runAgent events still flow).
- When Designer arrives, no schema change is needed (slide rows already have a
  nullable `image_url` column waiting).

## Prerequisites for activating Phase 5

```bash
# On EC2 (supervised):
sudo apt-get update
sudo apt-get install -y libnss3 libatk-bridge2.0-0 libdrm2 libxkbcommon0 \
  libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2 \
  libpango-1.0-0

# Bubbles repo will add playwright dep:
cd /home/ubuntu/bubbles
pnpm --filter @bubbles/backend add playwright
sudo -u ubuntu npx playwright install chromium

# S3 bucket (Sydney for proximity, or wherever owner prefers):
aws s3 mb s3://bubbles-prod --region ap-southeast-2
# Attach an IAM policy to the EC2 role granting:
#   s3:PutObject, s3:GetObject, s3:ListBucket on arn:aws:s3:::bubbles-prod/*
```
